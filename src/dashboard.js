import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  addDashboardBlacklistEntry,
  consumeDashboardLoginChallenge,
  createDashboardLoginChallenge,
  deleteDashboardSession,
  getDashboardAnalytics,
  getDashboardBlacklist,
  getDashboardOverview,
  getDashboardParticipants,
  getDashboardPayments,
  getDashboardReferrals,
  getDashboardRiskSignals,
  getDashboardSession,
  getDashboardSystemStatus,
  getDashboardWinners,
  getDatabaseFilePath,
  revokeDashboardLoginChallenges,
  removeDashboardBlacklistEntry,
} from "./store.js";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const threeDirectory = fileURLToPath(new URL("../node_modules/three/", import.meta.url));
const loginTtlMs = 5 * 60 * 1000;
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000;
const maxLoginCodeAttempts = 5;
const pendingLoginCodes = new Map();
const loginCodePepper = randomBytes(32);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function hashLoginCode(challengeId, code) {
  return createHmac("sha256", loginCodePepper).update(`${challengeId}:${code}`).digest("hex");
}

function sendJson(response, status, data, extraHeaders = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  response.end(JSON.stringify(data));
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return ["", ""];
    try {
      return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
    } catch {
      return ["", ""];
    }
  }).filter(([key]) => key));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 10_000) throw Object.assign(new Error("Request body is too large."), { statusCode: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 });
  }
}

function escapeCsv(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  return `\uFEFF${columns.map(escapeCsv).join(",")}\r\n${rows
    .map((row) => columns.map((column) => escapeCsv(row[column])).join(","))
    .join("\r\n")}\r\n`;
}

function parseUserId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw Object.assign(new Error("Telegram ID must be a positive integer."), { statusCode: 400 });
  return id;
}

function parseSearch(value) {
  return String(value || "").trim().slice(0, 100);
}

