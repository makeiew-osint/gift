import "dotenv/config";
import { Telegraf } from "telegraf";
import { finishGiveaway, registerAdminHandlers, startGiveawayScheduler } from "./admin.js";
import { closeDatabase } from "./store.js";
import { createDashboardServer } from "./dashboard.js";

const botToken = process.env.BOT_TOKEN;
const adminIds = new Set(
  (process.env.ADMIN_IDS || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isSafeInteger(id) && id > 0),
);

if (!botToken) throw new Error("BOT_TOKEN is required. Copy .env.example to .env and configure it.");
if (!adminIds.size) throw new Error("ADMIN_IDS must contain at least one numeric Telegram user ID.");

const bot = new Telegraf(botToken);
registerAdminHandlers(bot, { adminIds, botToken });
const scheduler = startGiveawayScheduler(bot, adminIds);
const dashboard = createDashboardServer({ bot, adminIds });

bot.catch((error, ctx) => {
  console.error(`Telegram update failed${ctx?.update?.update_id ? ` (${ctx.update.update_id})` : ""}:`, error);
});

await bot.launch({
  allowedUpdates: ["message", "callback_query", "pre_checkout_query", "message_reaction"],
}, () => {
  console.log(`Connected to Telegram as @${bot.botInfo.username} for ${adminIds.size} administrator(s).`);
});
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
await new Promise((resolve, reject) => {
  dashboard.once("error", reject);
  dashboard.listen(port, host, resolve);
});
console.log(`Admin dashboard listening on ${host}:${port}.`);

async function stop(signal) {
  console.log(`Received ${signal}, stopping bot…`);
  clearInterval(scheduler);
  bot.stop(signal);
  await new Promise((resolve) => dashboard.close(resolve));
  await closeDatabase();
  process.exit(0);
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
