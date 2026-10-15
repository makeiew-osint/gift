import test from "node:test";
import assert from "node:assert/strict";
import { decorateTelegramEmoji } from "../src/premium-emoji.js";

test("adds Premium Emoji entities with UTF-16 offsets to plain messages", async () => {
  const calls = [];
  const telegram = {
    async sendMessage(...args) { calls.push(args); },
  };
  decorateTelegramEmoji(telegram);
  await telegram.sendMessage(1, "Привет 🎁, розыгрыш ⭐️", { disable_notification: true });

  const [, text, options] = calls[0];
  assert.equal(text, "Привет 🎁, розыгрыш ⭐️");
  assert.deepEqual(options.entities, [
    { type: "custom_emoji", offset: 7, length: 2, custom_emoji_id: "5850323366476519158" },
    { type: "custom_emoji", offset: 20, length: 2, custom_emoji_id: "6037514847443227774" },
  ]);
  assert.equal(options.disable_notification, true);
});

test("uses Telegram HTML custom emoji tags and decorates captions and edits", async () => {
  const calls = [];
  const telegram = {
    async sendMessage(...args) { calls.push(["message", ...args]); },
    async editMessageText(...args) { calls.push(["edit", ...args]); },
    async editMessageCaption(...args) { calls.push(["editCaption", ...args]); },
    async sendAnimation(...args) { calls.push(["animation", ...args]); },
  };
  decorateTelegramEmoji(telegram);
  await telegram.sendMessage(1, "<b>Приз ✨</b>", { parse_mode: "HTML" });
  await telegram.editMessageText(1, 2, undefined, "Розыгрыш 🌟", { reply_markup: {} });
  await telegram.editMessageCaption(1, 2, undefined, "Розыгрыш 🎁", { parse_mode: "HTML" });
  await telegram.sendAnimation(1, "animation-id", { caption: "Победитель 🏆", parse_mode: "HTML" });

  assert.match(calls[0][2], /<tg-emoji emoji-id="5850389345764122229">✨<\/tg-emoji>/);
  assert.deepEqual(calls[1].slice(1, 5), [
    1,
    2,
    undefined,
    'Розыгрыш 🌟',
  ]);
  assert.deepEqual(calls[1][5].entities, [
    { type: "custom_emoji", offset: 9, length: 2, custom_emoji_id: "5897920748101571572" },
  ]);
  assert.match(calls[2][4], /<tg-emoji emoji-id="5850323366476519158">🎁<\/tg-emoji>/);
  assert.match(calls[3][3].caption, /<tg-emoji emoji-id="5280769763398671636">🏆<\/tg-emoji>/);
});
