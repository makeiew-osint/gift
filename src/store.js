import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { selectWinners } from "./draw.js";

const databasePath = process.env.DATABASE_PATH || "./data/giveaways.sqlite";
fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    prize TEXT NOT NULL,
    description TEXT NOT NULL,
    media_type TEXT CHECK (media_type IS NULL OR media_type IN ('photo', 'animation')),
    media_file_id TEXT,
    publish_channel TEXT NOT NULL,
    required_channels TEXT NOT NULL,
    require_reaction INTEGER NOT NULL DEFAULT 0 CHECK (require_reaction IN (0, 1)),
    payment_stars INTEGER NOT NULL DEFAULT 0 CHECK (payment_stars >= 0),
    winner_count INTEGER NOT NULL CHECK (winner_count BETWEEN 1 AND 100),
    target_participants INTEGER CHECK (target_participants IS NULL OR target_participants > 0),
    ends_at INTEGER,
    status TEXT NOT NULL CHECK (status IN ('active', 'ended', 'cancelled')),
    created_by INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    ended_at INTEGER,
    reminder_sent_at INTEGER,
    reminder_window_ms INTEGER,
    target_notified_at INTEGER,
    drawing_started_at INTEGER,
    subscription_notice_sent_at INTEGER,
    channel_message_id INTEGER,
    channel_media_message_id INTEGER,
    channel_chat_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS entries (
    giveaway_id INTEGER NOT NULL REFERENCES giveaways(id),
    user_id INTEGER NOT NULL,
    first_name TEXT,
    username TEXT,
    joined_at INTEGER NOT NULL,
    payment_charge_id TEXT UNIQUE,
    refunded_at INTEGER,
    refund_error TEXT,
    refund_claimed_at INTEGER,
    verified_channels INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (giveaway_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    giveaway_id INTEGER NOT NULL REFERENCES giveaways(id),
    user_id INTEGER NOT NULL,
    answer_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verifications (
    giveaway_id INTEGER NOT NULL REFERENCES giveaways(id),
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (giveaway_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS payment_intents (
    payload TEXT PRIMARY KEY,
    giveaway_id INTEGER NOT NULL REFERENCES giveaways(id),
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at INTEGER NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS one_pending_payment_per_user
    ON payment_intents (giveaway_id, user_id) WHERE status = 'pending';

  CREATE TABLE IF NOT EXISTS winners (
    giveaway_id INTEGER NOT NULL REFERENCES giveaways(id),
    user_id INTEGER NOT NULL,
    selected_at INTEGER NOT NULL,
    PRIMARY KEY (giveaway_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS giveaway_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giveaway_id INTEGER NOT NULL REFERENCES giveaways(id),
    actor_id INTEGER,
    event_type TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entry_channel_checks (
    giveaway_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    channel TEXT NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('entry', 'draw')),
    is_member INTEGER NOT NULL CHECK (is_member IN (0, 1)),
    checked_at INTEGER NOT NULL,
    PRIMARY KEY (giveaway_id, user_id, channel, stage),
    FOREIGN KEY (giveaway_id, user_id) REFERENCES entries(giveaway_id, user_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS giveaway_reactions (
    giveaway_id INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    is_reacted INTEGER NOT NULL CHECK (is_reacted IN (0, 1)),
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (giveaway_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS referral_visits (
    giveaway_id INTEGER NOT NULL REFERENCES giveaways(id),
    referrer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    opened_at INTEGER NOT NULL,
    joined_at INTEGER,
    PRIMARY KEY (giveaway_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS blocked_users (
    user_id INTEGER PRIMARY KEY,
    reason TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dashboard_login_challenges (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    code_hash TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    approved_by INTEGER,
    approved_at INTEGER,
    consumed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS dashboard_sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

const dashboardChallengeColumns = new Set(
  db.prepare("PRAGMA table_info(dashboard_login_challenges)").all().map((column) => column.name),
);
if (!dashboardChallengeColumns.has("code_hash")) {
  db.exec("ALTER TABLE dashboard_login_challenges ADD COLUMN code_hash TEXT");
}
if (!dashboardChallengeColumns.has("attempt_count")) {
  db.exec("ALTER TABLE dashboard_login_challenges ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0");
}

const giveawayColumns = new Set(
  db.prepare("PRAGMA table_info(giveaways)").all().map((column) => column.name),
);
if (!giveawayColumns.has("media_type")) {
  db.exec("ALTER TABLE giveaways ADD COLUMN media_type TEXT");
}

export function getDashboardWinners() {
  return db.prepare(`
    SELECT w.giveaway_id, g.title, w.user_id, e.first_name, e.username, w.selected_at
    FROM winners w
    JOIN giveaways g ON g.id = w.giveaway_id
    LEFT JOIN entries e ON e.giveaway_id = w.giveaway_id AND e.user_id = w.user_id
    ORDER BY w.selected_at DESC
    LIMIT 200
  `).all();
}
if (!giveawayColumns.has("media_file_id")) {
  db.exec("ALTER TABLE giveaways ADD COLUMN media_file_id TEXT");
}
for (const column of [
  "reminder_sent_at", "reminder_window_ms", "target_notified_at",
  "channel_message_id", "channel_media_message_id", "drawing_started_at",
  "subscription_notice_sent_at", "channel_chat_id",
]) {
  if (!giveawayColumns.has(column)) db.exec(`ALTER TABLE giveaways ADD COLUMN ${column} INTEGER`);
}
if (!giveawayColumns.has("require_reaction")) {
  db.exec("ALTER TABLE giveaways ADD COLUMN require_reaction INTEGER NOT NULL DEFAULT 0 CHECK (require_reaction IN (0, 1))");
}
const entryColumns = new Set(db.prepare("PRAGMA table_info(entries)").all().map((column) => column.name));
for (const [column, definition] of [
  ["first_name", "TEXT"],
  ["username", "TEXT"],
  ["refunded_at", "INTEGER"],
  ["refund_error", "TEXT"],
  ["refund_claimed_at", "INTEGER"],
  ["verified_channels", "INTEGER NOT NULL DEFAULT 0"],
  ["referrer_id", "INTEGER"],
]) {
  if (!entryColumns.has(column)) db.exec(`ALTER TABLE entries ADD COLUMN ${column} ${definition}`);
}

function addGiveawayEvent(giveawayId, eventType, actorId = null, details = {}) {
  db.prepare(`
    INSERT INTO giveaway_events (giveaway_id, actor_id, event_type, details, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(giveawayId, actorId, eventType, JSON.stringify(details), Date.now());
}

db.exec(`
  INSERT INTO giveaway_events (giveaway_id, actor_id, event_type, details, created_at)
  SELECT e.giveaway_id, e.user_id, 'payment_received',
    json_object('chargedStars', g.payment_stars, 'chargeId', e.payment_charge_id), e.joined_at
  FROM entries e
  JOIN giveaways g ON g.id = e.giveaway_id
  WHERE e.payment_charge_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM giveaway_events ev
      WHERE ev.giveaway_id = e.giveaway_id AND ev.actor_id = e.user_id
        AND ev.event_type = 'payment_received'
    )
`);

export function createGiveaway(input) {
  const createdAt = Date.now();
  const result = db.prepare(`
    INSERT INTO giveaways (
      title, prize, description, media_type, media_file_id, publish_channel, required_channels,
      require_reaction, payment_stars, winner_count, target_participants, ends_at,
      status, created_by, created_at, reminder_window_ms
    ) VALUES (
      @title, @prize, @description, @mediaType, @mediaFileId, @publishChannel, @requiredChannels,
      @requireReaction, @paymentStars, @winnerCount, @targetParticipants, @endsAt,
      'active', @createdBy, @createdAt, @reminderWindowMs
    )
  `).run({
    title: input.title,
    prize: input.prize,
    description: input.description,
    mediaType: input.mediaType || null,
    mediaFileId: input.mediaFileId || null,
    publishChannel: input.publishChannel,
    requiredChannels: JSON.stringify(input.requiredChannels),
    requireReaction: input.requireReaction ? 1 : 0,
    paymentStars: input.paymentStars,
    winnerCount: input.winnerCount,
    targetParticipants: input.targetParticipants,
    endsAt: input.endsAt,
    reminderWindowMs: input.reminderWindowMs ?? null,
    createdBy: input.createdBy,
    createdAt,
  });
  const giveaway = getGiveaway(Number(result.lastInsertRowid));
  addGiveawayEvent(giveaway.id, "created", input.createdBy, {
    title: giveaway.title,
    paymentStars: giveaway.payment_stars,
  });
  return giveaway;
}

export function getGiveaway(id) {
  const giveaway = db.prepare("SELECT * FROM giveaways WHERE id = ?").get(id);
  return giveaway ? { ...giveaway, required_channels: JSON.parse(giveaway.required_channels) } : null;
}

export function getActiveGiveaways() {
  return db.prepare("SELECT * FROM giveaways WHERE status = 'active' ORDER BY created_at DESC")
    .all()
    .map((giveaway) => ({ ...giveaway, required_channels: JSON.parse(giveaway.required_channels) }));
}

export function getRecentGiveaways(limit = 10) {
  return db.prepare("SELECT * FROM giveaways ORDER BY created_at DESC LIMIT ?")
    .all(limit)
    .map((giveaway) => ({ ...giveaway, required_channels: JSON.parse(giveaway.required_channels) }));
}

export function getEntryCount(giveawayId) {
  return db.prepare("SELECT COUNT(*) AS count FROM entries WHERE giveaway_id = ?")
    .get(giveawayId).count;
}

export function hasEntry(giveawayId, userId) {
  return Boolean(db.prepare("SELECT 1 FROM entries WHERE giveaway_id = ? AND user_id = ?")
    .get(giveawayId, userId));
}

export function addEntry(giveawayId, userId, paymentChargeId = null, participant = {}) {
  const result = db.prepare(`
    INSERT OR IGNORE INTO entries (
      giveaway_id, user_id, first_name, username, joined_at, payment_charge_id,
      verified_channels, referrer_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    giveawayId,
    userId,
    participant.firstName || null,
    participant.username || null,
    Date.now(),
    paymentChargeId,
    participant.verifiedChannels || 0,
    participant.referrerId && participant.referrerId !== userId ? participant.referrerId : null,
  );
  if (result.changes) {
    const channels = participant.verifiedChannelNames || [];
    const recordChannel = db.prepare(`
      INSERT OR REPLACE INTO entry_channel_checks
        (giveaway_id, user_id, channel, stage, is_member, checked_at)
      VALUES (?, ?, ?, 'entry', 1, ?)
    `);
    for (const channel of channels) recordChannel.run(giveawayId, userId, channel, Date.now());
    db.prepare(`
      UPDATE referral_visits SET joined_at = ?
      WHERE giveaway_id = ? AND user_id = ? AND referrer_id = ?
    `).run(Date.now(), giveawayId, userId, participant.referrerId || -1);
    addGiveawayEvent(giveawayId, paymentChargeId ? "payment_received" : "participant_joined", userId, {
      chargedStars: paymentChargeId ? getGiveaway(giveawayId)?.payment_stars || 0 : 0,
      chargeId: paymentChargeId,
      referrerId: participant.referrerId || null,
    });
  }
  return result.changes > 0;
}

export function saveChallenge({ id, giveawayId, userId, answerHash, expiresAt }) {
  db.prepare("DELETE FROM challenges WHERE expires_at < ?").run(Date.now());
  db.prepare(`
    INSERT INTO challenges (id, giveaway_id, user_id, answer_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, giveawayId, userId, answerHash, expiresAt, Date.now());
}

export function getChallenge(id) {
  return db.prepare("SELECT * FROM challenges WHERE id = ?").get(id);
}

export function recordChallengeAttempt(id, verified) {
  db.prepare(`
    UPDATE challenges
    SET attempts = attempts + 1, verified = CASE WHEN ? THEN 1 ELSE verified END
    WHERE id = ?
  `).run(verified ? 1 : 0, id);
}

export function saveVerification(giveawayId, userId, expiresAt) {
  db.prepare(`
    INSERT INTO verifications (giveaway_id, user_id, expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(giveaway_id, user_id) DO UPDATE SET expires_at = excluded.expires_at
  `).run(giveawayId, userId, expiresAt);
}

export function hasValidVerification(giveawayId, userId) {
  return Boolean(db.prepare(`
    SELECT 1 FROM verifications WHERE giveaway_id = ? AND user_id = ? AND expires_at > ?
  `).get(giveawayId, userId, Date.now()));
}

export function createPaymentIntent(payload, giveawayId, userId) {
  const existing = db.prepare(`
    SELECT payload FROM payment_intents
    WHERE giveaway_id = ? AND user_id = ? AND status = 'pending'
  `).get(giveawayId, userId);
  if (existing) return existing.payload;
  db.prepare(`
    INSERT INTO payment_intents (payload, giveaway_id, user_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(payload, giveawayId, userId, Date.now());
  return payload;
}

export function getPaymentIntent(payload) {
  return db.prepare("SELECT * FROM payment_intents WHERE payload = ?").get(payload);
}

export function markPaymentIntentPaid(payload) {
  db.prepare("UPDATE payment_intents SET status = 'paid' WHERE payload = ?")
    .run(payload);
}

export function getWinners(giveawayId) {
  return db.prepare("SELECT user_id FROM winners WHERE giveaway_id = ? ORDER BY selected_at")
    .all(giveawayId).map((row) => row.user_id);
}

export function getUserGiveawayCount(userId) {
  return db.prepare("SELECT COUNT(*) AS count FROM entries WHERE user_id = ?").get(userId).count;
}

export function getUserGiveaways(userId, limit = 10, offset = 0) {
  return db.prepare(`
    SELECT g.*, e.joined_at, e.payment_charge_id, e.refunded_at, e.refund_error,
      EXISTS (
        SELECT 1 FROM winners w WHERE w.giveaway_id = g.id AND w.user_id = e.user_id
      ) AS is_winner
    FROM entries e
    JOIN giveaways g ON g.id = e.giveaway_id
    WHERE e.user_id = ?
    ORDER BY e.joined_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset).map((giveaway) => ({
    ...giveaway,
    required_channels: JSON.parse(giveaway.required_channels),
  }));
}

export function getGiveawayStats(giveawayId) {
  return db.prepare(`
    SELECT COUNT(e.user_id) AS participant_count,
      (SELECT COUNT(*) FROM giveaway_events ev
        WHERE ev.giveaway_id = g.id AND ev.event_type = 'payment_received') AS paid_count,
      (SELECT COALESCE(SUM(CAST(json_extract(ev.details, '$.chargedStars') AS INTEGER)), 0)
        FROM giveaway_events ev
        WHERE ev.giveaway_id = g.id AND ev.event_type = 'payment_received') AS stars_collected,
      (SELECT COUNT(*) FROM giveaway_events ev
        WHERE ev.giveaway_id = g.id AND ev.event_type = 'payment_refunded') AS refunded_count,
      (SELECT COALESCE(SUM(CAST(json_extract(ev.details, '$.stars') AS INTEGER)), 0)
        FROM giveaway_events ev
        WHERE ev.giveaway_id = g.id AND ev.event_type = 'payment_refunded') AS stars_refunded,
      COALESCE(SUM(verified_channels), 0) AS verified_subscriptions
    FROM giveaways g LEFT JOIN entries e ON g.id = e.giveaway_id
    WHERE g.id = ?
  `).get(giveawayId);
}

export function getGiveawayEntries(giveawayId) {
  return db.prepare(`
    SELECT user_id, first_name, username, joined_at, payment_charge_id, refunded_at, refund_error,
      refund_claimed_at,
      verified_channels, referrer_id
    FROM entries WHERE giveaway_id = ? ORDER BY joined_at
  `).all(giveawayId);
}

export function getShuffledGiveawayEntries(giveawayId) {
  const entries = db.prepare("SELECT user_id FROM entries WHERE giveaway_id = ?").all(giveawayId);
  return selectWinners(entries, entries.length);
}

export function claimGiveawayDraw(giveawayId) {
  const now = Date.now();
  const changed = db.prepare(`
    UPDATE giveaways SET drawing_started_at = ?
    WHERE id = ? AND status = 'active'
      AND (drawing_started_at IS NULL OR drawing_started_at < ?)
  `).run(now, giveawayId, now - 30 * 60 * 1000).changes > 0;
  if (changed) addGiveawayEvent(giveawayId, "subscription_recheck_started");
  return changed;
}

export function releaseGiveawayDraw(giveawayId, errorMessage) {
  const changed = db.prepare(`
    UPDATE giveaways SET drawing_started_at = NULL
    WHERE id = ? AND status = 'active' AND drawing_started_at IS NOT NULL
  `).run(giveawayId).changes > 0;
  if (changed) {
    addGiveawayEvent(giveawayId, "subscription_recheck_failed", null, { error: errorMessage });
  }
  return changed;
}

export function getActiveGiveawaysNeedingSubscriptionNotice() {
  return db.prepare(`
    SELECT * FROM giveaways
    WHERE status = 'active'
      AND (
        subscription_notice_sent_at IS NULL
        OR (
          subscription_notice_sent_at < 0
          AND subscription_notice_sent_at > ?
        )
      )
    ORDER BY created_at
  `).all(-(Date.now() - 5 * 60 * 1000)).map((giveaway) => ({
    ...giveaway,
    required_channels: JSON.parse(giveaway.required_channels),
  }));
}

export function claimSubscriptionNotice(giveawayId) {
  return db.prepare(`
    UPDATE giveaways SET subscription_notice_sent_at = ?
    WHERE id = ? AND status = 'active'
      AND (
        subscription_notice_sent_at IS NULL
        OR (
          subscription_notice_sent_at < 0
          AND subscription_notice_sent_at > ?
        )
      )
  `).run(-Date.now(), giveawayId, -(Date.now() - 5 * 60 * 1000)).changes > 0;
}

export function releaseSubscriptionNotice(giveawayId) {
  db.prepare(`
    UPDATE giveaways SET subscription_notice_sent_at = NULL
    WHERE id = ? AND status = 'active' AND subscription_notice_sent_at < 0
  `).run(giveawayId);
}

export function markSubscriptionNoticeSent(giveawayId) {
  const changed = db.prepare(`
    UPDATE giveaways SET subscription_notice_sent_at = ?
    WHERE id = ? AND status = 'active' AND subscription_notice_sent_at < 0
  `).run(Date.now(), giveawayId).changes > 0;
  if (changed) addGiveawayEvent(giveawayId, "subscription_recheck_rule_announced");
  return changed;
}

export function getUnrefundedPayments(giveawayId) {
  return getGiveawayEntries(giveawayId)
    .filter((entry) => entry.payment_charge_id && !entry.refunded_at);
}

export function getGiveawayEvents(giveawayId, limit = 100) {
  return db.prepare(`
    SELECT actor_id, event_type, details, created_at
    FROM giveaway_events WHERE giveaway_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(giveawayId, limit).map((event) => ({ ...event, details: JSON.parse(event.details) }));
}

export function getGiveawayPaymentEvents(giveawayId) {
  return db.prepare(`
    SELECT actor_id, event_type, details, created_at
    FROM giveaway_events
    WHERE giveaway_id = ? AND event_type IN ('payment_received', 'payment_refunded', 'refund_failed')
    ORDER BY created_at
  `).all(giveawayId).map((event) => ({ ...event, details: JSON.parse(event.details) }));
}

export function updateGiveaway(giveawayId, patch, actorId) {
  const allowedColumns = new Set([
    "title", "prize", "description", "required_channels", "require_reaction", "winner_count",
    "target_participants", "ends_at", "reminder_window_ms",
  ]);
  const updates = Object.entries(patch);
  if (!updates.length || updates.some(([key]) => !allowedColumns.has(key))) {
    throw new Error("Invalid giveaway update.");
  }
  if (Object.hasOwn(patch, "require_reaction")
    && ![true, false, 0, 1].includes(patch.require_reaction)) {
    throw new Error("Invalid giveaway reaction requirement.");
  }
  const values = Object.fromEntries(updates.map(([key, value]) => [
    key,
    key === "required_channels" ? JSON.stringify(value)
      : key === "require_reaction" ? Number(Boolean(value)) : value,
  ]));
  const assignmentList = updates.map(([key]) => `${key} = @${key}`);
  if (Object.hasOwn(patch, "ends_at")) assignmentList.push("reminder_sent_at = NULL");
  if (Object.hasOwn(patch, "target_participants")) assignmentList.push("target_notified_at = NULL");
  const assignments = assignmentList.join(", ");
  const changed = db.prepare(`
    UPDATE giveaways SET ${assignments}
    WHERE id = @id AND status = 'active' AND drawing_started_at IS NULL
  `).run({ ...values, id: giveawayId }).changes > 0;
  if (changed) {
    if (Object.hasOwn(patch, "require_reaction")) {
      db.prepare("DELETE FROM giveaway_reactions WHERE giveaway_id = ?").run(giveawayId);
    }
    addGiveawayEvent(giveawayId, "edited", actorId, patch);
  }
  return changed;
}

export function recordGiveawayEvent(giveawayId, eventType, actorId = null, details = {}) {
  addGiveawayEvent(giveawayId, eventType, actorId, details);
}

export function claimRefund(giveawayId, userId) {
  return db.prepare(`
    UPDATE entries SET refund_claimed_at = ?, refund_error = NULL
    WHERE giveaway_id = ? AND user_id = ? AND payment_charge_id IS NOT NULL
      AND refunded_at IS NULL
      AND (refund_claimed_at IS NULL OR refund_claimed_at < ?)
  `).run(Date.now(), giveawayId, userId, Date.now() - 5 * 60 * 1000).changes > 0;
}

export function markRefundResult(giveawayId, userId, errorMessage = null, actorId = null) {
  const refunded = !errorMessage;
  const result = db.prepare(`
    UPDATE entries SET refunded_at = ?, refund_error = ?, refund_claimed_at = NULL
    WHERE giveaway_id = ? AND user_id = ? AND payment_charge_id IS NOT NULL AND refunded_at IS NULL
  `).run(refunded ? Date.now() : null, errorMessage, giveawayId, userId);
  if (result.changes) {
    addGiveawayEvent(giveawayId, refunded ? "payment_refunded" : "refund_failed", actorId, {
      userId,
      error: errorMessage,
      stars: refunded ? getGiveaway(giveawayId)?.payment_stars || 0 : undefined,
      chargeId: db.prepare("SELECT payment_charge_id FROM entries WHERE giveaway_id = ? AND user_id = ?")
        .get(giveawayId, userId)?.payment_charge_id,
    });
  }
  return result.changes > 0;
}

export function markReminderSent(giveawayId, sentAt = Date.now(), recipientCount = 0) {
  const changed = db.prepare(`
    UPDATE giveaways SET reminder_sent_at = ?
    WHERE id = ? AND status = 'active' AND reminder_sent_at IS NULL
  `).run(sentAt, giveawayId).changes > 0;
  if (changed) addGiveawayEvent(giveawayId, "ending_reminder_sent", null, { recipientCount });
  return changed;
}

export function markTargetNotified(giveawayId, actorId = null) {
  const changed = db.prepare(`
    UPDATE giveaways SET target_notified_at = ?
    WHERE id = ? AND status = 'active' AND target_notified_at IS NULL
  `).run(Date.now(), giveawayId).changes > 0;
  if (changed) addGiveawayEvent(giveawayId, "participant_limit_reached", actorId);
  return changed;
}

export function savePublishedMessageIds(giveawayId, messageId, mediaMessageId = null, channelChatId = null) {
  db.prepare(`
    UPDATE giveaways
    SET channel_message_id = ?, channel_media_message_id = ?, channel_chat_id = ?,
      subscription_notice_sent_at = ?
    WHERE id = ?
  `).run(messageId, mediaMessageId, channelChatId, Date.now(), giveawayId);
  addGiveawayEvent(giveawayId, "subscription_recheck_rule_announced");
}

export function setGiveawayChannelChatId(giveawayId, channelChatId) {
  if (!Number.isSafeInteger(channelChatId)) throw new Error("Invalid Telegram channel ID.");
  db.prepare("UPDATE giveaways SET channel_chat_id = ? WHERE id = ?")
    .run(channelChatId, giveawayId);
}

export function recordChannelReaction(channelChatId, messageId, userId, isReacted) {
  if (!Number.isSafeInteger(channelChatId) || !Number.isSafeInteger(messageId)
    || !Number.isSafeInteger(userId)) return false;
  const giveaway = db.prepare(`
    SELECT id FROM giveaways
    WHERE channel_chat_id = ? AND channel_message_id = ?
      AND status = 'active' AND require_reaction = 1
  `).get(channelChatId, messageId);
  if (!giveaway) return false;
  db.prepare(`
    INSERT INTO giveaway_reactions (giveaway_id, user_id, is_reacted, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(giveaway_id, user_id) DO UPDATE SET
      is_reacted = excluded.is_reacted,
      updated_at = excluded.updated_at
  `).run(giveaway.id, userId, isReacted ? 1 : 0, Date.now());
  return true;
}

export function hasGiveawayReaction(giveawayId, userId) {
  return Boolean(db.prepare(`
    SELECT 1 FROM giveaway_reactions
    WHERE giveaway_id = ? AND user_id = ? AND is_reacted = 1
  `).get(giveawayId, userId));
}

export function closeDatabase() {
  db.close();
}

export async function createDatabaseBackup() {
  const absoluteDatabasePath = path.resolve(databasePath);
  const backupDirectory = path.join(path.dirname(absoluteDatabasePath), "backups");
  const backupPrefix = `${path.parse(absoluteDatabasePath).name}-backup-`;
  fs.mkdirSync(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDirectory, `${backupPrefix}${timestamp}.sqlite`);
  await db.backup(backupPath);

  const backups = fs.readdirSync(backupDirectory)
    .filter((filename) => filename.startsWith(backupPrefix) && filename.endsWith(".sqlite"))
    .map((filename) => ({
      filename,
      createdAt: fs.statSync(path.join(backupDirectory, filename)).mtimeMs,
    }))
    .sort((left, right) => right.createdAt - left.createdAt);
  for (const backup of backups.slice(14)) {
    fs.unlinkSync(path.join(backupDirectory, backup.filename));
  }
  const size = fs.statSync(backupPath).size;
  return { path: backupPath, size };
}

export function cancelGiveaway(giveawayId, actorId = null) {
  const giveaway = getGiveaway(giveawayId);
  const changed = db.prepare(`
    UPDATE giveaways SET status = 'cancelled', ended_at = ?
    WHERE id = ? AND status = 'active' AND drawing_started_at IS NULL
  `).run(Date.now(), giveawayId).changes > 0;
  if (changed) addGiveawayEvent(giveawayId, "cancelled", actorId ?? giveaway?.created_by);
  return changed;
}

export function finalizeGiveaway(giveawayId, winnerIds, actorId = null, excludedCount = 0) {
  return db.transaction(() => {
    const giveaway = db.prepare("SELECT * FROM giveaways WHERE id = ? AND status = 'active' AND drawing_started_at IS NOT NULL")
      .get(giveawayId);
    if (!giveaway) return null;

    const entries = db.prepare("SELECT user_id FROM entries WHERE giveaway_id = ?").all(giveawayId);
    const entryIds = new Set(entries.map(({ user_id: userId }) => userId));
    if (winnerIds.some((userId) => !entryIds.has(userId)) || winnerIds.length > giveaway.winner_count) {
      throw new Error("The selected winners are not valid giveaway participants.");
    }
    const selectedAt = Date.now();
    const insertWinner = db.prepare(`
      INSERT INTO winners (giveaway_id, user_id, selected_at) VALUES (?, ?, ?)
    `);
    winnerIds.forEach((userId) => insertWinner.run(giveawayId, userId, selectedAt));

    const updated = db.prepare(`
      UPDATE giveaways SET status = 'ended', ended_at = ?, drawing_started_at = NULL
      WHERE id = ? AND status = 'active' AND drawing_started_at IS NOT NULL
    `).run(selectedAt, giveawayId);
    if (!updated.changes) return null;
    addGiveawayEvent(giveawayId, "ended", actorId, {
      participantCount: entries.length,
      winnerCount: winnerIds.length,
      excludedCount,
    });
    return {
      ...giveaway,
      status: "ended",
      ended_at: selectedAt,
      required_channels: JSON.parse(giveaway.required_channels),
      winners: winnerIds,
      participantCount: entries.length,
      excludedCount,
    };
  })();
}

export function trackReferralVisit(giveawayId, referrerId, userId) {
  if (!Number.isSafeInteger(giveawayId) || !Number.isSafeInteger(referrerId)
    || !Number.isSafeInteger(userId) || referrerId === userId) return false;
  const giveaway = getGiveaway(giveawayId);
  if (!giveaway) return false;
  db.prepare(`
    INSERT INTO referral_visits (giveaway_id, referrer_id, user_id, opened_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(giveaway_id, user_id) DO UPDATE SET
      referrer_id = excluded.referrer_id,
      opened_at = excluded.opened_at
  `).run(giveawayId, referrerId, userId, Date.now());
  return true;
}

export function getReferralReferrer(giveawayId, userId) {
  return db.prepare(`
    SELECT referrer_id FROM referral_visits WHERE giveaway_id = ? AND user_id = ?
  `).get(giveawayId, userId)?.referrer_id || null;
}

export function recordEntryChannelCheck(giveawayId, userId, channel, stage, isMember) {
  if (!["entry", "draw"].includes(stage)) throw new Error("Invalid subscription-check stage.");
  db.prepare(`
    INSERT INTO entry_channel_checks (giveaway_id, user_id, channel, stage, is_member, checked_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(giveaway_id, user_id, channel, stage) DO UPDATE SET
      is_member = excluded.is_member,
      checked_at = excluded.checked_at
  `).run(giveawayId, userId, channel, stage, isMember ? 1 : 0, Date.now());
}

export function isUserBlocked(userId) {
  return Boolean(db.prepare("SELECT 1 FROM blocked_users WHERE user_id = ?").get(userId));
}

export function getDashboardOverview() {
  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM giveaways WHERE status = 'active') AS active_giveaways,
      (SELECT COUNT(*) FROM entries) AS participants,
      (SELECT COUNT(*) FROM entries WHERE payment_charge_id IS NOT NULL) AS paid_entries,
      (SELECT COUNT(*) FROM entries WHERE payment_charge_id IS NULL) AS free_entries,
      (SELECT COUNT(*) FROM giveaway_events WHERE event_type = 'payment_received') AS successful_payments,
      (SELECT COALESCE(SUM(CAST(json_extract(details, '$.chargedStars') AS INTEGER)), 0)
        FROM giveaway_events WHERE event_type = 'payment_received') AS stars_collected,
      (SELECT COUNT(*) FROM giveaway_events WHERE event_type = 'payment_refunded') AS refund_count,
      (SELECT COALESCE(SUM(CAST(json_extract(details, '$.stars') AS INTEGER)), 0)
        FROM giveaway_events WHERE event_type = 'payment_refunded') AS stars_refunded,
      (SELECT COUNT(*) FROM blocked_users) AS blocked_users,
      (SELECT COUNT(*) FROM payment_intents WHERE status = 'pending') AS pending_payments,
      (SELECT COUNT(*) FROM giveaway_events WHERE event_type = 'refund_failed') AS failed_refunds,
      (SELECT COUNT(*) FROM payment_intents WHERE status = 'pending')
        + (SELECT COUNT(*) FROM giveaway_events WHERE event_type = 'refund_failed') AS review_items
  `).get();
  totals.stars_net = totals.stars_collected - totals.stars_refunded;
  const giveaways = getRecentGiveaways(50).map((giveaway) => ({
    id: giveaway.id,
    title: giveaway.title,
    prize: giveaway.prize,
    status: giveaway.status,
    publish_channel: giveaway.publish_channel,
    payment_stars: giveaway.payment_stars,
    winner_count: giveaway.winner_count,
    target_participants: giveaway.target_participants,
    required_channels: giveaway.required_channels,
    require_reaction: giveaway.require_reaction,
    participant_count: getEntryCount(giveaway.id),
    ends_at: giveaway.ends_at,
    created_at: giveaway.created_at,
  }));
  const channelStats = db.prepare(`
    SELECT g.id AS giveaway_id, g.title, c.channel,
      COUNT(CASE WHEN c.stage = 'entry' AND c.is_member = 1 THEN 1 END) AS checked_at_entry,
      COUNT(CASE WHEN c.stage = 'entry' THEN 1 END) AS checked_at_entry_total,
      COUNT(CASE WHEN c.stage = 'draw' AND c.is_member = 1 THEN 1 END) AS still_subscribed_at_draw,
      COUNT(CASE WHEN c.stage = 'draw' THEN 1 END) AS checked_at_draw
    FROM entry_channel_checks c
    JOIN giveaways g ON g.id = c.giveaway_id
    GROUP BY g.id, c.channel
    ORDER BY g.created_at DESC, c.channel
  `).all();
  const events = db.prepare(`
    SELECT ev.giveaway_id, g.title, ev.actor_id, ev.event_type, ev.details, ev.created_at
    FROM giveaway_events ev
    JOIN giveaways g ON g.id = ev.giveaway_id
    ORDER BY ev.created_at DESC
    LIMIT 8
  `).all().map((event) => ({ ...event, details: JSON.parse(event.details) }));
  return { totals, giveaways, channelStats, events };
}

export function getDashboardAnalytics(days = 14) {
  const boundedDays = Math.max(1, Math.min(90, Number(days) || 14));
  const now = Date.now();
  const periodMs = boundedDays * 24 * 60 * 60 * 1000;
  const cutoff = now - periodMs;
  const previousCutoff = cutoff - periodMs;
  const daily = db.prepare(`
    SELECT strftime('%Y-%m-%d', joined_at / 1000, 'unixepoch') AS day,
      COUNT(*) AS participants,
      SUM(CASE WHEN payment_charge_id IS NOT NULL THEN 1 ELSE 0 END) AS paid_entries
    FROM entries
    WHERE joined_at >= ?
    GROUP BY day
    ORDER BY day
  `).all(cutoff);
  const dailyStars = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day,
      COALESCE(SUM(CASE WHEN event_type = 'payment_received'
        THEN CAST(json_extract(details, '$.chargedStars') AS INTEGER) ELSE 0 END), 0) AS stars_collected,
      COALESCE(SUM(CASE WHEN event_type = 'payment_refunded'
        THEN CAST(json_extract(details, '$.stars') AS INTEGER) ELSE 0 END), 0) AS stars_refunded
    FROM giveaway_events
    WHERE created_at >= ? AND event_type IN ('payment_received', 'payment_refunded')
    GROUP BY day
    ORDER BY day
  `).all(cutoff);
  const dailyReferralVisits = db.prepare(`
    SELECT strftime('%Y-%m-%d', opened_at / 1000, 'unixepoch') AS day,
      COUNT(*) AS referral_visits
    FROM referral_visits
    WHERE opened_at >= ?
    GROUP BY day
  `).all(cutoff);
  const dailyReferralJoins = db.prepare(`
    SELECT strftime('%Y-%m-%d', joined_at / 1000, 'unixepoch') AS day,
      COUNT(*) AS referral_joins
    FROM referral_visits
    WHERE joined_at >= ?
    GROUP BY day
  `).all(cutoff);
  const dailyByDate = new Map(daily.map((row) => [row.day, {
    ...row,
    stars_collected: 0,
    stars_refunded: 0,
    referral_visits: 0,
    referral_joins: 0,
  }]));
  const ensureDay = (day) => {
    if (!dailyByDate.has(day)) {
      dailyByDate.set(day, {
        day,
        participants: 0,
        paid_entries: 0,
        stars_collected: 0,
        stars_refunded: 0,
        referral_visits: 0,
        referral_joins: 0,
      });
    }
    return dailyByDate.get(day);
  };
  for (const row of dailyStars) Object.assign(ensureDay(row.day), row);
  for (const row of dailyReferralVisits) Object.assign(ensureDay(row.day), row);
  for (const row of dailyReferralJoins) Object.assign(ensureDay(row.day), row);
  const hourly = db.prepare(`
    SELECT CAST(strftime('%H', joined_at / 1000, 'unixepoch') AS INTEGER) AS hour,
      COUNT(*) AS participants
    FROM entries
    WHERE joined_at >= ?
    GROUP BY hour
    ORDER BY hour
  `).all(cutoff);
  const channels = db.prepare(`
    SELECT channel,
      COUNT(DISTINCT CASE WHEN stage = 'entry'
        THEN giveaway_id || ':' || user_id END) AS checked_at_entry,
      COUNT(DISTINCT CASE WHEN stage = 'entry' AND is_member = 1
        THEN giveaway_id || ':' || user_id END) AS joined_subscribed,
      COUNT(DISTINCT CASE WHEN stage = 'draw' AND is_member = 1
        THEN giveaway_id || ':' || user_id END) AS remained_subscribed,
      COUNT(DISTINCT CASE WHEN stage = 'draw'
        THEN giveaway_id || ':' || user_id END) AS rechecked_at_draw
    FROM entry_channel_checks
    WHERE checked_at >= ?
    GROUP BY channel
    ORDER BY joined_subscribed DESC
  `).all(cutoff);
  const referrals = db.prepare(`
    SELECT COUNT(*) AS visits, SUM(CASE WHEN joined_at IS NOT NULL THEN 1 ELSE 0 END) AS joins
    FROM referral_visits
    WHERE opened_at >= ?
  `).get(cutoff);
  const comparison = db.prepare(`
    SELECT
      SUM(CASE WHEN e.joined_at >= ? THEN 1 ELSE 0 END) AS current_entries,
      SUM(CASE WHEN e.joined_at < ? THEN 1 ELSE 0 END) AS previous_entries,
      SUM(CASE WHEN e.joined_at >= ? AND e.payment_charge_id IS NOT NULL THEN 1 ELSE 0 END) AS current_paid_entries,
      SUM(CASE WHEN e.joined_at < ? AND e.payment_charge_id IS NOT NULL THEN 1 ELSE 0 END) AS previous_paid_entries,
      SUM(CASE WHEN e.joined_at >= ? AND e.payment_charge_id IS NOT NULL THEN g.payment_stars ELSE 0 END) AS current_stars,
      SUM(CASE WHEN e.joined_at < ? AND e.payment_charge_id IS NOT NULL THEN g.payment_stars ELSE 0 END) AS previous_stars
    FROM entries e
    JOIN giveaways g ON g.id = e.giveaway_id
    WHERE e.joined_at >= ?
  `).get(cutoff, cutoff, cutoff, cutoff, cutoff, cutoff, previousCutoff);
  const giveawayPerformance = db.prepare(`
    SELECT g.id AS giveaway_id, g.title,
      COUNT(e.user_id) AS entries,
      SUM(CASE WHEN e.payment_charge_id IS NOT NULL THEN 1 ELSE 0 END) AS paid_entries,
      COALESCE(SUM(CASE WHEN e.payment_charge_id IS NOT NULL THEN g.payment_stars ELSE 0 END), 0) AS stars_collected,
      (SELECT COUNT(*) FROM referral_visits r
        WHERE r.giveaway_id = g.id AND r.opened_at >= ?) AS referral_visits,
      (SELECT COUNT(*) FROM referral_visits r
        WHERE r.giveaway_id = g.id AND r.opened_at >= ? AND r.joined_at IS NOT NULL) AS referral_joins
    FROM giveaways g
    LEFT JOIN entries e ON e.giveaway_id = g.id AND e.joined_at >= ?
    GROUP BY g.id, g.title
    HAVING COUNT(e.user_id) > 0
    ORDER BY entries DESC, stars_collected DESC
    LIMIT 12
  `).all(cutoff, cutoff, cutoff);
  return {
    days: boundedDays,
    dailyMetricsAvailable: true,
    daily: [...dailyByDate.values()].sort((left, right) => left.day.localeCompare(right.day)),
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      participants: hourly.find((row) => row.hour === hour)?.participants || 0,
    })),
    channels,
    referrals: { visits: referrals.visits || 0, joins: referrals.joins || 0 },
    comparison: {
      current: {
        entries: comparison.current_entries || 0,
        paid_entries: comparison.current_paid_entries || 0,
        stars: comparison.current_stars || 0,
      },
      previous: {
        entries: comparison.previous_entries || 0,
        paid_entries: comparison.previous_paid_entries || 0,
        stars: comparison.previous_stars || 0,
      },
    },
    giveawayPerformance,
    publicationViews: null,
    publicationViewsNote: "Telegram Bot API does not provide a reliable way to fetch current channel-post view counts.",
  };
}

export function getDashboardPayments(search = "") {
  const query = `%${String(search).replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const rows = db.prepare(`
    SELECT e.giveaway_id, g.title, e.user_id, e.first_name, e.username,
      e.payment_charge_id, e.joined_at, e.refunded_at, e.refunded_at AS refund_created_at, e.refund_error,
      g.payment_stars AS stars,
      CASE
        WHEN e.refund_error IS NOT NULL THEN 'review'
        WHEN e.refunded_at IS NOT NULL THEN 'refunded'
        WHEN e.payment_charge_id IS NOT NULL THEN 'paid'
        ELSE 'free'
      END AS status
    FROM entries e JOIN giveaways g ON g.id = e.giveaway_id
    WHERE e.payment_charge_id IS NOT NULL
      AND (
        ? = '%%' OR CAST(e.user_id AS TEXT) LIKE ? ESCAPE '\\'
        OR COALESCE(e.payment_charge_id, '') LIKE ? ESCAPE '\\'
        OR g.title LIKE ? ESCAPE '\\'
      )
    UNION ALL
    SELECT p.giveaway_id, g.title, p.user_id, e.first_name, e.username,
      p.payload AS payment_charge_id, p.created_at AS joined_at,
      NULL AS refunded_at, NULL AS refund_created_at, NULL AS refund_error, g.payment_stars AS stars,
      'pending' AS status
    FROM payment_intents p
    JOIN giveaways g ON g.id = p.giveaway_id
    LEFT JOIN entries e ON e.giveaway_id = p.giveaway_id AND e.user_id = p.user_id
    WHERE p.status = 'pending' AND (
      ? = '%%' OR CAST(p.user_id AS TEXT) LIKE ? ESCAPE '\\'
      OR p.payload LIKE ? ESCAPE '\\'
      OR g.title LIKE ? ESCAPE '\\'
    )
    ORDER BY joined_at DESC
    LIMIT 500
  `).all(
    search ? query : "%%",
    search ? query : "%%", search ? query : "%%", search ? query : "%%",
    search ? query : "%%",
    search ? query : "%%", search ? query : "%%", search ? query : "%%",
  );
  const unmatchedPayments = db.prepare(`
    SELECT p.giveaway_id, g.title, p.actor_id AS user_id, NULL AS first_name, NULL AS username,
      json_extract(p.details, '$.chargeId') AS payment_charge_id,
      p.created_at AS joined_at,
      (SELECT MAX(r.created_at) FROM giveaway_events r
        WHERE r.event_type = 'payment_refunded'
          AND json_extract(r.details, '$.chargeId') = json_extract(p.details, '$.chargeId')) AS refunded_at,
      (SELECT MAX(r.created_at) FROM giveaway_events r
        WHERE r.event_type = 'payment_refunded'
          AND json_extract(r.details, '$.chargeId') = json_extract(p.details, '$.chargeId')) AS refund_created_at,
      (SELECT json_extract(r.details, '$.error') FROM giveaway_events r
        WHERE r.event_type = 'refund_failed'
          AND json_extract(r.details, '$.chargeId') = json_extract(p.details, '$.chargeId')
        ORDER BY r.created_at DESC LIMIT 1) AS refund_error,
      CAST(json_extract(p.details, '$.chargedStars') AS INTEGER) AS stars,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM giveaway_events r
          WHERE r.event_type = 'payment_refunded'
            AND json_extract(r.details, '$.chargeId') = json_extract(p.details, '$.chargeId')
        ) THEN 'refunded'
        WHEN EXISTS (
          SELECT 1 FROM giveaway_events r
          WHERE r.event_type = 'refund_failed'
            AND json_extract(r.details, '$.chargeId') = json_extract(p.details, '$.chargeId')
        ) THEN 'review'
        ELSE 'paid'
      END AS status
    FROM giveaway_events p
    JOIN giveaways g ON g.id = p.giveaway_id
    WHERE p.event_type = 'payment_received'
      AND json_extract(p.details, '$.chargeId') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM entries e
        WHERE e.payment_charge_id = json_extract(p.details, '$.chargeId')
      )
      AND (
        ? = '%%' OR CAST(p.actor_id AS TEXT) LIKE ? ESCAPE '\\'
        OR json_extract(p.details, '$.chargeId') LIKE ? ESCAPE '\\'
        OR g.title LIKE ? ESCAPE '\\'
      )
    ORDER BY p.created_at DESC
    LIMIT 500
  `).all(
    search ? query : "%%",
    search ? query : "%%", search ? query : "%%", search ? query : "%%",
  );
  return [...rows, ...unmatchedPayments]
    .sort((left, right) => right.joined_at - left.joined_at)
    .slice(0, 500);
}

export function getDashboardParticipants(search = "") {
  const query = `%${String(search).replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  return db.prepare(`
    SELECT e.giveaway_id, g.title AS giveaway_title, e.user_id, e.first_name, e.username,
      e.joined_at, e.payment_charge_id, e.verified_channels, e.referrer_id,
      b.reason AS blocked_reason,
      EXISTS (SELECT 1 FROM winners w WHERE w.giveaway_id = e.giveaway_id AND w.user_id = e.user_id) AS is_winner
    FROM entries e
    JOIN giveaways g ON g.id = e.giveaway_id
    LEFT JOIN blocked_users b ON b.user_id = e.user_id
    WHERE ? = '%%'
      OR CAST(e.user_id AS TEXT) LIKE ? ESCAPE '\\'
      OR COALESCE(e.username, '') LIKE ? ESCAPE '\\'
      OR COALESCE(e.first_name, '') LIKE ? ESCAPE '\\'
      OR g.title LIKE ? ESCAPE '\\'
    ORDER BY e.joined_at DESC
    LIMIT 500
  `).all(
    search ? query : "%%",
    search ? query : "%%", search ? query : "%%", search ? query : "%%", search ? query : "%%",
  );
}

export function getDashboardReferrals() {
  return db.prepare(`
    SELECT r.giveaway_id, g.title, r.referrer_id,
      COUNT(*) AS visits,
      SUM(CASE WHEN r.joined_at IS NOT NULL THEN 1 ELSE 0 END) AS joins
    FROM referral_visits r
    JOIN giveaways g ON g.id = r.giveaway_id
    GROUP BY r.giveaway_id, r.referrer_id
    ORDER BY joins DESC, visits DESC
    LIMIT 500
  `).all();
}

export function getDashboardRiskSignals() {
  const repeatedCaptcha = db.prepare(`
    SELECT c.giveaway_id, g.title, c.user_id, COUNT(*) AS attempts,
      SUM(c.attempts) AS wrong_answers, MAX(c.created_at) AS last_attempt
    FROM challenges c JOIN giveaways g ON g.id = c.giveaway_id
    GROUP BY c.giveaway_id, c.user_id
    HAVING SUM(c.attempts) >= 3
    ORDER BY last_attempt DESC
    LIMIT 100
  `).all();
  const rapidEntries = db.prepare(`
    SELECT user_id, COUNT(*) AS entries, MIN(joined_at) AS first_join, MAX(joined_at) AS last_join
    FROM entries
    WHERE joined_at >= ?
    GROUP BY user_id
    HAVING COUNT(*) >= 4
    ORDER BY entries DESC
    LIMIT 100
  `).all(Date.now() - 24 * 60 * 60 * 1000);
  return { repeatedCaptcha, rapidEntries };
}

export function getDashboardBlacklist() {
  return db.prepare(`
    SELECT user_id, reason, created_by, created_at FROM blocked_users ORDER BY created_at DESC
  `).all();
}

export function addDashboardBlacklistEntry(userId, reason, actorId) {
  db.prepare(`
    INSERT INTO blocked_users (user_id, reason, created_by, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET reason = excluded.reason,
      created_by = excluded.created_by, created_at = excluded.created_at
  `).run(userId, reason, actorId, Date.now());
}

export function removeDashboardBlacklistEntry(userId) {
  return db.prepare("DELETE FROM blocked_users WHERE user_id = ?").run(userId).changes > 0;
}

export function getDashboardSystemStatus() {
  const databaseBytes = fs.statSync(path.resolve(databasePath)).size;
  const backupDirectory = path.join(path.dirname(path.resolve(databasePath)), "backups");
  const backupFiles = fs.existsSync(backupDirectory)
    ? fs.readdirSync(backupDirectory, { withFileTypes: true })
    : [];
  const lastBackup = backupFiles
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sqlite"))
    .map((entry) => {
      const filePath = path.join(backupDirectory, entry.name);
      const stats = fs.statSync(filePath);
      return { name: path.basename(filePath), size: stats.size, createdAt: stats.mtimeMs };
    })
    .sort((left, right) => right.createdAt - left.createdAt)[0] || null;
  return {
    databaseBytes,
    databaseCheck: db.pragma("quick_check", { simple: true }),
    lastBackup,
    latestEventAt: db.prepare("SELECT MAX(created_at) AS created_at FROM giveaway_events").get().created_at,
  };
}

export function getDatabaseFilePath() {
  return path.resolve(databasePath);
}

export function createDashboardLoginChallenge(id, expiresAt, codeHash, adminId) {
  const now = Date.now();
  db.prepare("DELETE FROM dashboard_login_challenges WHERE expires_at < ?").run(now);
  db.prepare("DELETE FROM dashboard_sessions WHERE expires_at < ?").run(now);
  db.prepare(`
    INSERT INTO dashboard_login_challenges (id, created_at, expires_at, code_hash, approved_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, now, expiresAt, codeHash, adminId);
}

export function revokeDashboardLoginChallenges(ids) {
  const revoke = db.prepare(`
    UPDATE dashboard_login_challenges SET consumed_at = ?
    WHERE id = ? AND consumed_at IS NULL
  `);
  const now = Date.now();
  db.transaction((challengeIds) => {
    for (const id of challengeIds) revoke.run(now, id);
  })(ids);
}

export function consumeDashboardLoginChallenge(challengeId, codeHash, tokenHash, ttlMs, maxAttempts) {
  return db.transaction(() => {
    const challenge = db.prepare(`
      SELECT * FROM dashboard_login_challenges
      WHERE id = ? AND approved_by IS NOT NULL AND consumed_at IS NULL AND expires_at > ?
    `).get(challengeId, Date.now());
    if (!challenge) return { session: null, locked: false };
    if (challenge.attempt_count >= maxAttempts) return { session: null, locked: true };
    db.prepare(`
      UPDATE dashboard_login_challenges SET attempt_count = attempt_count + 1
      WHERE id = ? AND attempt_count < ?
    `).run(challengeId, maxAttempts);
    if (challenge.code_hash !== codeHash) {
      return { session: null, locked: challenge.attempt_count + 1 >= maxAttempts };
    }
    const consumed = db.prepare(`
      UPDATE dashboard_login_challenges SET consumed_at = ?
      WHERE id = ? AND consumed_at IS NULL AND attempt_count <= ?
    `).run(Date.now(), challengeId, maxAttempts).changes;
    if (!consumed) return { session: null, locked: true };
    const createdAt = Date.now();
    db.prepare(`
      INSERT INTO dashboard_sessions (token_hash, admin_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(tokenHash, challenge.approved_by, createdAt, createdAt + ttlMs);
    return {
      session: { adminId: challenge.approved_by, expiresAt: createdAt + ttlMs },
      locked: false,
    };
  })();
}

export function getDashboardSession(tokenHash) {
  const session = db.prepare(`
    SELECT admin_id, expires_at FROM dashboard_sessions WHERE token_hash = ?
  `).get(tokenHash);
  if (!session || session.expires_at <= Date.now()) {
    db.prepare("DELETE FROM dashboard_sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  return session;
}

export function deleteDashboardSession(tokenHash) {
  db.prepare("DELETE FROM dashboard_sessions WHERE token_hash = ?").run(tokenHash);
}
