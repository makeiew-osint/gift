import {
  cancelGiveaway,
  createPaymentIntent,
  createGiveaway,
  finalizeGiveaway,
  getActiveGiveaways,
  getEntryCount,
  getGiveaway,
  getPaymentIntent,
  getRecentGiveaways,
  getUserGiveaways,
  getUserGiveawayCount,
  getGiveawayStats,
  getGiveawayEntries,
  getUnrefundedPayments,
  getGiveawayEvents,
  getGiveawayPaymentEvents,
  getShuffledGiveawayEntries,
  getActiveGiveawaysNeedingSubscriptionNotice,
  claimGiveawayDraw,
  releaseGiveawayDraw,
  markSubscriptionNoticeSent,
  claimSubscriptionNotice,
  releaseSubscriptionNotice,
  updateGiveaway,
  claimRefund,
  markRefundResult,
  markReminderSent,
  markTargetNotified,
  recordGiveawayEvent,
  savePublishedMessageIds,
  createDatabaseBackup,
  addEntry,
  getChallenge,
  hasEntry,
  hasValidVerification,
  markPaymentIntentPaid,
  recordChallengeAttempt,
  saveChallenge,
  saveVerification,
  isUserBlocked,
  recordEntryChannelCheck,
  trackReferralVisit,
  getReferralReferrer,
  recordChannelReaction,
  hasGiveawayReaction,
  setGiveawayChannelChatId,
} from "./store.js";
import { randomInt, randomUUID } from "node:crypto";
import { createCaptchaQuestion, hashCaptchaAnswer, matchesCaptchaAnswer } from "./telegram.js";
import { decorateTelegramEmoji } from "./premium-emoji.js";

const wizardByUser = new Map();
const pendingPreviews = new Map();
const wizardSteps = [
  "title",
  "prize",
  "description",
  "media",
  "stars",
  "publishChannel",
  "requiredChannels",
  "requiredReaction",
  "winnerCount",
  "finishRule",
];

function buttonText(value) {
  return value.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").trim();
}

function isAdmin(ctx, adminIds) {
  return isPrivate(ctx) && adminIds.has(ctx.from?.id);
}

function isPrivate(ctx) {
  return ctx.chat?.type === "private";
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[character]);
}

function editCurrentMessage(ctx, text, options) {
  const message = ctx.callbackQuery?.message;
  const hasMediaCaption = Boolean(
    message?.photo?.length || message?.animation || message?.video,
  );
  return hasMediaCaption
    ? ctx.editMessageCaption(text, options)
    : ctx.editMessageText(text, options);
}

function giveawayText(giveaway) {
  const remainingMs = giveaway.ends_at ? Math.max(0, giveaway.ends_at - Date.now()) : null;
  const remainingHours = remainingMs === null ? null : Math.floor(remainingMs / 3_600_000);
  const remainingMinutes = remainingMs === null ? null : Math.floor((remainingMs % 3_600_000) / 60_000);
  const remainingTime = remainingMs === null
    ? null
    : remainingHours > 0 ? `${remainingHours} ч ${remainingMinutes} мин` : `${remainingMinutes} мин`;
  const participantCount = getEntryCount(giveaway.id);
  return [
    "🎁 ПОДАРКИ ОТ MAKEIEW",
    "",
    `🌟 ${giveaway.title}`,
    `🏆 Приз — ${giveaway.prize}`,
    giveaway.description ? `\n${giveaway.description}` : "",
    "",
    `Победителей: ${giveaway.winner_count}.`,
    `⭐ Цена: ${giveaway.payment_stars ? `${giveaway.payment_stars} Stars` : "участие бесплатное"}`,
    giveaway.required_channels.length
      ? `Подписка обязательна: ${giveaway.required_channels.join(", ")}`
      : "Обязательная подписка на каналы не требуется",
    giveaway.require_reaction ? "Реакция на объявление обязательна" : "",
    `До конца: ${remainingTime ?? "до набора участников"}`,
    giveaway.target_participants
      ? `Участников: ${participantCount} из ${giveaway.target_participants}`
      : `Участников: ${participantCount}`,
  ].filter(Boolean).join("\n");
}

function giveawayPost(giveaway) {
  const requiredChannels = giveaway.required_channels ?? giveaway.requiredChannels ?? [];
  return [
    "🎁 <b>ПОДАРКИ ОТ MAKEIEW</b>",
    "",
    `✨ <b>${escapeHtml(giveaway.title)}</b>`,
    `🏆 <b>Приз:</b> ${escapeHtml(giveaway.prize)}`,
    giveaway.description ? `\n${escapeHtml(giveaway.description)}` : "",
    "",
    `Победителей: <b>${giveaway.winner_count}</b>`,
    giveaway.payment_stars ? `⭐ Участие: <b>${giveaway.payment_stars} Stars</b>` : "<b>Участие бесплатное</b>",
    giveaway.target_participants ? `🎯 Розыгрыш завершится, когда наберётся ${giveaway.target_participants} участников` : "",
    giveaway.ends_at
      ? `Итоги ${new Date(giveaway.ends_at).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Moscow" })} (МСК)`
      : "",
    "",
    requiredChannels.length
      ? "<i>Подписка на обязательные каналы должна сохраняться до подведения итогов. Перед выбором победителей бот проверит её ещё раз.</i>"
      : "",
    giveaway.require_reaction
      ? "<i>Для участия поставьте любую реакцию на эту публикацию от своего аккаунта. Бот проверит её перед регистрацией и перед выбором победителей.</i>"
      : "",
    "",
    "<i>Нажмите кнопку ниже, чтобы принять участие</i>",
  ].filter(Boolean).join("\n");
}

async function ensureBotAdmin(bot, channel) {
  const me = await bot.telegram.getMe();
  const member = await bot.telegram.getChatMember(channel, me.id);
  if (!["creator", "administrator"].includes(member.status)) {
    throw new Error(`Добавьте бота администратором в ${channel}, затем отправьте /newgiveaway ещё раз.`);
  }
}

async function sendGiveawayPreview(ctx, wizard) {
  for (const [id, preview] of pendingPreviews) {
    if (Date.now() - preview.createdAt > 30 * 60 * 1000) pendingPreviews.delete(id);
  }
  const previewId = randomUUID();
  const draft = {
    ...wizard,
    ends_at: wizard.finishRule.endsAt,
    target_participants: wizard.finishRule.targetParticipants,
    winner_count: wizard.winnerCount,
    payment_stars: wizard.paymentStars,
    media_type: wizard.mediaType,
    media_file_id: wizard.mediaFileId,
    require_reaction: Boolean(wizard.requireReaction),
  };
  pendingPreviews.set(previewId, { userId: ctx.from.id, draft, createdAt: Date.now() });
  await ctx.reply("Проверьте объявление ниже. Оно появится в канале только после вашего подтверждения.");

  const post = giveawayPost(draft);
  if (draft.mediaFileId) {
    const sendMedia = draft.mediaType === "animation"
      ? ctx.replyWithAnimation.bind(ctx)
      : ctx.replyWithPhoto.bind(ctx);
    if (post.length <= 1024) {
      await sendMedia(draft.mediaFileId, { caption: post, parse_mode: "HTML" });
    } else {
      await sendMedia(draft.mediaFileId);
      await ctx.reply(post, { parse_mode: "HTML" });
    }
  } else {
    await ctx.reply(post, { parse_mode: "HTML" });
  }
  return ctx.reply("Если всё верно, опубликуйте розыгрыш. Если нужно начать заново, отмените создание.", {
    reply_markup: {
      inline_keyboard: [[
        { text: "Опубликовать розыгрыш", callback_data: `publish:${previewId}` },
        { text: "Отменить", callback_data: `discard:${previewId}` },
      ]],
    },
  });
}

async function publishConfirmedGiveaway(ctx, bot, preview, adminIds) {
  const giveaway = createGiveaway({
    ...preview.draft,
    ...preview.draft.finishRule,
    createdBy: preview.draft.createdBy,
  });
  try {
    await publishGiveaway(bot, giveaway);
  } catch (error) {
    cancelGiveaway(giveaway.id);
    throw new Error(
      `Не удалось опубликовать розыгрыш в ${giveaway.publish_channel}. Проверьте права бота в канале и попробуйте создать розыгрыш заново. ${error.description || error.message}`,
    );
  }
  await ctx.editMessageText(
    `Розыгрыш №${giveaway.id} опубликован в ${giveaway.publish_channel}.\n${giveaway.payment_stars ? `Участие стоит ${giveaway.payment_stars} Stars. Поступление каждой оплаты подтвержу отдельным сообщением.` : "Участие бесплатное."}`,
  );
  await sendAdminNotice(
    bot,
    adminIds,
    `Опубликован розыгрыш №${giveaway.id}: «${giveaway.title}».\nКанал: ${giveaway.publish_channel}`,
  );
}

export async function publishGiveaway(bot, giveaway) {
  decorateTelegramEmoji(bot.telegram);
  const me = await bot.telegram.getMe();
  const entryUrl = `https://t.me/${me.username}?start=join_${giveaway.id}`;
  const options = {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [[{ text: "Участвовать", url: entryUrl }]],
    },
  };
  if (!giveaway.media_file_id) {
    const message = await bot.telegram.sendMessage(giveaway.publish_channel, giveawayPost(giveaway), options);
    if (Number.isInteger(message?.message_id)) {
      savePublishedMessageIds(giveaway.id, message.message_id, null, message.chat?.id ?? null);
    }
    return message;
  }
  const sendMedia = giveaway.media_type === "animation"
    ? bot.telegram.sendAnimation.bind(bot.telegram)
    : bot.telegram.sendPhoto.bind(bot.telegram);
  const post = giveawayPost(giveaway);
  if (post.length <= 1024) {
    const message = await sendMedia(giveaway.publish_channel, giveaway.media_file_id, {
      ...options,
      caption: post,
    });
    if (Number.isInteger(message?.message_id)) {
      savePublishedMessageIds(giveaway.id, message.message_id, message.message_id, message.chat?.id ?? null);
    }
    return message;
  }
  const mediaMessage = await sendMedia(giveaway.publish_channel, giveaway.media_file_id);
  const message = await bot.telegram.sendMessage(giveaway.publish_channel, post, options);
  if (Number.isInteger(message?.message_id)) {
    savePublishedMessageIds(
      giveaway.id,
      message.message_id,
      Number.isInteger(mediaMessage?.message_id) ? mediaMessage.message_id : null,
      message.chat?.id ?? null,
    );
  }
  return message;
}

