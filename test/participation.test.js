import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const databasePath = path.join(os.tmpdir(), `makeiew-participation-${randomUUID()}.sqlite`);
process.env.DATABASE_PATH = databasePath;
const [{ finishGiveaway, registerAdminHandlers, startGiveawayScheduler }, store] = await Promise.all([
  import("../src/admin.js"),
  import("../src/store.js"),
]);
after(() => {
  store.closeDatabase();
  for (const file of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});

class FakeBot {
  actions = [];
  handlers = new Map();
  invoices = [];
  messages = [];
  subscribed = false;
  apiCalls = [];
  commands = new Map();
  middlewares = [];

  telegram = {
    getMe: async () => ({ id: 99999, username: "makeiew_bot" }),
    getChatMember: async (channel, userId) => ({
      status: userId === 99999 || this.subscribed ? "administrator" : "left",
    }),
    callApi: async (method, payload) => {
      this.apiCalls.push({ method, payload });
      return true;
    },
    sendMessage: async (chatId, text, extra) => {
      this.messages.push({ chatId, text, extra });
      return {};
    },
    sendPhoto: async (chatId, fileId, extra) => {
      const result = { type: "photo", chatId, fileId, extra };
      this.messages.push(result);
      return result;
    },
    sendAnimation: async (chatId, fileId, extra) => {
      const result = { type: "animation", chatId, fileId, extra };
      this.messages.push(result);
      return result;
    },
    sendDocument: async (chatId, document, extra) => {
      const result = { chatId, document, extra };
      this.messages.push(result);
      return result;
    },
    editMessageText: async (...args) => {
      this.apiCalls.push({ method: "editMessageText", payload: args });
      return true;
    },
    editMessageCaption: async (...args) => {
      this.apiCalls.push({ method: "editMessageCaption", payload: args });
      return true;
    },
  };

  start(handler) { this.startHandler = handler; }
  use(handler) { this.middlewares.push(handler); }
  command(name, handler) { this.commands.set(name, handler); }
  action(trigger, handler) { this.actions.push({ trigger, handler }); }
  on(update, handler) {
    this.handlers.set(Array.isArray(update) ? update.join("|") : update, handler);
  }
}

function createContext(userId, data) {
  return {
    from: { id: userId, first_name: "Участник", username: "participant" },
    chat: { type: "private", id: userId },
    callbackQuery: { data },
    match: null,
    messages: [],
    alerts: [],
    invoices: [],
    async answerCbQuery(text, options) { this.alerts.push({ text, options }); },
    async editMessageText(text, options) {
      this.editMethod = "text";
      const result = { text, options };
      this.messages.push(result);
      this.lastMessage = result;
      return result;
    },
    async editMessageCaption(text, options) {
      this.editMethod = "caption";
      const result = { text, options };
      this.messages.push(result);
      this.lastMessage = result;
      return result;
    },
    async reply(text, options) {
      const result = { text, options };
      this.messages.push(result);
      return result;
    },
    async replyWithInvoice(invoice) {
      this.invoices.push(invoice);
      return {};
    },
    async replyWithPhoto(fileId, options) {
      this.lastMessage = { type: "photo", fileId, options };
      return this.lastMessage;
    },
    async replyWithAnimation(fileId, options) {
      this.lastMessage = { type: "animation", fileId, options };
      return this.lastMessage;
    },
  };
}

function createAdminMessage(text, userId = 900) {
  return {
    from: { id: userId, first_name: "Администратор" },
    chat: { type: "private" },
    message: { text },
    replies: [],
    async reply(replyText, options) {
      this.lastReply = { text: replyText, options };
      this.replies.push(this.lastReply);
      return this.lastReply;
    },
    async replyWithPhoto(fileId, options) {
      this.previewMedia = { type: "photo", fileId, options };
      return this.previewMedia;
    },
    async replyWithAnimation(fileId, options) {
      this.previewMedia = { type: "animation", fileId, options };
      return this.previewMedia;
    },
  };
}

async function invokeAction(bot, data, userId, { media = false } = {}) {
  const registered = bot.actions.find(({ trigger }) => (
    typeof trigger === "string" ? trigger === data : trigger.test(data)
  ));
  assert.ok(registered, `No callback registered for ${data}`);
  const ctx = createContext(userId, data);
  ctx.telegram = bot.telegram;
  if (media) ctx.callbackQuery.message = { photo: [{ file_id: "test-photo" }] };
  ctx.match = typeof registered.trigger === "string"
    ? []
    : registered.trigger.exec(data);
  await registered.handler(ctx);
  return ctx;
}

function createTestGiveaway(overrides = {}) {
  return store.createGiveaway({
    title: "Летний розыгрыш",
    prize: "Подарок makeiew",
    description: "Проверьте подписку и участвуйте!",
    publishChannel: "@makeiew",
    requiredChannels: ["@required"],
    paymentStars: 7,
    winnerCount: 1,
    targetParticipants: 100,
    endsAt: null,
    createdBy: 900,
    ...overrides,
  });
}

test("runs captcha, rechecks subscriptions, and accepts a Stars payment in Telegram", async (t) => {
  const token = "test-only-bot-token";
  const adminId = 900;
  const userId = 901;
  const giveaway = createTestGiveaway();
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([adminId]), botToken: token });

  let ctx = await invokeAction(bot, `join:${giveaway.id}`, userId);
  const captcha = ctx.lastMessage;
  assert.match(captcha.text, /Проверка на человека/);
  const [left, right] = captcha.text.match(/\d+ \+ \d+/)[0].match(/\d+/g).map(Number);
  const answer = left + right;
  const choices = captcha.options.reply_markup.inline_keyboard.flat().map((button) => button.callback_data);
  assert.equal(choices.length, 4);
  assert.ok(choices.includes(`cap:${choices[0].split(":")[1]}:${answer}`));

  ctx = await invokeAction(bot, `cap:${choices[0].split(":")[1]}:${answer}`, userId);
  assert.match(ctx.lastMessage.text, /Подпишитесь на каналы/);
  assert.ok(ctx.lastMessage.options.reply_markup.inline_keyboard.flat().some((button) => button.url === "https://t.me/required"));

  bot.subscribed = true;
  ctx = await invokeAction(bot, `check:${giveaway.id}`, userId);
  assert.match(ctx.lastMessage.text, /Проверка пройдена/);

  ctx = await invokeAction(bot, `confirm:${giveaway.id}`, userId);
  assert.equal(ctx.invoices[0].currency, "XTR");
  assert.equal(ctx.invoices[0].provider_token, "");
  assert.deepEqual(ctx.invoices[0].prices, [{ label: "Участие в розыгрыше", amount: 7 }]);
  assert.match(ctx.lastMessage.text, /Счёт отправлен/);

  const payload = ctx.invoices[0].payload;
  const intent = store.getPaymentIntent(payload);
  const preCheckout = {
    preCheckoutQuery: {
      invoice_payload: payload,
      from: { id: userId },
      total_amount: 7,
      currency: "XTR",
    },
    answer: null,
    async answerPreCheckoutQuery(ok, errorMessage) { this.answer = { ok, errorMessage }; },
  };
  await bot.handlers.get("pre_checkout_query")(preCheckout);
  assert.deepEqual(preCheckout.answer, { ok: true, errorMessage: undefined });

  const payment = {
    from: { id: userId, first_name: "Участник", username: "participant" },
    message: {
      successful_payment: {
        invoice_payload: payload,
        telegram_payment_charge_id: "test-charge-id",
        currency: "XTR",
        total_amount: 7,
      },
    },
    async reply(text) { this.confirmation = text; },
  };
  await bot.handlers.get("message")(payment);
  assert.equal(store.hasEntry(giveaway.id, userId), true);
  assert.equal(store.getPaymentIntent(payload).status, "paid");
  assert.match(payment.confirmation, /вы участвуете/i);
  assert.match(bot.messages.at(-1).text, /Звёзды зачислены на баланс бота/);
});