function serveStatic(requestPath, request, response) {
  const requestedPath = requestPath === "/" ? "index.html" : decodeURIComponent(requestPath.slice(1));
  const absolutePath = path.resolve(publicDirectory, requestedPath);
  if (!absolutePath.startsWith(`${path.resolve(publicDirectory)}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  let filePath = absolutePath;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(publicDirectory, "index.html");
  }
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(filePath).pipe(response);
}

function serveThreeModule(requestPath, request, response) {
  const moduleFiles = {
    "/vendor/three.module.min.js": path.join(threeDirectory, "build", "three.module.min.js"),
    "/vendor/three.core.min.js": path.join(threeDirectory, "build", "three.core.min.js"),
    "/vendor/orbit-controls.js": path.join(threeDirectory, "examples", "jsm", "controls", "OrbitControls.js"),
  };
  const filePath = moduleFiles[requestPath];
  if (!filePath || !fs.existsSync(filePath)) {
    response.writeHead(404).end();
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  if (requestPath === "/vendor/orbit-controls.js") {
    content = content.replaceAll('from "three"', 'from "/vendor/three.module.min.js"')
      .replaceAll("from 'three'", 'from "/vendor/three.module.min.js"');
  }
  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Type": "text/javascript; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  response.end(content);
}

export function createDashboardServer({ bot, adminIds }) {
  const loginAttempts = new Map();

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      if (url.pathname.startsWith("/api/") && request.method !== "GET" && request.method !== "HEAD") {
        const origin = request.headers.origin;
        const host = request.headers.host;
        if (origin) {
          try {
            if (new URL(origin).host !== host) {
              sendJson(response, 403, { error: "Cross-origin requests are not allowed." });
              return;
            }
          } catch {
            sendJson(response, 403, { error: "Invalid request origin." });
            return;
          }
        }
      }

      if (url.pathname === "/api/health" && request.method === "GET") {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (url.pathname === "/api/login" && request.method === "POST") {
        const ip = request.socket.remoteAddress || "unknown";
        const currentTime = Date.now();
        const record = loginAttempts.get(ip);
        if (record && currentTime - record.startedAt < 60_000 && record.count >= 8) {
          sendJson(response, 429, { error: "Слишком много попыток входа. Подождите минуту." });
          return;
        }
        loginAttempts.set(ip, record && currentTime - record.startedAt < 60_000
          ? { ...record, count: record.count + 1 }
          : { startedAt: currentTime, count: 1 });
        const requestId = randomUUID();
        for (const [id, pending] of pendingLoginCodes) {
          if (pending.expiresAt <= currentTime) pendingLoginCodes.delete(id);
        }
        const codes = new Set();
        const candidates = [];
        try {
          for (const adminId of adminIds) {
            let code;
            do {
              code = String(randomInt(0, 1_000_000)).padStart(6, "0");
            } while (codes.has(code));
            codes.add(code);
            const challengeId = randomUUID();
            createDashboardLoginChallenge(
              challengeId,
              currentTime + loginTtlMs,
              hashLoginCode(challengeId, code),
              adminId,
            );
            try {
              await bot.telegram.sendMessage(
                adminId,
                `Код для входа в веб-панель: ${code}\n\nКод действует 5 минут и используется один раз. Если вы не запрашивали вход, проигнорируйте это сообщение.`,
              );
              candidates.push({
                adminId,
                challengeId,
                codeHash: hashLoginCode(requestId, code),
                challengeCodeHash: hashLoginCode(challengeId, code),
              });
            } catch (error) {
              revokeDashboardLoginChallenges([challengeId]);
              console.error(`Could not send dashboard login code to administrator ${adminId}:`, error);
            }
          }
        } catch (error) {
          revokeDashboardLoginChallenges(candidates.map(({ challengeId }) => challengeId));
          sendJson(response, 500, { error: "Не удалось подготовить код входа. Попробуйте ещё раз." });
          return;
        }
        if (!candidates.length) {
          sendJson(response, 502, { error: "Бот не смог отправить код. Откройте чат с ботом и нажмите /start, затем попробуйте снова." });
          return;
        }
        pendingLoginCodes.set(requestId, { candidates, expiresAt: currentTime + loginTtlMs, attempts: 0 });
        sendJson(response, 201, {
          challengeId: requestId,
          expiresAt: currentTime + loginTtlMs,
          delivered: candidates.length,
          deliveryWarning: candidates.length < adminIds.size,
        });
        return;
      }

      if (url.pathname === "/api/login/verify" && request.method === "POST") {
        const body = await readJson(request);
        const challengeId = String(body.challengeId || "");
        const code = String(body.code || "");
        if (!/^[0-9a-f-]{36}$/.test(challengeId) || !/^\d{6}$/.test(code)) {
          sendJson(response, 400, { error: "Введите шестизначный код из Telegram." });
          return;
        }
        const loginRequest = pendingLoginCodes.get(challengeId);
        if (!loginRequest || loginRequest.expiresAt <= Date.now()) {
          pendingLoginCodes.delete(challengeId);
          sendJson(response, 410, { error: "Срок действия кода истёк. Запросите новый код." });
          return;
        }
        if (loginRequest.attempts >= maxLoginCodeAttempts) {
          sendJson(response, 429, { error: "Превышено число попыток. Запросите новый код в Telegram." });
          return;
        }
        loginRequest.attempts += 1;
        const submittedHash = Buffer.from(hashLoginCode(challengeId, code), "hex");
        const matched = loginRequest.candidates.find(({ codeHash }) => (
          timingSafeEqual(submittedHash, Buffer.from(codeHash, "hex"))
        ));
        if (!matched) {
          if (loginRequest.attempts >= maxLoginCodeAttempts) {
            revokeDashboardLoginChallenges(loginRequest.candidates.map(({ challengeId: id }) => id));
            pendingLoginCodes.delete(challengeId);
          }
          sendJson(response, loginRequest.attempts >= maxLoginCodeAttempts ? 429 : 401, {
            error: loginRequest.attempts >= maxLoginCodeAttempts
              ? "Превышено число попыток. Запросите новый код в Telegram."
              : "Код неверный или запрос истёк. Проверьте сообщение от бота и попробуйте ещё раз.",
          });
          return;
        }
        const token = randomBytes(32).toString("base64url");
        const result = consumeDashboardLoginChallenge(
          matched.challengeId,
          matched.challengeCodeHash,
          hashToken(token),
          sessionTtlMs,
          maxLoginCodeAttempts,
        );
        if (!result.session) {
          revokeDashboardLoginChallenges(loginRequest.candidates.map(({ challengeId: id }) => id));
          pendingLoginCodes.delete(challengeId);
          sendJson(response, 410, { error: "Код истёк или уже использован. Запросите новый." });
          return;
        }
        revokeDashboardLoginChallenges(loginRequest.candidates
          .filter(({ challengeId: id }) => id !== matched.challengeId)
          .map(({ challengeId: id }) => id));
        pendingLoginCodes.delete(challengeId);
        const secure = request.socket.encrypted || request.headers["x-forwarded-proto"] === "https";
        response.setHeader("Set-Cookie", `giveaway_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(sessionTtlMs / 1000)}${secure ? "; Secure" : ""}`);
        sendJson(response, 200, { authenticated: true, expiresAt: result.session.expiresAt });
        return;
      }

      const cookies = parseCookies(request.headers.cookie);
      const sessionToken = cookies.giveaway_admin_session;
      const session = sessionToken ? getDashboardSession(hashToken(sessionToken)) : null;
      const adminId = session?.admin_id;
      const isAuthorized = Number.isSafeInteger(adminId) && adminIds.has(adminId);

      if (url.pathname === "/api/logout" && request.method === "POST") {
        if (sessionToken) deleteDashboardSession(hashToken(sessionToken));
        sendJson(response, 200, { ok: true }, {
          "Set-Cookie": "giveaway_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
        });
        return;
      }

      if (url.pathname === "/api/session" && request.method === "GET") {
        if (!isAuthorized) {
          sendJson(response, 401, { authenticated: false });
          return;
        }
        sendJson(response, 200, { authenticated: true, adminId });
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        if (!isAuthorized) {
          sendJson(response, 401, { error: "Требуется подтверждение входа администратором в Telegram." });
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/overview") {
          sendJson(response, 200, getDashboardOverview());
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/analytics") {
          sendJson(response, 200, getDashboardAnalytics(url.searchParams.get("days")));
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/payments") {
          sendJson(response, 200, getDashboardPayments(parseSearch(url.searchParams.get("q"))));
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/participants") {
          sendJson(response, 200, getDashboardParticipants(parseSearch(url.searchParams.get("q"))));
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/referrals") {
          sendJson(response, 200, getDashboardReferrals());
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/risk") {
          sendJson(response, 200, getDashboardRiskSignals());
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/blacklist") {
          sendJson(response, 200, getDashboardBlacklist());
          return;
        }
        if (request.method === "POST" && url.pathname === "/api/blacklist") {
          const body = await readJson(request);
          const userId = parseUserId(body.userId);
          const reason = String(body.reason || "").trim().slice(0, 500);
          if (!reason) throw Object.assign(new Error("Укажите причину ограничения."), { statusCode: 400 });
          addDashboardBlacklistEntry(userId, reason, adminId);
          sendJson(response, 201, { ok: true });
          return;
        }
        const blacklistMatch = url.pathname.match(/^\/api\/blacklist\/(\d+)$/);
        if (blacklistMatch && request.method === "DELETE") {
          sendJson(response, 200, { removed: removeDashboardBlacklistEntry(parseUserId(blacklistMatch[1])) });
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/winners") {
          sendJson(response, 200, getDashboardWinners());
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/system") {
          const status = getDashboardSystemStatus();
          const lastBackup = status.lastBackup
            ? { ...status.lastBackup, name: path.basename(status.lastBackup.name) }
            : null;
          sendJson(response, 200, {
            ...status,
            lastBackup,
            databasePath: path.basename(getDatabaseFilePath()),
            uptimeSeconds: Math.floor(process.uptime()),
            nodeVersion: process.version,
            memoryBytes: process.memoryUsage().rss,
          });
          return;
        }
        const exportMatch = url.pathname.match(/^\/api\/export\/(participants|payments|referrals|winners)\.csv$/);
        if (exportMatch && request.method === "GET") {
          const tables = {
            participants: getDashboardParticipants(""),
            payments: getDashboardPayments(""),
            referrals: getDashboardReferrals(),
            winners: getDashboardWinners(),
          };
          response.writeHead(200, {
            "Cache-Control": "no-store",
            "Content-Disposition": `attachment; filename="${exportMatch[1]}-${new Date().toISOString().slice(0, 10)}.csv"`,
            "Content-Type": "text/csv; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          });
          response.end(toCsv(tables[exportMatch[1]]));
          return;
        }
        sendJson(response, 404, { error: "API endpoint not found." });
        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      if (url.pathname.startsWith("/vendor/")) {
        serveThreeModule(url.pathname, request, response);
        return;
      }
      serveStatic(url.pathname, request, response);
    } catch (error) {
      console.error("Dashboard request failed:", error);
      sendJson(response, error.statusCode || 500, {
        error: error.statusCode ? error.message : "Внутренняя ошибка панели. Проверьте журнал приложения.",
      });
    }
  });

  return server;
}