async function sendAdminNotice(bot, adminIds, text, options) {
  const results = await Promise.allSettled(
    [...adminIds].map((adminId) => bot.telegram.sendMessage(adminId, text, options)),
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Could not notify administrator ${[...adminIds][index]}:`, result.reason);
    }
  });
}

async function participantStillSubscribed(bot, giveaway, userId) {
  let allSubscribed = true;
  for (const channel of giveaway.required_channels) {
    const member = await bot.telegram.getChatMember(channel, userId);
    const subscribed = ["creator", "administrator", "member"].includes(member.status)
      || (member.status === "restricted" && member.is_member);
    recordEntryChannelCheck(giveaway.id, userId, channel, "draw", subscribed);
    if (!subscribed) allSubscribed = false;
  }
  return allSubscribed && (!giveaway.require_reaction || hasGiveawayReaction(giveaway.id, userId));
}

export async function finishGiveaway(bot, adminIds, giveawayId, actorId = null) {
  const beforeAnnouncement = getGiveaway(giveawayId);
  if (!beforeAnnouncement) return false;
  if (!beforeAnnouncement.subscription_notice_sent_at) {
    await announceSubscriptionRecheckRules(bot, adminIds);
  }
  const afterAnnouncement = getGiveaway(giveawayId);
  if (!afterAnnouncement?.subscription_notice_sent_at || afterAnnouncement.subscription_notice_sent_at < 0) {
    return false;
  }
  if (!claimGiveawayDraw(giveawayId)) return false;
  let giveaway;
  try {
    const current = getGiveaway(giveawayId);
    if (!current) {
      releaseGiveawayDraw(giveawayId, "Розыгрыш не найден.");
      return false;
    }
    const candidates = getShuffledGiveawayEntries(giveawayId);
    const winners = [];
    let excludedCount = 0;
    for (const candidate of candidates) {
      if (!await participantStillSubscribed(bot, current, candidate.user_id)) {
        excludedCount += 1;
        continue;
      }
      winners.push(candidate.user_id);
      if (winners.length >= current.winner_count) break;
    }
    giveaway = finalizeGiveaway(giveawayId, winners, actorId, excludedCount);
    if (!giveaway) {
      releaseGiveawayDraw(giveawayId, "Не удалось зафиксировать результаты.");
      return false;
    }
  } catch (error) {
    releaseGiveawayDraw(giveawayId, error.description || error.message);
    console.error(`Could not verify subscriptions for giveaway ${giveawayId}:`, error);
    await sendAdminNotice(
      bot,
      adminIds,
      `Не удалось повторно проверить подписки для розыгрыша №${giveawayId}. Итоги пока не подведены, бот попробует ещё раз. Ошибка: ${error.description || error.message}`,
    );
    return false;
  }

  const winnerNames = giveaway.winners.length
    ? giveaway.winners.map((userId, index) => `${index + 1}. <a href="tg://user?id=${userId}">Победитель</a>`).join("\n")
    : "Участников нет — победитель не выбран.";
  try {
    await bot.telegram.sendMessage(
      giveaway.publish_channel,
      `🏆 Розыгрыш «${giveaway.title}» завершён.\nУчастников: ${giveaway.participantCount}\nПобедителей: ${giveaway.winners.length}\nУсловия подписки и реакции победителей проверены повторно.\nИтоги отправлены организатору.`,
    );
  } catch (error) {
    console.error(`Could not publish results for giveaway ${giveawayId}:`, error);
    await sendAdminNotice(bot, adminIds, `Розыгрыш «${giveaway.title}» завершён, но итоги не удалось опубликовать в ${giveaway.publish_channel}. Проверьте права бота.`);
  }

  const winnersSet = new Set(giveaway.winners);
  const participants = getGiveawayEntries(giveawayId);
  const nonWinnerParticipants = participants.filter(({ user_id: userId }) => !winnersSet.has(userId));
  const participantNotifications = await Promise.allSettled(
    nonWinnerParticipants.map(({ user_id: userId }) => bot.telegram.sendMessage(
      userId,
      `Приём заявок в розыгрыш «${giveaway.title}» завершён, итоги подведены. Спасибо за участие!`,
    )),
  );
  participantNotifications.forEach((result, index) => {
    if (result.status === "rejected") {
      const participant = nonWinnerParticipants[index];
      console.error(`Could not notify participant ${participant.user_id} about giveaway ${giveawayId}:`, result.reason);
    }
  });
  const failedParticipantNotifications = participantNotifications
    .filter((result) => result.status === "rejected").length;
  const deliveredParticipantNotifications = participantNotifications.length - failedParticipantNotifications;
  await sendAdminNotice(
    bot,
    adminIds,
    `🏆 <b>Итоги розыгрыша «${escapeHtml(giveaway.title)}»</b>\nПриз: ${escapeHtml(giveaway.prize)}\nУчастников: ${giveaway.participantCount}\nИсключено за невыполнение условий: ${giveaway.excludedCount}\n\n<b>Победители:</b>\n${winnerNames}\n\n<b>Уведомления участникам (победителям не отправляли):</b>\nДоставлено: ${deliveredParticipantNotifications} из ${participantNotifications.length}\nНе доставлено: ${failedParticipantNotifications}`,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
  if (failedParticipantNotifications) {
    const failedLines = participantNotifications.flatMap((result, index) => {
      if (result.status !== "rejected") return [];
      const participant = nonWinnerParticipants[index];
      const name = [participant.first_name, participant.username ? `@${participant.username}` : null]
        .filter(Boolean)
        .join(" ");
      return [`• ${name || "Участник"} — Telegram ID ${participant.user_id}`];
    });
    let reportChunk = `Не удалось доставить уведомление участникам розыгрыша №${giveaway.id}:\n`;
    const maxChunkLength = 3500;
    for (const line of failedLines) {
      if (reportChunk.length + line.length + 1 > maxChunkLength) {
        await sendAdminNotice(bot, adminIds, reportChunk.trimEnd());
        reportChunk = `Не удалось доставить уведомление участникам розыгрыша №${giveaway.id} (продолжение):\n`;
      }
      reportChunk += `${line}\n`;
    }
    if (reportChunk.trimEnd() !== `Не удалось доставить уведомление участникам розыгрыша №${giveaway.id}:`) {
      await sendAdminNotice(bot, adminIds, reportChunk.trimEnd());
    }
  }
  return true;
}

function validateChannels(input, allowEmpty) {
  const channels = input === "-" ? [] : input.split(/[,\s]+/).filter(Boolean);
  if (!allowEmpty && channels.length === 0) {
    throw new Error("Укажите канал для публикации в формате @username.");
  }
  if (channels.some((channel) => !/^@[A-Za-z0-9_]{5,32}$/.test(channel))) {
    throw new Error("Каналы указываются публичными username, например @makeiew.");
  }
  if (channels.length > 10) throw new Error("Можно указать не больше 10 каналов.");
  return [...new Set(channels)];
}

function parseFinishRule(input) {
  const [hoursText, participantsText, extra] = input.trim().split(/\s+/);
  const formatHelp = "Введите часы и участников через пробел. Например: 24 100, 24 - или - 100.";
  if (extra || !hoursText || !participantsText) throw new Error(formatHelp);
  const hours = hoursText === "-" ? null : Number(hoursText);
  const durationMs = hours === null ? null : Math.round(hours * 60) * 60_000;
  const participants = participantsText === "-" ? null : Number(participantsText);
  if (
    (hours !== null && (!Number.isFinite(hours) || hours <= 0 || hours > 8760 || durationMs < 60_000))
    || (participants !== null && (!Number.isInteger(participants) || participants < 1 || participants > 1000000))
    || (hours === null && participants === null)
  ) {
    throw new Error(`${formatHelp}\nЧасы: от 1 минуты до 8760 (можно дробно). Участники: от 1 до 1 000 000.`);
  }
  return {
    endsAt: durationMs === null ? null : Date.now() + durationMs,
    reminderWindowMs: durationMs === null
      ? null
      : durationMs < 60 * 60 * 1000 ? 10 * 60 * 1000 : 60 * 60 * 1000,
    targetParticipants: participants,
  };
}

function askNext(ctx, wizard) {
  const prompts = {
    title: "Как назвать розыгрыш? Напишите короткое название, до 80 символов.",
    prize: "Что получит победитель? Опишите приз, до 120 символов.",
    description: "Напишите текст объявления. Если описание не нужно, отправьте дефис: -",
    media: "Пришлите фото или GIF для объявления. Если картинка не нужна, отправьте дефис: -",
    stars: "Сколько стоит участие? Отправьте 0 для бесплатного розыгрыша или число Stars, например: 5.",
    publishChannel: "Куда опубликовать объявление? Отправьте публичный канал в формате @channelname. Бот должен быть администратором канала.",
    requiredChannels: "На какие каналы участник должен подписаться? Отправьте названия через пробел или запятую, например: @channel1 @channel2. Если подписка не нужна, отправьте дефис: -",
    requiredReaction: "Нужна ли реакция на публикации розыгрыша? Отправьте «да» или «нет». Если да, подойдёт любая реакция; бот проверит её при участии и перед выбором победителя.",
    winnerCount: "Сколько победителей выбрать? Отправьте число от 1 до 100.",
    finishRule: "Когда подвести итоги? Отправьте часы и количество участников через пробел.\n\n24 100 — завершить через 24 часа ИЛИ при 100 участниках.\n0.5 - — завершить через 30 минут.\n- 100 — завершить, когда наберётся 100 участников.\n\nЧасы: от 1 минуты до 8760 (можно дробно, например 0.5 = 30 минут). Участники: от 1 до 1 000 000.",
  };
  const step = wizardSteps.indexOf(wizard.step) + 1;
  return ctx.reply(`Шаг ${step} из ${wizardSteps.length}\n\n${prompts[wizard.step]}\n\nОтменить создание: /cancel`);
}

async function beginWizard(ctx, adminIds) {
  if (!isAdmin(ctx, adminIds)) return ctx.reply("Эта команда доступна только администратору.");
  if (!isPrivate(ctx)) return ctx.reply("Создание розыгрыша доступно в личном чате с ботом.");
  wizardByUser.set(ctx.from.id, { step: "title", createdBy: ctx.from.id });
  return askNext(ctx, wizardByUser.get(ctx.from.id));
}

async function handleWizardMessage(ctx, adminIds, bot) {
  if (!isAdmin(ctx, adminIds) || !isPrivate(ctx)) return;
  const wizard = wizardByUser.get(ctx.from.id);
  if (!wizard) return;
  if (wizard.step === "editValue") {
    const text = ctx.message.text?.trim();
    if (!text) return ctx.reply("Отправьте текстовое значение.");
    const current = getGiveaway(wizard.giveawayId);
    if (!current || current.status !== "active") {
      wizardByUser.delete(ctx.from.id);
      return ctx.reply("Розыгрыш уже не активен.");
    }
    try {
      let patch;
      let reactionChatId = null;
      switch (wizard.editField) {
        case "title":
          if (text.length > 80) throw new Error("Название должно быть не длиннее 80 символов.");
          patch = { title: text };
          break;
        case "prize":
          if (text.length > 120) throw new Error("Описание приза должно быть не длиннее 120 символов.");
          patch = { prize: text };
          break;
        case "description":
          if (text.length > 600) throw new Error("Описание должно быть не длиннее 600 символов.");
          patch = { description: text === "-" ? "" : text };
          break;
        case "channels":
          patch = { required_channels: validateChannels(text, true) };
          await Promise.all(patch.required_channels.map((channel) => ensureBotAdmin(bot, channel)));
          break;
        case "reaction": {
          const answer = text.toLocaleLowerCase("ru-RU");
          if (!["да", "нет"].includes(answer)) throw new Error("Отправьте «да» или «нет».");
          patch = { require_reaction: answer === "да" };
          if (patch.require_reaction) {
            await ensureBotAdmin(bot, current.publish_channel);
            const channel = await bot.telegram.getChat(current.publish_channel);
            if (!Number.isSafeInteger(channel.id)) {
              throw new Error("Telegram не вернул ID канала. Не удалось включить проверку реакции.");
            }
            reactionChatId = channel.id;
          }
          break;
        }
        case "hours": {
          const hours = Number(text);
          const durationMs = Math.round(hours * 60) * 60_000;
          if (!Number.isFinite(hours) || hours <= 0 || hours > 8760 || durationMs < 60_000) {
            throw new Error("Введите длительность от 1 минуты до 8760 часов.");
          }
          patch = {
            ends_at: Date.now() + durationMs,
            reminder_window_ms: durationMs < 60 * 60 * 1000 ? 10 * 60 * 1000 : 60 * 60 * 1000,
          };
          break;
        }
        case "target": {
          const target = text === "-" ? null : Number(text);
          if (target !== null && (!Number.isInteger(target) || target < 1 || target > 1_000_000)) {
            throw new Error("Введите лимит от 1 до 1 000 000 или -.");
          }
          patch = { target_participants: target };
          break;
        }
        case "winners": {
          const count = Number(text);
          if (!Number.isInteger(count) || count < 1 || count > 100) {
            throw new Error("Введите целое число от 1 до 100.");
          }
          patch = { winner_count: count };
          break;
        }
        default:
          throw new Error("Неизвестное поле для изменения.");
      }
      const updatedGiveaway = { ...current, ...patch };
      if (
        updatedGiveaway.media_file_id
        && updatedGiveaway.channel_media_message_id === updatedGiveaway.channel_message_id
        && giveawayPost(updatedGiveaway).length > 1024
      ) {
        throw new Error("Объявление слишком длинное для подписи к этому медиа. Сократите описание.");
      }
      if (current.channel_message_id) {
        await refreshPublishedGiveaway(bot, updatedGiveaway);
      } else {
        await publishGiveaway(bot, updatedGiveaway);
      }
      if (!updateGiveaway(current.id, patch, ctx.from.id)) {
        throw new Error("Не удалось сохранить изменения: розыгрыш уже не активен.");
      }
      if (reactionChatId !== null) setGiveawayChannelChatId(current.id, reactionChatId);
      wizardByUser.delete(ctx.from.id);
      await sendAdminNotice(bot, adminIds, `Администратор ${ctx.from.id} изменил розыгрыш №${current.id}: ${Object.keys(patch).join(", ")}.`);
      return ctx.reply(`Розыгрыш №${current.id} обновлён. Объявление в канале также обновлено.${current.channel_message_id ? "" : "\nДля старой публикации отправлена новая карточка."}`);
    } catch (error) {
      console.error(`Could not edit giveaway ${current.id}:`, error);
      return ctx.reply(error.message || "Не удалось изменить розыгрыш.");
    }
  }
  if (wizard.step === "media") {
    const photo = ctx.message.photo?.at(-1);
    const animation = ctx.message.animation;
    if (photo || animation) {
      wizard.mediaType = animation ? "animation" : "photo";
      wizard.mediaFileId = animation?.file_id || photo.file_id;
      wizard.step = "stars";
      wizardByUser.set(ctx.from.id, wizard);
      return askNext(ctx, wizard);
    }
  }
  const text = ctx.message.text?.trim();
  if (!text) {
    return ctx.reply(wizard.step === "media"
      ? "Отправьте изображение или GIF либо отправьте «-», чтобы пропустить."
      : "Отправьте текстовое значение, пожалуйста.");
  }

  try {
    switch (wizard.step) {
      case "title":
        if (text.length > 80) throw new Error("Название должно быть не длиннее 80 символов.");
        wizard.title = text;
        wizard.step = "prize";
        break;
      case "prize":
        if (text.length > 120) throw new Error("Описание приза должно быть не длиннее 120 символов.");
        wizard.prize = text;
        wizard.step = "description";
        break;
      case "description":
        if (text.length > 600) throw new Error("Описание должно быть не длиннее 600 символов.");
        wizard.description = text === "-" ? "" : text;
        wizard.step = "media";
        break;
      case "media":
        if (text !== "-") throw new Error("Отправьте изображение или GIF либо отправьте «-», чтобы пропустить.");
        wizard.step = "stars";
        break;
      case "stars": {
        const stars = Number(text);
        if (!Number.isSafeInteger(stars) || stars < 0 || stars > 1000000) {
          throw new Error("Введите 0 для бесплатного участия или целое число Stars от 1 до 1 000 000.");
        }
        wizard.paymentStars = stars;
        wizard.step = "publishChannel";
        break;
      }
      case "publishChannel":
        wizard.publishChannel = validateChannels(text, false)[0];
        wizard.step = "requiredChannels";
        break;
      case "requiredChannels":
        wizard.requiredChannels = validateChannels(text, true);
        wizard.step = "requiredReaction";
        break;
      case "requiredReaction": {
        const answer = text.toLocaleLowerCase("ru-RU");
        if (!["да", "нет"].includes(answer)) throw new Error("Отправьте «да» или «нет».");
        wizard.requireReaction = answer === "да";
        wizard.step = "winnerCount";
        break;
      }
      case "winnerCount": {
        const count = Number(text);
        if (!Number.isInteger(count) || count < 1 || count > 100) {
          throw new Error("Введите целое число победителей от 1 до 100.");
        }
        wizard.winnerCount = count;
        wizard.step = "finishRule";
        break;
      }
      case "finishRule":
        wizard.finishRule = parseFinishRule(text);
        await ensureBotAdmin(bot, wizard.publishChannel);
        await Promise.all(wizard.requiredChannels.map((channel) => ensureBotAdmin(bot, channel)));
        wizardByUser.delete(ctx.from.id);
        return sendGiveawayPreview(ctx, wizard);
      default:
        wizardByUser.delete(ctx.from.id);
        return ctx.reply("Сценарий создания сброшен. Запустите /newgiveaway ещё раз.");
    }
    wizardByUser.set(ctx.from.id, wizard);
    return askNext(ctx, wizard);
  } catch (error) {
    return ctx.reply(error.message || "Не удалось сохранить значение. Попробуйте ещё раз.");
  }
}

function isGiveawayDue(giveaway) {
  if (giveaway.drawing_started_at) return true;
  return (giveaway.ends_at !== null && giveaway.ends_at <= Date.now())
    || (giveaway.target_participants !== null
      && getEntryCount(giveaway.id) >= giveaway.target_participants);
}

async function getMissingChannels(bot, giveaway, userId) {
  const statuses = await Promise.all(giveaway.required_channels.map(async (channel) => {
    const member = await bot.telegram.getChatMember(channel, userId);
    const subscribed = ["creator", "administrator", "member"].includes(member.status)
      || (member.status === "restricted" && member.is_member);
    return subscribed ? null : channel;
  }));
  return statuses.filter(Boolean);
}

function giveawayPostUrl(giveaway) {
  if (!/^@[A-Za-z0-9_]{5,32}$/.test(giveaway.publish_channel)) return null;
  return giveaway.channel_message_id
    ? `https://t.me/${giveaway.publish_channel.slice(1)}/${giveaway.channel_message_id}`
    : `https://t.me/${giveaway.publish_channel.slice(1)}`;
}

function entryKeyboard(giveaway) {
  return {
    inline_keyboard: [
      [{
        text: giveaway.payment_stars
          ? `Участвовать · ${giveaway.payment_stars} Stars`
          : "Участвовать",
        callback_data: `join:${giveaway.id}`,
      }],
      [{ text: "Обновить статус", callback_data: `cardrefresh:${giveaway.id}` }],
    ],
  };
}

async function showGiveaway(ctx, giveaway, edit = false) {
  const options = { reply_markup: entryKeyboard(giveaway) };
  if (giveaway.media_file_id) {
    const text = giveawayText(giveaway);
    if (
      edit
      && (ctx.callbackQuery?.message?.photo?.length || ctx.callbackQuery?.message?.animation)
      && text.length <= 1024
    ) {
      return editCurrentMessage(ctx, text, options);
    }
    const sendMedia = giveaway.media_type === "animation"
      ? ctx.replyWithAnimation.bind(ctx)
      : ctx.replyWithPhoto.bind(ctx);
    if (text.length <= 1024) {
      return sendMedia(giveaway.media_file_id, { ...options, caption: text });
    }
    await sendMedia(giveaway.media_file_id);
    return ctx.reply(text, options);
  }
  return edit
    ? editCurrentMessage(ctx, giveawayText(giveaway), options)
    : ctx.reply(giveawayText(giveaway), options);
}

async function showSubscriptionStep(ctx, bot, giveaway, userId) {
  const missing = await getMissingChannels(bot, giveaway, userId);
  const missingReaction = giveaway.require_reaction && !hasGiveawayReaction(giveaway.id, userId);
  if (missing.length || missingReaction) {
    const keyboard = missing.map((channel) => [{
      text: channel,
      url: `https://t.me/${channel.slice(1)}`,
    }]);
    const requirements = [];
    if (missing.length) {
      requirements.push(`Подпишитесь на каналы: ${missing.join(", ")}.`);
    }
    if (missingReaction) {
      requirements.push("Поставьте любую реакцию на публикацию от своего аккаунта. Если уже реагировали, снимите реакцию и поставьте её снова.");
      const postUrl = giveawayPostUrl(giveaway);
      if (postUrl) keyboard.push([{ text: "Открыть публикацию", url: postUrl }]);
    }
    keyboard.push([{ text: "Проверить условия", callback_data: `check:${giveaway.id}` }]);
    return editCurrentMessage(ctx,
      `<b>${missing.length ? "Подпишитесь на каналы и выполните условия" : "Выполните условие участия"}</b>\n\nДля розыгрыша «${escapeHtml(giveaway.title)}»:\n${requirements.map((item) => `• ${escapeHtml(item)}`).join("\n")}\n\nЗатем нажмите «Проверить условия».`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } },
    );
  }
  return editCurrentMessage(ctx,
    `<b>Проверка пройдена!</b>\n\nРозыгрыш: ${escapeHtml(giveaway.title)}\n${giveaway.payment_stars ? `Участие стоит ${giveaway.payment_stars} ⭐️.` : "Участие бесплатное."}\n\nНажмите кнопку, чтобы завершить регистрацию.`,
    { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{
      text: giveaway.payment_stars
        ? `Оплатить ${giveaway.payment_stars} Stars`
        : "Участвовать бесплатно",
      callback_data: `confirm:${giveaway.id}`,
    }]] } },
  );
}