test("adds a free participant after the captcha without opening a web app", async () => {
  const token = "test-only-bot-token";
  const userId = 902;
  const giveaway = createTestGiveaway({ requiredChannels: [], paymentStars: 0 });
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: token });
  let ctx = await invokeAction(bot, `join:${giveaway.id}`, userId);
  const [left, right] = ctx.lastMessage.text.match(/\d+ \+ \d+/)[0].match(/\d+/g).map(Number);
  const challengeId = ctx.lastMessage.options.reply_markup.inline_keyboard[0][0].callback_data.split(":")[1];

  ctx = await invokeAction(bot, `cap:${challengeId}:${left + right}`, userId);
  assert.match(ctx.lastMessage.text, /Участие бесплатное/);
  ctx = await invokeAction(bot, `confirm:${giveaway.id}`, userId);
  assert.equal(store.hasEntry(giveaway.id, userId), true);
  assert.match(ctx.lastMessage.text, /Вы в списке участников/);
});

test("edits photo giveaway captions instead of trying to edit media as text", async () => {
  const giveaway = createTestGiveaway({ requiredChannels: [] });
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });

  const captcha = await invokeAction(bot, `join:${giveaway.id}`, 905, { media: true });
  assert.equal(captcha.editMethod, "caption");
  assert.match(captcha.lastMessage.text, /Проверка на человека/);

  const challengeId = captcha.lastMessage.options.reply_markup.inline_keyboard[0][0]
    .callback_data.split(":")[1];
  const [left, right] = captcha.lastMessage.text.match(/\d+ \+ \d+/)[0]
    .match(/\d+/g).map(Number);
  const verified = await invokeAction(
    bot,
    `cap:${challengeId}:${left + right}`,
    905,
    { media: true },
  );
  assert.equal(verified.editMethod, "caption");
  assert.match(verified.lastMessage.text, /Проверка пройдена/);
});

