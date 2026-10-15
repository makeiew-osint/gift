import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const databasePath = path.join(os.tmpdir(), `makeiew-giveaways-${randomUUID()}.sqlite`);
process.env.DATABASE_PATH = databasePath;
const store = await import("../src/store.js");

test("persists a giveaway, deduplicates entries, and finalizes it once", async (t) => {
  t.after(() => {
    store.closeDatabase();
    for (const file of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  const giveaway = store.createGiveaway({
    title: "Тестовый розыгрыш",
    prize: "Подарок",
    description: "",
    publishChannel: "@makeiew",
    requiredChannels: ["@makeiew"],
    paymentStars: 0,
    winnerCount: 2,
    targetParticipants: 2,
    endsAt: null,
    createdBy: 42,
    step: "finishRule",
    finishRule: { endsAt: null, targetParticipants: 2 },
  });

  assert.equal(giveaway.status, "active");
  assert.deepEqual(giveaway.required_channels, ["@makeiew"]);
  assert.equal(store.addEntry(giveaway.id, 100, null, {
    firstName: "Участник",
    username: "example",
    verifiedChannels: 2,
  }), true);
  assert.equal(store.addEntry(giveaway.id, 100), false);
  assert.equal(store.addEntry(giveaway.id, 101), true);
  assert.equal(store.getEntryCount(giveaway.id), 2);
  assert.equal(store.getGiveawayStats(giveaway.id).verified_subscriptions, 2);
  assert.equal(store.getUserGiveaways(100)[0].title, giveaway.title);
  assert.equal(store.getGiveawayEntries(giveaway.id)[0].username, "example");
  assert.equal(store.updateGiveaway(giveaway.id, { title: "Обновлённый розыгрыш" }, 42), true);
  assert.equal(store.getGiveawayEvents(giveaway.id).some(({ event_type }) => event_type === "edited"), true);
  assert.equal(store.markReminderSent(giveaway.id, Date.now(), 2), true);
  assert.equal(store.markReminderSent(giveaway.id, Date.now(), 2), false);
  assert.equal(store.markTargetNotified(giveaway.id, 42), true);
  assert.equal(store.claimSubscriptionNotice(giveaway.id), true);
  assert.equal(store.claimSubscriptionNotice(giveaway.id), false);
  assert.equal(store.markSubscriptionNoticeSent(giveaway.id), true);
  assert.equal(store.markSubscriptionNoticeSent(giveaway.id), false);

  assert.equal(store.claimGiveawayDraw(giveaway.id), true);
  const selected = store.getShuffledGiveawayEntries(giveaway.id)
    .slice(0, 2)
    .map(({ user_id: userId }) => userId);
  const result = store.finalizeGiveaway(giveaway.id, selected, 42);
  assert.equal(result.status, "ended");
  assert.equal(result.winners.length, 2);
  assert.equal(store.getGiveaway(giveaway.id).status, "ended");
  assert.equal(store.finalizeGiveaway(giveaway.id), null);
  assert.equal(store.getWinners(giveaway.id).length, 2);
  assert.equal(store.getGiveawayEvents(giveaway.id).some(({ event_type }) => event_type === "ended"), true);

  const paidGiveaway = store.createGiveaway({
    title: "Платный розыгрыш",
    prize: "Приз",
    description: "",
    publishChannel: "@makeiew",
    requiredChannels: [],
    paymentStars: 5,
    winnerCount: 1,
    targetParticipants: null,
    endsAt: null,
    createdBy: 42,
  });
  store.addEntry(paidGiveaway.id, 102, "charge-102", {
    firstName: "Оплативший",
    verifiedChannels: 1,
  });
  assert.equal(store.getGiveawayStats(paidGiveaway.id).stars_collected, 5);
  assert.equal(store.claimRefund(paidGiveaway.id, 102), true);
  store.markRefundResult(paidGiveaway.id, 102, "temporary error", 42);
  assert.equal(store.claimRefund(paidGiveaway.id, 102), true);
  store.markRefundResult(paidGiveaway.id, 102, null, 42);
  assert.equal(store.getGiveawayStats(paidGiveaway.id).stars_refunded, 5);
  assert.equal(store.getGiveawayEvents(paidGiveaway.id).some(({ event_type }) => event_type === "refund_failed"), true);

  const backup = await store.createDatabaseBackup();
  assert.ok(fs.statSync(backup.path).size > 0);
  const backupDb = new Database(backup.path, { readonly: true });
  assert.equal(backupDb.prepare("SELECT COUNT(*) AS count FROM giveaways").get().count, 2);
  backupDb.close();
  fs.unlinkSync(backup.path);
});