async function beginCaptcha(ctx, bot, botToken, giveawayId, onGiveawayDue) {
  const giveaway = getGiveaway(giveawayId);
  if (!giveaway || giveaway.status !== "active") {
    await editCurrentMessage(ctx, "Этот розыгрыш уже завершён.");
    return;
  }
  if (giveaway.drawing_started_at) {
    await editCurrentMessage(ctx, "Сейчас проверяю подписки и подвожу итоги. Новые участники уже не принимаются.");
    return;
  }
  if (isGiveawayDue(giveaway)) {
    await onGiveawayDue(giveaway.id);
    await editCurrentMessage(ctx, "Время розыгрыша вышло. Результаты уже подводятся.");
    return;
  }
  if (hasEntry(giveaway.id, ctx.from.id)) {
    await editCurrentMessage(ctx,
      `Вы уже участвуете в розыгрыше «${escapeHtml(giveaway.title)}». Удачи!`,
      { parse_mode: "HTML" },
    );
    return;
  }

  const captcha = createCaptchaQuestion(randomInt);
  const challengeId = randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const answerHash = hashCaptchaAnswer(captcha.answer, botToken);
  saveChallenge({ id: challengeId, giveawayId, userId: ctx.from.id, answerHash, expiresAt });
  const keyboard = captcha.options.map((option) => [{
    text: String(option),
    callback_data: `cap:${challengeId}:${option}`,
  }]);
  await editCurrentMessage(ctx,
    `<b>Проверка на человека</b>\n\nРешите пример:\n\n<b>${captcha.question}</b>\n\nВыберите правильный ответ:`,
    { parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } },
  );
}