test("shows winner identities only to admins when a giveaway ends", async () => {
  const giveaway = createTestGiveaway({ requiredChannels: [] });
  store.addEntry(giveaway.id, 910);
  store.addEntry(giveaway.id, 911);
  const bot = new FakeBot();

  await finishGiveaway(bot, new Set([900]), giveaway.id);

  const channelResult = bot.messages.find(({ chatId, text }) => (
    chatId === giveaway.publish_channel && /розыгрыш .* завершён/i.test(text)
  ));
  assert.ok(channelResult);
  assert.match(channelResult.text, /розыгрыш .* завершён/i);
  assert.doesNotMatch(channelResult.text, /tg:\/\/user\?id=|Победитель/);

  const adminResult = bot.messages.find(({ chatId }) => chatId === 900);
  assert.ok(adminResult);
  assert.equal(adminResult.extra.parse_mode, "HTML");
  assert.match(adminResult.text, /Победители:/);
  assert.match(adminResult.text, /tg:\/\/user\?id=(910|911)/);

  const participantNotices = bot.messages.filter(({ chatId }) => chatId === 910 || chatId === 911);
  assert.equal(participantNotices.length, 1);
  assert.match(participantNotices[0].text, /Приём заявок .* завершён, итоги подведены/);
  const winnerId = Number(adminResult.text.match(/tg:\/\/user\?id=(\d+)/)[1]);
  assert.equal(bot.messages.some(({ chatId }) => chatId === winnerId), false);
});

test("offers admins a close-and-notify button for active giveaways", async () => {
  const giveaway = createTestGiveaway({ requiredChannels: [] });
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });

  const ctx = createAdminMessage("/mygiveaways");
  await bot.commands.get("mygiveaways")(ctx);

  const buttons = ctx.replies[0].options.reply_markup.inline_keyboard.flat();
  assert.ok(buttons.some(({ text, callback_data }) => (
    text === "Завершить и уведомить" && callback_data === `finish:${giveaway.id}`
  )));
});

test("replaces an unsubscribed winner with the next subscribed candidate", async () => {
  const giveaway = createTestGiveaway({ winnerCount: 2 });
  store.addEntry(giveaway.id, 916);
  store.addEntry(giveaway.id, 917);
  const bot = new FakeBot();
  bot.telegram.getChatMember = async (_channel, userId) => ({
    status: userId === 917 ? "member" : "left",
  });

  assert.equal(await finishGiveaway(bot, new Set([900]), giveaway.id), true);

  assert.deepEqual(store.getWinners(giveaway.id), [917]);
  assert.match(
    bot.messages.find(({ chatId }) => chatId === 900).text,
    /Исключено неподписанных: 1/,
  );
  assert.ok(bot.messages.some(({ chatId, text }) => (
    chatId === giveaway.publish_channel && /сохраняйте подписку/.test(text)
  )));
});

