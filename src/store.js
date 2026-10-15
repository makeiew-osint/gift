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
    channel_media_message_id INTEGER
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
`);

const giveawayColumns = new Set(
  db.prepare("PRAGMA table_info(giveaways)").all().map((column) => column.name),
);
if (!giveawayColumns.has("media_type")) {
  db.exec("ALTER TABLE giveaways ADD COLUMN media_type TEXT");
}
if (!giveawayColumns.has("media_file_id")) {
  db.exec("ALTER TABLE giveaways ADD COLUMN media_file_id TEXT");
}
for (const column of [
  "reminder_sent_at", "reminder_window_ms", "target_notified_at",
  "channel_message_id", "channel_media_message_id", "drawing_started_at",
  "subscription_notice_sent_at",
]) {
  if (!giveawayColumns.has(column)) db.exec(`ALTER TABLE giveaways ADD COLUMN ${column} INTEGER`);
}
const entryColumns = new Set(db.prepare("PRAGMA table_info(entries)").all().map((column) => column.name));
for (const [column, definition] of [
  ["first_name", "TEXT"],
  ["username", "TEXT"],
  ["refunded_at", "INTEGER"],
  ["refund_error", "TEXT"],
  ["refund_claimed_at", "INTEGER"],
  ["verified_channels", "INTEGER NOT NULL DEFAULT 0"],
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
      payment_stars, winner_count, target_participants, ends_at,
      status, created_by, created_at, reminder_window_ms
    ) VALUES (
      @title, @prize, @description, @mediaType, @mediaFileId, @publishChannel, @requiredChannels,
      @paymentStars, @winnerCount, @targetParticipants, @endsAt,
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
      giveaway_id, user_id, first_name, username, joined_at, payment_charge_id, verified_channels
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    giveawayId,
    userId,
    participant.firstName || null,
    participant.username || null,
    Date.now(),
    paymentChargeId,
    participant.verifiedChannels || 0,
  );
  if (result.changes) {
    addGiveawayEvent(giveawayId, paymentChargeId ? "payment_received" : "participant_joined", userId, {
      chargedStars: paymentChargeId ? getGiveaway(giveawayId)?.payment_stars || 0 : 0,
      chargeId: paymentChargeId,
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
      verified_channels
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
    "title", "prize", "description", "required_channels", "winner_count",
    "target_participants", "ends_at", "reminder_window_ms",
  ]);
  const updates = Object.entries(patch);
  if (!updates.length || updates.some(([key]) => !allowedColumns.has(key))) {
    throw new Error("Invalid giveaway update.");
  }
  const values = Object.fromEntries(updates.map(([key, value]) => [
    key,
    key === "required_channels" ? JSON.stringify(value) : value,
  ]));
  const assignmentList = updates.map(([key]) => `${key} = @${key}`);
  if (Object.hasOwn(patch, "ends_at")) assignmentList.push("reminder_sent_at = NULL");
  if (Object.hasOwn(patch, "target_participants")) assignmentList.push("target_notified_at = NULL");
  const assignments = assignmentList.join(", ");
  const changed = db.prepare(`
    UPDATE giveaways SET ${assignments}
    WHERE id = @id AND status = 'active' AND drawing_started_at IS NULL
  `).run({ ...values, id: giveawayId }).changes > 0;
  if (changed) addGiveawayEvent(giveawayId, "edited", actorId, patch);
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

export function savePublishedMessageIds(giveawayId, messageId, mediaMessageId = null) {
  db.prepare(`
    UPDATE giveaways
    SET channel_message_id = ?, channel_media_message_id = ?, subscription_notice_sent_at = ?
    WHERE id = ?
  `).run(messageId, mediaMessageId, Date.now(), giveawayId);
  addGiveawayEvent(giveawayId, "subscription_recheck_rule_announced");
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