async function confirmParticipation(ctx, bot, botToken, adminIds, giveawayId) {
  if (isUserBlocked(ctx.from.id)) {
    await editCurrentMessage(ctx, "Участие ограничено администратором.");
    return;
  }
  const giveaway = getGiveaway(giveawayId);
  if (!giveaway || giveaway.status !== "active") {
    await editCurrentMessage(ctx, "Этот розыгрыш уже завершён.");
    return;
  }
  if (giveaway.drawing_started_at) {
    await editCurrentMessage(ctx, "Сейчас проверяю подписки и подвожу итоги. Новые участники уже не принимаются.");
    return;
  }
  if (isGiveawayDue(giveaway)) {
    await editCurrentMessage(ctx, "Набор участников уже завершён. Скоро появятся результаты.");
    return;
  }
  if (hasEntry(giveaway.id, ctx.from.id)) {
    await editCurrentMessage(ctx, `Вы уже участвуете в розыгрыше «${escapeHtml(giveaway.title)}».`, {
      parse_mode: "HTML",
    });
    return;
  }
  if (!hasValidVerification(giveawayId, ctx.from.id)) {
    await editCurrentMessage(ctx, "Проверка истекла. Откройте карточку розыгрыша и попробуйте ещё раз.");
    return;
  }

  const missing = await getMissingChannels(bot, giveaway, ctx.from.id);
  if (missing.length || (giveaway.require_reaction && !hasGiveawayReaction(giveaway.id, ctx.from.id))) {
    return showSubscriptionStep(ctx, bot, giveaway, ctx.from.id);
  }

  if (giveaway.payment_stars) {
    const payload = createPaymentIntent(
      `giveaway-${giveawayId}-${ctx.from.id}-${randomUUID()}`,
      giveawayId,
      ctx.from.id,
    );
    const title = Array.from(`Участие: ${giveaway.title}`).slice(0, 32).join("");
    const description = Array.from(
      `Билет в розыгрыш «${giveaway.title}». Приз: ${giveaway.prize}`,
    ).slice(0, 255).join("");
    await ctx.replyWithInvoice({
      title,
      description,
      payload,
      provider_token: "",
      currency: "XTR",
      prices: [{ label: "Участие в розыгрыше", amount: giveaway.payment_stars }],
    });
    await editCurrentMessage(ctx,
      `⭐️ Счёт отправлен отдельным сообщением.\n\nЗавершите оплату ${giveaway.payment_stars} Stars, чтобы попасть в список участников.`,
    );
    return;
  }

  const added = addEntry(giveawayId, ctx.from.id, null,   {
    firstName: ctx.from.first_name,
    username: ctx.from.username,
    verifiedChannels: giveaway.required_channels.length,
    verifiedChannelNames: giveaway.required_channels,
    referrerId: getReferralReferrer(giveawayId, ctx.from.id),
  });
  if (added) {
    try {
      await bot.telegram.sendMessage(
        ctx.from.id,
        `<b>Вы участвуете!</b>\n\nРозыгрыш: ${escapeHtml(giveaway.title)}\nПриз: ${escapeHtml(giveaway.prize)}\n\nБот сообщит результат после завершения.`,
        {
          parse_mode: "HTML",
          reply_markup: ctx.botInfo?.username ? {
            inline_keyboard: [[{
              text: "Пригласить друга",
              url: `https://t.me/${ctx.botInfo.username}?start=join_${giveaway.id}_r_${ctx.from.id}`,
            }]],
          } : undefined,
        },
      );
    } catch (error) {
      console.error(`Could not confirm free entry to participant ${ctx.from.id}:`, error);
    }
    const participantName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "Не указано";
    await sendAdminNotice(
      bot,
      adminIds,
      `✅ Новая бесплатная заявка\nРозыгрыш: «${giveaway.title}» №${giveaway.id}\nУчастник: ${participantName}${ctx.from.username ? ` (@${ctx.from.username})` : ""}\nTelegram ID: ${ctx.from.id}\nПодписки проверены: ${giveaway.required_channels.length ? giveaway.required_channels.join(", ") : "обязательных каналов нет"}\nСтатус: регистрация подтверждена.`,
    );
  }
  await editCurrentMessage(ctx,
    added ? "Вы в списке участников! Удачи!" : "Вы уже участвуете в этом розыгрыше.",
  );
}

async function sendWelcome(ctx) {
  const active = getActiveGiveaways().slice(0, 8);
  const text = active.length
    ? "🎁 ПОДАРКИ ОТ MAKEIEW\n\nВыберите розыгрыш ниже — покажу условия и кнопку участия."
    : "🎁 Подарки от makeiew\n\nСейчас активных розыгрышей нет. Загляните позже!";
  const rows = active.map((giveaway) => [{
    text: buttonText(`${Array.from(giveaway.title).slice(0, 38).join("")} · ${giveaway.payment_stars ? `${giveaway.payment_stars} Stars` : "бесплатно"}`),
    callback_data: `open:${giveaway.id}`,
  }]);
  rows.push([
    { text: "Мои розыгрыши", callback_data: "participant:mine" },
    { text: "Обновить список", callback_data: "refresh" },
  ]);
  const options = { reply_markup: { inline_keyboard: rows } };
  return ctx.callbackQuery
    ? editCurrentMessage(ctx, text, options)
    : ctx.reply(text, options);
}

function giveawayStatus(status) {
  return status === "active" ? "активен" : status === "ended" ? "завершён" : "отменён";
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Moscow",
  });
}

function adminGiveawayKeyboard(giveaway) {
  const rows = [[
    { text: "Статистика", callback_data: `admin:stats:${giveaway.id}` },
    { text: "Участники CSV", callback_data: `admin:export:${giveaway.id}` },
  ], [
    { text: "Журнал оплат CSV", callback_data: `admin:payments:${giveaway.id}` },
  ], [
    { text: "История", callback_data: `admin:history:${giveaway.id}` },
  ]];
  if (giveaway.status === "active") {
    rows.unshift([
      { text: "Изменить", callback_data: `admin:edit:${giveaway.id}` },
      { text: "Отменить", callback_data: `admin:cancel:${giveaway.id}` },
    ]);
    rows.push([{ text: "Завершить и уведомить", callback_data: `finish:${giveaway.id}` }]);
  }
  if (giveaway.status === "cancelled" && getUnrefundedPayments(giveaway.id).length) {
    rows.unshift([{ text: "Проверить / вернуть оплаты", callback_data: `admin:refundlist:${giveaway.id}` }]);
  }
  return { inline_keyboard: rows };
}