test("does not finish a giveaway when Telegram subscription recheck fails", async () => {
  const giveaway = createTestGiveaway({ winnerCount: 1 });
  store.addEntry(giveaway.id, 918);
  const bot = new FakeBot();
  bot.telegram.getChatMember = async () => {
    throw new Error("Telegram API unavailable");
  };

  assert.equal(await finishGiveaway(bot, new Set([900]), giveaway.id), false);
  assert.equal(store.getGiveaway(giveaway.id).status, "active");
  assert.equal(store.getGiveaway(giveaway.id).drawing_started_at, null);
  assert.equal(store.getWinners(giveaway.id).length, 0);
  assert.ok(bot.messages.some(({ chatId, text }) => (
    chatId === 900 && /подписки.*пока не подведены/i.test(text)
  )));
});

test("treats an already-updated channel post as a successful rule announcement", async () => {
  const giveaway = createTestGiveaway({ winnerCount: 1 });
  store.addEntry(giveaway.id, 920);
  store.savePublishedMessageIds(giveaway.id, 321);
  const bot = new FakeBot();
  bot.telegram.getChatMember = async () => ({ status: "member" });
  bot.telegram.editMessageText = async () => {
    throw { response: { description: "Bad Request: message is not modified" } };
  };

  assert.equal(await finishGiveaway(bot, new Set([900]), giveaway.id), true);
  assert.ok(store.getGiveaway(giveaway.id).subscription_notice_sent_at > 0);
  assert.deepEqual(store.getWinners(giveaway.id), [920]);
});

test("rejects Stars checkout while winner subscriptions are being checked", async () => {
  const giveaway = createTestGiveaway();
  const payload = store.createPaymentIntent("draw-in-progress-test", giveaway.id, 919);
  assert.equal(store.claimGiveawayDraw(giveaway.id), true);
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });
  const preCheckout = {
    preCheckoutQuery: {
      invoice_payload: payload,
      from: { id: 919 },
      total_amount: 7,
      currency: "XTR",
    },
    answer: null,
    async answerPreCheckoutQuery(ok, errorMessage) { this.answer = { ok, errorMessage }; },
  };

  await bot.handlers.get("pre_checkout_query")(preCheckout);

  assert.equal(preCheckout.answer.ok, false);
  assert.match(preCheckout.answer.errorMessage, /завершён/i);
  store.releaseGiveawayDraw(giveaway.id, "test cleanup");
});

test("shows the live Telegram Stars balance and manual withdrawal details to admins only", async () => {
  const bot = new FakeBot();
  bot.telegram.callApi = async (method, payload) => {
    bot.apiCalls.push({ method, payload });
    return { amount: 123, nanostar_amount: 450000000 };
  };
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });

  const balance = await invokeAction(bot, "admin:balance", 900);
  assert.deepEqual(bot.apiCalls.at(-1), { method: "getMyStarBalance", payload: {} });
  assert.match(balance.messages[0].text, /123\.45 ⭐ Stars/);

  const withdrawal = await invokeAction(bot, "admin:withdraw", 900);
  assert.match(withdrawal.messages[0].text, /вручную в Fragment/);
  assert.equal(
    withdrawal.messages[0].options.reply_markup.inline_keyboard[0][0].url,
    "https://fragment.com/",
  );

  const denied = await invokeAction(bot, "admin:balance", 901);
  assert.match(denied.alerts[0].text, /только администратору/i);
  assert.equal(denied.messages.length, 0);
});

test("creates an admin-only database backup", async () => {
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });

  const admin = await invokeAction(bot, "admin:backup", 900);
  assert.match(admin.messages[0].text, /Резервная копия создана/);
  assert.match(admin.messages[0].text, /до 14 последних копий/);
  assert.equal(fs.existsSync(admin.messages[0].text.match(/Путь: (.+)/)[1]), true);
  fs.unlinkSync(admin.messages[0].text.match(/Путь: (.+)/)[1]);

  const notAdmin = await invokeAction(bot, "admin:backup", 902);
  assert.match(notAdmin.alerts[0].text, /только администратору/i);
  assert.equal(notAdmin.messages.length, 0);
});

