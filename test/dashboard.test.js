import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const databasePath = path.join(os.tmpdir(), `makeiew-dashboard-${randomUUID()}.sqlite`);
process.env.DATABASE_PATH = databasePath;
const store = await import("../src/store.js");
const { createDashboardServer } = await import("../src/dashboard.js");

async function readJson(response) {
  const body = await response.text();
  assert.ok(body, `Expected JSON response for ${response.url}; received HTTP ${response.status}.`);
  return JSON.parse(body);
}

test("dashboard login, reporting, exports, and blacklist require an approved admin session", async (t) => {
  const adminIds = new Set([1881090493]);
  const giveaway = store.createGiveaway({
    title: "Dashboard test",
    prize: "Test prize",
    description: "",
    publishChannel: "@makeiew",
    requiredChannels: ["@makeiew"],
    paymentStars: 10,
    winnerCount: 1,
    targetParticipants: 25,
    endsAt: null,
    createdBy: 1881090493,
  });
  store.trackReferralVisit(giveaway.id, 888, 777);
  store.addEntry(giveaway.id, 777, "charge-test", {
    firstName: "Participant",
    username: "participant",
    verifiedChannels: 1,
    verifiedChannelNames: ["@makeiew"],
    referrerId: 888,
  });
  store.recordEntryChannelCheck(giveaway.id, 777, "@makeiew", "draw", true);

  const botMessages = [];
  const bot = { telegram: {
    sendMessage: async (chatId, text) => { botMessages.push({ chatId, text }); },
  } };
  const server = createDashboardServer({ bot, adminIds });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.closeDatabase();
    for (const file of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const unauthorized = await fetch(`${baseUrl}/api/overview`);
  assert.equal(unauthorized.status, 401);

  const loginResponse = await fetch(`${baseUrl}/api/login`, { method: "POST" });
  assert.equal(loginResponse.status, 201);
  const login = await readJson(loginResponse);
  assert.equal("telegramUrl" in login, false);
  assert.equal("code" in login, false);
  assert.deepEqual(botMessages.map(({ chatId }) => chatId), [1881090493]);
  const code = botMessages[0].text.match(/\b(\d{6})\b/)?.[1];
  assert.match(code, /^\d{6}$/);

  const wrongCode = await fetch(`${baseUrl}/api/login/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId: login.challengeId, code: code === "000000" ? "000001" : "000000" }),
  });
  assert.equal(wrongCode.status, 401);

  const verified = await fetch(`${baseUrl}/api/login/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId: login.challengeId, code }),
  });
  assert.equal(verified.status, 200);
  assert.equal((await readJson(verified)).authenticated, true);
  const cookie = verified.headers.get("set-cookie").split(";")[0];
  const sessionResponse = await fetch(`${baseUrl}/api/session`, { headers: { cookie } });
  assert.deepEqual(await readJson(sessionResponse), { authenticated: true, adminId: 1881090493 });

  const lockedLoginResponse = await fetch(`${baseUrl}/api/login`, { method: "POST" });
  const lockedLogin = await readJson(lockedLoginResponse);
  const lockedCode = botMessages[1].text.match(/\b(\d{6})\b/)?.[1];
  const invalidCode = lockedCode === "999999" ? "999998" : "999999";
  const attempts = Array.from({ length: 5 }, () => fetch(`${baseUrl}/api/login/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId: lockedLogin.challengeId, code: invalidCode }),
  }));
  const attemptResponses = await Promise.all(attempts);
  assert.deepEqual(attemptResponses.map((response) => response.status).sort(), [401, 401, 401, 401, 429]);

  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Dark Admin Console/);
  assert.match(home.headers.get("content-security-policy"), /default-src 'self'/);

  const overview = await fetch(`${baseUrl}/api/overview`, { headers: { cookie } });
  assert.equal(overview.status, 200);
  const overviewData = await readJson(overview);
  assert.equal(overviewData.totals.participants, 1);
  assert.equal(overviewData.totals.stars_collected, 10);
  assert.equal(overviewData.totals.free_entries, 0);
  assert.equal(overviewData.totals.paid_entries, 1);
  assert.equal(overviewData.giveaways[0].target_participants, 25);
  assert.deepEqual(overviewData.giveaways[0].required_channels, ["@makeiew"]);
  assert.equal(overviewData.giveaways[0].require_reaction, 0);
  assert.equal(overviewData.channelStats[0].checked_at_draw, 1);
  assert.equal(overviewData.channelStats[0].checked_at_entry, 1);
  assert.equal(overviewData.channelStats[0].checked_at_entry_total, 1);
  assert.equal(overviewData.events.length > 0, true);
  const crossOriginMutation = await fetch(`${baseUrl}/api/blacklist`, {
    method: "POST",
    headers: { cookie, origin: "https://attacker.example", "content-type": "application/json" },
    body: JSON.stringify({ userId: "777", reason: "must be rejected" }),
  });
  assert.equal(crossOriginMutation.status, 403);

  assert.equal(store.markRefundResult(giveaway.id, 777), true);
  const analytics = await fetch(`${baseUrl}/api/analytics?days=14`, { headers: { cookie } });
  assert.equal(analytics.status, 200);
  const analyticsData = await readJson(analytics);
  assert.equal(analyticsData.publicationViews, null);
  assert.equal(analyticsData.dailyMetricsAvailable, true);
  assert.deepEqual(analyticsData.comparison.current, { entries: 1, paid_entries: 1, stars: 10 });
  assert.deepEqual(analyticsData.comparison.previous, { entries: 0, paid_entries: 0, stars: 0 });
  assert.equal(analyticsData.giveawayPerformance[0].entries, 1);
  assert.equal(analyticsData.giveawayPerformance[0].paid_entries, 1);
  assert.equal(analyticsData.giveawayPerformance[0].stars_collected, 10);
  assert.equal(analyticsData.giveawayPerformance[0].referral_visits, 1);
  assert.equal(analyticsData.giveawayPerformance[0].referral_joins, 1);
  assert.equal(analyticsData.channels[0].checked_at_entry, 1);
  assert.equal(analyticsData.channels[0].remained_subscribed, 1);
  assert.equal(analyticsData.daily.reduce((sum, entry) => sum + entry.participants, 0), 1);
  assert.equal(analyticsData.daily.reduce((sum, entry) => sum + entry.paid_entries, 0), 1);
  assert.equal(analyticsData.daily.reduce((sum, entry) => sum + entry.stars_collected, 0), 10);
  assert.equal(analyticsData.daily.reduce((sum, entry) => sum + entry.stars_refunded, 0), 10);
  assert.equal(analyticsData.daily.reduce((sum, entry) => sum + entry.referral_visits, 0), 1);
  assert.equal(analyticsData.daily.reduce((sum, entry) => sum + entry.referral_joins, 0), 1);
  assert.equal(analyticsData.referrals.visits, 1);
  assert.equal(analyticsData.referrals.joins, 1);
  const extendedAnalytics = await fetch(`${baseUrl}/api/analytics?days=90`, { headers: { cookie } });
  assert.equal((await readJson(extendedAnalytics)).days, 90);
  const threeModule = await fetch(`${baseUrl}/vendor/three.module.min.js`);
  assert.equal(threeModule.status, 200);
  assert.match(threeModule.headers.get("content-type"), /javascript/);
  assert.match(await threeModule.text(), /WebGLRenderer/);
  const threeCore = await fetch(`${baseUrl}/vendor/three.core.min.js`);
  assert.equal(threeCore.status, 200);
  assert.match(threeCore.headers.get("content-type"), /javascript/);
  const orbitControls = await fetch(`${baseUrl}/vendor/orbit-controls.js`);
  assert.equal(orbitControls.status, 200);
  assert.match(await orbitControls.text(), /from "\/vendor\/three\.module\.min\.js"/);
  const dashboardScript = await fetch(`${baseUrl}/dashboard.js`);
  assert.equal(dashboardScript.status, 200);
  const dashboardScriptText = await dashboardScript.text();
  assert.match(dashboardScriptText, /overview-gift-canvas/);
  assert.match(dashboardScriptText, /data-model-role/);
  const sceneScript = await fetch(`${baseUrl}/analytics-3d.js`);
  assert.equal(sceneScript.status, 200);
  const sceneScriptText = await sceneScript.text();
  assert.match(sceneScriptText, /export function mountOverviewModels\(canvas,/);
  assert.match(sceneScriptText, /modelRole/);
  const system = await fetch(`${baseUrl}/api/system`, { headers: { cookie } });
  assert.equal(system.status, 200);
  assert.equal((await readJson(system)).databaseCheck, "ok");

  store.recordGiveawayEvent(giveaway.id, "payment_received", 666, {
    chargedStars: 10,
    chargeId: "orphan-charge",
    source: "blocked-user",
  });
  store.recordGiveawayEvent(giveaway.id, "refund_failed", 666, {
    stars: 10,
    chargeId: "orphan-charge",
    source: "blocked-user",
  });
  const payments = await fetch(`${baseUrl}/api/payments?q=charge-test`, { headers: { cookie } });
  assert.equal(payments.status, 200);
  assert.equal((await readJson(payments)).length, 1);
  const unmatchedPayment = await fetch(`${baseUrl}/api/payments?q=orphan-charge`, { headers: { cookie } });
  assert.equal((await readJson(unmatchedPayment))[0].status, "review");
  const participants = await fetch(`${baseUrl}/api/participants?q=participant`, { headers: { cookie } });
  assert.equal((await readJson(participants)).length, 1);

  const referralRows = await fetch(`${baseUrl}/api/referrals`, { headers: { cookie } });
  assert.equal((await readJson(referralRows))[0].joins, 1);

  const added = await fetch(`${baseUrl}/api/blacklist`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ userId: "777", reason: "manual review" }),
  });
  assert.equal(added.status, 201);
  assert.equal(store.isUserBlocked(777), true);

  const csv = await fetch(`${baseUrl}/api/export/participants.csv`, { headers: { cookie } });
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /participant/);

  const removed = await fetch(`${baseUrl}/api/blacklist/777`, { method: "DELETE", headers: { cookie } });
  assert.equal((await readJson(removed)).removed, true);
  assert.equal(store.isUserBlocked(777), false);
});