function giveawayAdminSummary(giveaway) {
  const stats = getGiveawayStats(giveaway.id);
  const netStars = stats.stars_collected - stats.stars_refunded;
  return `№${giveaway.id} · ${giveaway.title}\nСтатус: ${giveawayStatus(giveaway.status)}\nУчастников: ${stats.participant_count}\nОплат: ${stats.paid_count} · собрано ${stats.stars_collected} ⭐\nВозвратов: ${stats.refunded_count} · возвращено ${stats.stars_refunded} ⭐\nБаланс розыгрыша: ${netStars} ⭐\nПроверено подписок: ${stats.verified_subscriptions}\nРеакция на публикацию: ${giveaway.require_reaction ? "обязательна" : "не требуется"}`;
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildGiveawayCsv(giveaway, entries) {
  const rows = [
    ["Telegram ID", "Имя", "Username", "Участие (МСК)", "Оплачено Stars", "Возврат", "Проверено подписок"],
    ...entries.map((entry) => [
      entry.user_id,
      entry.first_name,
      entry.username ? `@${entry.username}` : "",
      formatDate(entry.joined_at),
      entry.payment_charge_id ? giveaway.payment_stars : 0,
      entry.refunded_at ? "да" : entry.refund_error ? "ошибка" : "нет",
      entry.verified_channels,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function buildPaymentsCsv(giveaway, events) {
  const rows = [
    ["Событие", "Telegram ID участника", "ID администратора", "Stars", "ID платежа Telegram", "Дата (МСК)", "Ошибка"],
    ...events.map((event) => [
      event.event_type === "payment_received"
        ? "Оплата"
        : event.event_type === "payment_refunded" ? "Возврат" : "Ошибка возврата",
      event.event_type === "payment_received" ? event.actor_id : event.details.userId,
      event.event_type === "payment_received" ? "" : event.actor_id,
      event.event_type === "payment_received" ? event.details.chargedStars : event.details.stars || giveaway.payment_stars,
      event.details.chargeId,
      formatDate(event.created_at),
      event.details.error,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

async function sendGiveawayCsv(ctx, giveaway) {
  const entries = getGiveawayEntries(giveaway.id);
  const filename = `giveaway-${giveaway.id}-participants.csv`;
  return ctx.telegram.sendDocument(ctx.chat.id, {
    source: Buffer.from(buildGiveawayCsv(giveaway, entries), "utf8"),
    filename,
  }, {
    caption: `Участники розыгрыша №${giveaway.id}: ${entries.length}`,
  });
}

async function sendPaymentCsv(ctx, giveaway) {
  const events = getGiveawayPaymentEvents(giveaway.id);
  return ctx.telegram.sendDocument(ctx.chat.id, {
    source: Buffer.from(buildPaymentsCsv(giveaway, events), "utf8"),
    filename: `giveaway-${giveaway.id}-payments.csv`,
  }, {
    caption: `Журнал оплат и возвратов розыгрыша №${giveaway.id}`,
  });
}

async function sendMyGiveaways(ctx, page = 0) {
  const pageSize = 10;
  const total = getUserGiveawayCount(ctx.from.id);
  const giveaways = getUserGiveaways(ctx.from.id, pageSize, page * pageSize);
  if (!giveaways.length) {
    return ctx.reply("Вы пока не участвуете в розыгрышах.", {
      reply_markup: { inline_keyboard: [[{ text: "К розыгрышам", callback_data: "refresh" }]] },
    });
  }
  const navigation = [];
  if (page > 0) navigation.push({ text: "← Назад", callback_data: `participant:mine:${page - 1}` });
  if ((page + 1) * pageSize < total) navigation.push({ text: "Ещё →", callback_data: `participant:mine:${page + 1}` });
  await ctx.reply(`Ваши розыгрыши · ${page + 1}/${Math.max(1, Math.ceil(total / pageSize))}`, {
    reply_markup: navigation.length ? { inline_keyboard: [navigation] } : undefined,
  });
  for (const giveaway of giveaways) {
    const state = giveaway.status === "active"
      ? "Вы участвуете"
      : giveaway.status === "ended"
        ? giveaway.is_winner ? "Вы выиграли! Проверьте сообщение от бота." : "Завершён"
        : giveaway.refunded_at ? "Отменён · оплата возвращена"
          : giveaway.payment_charge_id
            ? giveaway.refund_error ? "Отменён · ошибка возврата, администратор проверяет" : "Отменён · возврат на проверке"
            : "Отменён";
    await ctx.reply(
      `№${giveaway.id} · ${giveaway.title}\nПриз: ${giveaway.prize}\nСтатус: ${state}${giveaway.payment_charge_id ? giveaway.refunded_at ? "" : "\nОплачено Stars" : ""}`,
    );
  }
}

function editFieldsKeyboard(giveawayId) {
  return { inline_keyboard: [
    [
      { text: "Название", callback_data: `admin:field:${giveawayId}:title` },
      { text: "Приз", callback_data: `admin:field:${giveawayId}:prize` },
    ],
    [
      { text: "Описание", callback_data: `admin:field:${giveawayId}:description` },
      { text: "Условия подписки", callback_data: `admin:field:${giveawayId}:channels` },
    ],
    [
      { text: "Срок (часы / -)", callback_data: `admin:field:${giveawayId}:hours` },
      { text: "Лимит участников", callback_data: `admin:field:${giveawayId}:target` },
    ],
    [{ text: "Число победителей", callback_data: `admin:field:${giveawayId}:winners` }],
    [{ text: "Условие реакции", callback_data: `admin:field:${giveawayId}:reaction` }],
  ] };
}

async function sendRefundList(ctx, giveaway) {
  const unpaid = getUnrefundedPayments(giveaway.id);
  if (!unpaid.length) return ctx.reply("Невозвращённых оплат нет.");
  await ctx.reply(`Оплаты розыгрыша №${giveaway.id}. Возвраты выполняются только после нажатия администратором:`);
  for (const entry of unpaid) {
    const label = entry.first_name || entry.username || entry.user_id;
    await ctx.reply(
      `Участник: ${label}${entry.username ? ` (@${entry.username})` : ""}\nСумма: ${giveaway.payment_stars} Stars${entry.refund_error ? `\nПоследняя ошибка: ${entry.refund_error}` : ""}`,
      { reply_markup: { inline_keyboard: [[{
        text: "Вернуть Stars",
        callback_data: `admin:refund:${giveaway.id}:${entry.user_id}`,
      }]] } },
    );
  }
}

async function refreshPublishedGiveaway(bot, giveaway) {
  if (!giveaway.channel_message_id) return;
  const post = giveawayPost(giveaway);
  const replyMarkup = {
    inline_keyboard: [[{
      text: "Участвовать",
      url: `https://t.me/${(await bot.telegram.getMe()).username}?start=join_${giveaway.id}`,
    }]],
  };
  if (giveaway.media_file_id && giveaway.channel_media_message_id === giveaway.channel_message_id) {
    if (post.length > 1024) throw new Error("Описание слишком длинное для обновления подписи медиа.");
    await bot.telegram.editMessageCaption(
      giveaway.publish_channel,
      giveaway.channel_message_id,
      undefined,
      post,
      { parse_mode: "HTML", reply_markup: replyMarkup },
    );
  } else {
    await bot.telegram.editMessageText(
      giveaway.publish_channel,
      giveaway.channel_message_id,
      undefined,
      post,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: replyMarkup },
    );
  }
}

async function markCancelledInChannel(bot, giveaway) {
  const text = `❌ Розыгрыш «${giveaway.title}» отменён организатором. Пожалуйста, не нажимайте кнопку участия.`;
  if (!giveaway.channel_message_id) {
    return bot.telegram.sendMessage(giveaway.publish_channel, text);
  }
  if (giveaway.media_file_id && giveaway.channel_media_message_id === giveaway.channel_message_id) {
    return bot.telegram.editMessageCaption(
      giveaway.publish_channel,
      giveaway.channel_message_id,
      undefined,
      text,
      { reply_markup: { inline_keyboard: [] } },
    );
  }
  return bot.telegram.editMessageText(
    giveaway.publish_channel,
    giveaway.channel_message_id,
    undefined,
    text,
    { reply_markup: { inline_keyboard: [] } },
  );
}

function isMessageNotModifiedError(error) {
  return error?.response?.description?.includes("message is not modified")
    || error?.description?.includes("message is not modified");
}

async function announceSubscriptionRecheckRules(bot, adminIds) {
  for (const giveaway of getActiveGiveawaysNeedingSubscriptionNotice()) {
    if (!claimSubscriptionNotice(giveaway.id)) continue;
    try {
      if (!giveaway.required_channels.length) {
        markSubscriptionNoticeSent(giveaway.id);
        continue;
      }
      if (giveaway.channel_message_id) {
        try {
          await refreshPublishedGiveaway(bot, giveaway);
        } catch (error) {
          if (!isMessageNotModifiedError(error)) throw error;
        }
      } else {
        await bot.telegram.sendMessage(
          giveaway.publish_channel,
          `📌 Уточнение к активному розыгрышу «${giveaway.title}»: чтобы претендовать на приз, сохраняйте подписку на обязательные каналы до подведения итогов. Перед выбором победителей бот повторно проверит подписку; отписавшиеся участники не попадут в выбор.`,
        );
      }
      markSubscriptionNoticeSent(giveaway.id);
    } catch (error) {
      releaseSubscriptionNotice(giveaway.id);
      console.error(`Could not announce subscription recheck rules for giveaway ${giveaway.id}:`, error);
      await sendAdminNotice(
        bot,
        adminIds,
        `Не удалось обновить условия розыгрыша №${giveaway.id} в канале ${giveaway.publish_channel}. Выбор победителей отложен, пока правило не будет опубликовано.`,
      );
    }
  }
}

function adminKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[
        { text: "⭐ Баланс Stars", callback_data: "admin:balance" },
        { text: "💸 Вывод Stars", callback_data: "admin:withdraw" },
      ], [{ text: "🗄 Создать копию базы", callback_data: "admin:backup" }]],
    },
  };
}

function formatStarBalance(balance) {
  const amount = Number(balance.amount);
  const nanostars = Number(balance.nanostar_amount || 0);
  if (!Number.isSafeInteger(amount) || !Number.isInteger(nanostars) || nanostars < 0) {
    throw new Error("Telegram returned an invalid Star balance.");
  }
  const fraction = nanostars.toString().padStart(9, "0").replace(/0+$/, "");
  return fraction ? `${amount}.${fraction}` : String(amount);
}

export function registerAdminHandlers(bot, { adminIds, botToken }) {
  decorateTelegramEmoji(bot.telegram);
  bot.use(async (ctx, next) => {
    decorateTelegramEmoji(ctx.telegram);
    return next();
  });

  bot.start(async (ctx) => {
    const payload = ctx.startPayload || "";
    const joinPayload = payload.match(/^join_(\d+)(?:_r_(\d+))?$/);
    const giveawayId = joinPayload?.[1];
    if (giveawayId) {
      const giveaway = getGiveaway(Number(giveawayId));
      if (!giveaway || giveaway.status !== "active") {
        await ctx.reply("Этот розыгрыш уже завершён.");
        return sendWelcome(ctx);
      }
      giveaway.referrerId = joinPayload[2] ? Number(joinPayload[2]) : null;
      if (giveaway.referrerId && giveaway.referrerId !== ctx.from.id) {
        trackReferralVisit(giveaway.id, giveaway.referrerId, ctx.from.id);
      }
      return showGiveaway(ctx, giveaway);
    }
    if (isAdmin(ctx, adminIds)) {
      return ctx.reply("Панель администратора\n\n/newgiveaway — создать розыгрыш\n/mygiveaways — список розыгрышей\n/cancel — отменить создание\n\nStars за участие поступают на баланс бота.", adminKeyboard());
    }
    return sendWelcome(ctx);
  });

  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx, adminIds)) return ctx.reply("Эта команда доступна только администратору.");
    return ctx.reply("Панель администратора\n\n/newgiveaway — создать розыгрыш\n/mygiveaways — список розыгрышей\n/cancel — отменить создание\n\nStars за участие поступают на баланс бота.", adminKeyboard());
  });

  bot.action("admin:balance", async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Кнопка доступна только администратору.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    try {
      const balance = await ctx.telegram.callApi("getMyStarBalance", {});
      return ctx.reply(`Баланс бота: ${formatStarBalance(balance)} ⭐ Stars\n\nЭто текущий баланс в Telegram; он включает средства бота, а не только оплаты конкретного розыгрыша.`);
    } catch (error) {
      console.error("Could not fetch Telegram Stars balance:", error);
      return ctx.reply("Не удалось получить баланс Stars от Telegram. Попробуйте ещё раз позже.");
    }
  });

  bot.action("admin:backup", async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Кнопка доступна только администратору.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery("Создаю резервную копию…");
    try {
      const backup = await createDatabaseBackup();
      const sizeMb = (backup.size / (1024 * 1024)).toFixed(2);
      return ctx.reply(`Резервная копия создана.\nРазмер: ${sizeMb} МБ\nПуть: ${backup.path}\nХранится до 14 последних копий. Скопируйте файл в надёжное внешнее хранилище для защиты от потери диска.`);
    } catch (error) {
      console.error("Could not create SQLite backup:", error);
      return ctx.reply("Не удалось создать резервную копию базы. Проверьте свободное место и права на запись.");
    }
  });

  bot.action("admin:withdraw", async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Кнопка доступна только администратору.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    return ctx.reply(
      "Вывод Stars\n\nПолученные Stars находятся на балансе бота. Вывести их автоматически через бота нельзя: владелец оформляет вывод вручную в Fragment. Доступность и условия вывода проверьте на стороне Fragment.",
      {
        reply_markup: {
          inline_keyboard: [[{ text: "Открыть Fragment", url: "https://fragment.com/" }]],
        },
      },
    );
  });

  bot.command("newgiveaway", (ctx) => beginWizard(ctx, adminIds));
  bot.command("cancel", (ctx) => {
    if (!isAdmin(ctx, adminIds)) return ctx.reply("Эта команда доступна только администратору.");
    wizardByUser.delete(ctx.from.id);
    for (const [id, preview] of pendingPreviews) {
      if (preview.userId === ctx.from.id) pendingPreviews.delete(id);
    }
    return ctx.reply("Создание розыгрыша отменено.");
  });
  bot.command("mygiveaways", async (ctx) => {
    if (!isAdmin(ctx, adminIds)) return ctx.reply("Эта команда доступна только администратору.");
    const giveaways = getRecentGiveaways(10);
    if (!giveaways.length) return ctx.reply("Розыгрышей пока нет. Создайте первый через /newgiveaway.");
    for (const giveaway of giveaways) {
      await ctx.reply(giveawayAdminSummary(giveaway), {
        reply_markup: adminGiveawayKeyboard(giveaway),
      });
    }
  });

  bot.action("participant:mine", async (ctx) => {
    if (!isPrivate(ctx)) {
      await ctx.answerCbQuery("Откройте бота в личном чате, чтобы посмотреть свои розыгрыши.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    return sendMyGiveaways(ctx, 0);
  });

  bot.action(/^participant:mine:(\d+)$/, async (ctx) => {
    if (!isPrivate(ctx)) {
      await ctx.answerCbQuery("Откройте бота в личном чате, чтобы посмотреть свои розыгрыши.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    return sendMyGiveaways(ctx, Number(ctx.match[1]));
  });

  bot.action(/^admin:stats:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только для администратора.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway) return ctx.reply("Розыгрыш не найден.");
    return ctx.reply(giveawayAdminSummary(giveaway));
  });

  bot.action(/^admin:export:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только для администратора.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery("Готовлю CSV…");
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway) return ctx.reply("Розыгрыш не найден.");
    try {
      return await sendGiveawayCsv(ctx, giveaway);
    } catch (error) {
      console.error(`Could not export entries for giveaway ${giveaway.id}:`, error);
      return ctx.reply("Не удалось отправить CSV. Попробуйте позже.");
    }
  });

  bot.action(/^admin:payments:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только для администратора.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery("Готовлю журнал…");
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway) return ctx.reply("Розыгрыш не найден.");
    try {
      return await sendPaymentCsv(ctx, giveaway);
    } catch (error) {
      console.error(`Could not export payments for giveaway ${giveaway.id}:`, error);
      return ctx.reply("Не удалось отправить журнал оплат. Попробуйте позже.");
    }
  });

  bot.action(/^admin:history:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только для администратора.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const giveawayId = Number(ctx.match[1]);
    const giveaway = getGiveaway(giveawayId);
    if (!giveaway) return ctx.reply("Розыгрыш не найден.");
    const labels = {
      created: "Создан",
      edited: "Изменён",
      participant_joined: "Участник зарегистрирован",
      payment_received: "Получена оплата",
      payment_refunded: "Возврат выполнен",
      refund_failed: "Ошибка возврата",
      ending_reminder_sent: "Отправлено напоминание участникам",
      ending_reminder_failed: "Не доставлены напоминания",
      participant_limit_reached: "Достигнут лимит участников",
      ended: "Завершён",
      cancelled: "Отменён",
    };
    const events = getGiveawayEvents(giveawayId);
    if (!events.length) return ctx.reply("История пока пуста.");
    const text = events.map((event) => {
      const detail = event.event_type === "payment_received"
        ? ` · ${event.details.chargedStars} Stars`
        : event.event_type === "edited"
          ? ` · ${Object.keys(event.details).join(", ")}`
          : "";
      return `${formatDate(event.created_at)} · ${labels[event.event_type] || event.event_type}${detail}\nID: ${event.actor_id ?? "система"}`;
    }).join("\n\n");
    return ctx.reply(`История розыгрыша №${giveawayId}\n\n${text}`);
  });

  bot.action(/^admin:edit:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только для администратора.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway || giveaway.status !== "active") return ctx.reply("Изменить можно только активный розыгрыш.");
    return ctx.reply(
      `Что изменить в розыгрыше №${giveaway.id}? Цена, канал публикации и призы/оплаты не меняются, чтобы не затронуть уже выданные счета.`,
      { reply_markup: editFieldsKeyboard(giveaway.id) },
    );
  });

  bot.action(/^admin:field:(\d+):(title|prize|description|channels|reaction|hours|target|winners)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только для администратора.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway || giveaway.status !== "active") return ctx.reply("Изменить можно только активный розыгрыш.");
    const prompts = {
      title: "Отправьте новое название (до 80 символов).",
      prize: "Отправьте новое описание приза (до 120 символов).",
      description: "Отправьте новое описание (до 600 символов), либо - чтобы очистить.",
      channels: "Отправьте обязательные каналы через пробел или - если подписка не нужна.",
      reaction: "Нужна ли реакция на публикации? Отправьте «да» или «нет». Любая реакция подойдёт. При включении участникам нужно будет поставить реакцию заново.",
      hours: "Сколько часов оставить до завершения? Введите число от 0.0167 до 8760; можно дробно, например 0.5 = 30 минут.",
      target: "Введите новый лимит участников или - чтобы убрать лимит.",
      winners: "Введите число победителей от 1 до 100.",
    };
    wizardByUser.set(ctx.from.id, {
      step: "editValue",
      giveawayId: giveaway.id,
      editField: ctx.match[2],
    });
    return ctx.reply(`${prompts[ctx.match[2]]}\n/cancel — отмена`);
  });

  bot.action(/^admin:cancel:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только для администратора.", { show_alert: true });
      return;
    }
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway || giveaway.status !== "active") {
      await ctx.answerCbQuery("Розыгрыш уже не активен.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    if (!cancelGiveaway(giveaway.id, ctx.from.id)) return ctx.reply("Не удалось отменить розыгрыш.");
    const text = `Розыгрыш №${giveaway.id} отменён. Автоматического возврата нет. Проверьте оплаты и нажимайте «Вернуть Stars» отдельно для каждого участника.`;
    await ctx.reply(text);
    try {
      await markCancelledInChannel(bot, giveaway);
    } catch (error) {
      console.error(`Could not mark cancelled giveaway ${giveaway.id} in its channel:`, error);
      await sendAdminNotice(bot, adminIds, `Розыгрыш №${giveaway.id} отменён, но публикацию в ${giveaway.publish_channel} не удалось обновить.`);
    }
    for (const entry of getGiveawayEntries(giveaway.id)) {
      try {
        const refundText = entry.payment_charge_id
          ? " Автоматического возврата нет — администратор проверит оплату и сообщит о решении."
          : "";
        await bot.telegram.sendMessage(entry.user_id, `Розыгрыш «${giveaway.title}» отменён.${refundText}`);
      } catch (error) {
        console.error(`Could not notify participant ${entry.user_id} about cancellation:`, error);
      }
    }
    return sendRefundList(ctx, giveaway);
  });

  bot.action(/^admin:refundlist:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только для администратора.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway || giveaway.status !== "cancelled") return ctx.reply("Возвраты вручную показываются для отменённых розыгрышей.");
    return sendRefundList(ctx, giveaway);
  });

  bot.action(/^admin:refund:(\d+):(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только для администратора.", { show_alert: true });
      return;
    }
    const giveawayId = Number(ctx.match[1]);
    const userId = Number(ctx.match[2]);
    const giveaway = getGiveaway(giveawayId);
    const entry = getGiveawayEntries(giveawayId).find((candidate) => candidate.user_id === userId);
    if (!giveaway || giveaway.status !== "cancelled" || !entry?.payment_charge_id || entry.refunded_at) {
      await ctx.answerCbQuery("Возврат недоступен или уже выполнен.", { show_alert: true });
      return;
    }
    if (!claimRefund(giveawayId, userId)) {
      await ctx.answerCbQuery("Возврат уже выполняется. Проверьте историю через минуту.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery("Отправляю возврат…");
    try {
      await ctx.telegram.callApi("refundStarPayment", {
        user_id: userId,
        telegram_payment_charge_id: entry.payment_charge_id,
      });
    } catch (error) {
      console.error(`Could not refund participant ${userId} for giveaway ${giveawayId}:`, error);
      markRefundResult(giveawayId, userId, error.description || error.message, ctx.from.id);
      await sendAdminNotice(bot, adminIds, `Не удалось вернуть ${giveaway.payment_stars} Stars участнику ${userId} по розыгрышу №${giveawayId}. Ошибка: ${error.description || error.message}`);
      return ctx.reply(`Не удалось выполнить возврат участнику ${userId}. Ошибка сохранена в истории; можно попробовать снова.`);
    }
    markRefundResult(giveawayId, userId, null, ctx.from.id);
    try {
      await bot.telegram.sendMessage(userId, `Оплата ${giveaway.payment_stars} Stars за отменённый розыгрыш «${giveaway.title}» возвращена.`);
    } catch (error) {
      console.error(`Refund succeeded but participant ${userId} could not be notified:`, error);
      await sendAdminNotice(bot, adminIds, `Возврат ${giveaway.payment_stars} Stars участнику ${userId} по розыгрышу №${giveawayId} выполнен, но уведомление не доставлено.`);
    }
    return ctx.reply(`Возврат ${giveaway.payment_stars} Stars пользователю ${userId} выполнен.`);
  });

  bot.action("refresh", async (ctx) => {
    await ctx.answerCbQuery();
    return sendWelcome(ctx);
  });

  bot.action(/^open:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway || giveaway.status !== "active") {
      await editCurrentMessage(ctx, "Этот розыгрыш уже завершён.");
      return;
    }
    return showGiveaway(ctx, giveaway, true);
  });

  bot.action(/^cardrefresh:(\d+)$/, async (ctx) => {
    if (!isPrivate(ctx)) {
      await ctx.answerCbQuery("Откройте карточку в личном чате с ботом.", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway) {
      await editCurrentMessage(ctx, "Розыгрыш не найден.");
      return;
    }
    if (giveaway.status !== "active") {
      await editCurrentMessage(ctx, `Розыгрыш завершён. Участников: ${getEntryCount(giveaway.id)}.`);
      return;
    }
    return showGiveaway(ctx, giveaway, true);
  });

  bot.action(/^join:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    try {
      return await beginCaptcha(
        ctx,
        bot,
        botToken,
        Number(ctx.match[1]),
        (id) => finishGiveaway(bot, adminIds, id),
      );
    } catch (error) {
      console.error("Could not start giveaway participation:", error);
      await ctx.reply("Не удалось начать участие. Попробуйте ещё раз чуть позже.");
    }
  });

  bot.action(/^cap:([a-f0-9-]{36}):(\d{1,2})$/, async (ctx) => {
    const challenge = getChallenge(ctx.match[1]);
    if (
      !challenge
      || challenge.user_id !== ctx.from.id
      || challenge.expires_at < Date.now()
      || challenge.attempts >= 4
      || challenge.verified
    ) {
      await ctx.answerCbQuery("Проверка истекла.", { show_alert: true });
      await editCurrentMessage(ctx, "Проверка истекла. Откройте карточку розыгрыша и начните заново.");
      return;
    }
    const giveaway = getGiveaway(challenge.giveaway_id);
    if (!giveaway || giveaway.status !== "active" || isGiveawayDue(giveaway)) {
      await ctx.answerCbQuery("Набор участников завершён.");
      await editCurrentMessage(ctx, "Набор участников завершён. Скоро появятся результаты.");
      return;
    }
    if (!matchesCaptchaAnswer(ctx.match[2], challenge.answer_hash, botToken)) {
      recordChallengeAttempt(challenge.id, false);
      const attemptsLeft = 3 - challenge.attempts;
      if (attemptsLeft <= 0) {
        await ctx.answerCbQuery("Попытки закончились.", { show_alert: true });
        await editCurrentMessage(ctx,
          "Попытки закончились. Нажмите кнопку, чтобы пройти проверку ещё раз.",
          { reply_markup: { inline_keyboard: [[{
            text: "Новая проверка",
            callback_data: `join:${giveaway.id}`,
          }]] } },
        );
      } else {
        await ctx.answerCbQuery(`Неверный ответ. Осталось попыток: ${attemptsLeft}.`, { show_alert: true });
      }
      return;
    }

    await ctx.answerCbQuery("Верно!");
    recordChallengeAttempt(challenge.id, true);
    saveVerification(giveaway.id, ctx.from.id, Date.now() + 15 * 60 * 1000);
    try {
      await showSubscriptionStep(ctx, bot, giveaway, ctx.from.id);
    } catch (error) {
      console.error("Could not check giveaway channel subscriptions:", error);
      await editCurrentMessage(ctx, "Не удалось проверить подписки. Попробуйте снова чуть позже.");
    }
  });

  bot.action(/^check:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const giveaway = getGiveaway(Number(ctx.match[1]));
    if (!giveaway || giveaway.status !== "active") {
      await editCurrentMessage(ctx, "Этот розыгрыш уже завершён.");
      return;
    }
    if (!hasValidVerification(giveaway.id, ctx.from.id)) {
      await editCurrentMessage(ctx, "Срок проверки истёк. Откройте карточку розыгрыша и начните заново.");
      return;
    }
    try {
      await showSubscriptionStep(ctx, bot, giveaway, ctx.from.id);
    } catch (error) {
      console.error("Could not check giveaway channel subscriptions:", error);
      await editCurrentMessage(ctx, "Не удалось проверить подписки. Нажмите «Проверить подписку» ещё раз.");
    }
  });

  bot.action(/^confirm:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    try {
      await confirmParticipation(ctx, bot, botToken, adminIds, Number(ctx.match[1]));
    } catch (error) {
      console.error("Could not register giveaway participant:", error);
      await editCurrentMessage(ctx, "Не удалось зарегистрировать участие. Нажмите кнопку ещё раз.");
    }
  });

  bot.action(/^publish:([a-f0-9-]{36})$/, async (ctx) => {
    const preview = pendingPreviews.get(ctx.match[1]);
    if (!isAdmin(ctx, adminIds) || !preview || preview.userId !== ctx.from.id) {
      await ctx.answerCbQuery("Предпросмотр недействителен или устарел.", { show_alert: true });
      return;
    }
    if (Date.now() - preview.createdAt > 30 * 60 * 1000) {
      pendingPreviews.delete(ctx.match[1]);
      await ctx.answerCbQuery("Срок предпросмотра истёк.", { show_alert: true });
      await editCurrentMessage(ctx, "Предпросмотр истёк. Запустите /newgiveaway, чтобы создать розыгрыш заново.");
      return;
    }
    pendingPreviews.delete(ctx.match[1]);
    await ctx.answerCbQuery("Публикую розыгрыш…");
    try {
      await publishConfirmedGiveaway(ctx, bot, preview, adminIds);
    } catch (error) {
      console.error("Could not publish confirmed giveaway:", error);
      await editCurrentMessage(ctx, error.message || "Не удалось опубликовать розыгрыш. Проверьте права бота в канале.");
    }
  });

  bot.action(/^discard:([a-f0-9-]{36})$/, async (ctx) => {
    const preview = pendingPreviews.get(ctx.match[1]);
    if (!isAdmin(ctx, adminIds) || !preview || preview.userId !== ctx.from.id) {
      await ctx.answerCbQuery("Предпросмотр недействителен или устарел.", { show_alert: true });
      return;
    }
    pendingPreviews.delete(ctx.match[1]);
    await ctx.answerCbQuery("Создание отменено.");
    await editCurrentMessage(ctx, "Розыгрыш не опубликован. Чтобы создать новый, отправьте /newgiveaway.");
  });

  bot.action(/^finish:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, adminIds)) {
      await ctx.answerCbQuery("Только администратор может завершить розыгрыш.", { show_alert: true });
      return;
    }
    const giveawayId = Number(ctx.match[1]);
    const finished = await finishGiveaway(bot, adminIds, giveawayId, ctx.from.id);
    const giveaway = getGiveaway(giveawayId);
    await ctx.answerCbQuery(
      finished
        ? "Розыгрыш завершён, участники уведомлены."
        : giveaway?.status === "active"
          ? "Не удалось завершить сейчас. Проверьте уведомление от бота и попробуйте позже."
          : "Розыгрыш уже завершён.",
    );
  });

  bot.on("text", (ctx) => handleWizardMessage(ctx, adminIds, bot));
  bot.on(["photo", "animation"], (ctx) => handleWizardMessage(ctx, adminIds, bot));
  bot.on("message_reaction", async (ctx) => {
    const update = ctx.update.message_reaction;
    const userId = update.user?.id;
    if (!Number.isSafeInteger(userId)) return;
    recordChannelReaction(
      update.chat.id,
      update.message_id,
      userId,
      Array.isArray(update.new_reaction) && update.new_reaction.length > 0,
    );
  });

  bot.on("pre_checkout_query", async (ctx) => {
    const query = ctx.preCheckoutQuery;
    try {
      if (isUserBlocked(query.from.id)) {
        await ctx.answerPreCheckoutQuery(false, "Участие ограничено администратором.");
        return;
      }
      const intent = getPaymentIntent(query.invoice_payload);
      const giveaway = intent && getGiveaway(intent.giveaway_id);
      if (
        !intent
        || intent.status !== "pending"
        || intent.user_id !== query.from.id
        || !giveaway
        || giveaway.status !== "active"
        || giveaway.drawing_started_at
        || (giveaway.ends_at !== null && giveaway.ends_at <= Date.now())
        || (giveaway.target_participants !== null
          && getEntryCount(giveaway.id) >= giveaway.target_participants)
        || giveaway.payment_stars !== query.total_amount
        || query.currency !== "XTR"
        || hasEntry(giveaway.id, query.from.id)
        || isUserBlocked(query.from.id)
      ) {
        await ctx.answerPreCheckoutQuery(false, "Счёт недействителен или розыгрыш уже завершён.");
        return;
      }
      const missingChannels = await Promise.all(giveaway.required_channels.map(async (channel) => {
        const member = await bot.telegram.getChatMember(channel, query.from.id);
        return ["creator", "administrator", "member"].includes(member.status)
          || (member.status === "restricted" && member.is_member)
          ? null
          : channel;
      }));
      if (missingChannels.some(Boolean)) {
        await ctx.answerPreCheckoutQuery(false, "Перед оплатой подпишитесь на обязательные каналы.");
        return;
      }
      if (giveaway.require_reaction && !hasGiveawayReaction(giveaway.id, query.from.id)) {
        await ctx.answerPreCheckoutQuery(false, "Поставьте реакцию на публикацию и проверьте условие перед оплатой.");
        return;
      }
      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error("Could not validate Stars pre-checkout:", error);
      await ctx.answerPreCheckoutQuery(false, "Не удалось проверить участие. Попробуйте позже.");
    }
  });

  bot.on("message", async (ctx) => {
    const payment = ctx.message.successful_payment;
    if (!payment) return;
    const intent = getPaymentIntent(payment.invoice_payload);
    const giveaway = intent && getGiveaway(intent.giveaway_id);
    if (
      !intent
      || intent.status !== "pending"
      || intent.user_id !== ctx.from.id
      || payment.currency !== "XTR"
      || giveaway?.payment_stars !== payment.total_amount
    ) {
      console.error("Received a Stars payment that does not match a pending giveaway intent.", {
        userId: ctx.from.id,
        payload: payment.invoice_payload,
        currency: payment.currency,
        amount: payment.total_amount,
      });
      await sendAdminNotice(bot, adminIds, `Получен платёж Stars, который не удалось сопоставить с ожидаемым участием. User ID: ${ctx.from.id}. Проверьте платеж вручную.`);
      return;
    }
    if (isUserBlocked(ctx.from.id)) {
      markPaymentIntentPaid(payment.invoice_payload);
      recordGiveawayEvent(giveaway.id, "payment_received", ctx.from.id, {
        chargedStars: payment.total_amount,
        chargeId: payment.telegram_payment_charge_id,
        source: "blocked-user",
      });
      recordGiveawayEvent(giveaway.id, "refund_failed", ctx.from.id, {
        userId: ctx.from.id,
        stars: payment.total_amount,
        chargeId: payment.telegram_payment_charge_id,
        source: "blocked-user",
        error: "Payment completed after the participant was added to the blacklist.",
      });
      await sendAdminNotice(
        bot,
        adminIds,
        `Платёж ${payment.total_amount} Stars поступил от пользователя из чёрного списка.\nРозыгрыш №${giveaway.id}, user ID: ${ctx.from.id}. Требуется ручная проверка и при необходимости возврат.`,
      );
      return;
    }
    if (giveaway.status !== "active" || giveaway.drawing_started_at || isGiveawayDue(giveaway)) {
      markPaymentIntentPaid(payment.invoice_payload);
      if (giveaway.status === "cancelled") {
        const added = addEntry(giveaway.id, ctx.from.id, payment.telegram_payment_charge_id, {
          firstName: ctx.from.first_name,
          username: ctx.from.username,
          verifiedChannels: giveaway.required_channels.length,
          verifiedChannelNames: giveaway.required_channels,
          referrerId: getReferralReferrer(giveaway.id, ctx.from.id),
        });
        if (!added) {
          recordGiveawayEvent(giveaway.id, "payment_received", ctx.from.id, {
            chargedStars: payment.total_amount,
            chargeId: payment.telegram_payment_charge_id,
            source: "cancelled-giveaway",
          });
        }
        await ctx.reply("Розыгрыш уже отменён. Оплата поступила после отмены; автоматического возврата нет, администратор проверит её вручную.");
        await sendAdminNotice(
          bot,
          adminIds,
          `Получена поздняя оплата ${payment.total_amount} Stars за отменённый розыгрыш №${giveaway.id}. Участник: ${ctx.from.id}. Автоматического возврата нет.`,
          {
            reply_markup: { inline_keyboard: [[{
              text: "Вернуть Stars",
              callback_data: `admin:refund:${giveaway.id}:${ctx.from.id}`,
            }]] },
          },
        );
        return;
      }
      recordGiveawayEvent(giveaway.id, "payment_received", ctx.from.id, {
        chargedStars: payment.total_amount,
        chargeId: payment.telegram_payment_charge_id,
        source: "late-payment",
      });
      try {
        await ctx.telegram.callApi("refundStarPayment", {
          user_id: ctx.from.id,
          telegram_payment_charge_id: payment.telegram_payment_charge_id,
        });
        recordGiveawayEvent(giveaway.id, "payment_refunded", null, {
          userId: ctx.from.id,
          stars: payment.total_amount,
          chargeId: payment.telegram_payment_charge_id,
          source: "late-payment",
        });
        await ctx.reply("Розыгрыш завершился до подтверждения оплаты. Stars возвращены.");
      } catch (error) {
        console.error(`Could not refund late Stars payment for giveaway ${giveaway.id}:`, error);
        recordGiveawayEvent(giveaway.id, "refund_failed", null, {
          userId: ctx.from.id,
          stars: payment.total_amount,
          chargeId: payment.telegram_payment_charge_id,
          source: "late-payment",
          error: error.description || error.message,
        });
        await ctx.reply("Розыгрыш завершился до подтверждения оплаты. Администратор проверит возврат Stars.");
        await sendAdminNotice(
          bot,
          adminIds,
          `Нужен ручной возврат ${payment.total_amount} ⭐️ за розыгрыш №${giveaway.id}, завершившийся до регистрации оплаты. Участник: ${ctx.from.id}.`,
        );
      }
      return;
    }
    const added = addEntry(
      giveaway.id,
      ctx.from.id,
      payment.telegram_payment_charge_id,
      {
        firstName: ctx.from.first_name,
        username: ctx.from.username,
        verifiedChannels: giveaway.required_channels.length,
        verifiedChannelNames: giveaway.required_channels,
        referrerId: getReferralReferrer(giveaway.id, ctx.from.id),
      },
    );
    markPaymentIntentPaid(payment.invoice_payload);
    try {
      if (!added) {
        await ctx.reply("Оплата получена, но вы уже зарегистрированы в этом розыгрыше.");
      } else {
        await ctx.reply(`Оплата получена — вы участвуете в розыгрыше «${giveaway.title}»!`, {
          reply_markup: ctx.botInfo?.username ? {
            inline_keyboard: [[{
              text: "Пригласить друга",
              url: `https://t.me/${ctx.botInfo.username}?start=join_${giveaway.id}_r_${ctx.from.id}`,
            }]],
          } : undefined,
        });
      }
    } catch (error) {
      console.error(`Could not confirm Stars payment to participant ${ctx.from.id}:`, error);
    }
    await sendAdminNotice(
      bot,
      adminIds,
      `⭐️ Получена оплата Stars за участие.\nРозыгрыш: «${giveaway.title}» №${giveaway.id}\nСумма: ${payment.total_amount} ⭐️\nУчастник: ${ctx.from.first_name || "Пользователь"}${ctx.from.username ? ` (@${ctx.from.username})` : ""}\nID: ${ctx.from.id}\nЗвёзды зачислены на баланс бота.`,
    );
  });
}