test("shows participant history, admin statistics, and separate participant/payment CSV exports", async () => {
  const giveaway = createTestGiveaway({ requiredChannels: [], paymentStars: 9 });
  store.addEntry(giveaway.id, 930, "paid-charge-930", {
    firstName: "Плательщик",
    username: "paid_user",
    verifiedChannels: 0,
  });
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });

  const mine = await invokeAction(bot, "participant:mine", 930);
  assert.ok(mine.messages.some(({ text }) => /Вы участвуете|Победил|Завершён/.test(text)));
  assert.ok(mine.messages.some(({ text }) => /Летний розыгрыш/.test(text)));

  const stats = await invokeAction(bot, `admin:stats:${giveaway.id}`, 900);
  assert.match(stats.messages[0].text, /Участников: 1/);
  assert.match(stats.messages[0].text, /собрано 9 ⭐/);

  const participantCsv = await invokeAction(bot, `admin:export:${giveaway.id}`, 900);
  const participantDocument = bot.messages.at(-1).document;
  assert.equal(participantDocument.filename, `giveaway-${giveaway.id}-participants.csv`);
  assert.match(participantDocument.source.toString("utf8"), /paid_user/);

  await invokeAction(bot, `admin:payments:${giveaway.id}`, 900);
  const paymentDocument = bot.messages.at(-1).document;
  assert.equal(paymentDocument.filename, `giveaway-${giveaway.id}-payments.csv`);
  assert.match(paymentDocument.source.toString("utf8"), /paid-charge-930/);
  assert.equal(participantCsv.messages.length, 0);

  const adminExportAction = bot.actions.find(({ trigger }) => (
    trigger instanceof RegExp && trigger.test(`admin:export:${giveaway.id}`)
  ));
  const groupCtx = createContext(900, `admin:export:${giveaway.id}`);
  groupCtx.chat.type = "group";
  groupCtx.match = adminExportAction.trigger.exec(`admin:export:${giveaway.id}`);
  groupCtx.telegram = bot.telegram;
  await adminExportAction.handler(groupCtx);
  assert.match(groupCtx.alerts[0].text, /только для администратора/i);

  const participantCtx = createContext(930, "participant:mine");
  participantCtx.chat.type = "group";
  participantCtx.telegram = bot.telegram;
  const mineAction = bot.actions.find(({ trigger }) => trigger === "participant:mine");
  await mineAction.handler(participantCtx);
  assert.match(participantCtx.alerts[0].text, /личном чате/i);
  assert.equal(participantCtx.messages.length, 0);
});

test("supports admin editing with a refreshed channel post and records a change event", async () => {
  const giveaway = createTestGiveaway({ requiredChannels: [] });
  store.savePublishedMessageIds(giveaway.id, 5678);
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });

  await invokeAction(bot, `admin:field:${giveaway.id}:title`, 900);
  await bot.handlers.get("text")(createAdminMessage("Новое название"));

  assert.equal(store.getGiveaway(giveaway.id).title, "Новое название");
  assert.ok(bot.apiCalls.some(({ method }) => method === "editMessageText"));
  assert.ok(store.getGiveawayEvents(giveaway.id).some((event) => (
    event.event_type === "edited" && event.actor_id === 900
  )));
});

test("cancels without automatic refunds and lets an admin explicitly refund a paid entry", async () => {
  const giveaway = createTestGiveaway({ requiredChannels: [] });
  store.addEntry(giveaway.id, 940, "refund-charge-940", {
    firstName: "Оплативший",
    username: "payer",
  });
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });

  const cancellation = await invokeAction(bot, `admin:cancel:${giveaway.id}`, 900);
  assert.equal(store.getGiveaway(giveaway.id).status, "cancelled");
  assert.equal(bot.apiCalls.some(({ method }) => method === "refundStarPayment"), false);
  assert.match(cancellation.messages[0].text, /Автоматического возврата нет/);

  const refund = await invokeAction(bot, `admin:refund:${giveaway.id}:940`, 900);
  assert.equal(bot.apiCalls.at(-1).method, "refundStarPayment");
  assert.equal(store.getGiveawayEntries(giveaway.id)[0].refunded_at > 0, true);
  assert.match(refund.messages[0].text, /возврат .* выполнен/i);
});

