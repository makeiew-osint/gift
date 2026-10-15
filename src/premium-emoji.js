const premiumEmojiIds = new Map([
  ["🎁", "5850323366476519158"],
  ["🌟", "5897920748101571572"],
  ["🏆", "5280769763398671636"],
  ["⭐", "6037514847443227774"],
  ["⭐️", "6037514847443227774"],
  ["✨", "5850389345764122229"],
  ["🎯", "5310278924616356636"],
]);

const entityPattern = new RegExp(
  [...premiumEmojiIds.keys()]
    .sort((left, right) => right.length - left.length)
    .map((emoji) => emoji.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "gu",
);
const decoratedTelegramInstances = new WeakSet();

function addPremiumEmojiEntities(text, options) {
  const entities = [];
  for (const match of text.matchAll(entityPattern)) {
    const emoji = match[0];
    entities.push({
      type: "custom_emoji",
      offset: match.index,
      length: emoji.length,
      custom_emoji_id: premiumEmojiIds.get(emoji),
    });
  }
  return entities.length
    ? { ...options, entities: [...(options.entities || []), ...entities] }
    : options;
}

function addPremiumEmojiHtml(text) {
  return text.replace(entityPattern, (emoji) => (
    `<tg-emoji emoji-id="${premiumEmojiIds.get(emoji)}">${emoji}</tg-emoji>`
  ));
}

function decorateText(text, options = {}) {
  if (typeof text !== "string") return { text, options };
  if (options.parse_mode === "HTML") {
    return { text: addPremiumEmojiHtml(text), options };
  }
  return { text, options: addPremiumEmojiEntities(text, options) };
}

export function decorateTelegramEmoji(telegram) {
  if (decoratedTelegramInstances.has(telegram)) return;
  decoratedTelegramInstances.add(telegram);

  for (const method of [
    "sendMessage",
    "editMessageText",
    "editMessageCaption",
    "sendPhoto",
    "sendAnimation",
  ]) {
    if (typeof telegram[method] !== "function") continue;
    const original = telegram[method].bind(telegram);
    telegram[method] = (...args) => {
      if (method === "sendMessage") {
        const [chatId, text, extra = {}] = args;
        const decorated = decorateText(text, extra);
        return original(chatId, decorated.text, decorated.options);
      }
      if (method === "editMessageText") {
        const [chatId, messageId, inlineMessageId, text, extra = {}] = args;
        const decorated = decorateText(text, extra);
        return original(chatId, messageId, inlineMessageId, decorated.text, decorated.options);
      }
      if (method === "editMessageCaption") {
        const [chatId, messageId, inlineMessageId, caption, extra = {}] = args;
        const decorated = decorateText(caption, extra);
        return original(
          chatId,
          messageId,
          inlineMessageId,
          decorated.text,
          decorated.options,
        );
      }
      const [chatId, media, extra = {}] = args;
      if (typeof extra.caption !== "string") return original(chatId, media, extra);
      const decorated = decorateText(extra.caption, extra);
      return original(chatId, media, { ...decorated.options, caption: decorated.text });
    };
  }
}

export function getPremiumEmojiId(emoji) {
  return premiumEmojiIds.get(emoji);
}