export function startGiveawayScheduler(bot, adminIds) {
  let checking = false;
  const timer = setInterval(async () => {
    if (checking) return;
    checking = true;
    try {
      await announceSubscriptionRecheckRules(bot, adminIds);
      for (const giveaway of getActiveGiveaways()) {
        if (!giveaway.subscription_notice_sent_at || giveaway.subscription_notice_sent_at < 0) continue;
        const timeReached = giveaway.ends_at !== null && giveaway.ends_at <= Date.now();
        const countReached = giveaway.target_participants !== null
          && getEntryCount(giveaway.id) >= giveaway.target_participants;
        if (!timeReached && !countReached && giveaway.ends_at !== null && !giveaway.reminder_sent_at) {
          const reminderWindow = giveaway.reminder_window_ms ?? 60 * 60 * 1000;
          if (giveaway.ends_at - Date.now() <= reminderWindow) {
            const participants = getGiveawayEntries(giveaway.id);
            if (participants.length) {
              const notifications = await Promise.allSettled(participants.map((entry) => (
                bot.telegram.sendMessage(
                  entry.user_id,
                  `Напоминание: розыгрыш «${giveaway.title}» завершится скоро. Условия и статус можно посмотреть в боте.`,
                )
              )));
              markReminderSent(giveaway.id, Date.now(), participants.length);
              const failed = notifications.filter((result) => result.status === "rejected").length;
              if (failed) {
                recordGiveawayEvent(giveaway.id, "ending_reminder_failed", null, {
                  failed,
                  recipients: participants.length,
                });
              }
              await sendAdminNotice(
                bot,
                adminIds,
                `Напоминание о скором завершении розыгрыша №${giveaway.id} отправлено ${participants.length - failed} из ${participants.length} участникам.${failed ? ` Не доставлено: ${failed}.` : ""}`,
              );
            }
          }
        }
        if (countReached && markTargetNotified(giveaway.id)) {
          await sendAdminNotice(
            bot,
            adminIds,
            `В розыгрыше №${giveaway.id} «${giveaway.title}» достигнут лимит ${giveaway.target_participants} участников. Подвожу итоги.`,
          );
        }
        if (timeReached || countReached) {
          await finishGiveaway(bot, adminIds, giveaway.id);
        }
      }
    } catch (error) {
      console.error("Giveaway completion check failed:", error);
    } finally {
      checking = false;
    }
  }, 15_000);
  timer.unref();
  return timer;
}