test("sends the ending reminder only to registered participants and only once", async () => {
  const giveaway = createTestGiveaway({
    requiredChannels: [],
    endsAt: Date.now() + 30 * 60 * 1000,
    reminderWindowMs: 10 * 60 * 1000,
    targetParticipants: 100,
  });
  store.addEntry(giveaway.id, 950);
  const bot = new FakeBot();
  const originalSetInterval = globalThis.setInterval;
  let scheduledTask;
  globalThis.setInterval = (task) => {
    scheduledTask = task;
    return { unref() {} };
  };
  try {
    startGiveawayScheduler(bot, new Set([900]));
  } finally {
    globalThis.setInterval = originalSetInterval;
  }

  await scheduledTask();
  assert.equal(bot.messages.filter(({ chatId }) => chatId === 950).length, 0);
  store.updateGiveaway(giveaway.id, { ends_at: Date.now() + 9 * 60 * 1000 }, 900);
  await scheduledTask();
  assert.equal(bot.messages.filter(({ chatId }) => chatId === 950).length, 1);
  assert.equal(bot.messages.filter(({ chatId }) => chatId === 900).length, 1);
  assert.match(bot.messages.find(({ chatId }) => chatId === 900).text, /Напоминание о скором завершении/);
  await scheduledTask();
  assert.equal(bot.messages.filter(({ chatId }) => chatId === 950).length, 1);
  assert.equal(bot.messages.filter(({ chatId }) => chatId === 900).length, 1);
});

test("refunds a Stars payment if its giveaway ended before payment confirmation", async () => {
  const giveaway = createTestGiveaway();
  const userId = 903;
  const payload = store.createPaymentIntent("late-payment-test", giveaway.id, userId);
  store.claimGiveawayDraw(giveaway.id);
  store.finalizeGiveaway(giveaway.id, [], 900);
  const bot = new FakeBot();
  const adminIds = new Set([900]);
  registerAdminHandlers(bot, { adminIds, botToken: "test-only-bot-token" });
  const payment = {
    from: { id: userId },
    telegram: bot.telegram,
    message: {
      successful_payment: {
        invoice_payload: payload,
        telegram_payment_charge_id: "late-charge-id",
        currency: "XTR",
        total_amount: 7,
      },
    },
    async reply(text) { this.confirmation = text; },
  };

  await bot.handlers.get("message")(payment);

  assert.deepEqual(bot.apiCalls, [{
    method: "refundStarPayment",
    payload: { user_id: userId, telegram_payment_charge_id: "late-charge-id" },
  }]);
  assert.match(payment.confirmation, /Stars возвращены/);
  assert.equal(store.getPaymentIntent(payload).status, "paid");
  assert.equal(store.hasEntry(giveaway.id, userId), false);
  assert.equal(store.getGiveawayStats(giveaway.id).paid_count, 1);
  assert.equal(store.getGiveawayStats(giveaway.id).stars_refunded, 7);
});

test("does not automatically refund an invoice paid after admin cancellation", async () => {
  const giveaway = createTestGiveaway();
  const userId = 960;
  const payload = store.createPaymentIntent("cancelled-payment-test", giveaway.id, userId);
  store.cancelGiveaway(giveaway.id, 900);
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });
  const payment = {
    from: { id: userId, first_name: "Late payer" },
    message: {
      successful_payment: {
        invoice_payload: payload,
        telegram_payment_charge_id: "cancelled-charge-id",
        currency: "XTR",
        total_amount: 7,
      },
    },
    async reply(text) { this.confirmation = text; },
  };

  await bot.handlers.get("message")(payment);

  assert.equal(bot.apiCalls.some(({ method }) => method === "refundStarPayment"), false);
  assert.match(payment.confirmation, /автоматического возврата нет/i);
  assert.equal(store.getGiveawayEntries(giveaway.id)[0].payment_charge_id, "cancelled-charge-id");
  assert.equal(store.getGiveawayStats(giveaway.id).stars_collected, 7);
  assert.ok(bot.messages.some(({ chatId, extra }) => (
    chatId === 900 && extra?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data
      === `admin:refund:${giveaway.id}:${userId}`
  )));
});

test("lets admins attach a photo or GIF and publishes it with the giveaway card", async () => {
  const bot = new FakeBot();
  registerAdminHandlers(bot, { adminIds: new Set([900]), botToken: "test-only-bot-token" });
  const textHandler = bot.handlers.get("text");
  const mediaHandler = bot.handlers.get("photo|animation");
  const giveaways = [];

  for (const [type, media] of [
    ["photo", { photo: [{ file_id: "photo-file-id" }] }],
    ["animation", { animation: { file_id: "animation-file-id" } }],
  ]) {
    const activeGiveawayCount = store.getActiveGiveaways().length;
    const startCtx = createAdminMessage("/newgiveaway");
    await bot.commands.get("newgiveaway")(startCtx);
    assert.match(startCtx.lastReply.text, /Шаг 1 из 9/);
    for (const text of ["Розыгрыш с медиа", "Подарок", "Описание"]) {
      await textHandler(createAdminMessage(text));
    }
    await mediaHandler({
      ...createAdminMessage(undefined),
      message: media,
    });
    for (const text of ["0", "@makeiew", "-"]) {
      await textHandler(createAdminMessage(text));
    }
    const winnerCountCtx = createAdminMessage("1");
    await textHandler(winnerCountCtx);
    assert.match(winnerCountCtx.lastReply.text, /Когда подвести итоги\?/);
    assert.match(winnerCountCtx.lastReply.text, /24 100/);
    const finishCtx = createAdminMessage(type === "photo" ? "0.5 -" : "1 -");
    await textHandler(finishCtx);
    const previewId = finishCtx.lastReply.options.reply_markup.inline_keyboard[0][0].callback_data.split(":")[1];
    const previewAction = finishCtx.lastReply.options.reply_markup.inline_keyboard[0][0].callback_data;
    assert.ok(finishCtx.replies.some(({ text }) => /Проверьте объявление ниже/.test(text)));
    assert.equal(finishCtx.previewMedia?.type, type);
    assert.equal(store.getActiveGiveaways().length, activeGiveawayCount);

    await invokeAction(bot, previewAction, 900);
    assert.equal(store.getActiveGiveaways().length, activeGiveawayCount + 1);
    const giveaway = store.getRecentGiveaways(1)[0];
    giveaways.push(giveaway);
    assert.equal(
      giveaway.reminder_window_ms,
      type === "photo" ? 10 * 60 * 1000 : 60 * 60 * 1000,
    );
    assert.equal(giveaway.media_type, type);
    assert.equal(
      giveaway.media_file_id,
      type === "photo" ? "photo-file-id" : "animation-file-id",
    );
    assert.match(previewId, /^[a-f0-9-]{36}$/);
  }

  const mediaPosts = bot.messages.filter(({ type }) => type === "photo" || type === "animation");
  assert.equal(mediaPosts.length, 2);
  assert.equal(mediaPosts[0].type, "photo");
  assert.equal(mediaPosts[0].fileId, "photo-file-id");
  assert.match(mediaPosts[0].extra.caption, /ПОДАРКИ ОТ MAKEIEW/);
  assert.equal(mediaPosts[1].type, "animation");
  assert.equal(mediaPosts[1].fileId, "animation-file-id");
  assert.ok(mediaPosts[1].extra.reply_markup.inline_keyboard[0][0].url.includes(`join_${giveaways[1].id}`));

  const participant = createContext(904, undefined);
  participant.startPayload = `join_${giveaways[0].id}`;
  await bot.startHandler(participant);
  assert.equal(participant.lastMessage.type, "photo");
  assert.equal(participant.lastMessage.fileId, "photo-file-id");
  assert.match(participant.lastMessage.options.caption, /Розыгрыш с медиа/);
});
