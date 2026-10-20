const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const strings = {
  ru: {
    overview: "Обзор", analytics: "Аналитика", finance: "Финансы", participants: "Участники",
    referrals: "Рефералы", antifraud: "Антифрод", blacklist: "Чёрный список", winners: "Итоги",
    system: "Система", logout: "Выйти", breadcrumb: "КОНСОЛЬ", dataFooter: "Только сохранённые данные · Telegram Giveaway Bot",
    navWorkspace: "РАБОЧЕЕ ПРОСТРАНСТВО", navReview: "ПРОВЕРКА И ФИНАНСЫ", navSystem: "СИСТЕМА",
    adminLabel: "АДМИН", giveawayRecord: "РОЗЫГРЫШ", eventLog: "ЖУРНАЛ СОБЫТИЙ",
    publishedTo: "КАНАЛ ПУБЛИКАЦИИ",
    freeEntries: "Бесплатные участия", paidEntries: "Платные участия",
    newParticipants: "Участия за 14 дней", paymentBreakdown: "Финансовая сводка",
    paymentCount: "Успешные оплаты", refundCount: "Возвраты", reviewQueue: "Ожидают проверки",
    giveawayGoal: "Цель участников", requiredChannels: "Проверка подписок",
    progressToGoal: "Прогресс набора", timeLeft: "До завершения",
    giveawayReached: "Цель набрана", deadlinePassed: "Время вышло", noDeadline: "Срок не задан",
    modelGift: "Подарок", modelTrophy: "Победители", modelStars: "Стоимость участия",
    modelSelectHint: "Выберите объект или наведите на него",
    loadingView: "Загружаю проверенные данные…", retry: "Повторить",
    entryChecks: "подписаны / проверены", drawChecks: "подписаны / проверены",
    drawRechecks: "Повторно проверены", activityTrend: "Регистрации за 14 дней",
    activityLegend: "Все участия · голубой штрих — платные",
    referralSummary: "Реферальная статистика", referralVisits14: "Переходы за 14 дней",
    referralJoins14: "Участия из приглашений",     noChannelChecks: "Для этого розыгрыша обязательные каналы не заданы.",
    noRecentActivity: "За выбранный период регистраций нет.",
    panelStatus: "Сессия активна", activeGiveaways: "Активные розыгрыши",
    latestEvents: "Последние события", statusActive: "идёт набор", emptyGiveaways: "Пока нет розыгрышей.",
    participantsCount: "Участников", stars: "Собрано Stars", returned: "Возвращено Stars", netStars: "Остаток после возвратов", refundDate: "Дата возврата", payments: "Оплат",
    free: "Бесплатно", paid: "платный вход", ending: "Окончание", channels: "Обязательные каналы",
    conditions: "Условие участия", reactionRequired: "Поставить реакцию",
    noEvents: "Событий пока нет.", viewAll: "Открыть список →", loadError: "Не удалось загрузить данные.",
    search: "Поиск по ID, имени, username или розыгрышу", export: "Скачать CSV", noRows: "По этому запросу нет записей.",
    paymentId: "Платёж / запись", user: "Участник", giveaway: "Розыгрыш", amount: "Сумма", date: "Дата", status: "Статус",
    joined: "Участие", checkedAtDraw: "Подписан на повторной проверке", joinedSubscribed: "Подписаны / проверены при входе",
    visits: "Переходы", joins: "Участия", conversion: "Конверсия", uniqueVisits: "Уникальные переходы",
    referralsNote: "Переход засчитывается один раз на человека и розыгрыш. Участие учитывается после успешной регистрации.",
    noReferrals: "Реферальных переходов пока нет. Ссылку «Пригласить друга» бот отправляет зарегистрированному участнику.",
    repeatedCaptcha: "Повторные ошибки капчи", rapidEntries: "Частые регистрации", signalNote: "Это сигналы для ручной проверки, не доказательство нарушения.",
    attempts: "попыток", wrong: "ошибок", last: "последняя", noSignals: "Подозрительных сигналов по текущим правилам нет.",
    addBlacklist: "Добавить ID", userId: "Telegram ID", reason: "Причина ограничения", add: "Добавить",
    remove: "Убрать", emptyBlacklist: "В чёрном списке пока никого нет.", createdAt: "Добавлен",
    selectedWinners: "Выбранные победители", noWinners: "Завершённых розыгрышей с сохранёнными победителями пока нет.",
    dailyActivity: "Регистрации по дням", hourActivity: "Активность по часам", days14: "14 дней", days30: "30 дней",
    days90: "90 дней", periodComparison: "к прошлому периоду",
    paidShare: "Доля платных участий", referralConversion: "Конверсия приглашений",
    channelRetention: "Сохранение подписки", periodStars: "Получено Stars",
    interactiveActivity: "Объём участий по дням", interactiveHint: "Перетаскивайте сцену для поворота · наведите на столбец для значений",
    giftModel: "Подарки · кубок · монеты · вращайте сцену",
    chartLoadError: "Не удалось загрузить 3D-сцену. Таблица с данными доступна ниже.",
    dayDetails: "Данные по дням", performance: "Эффективность розыгрышей",
    paidShareColumn: "Платная доля", referralsConversion: "Переходы → участия",
    activeHours: "Пиковый час", noPerformance: "За выбранный период участий нет.",
    comparisonUnavailable: "Нет данных для сравнения периодов на этом сервере.",
    noViews: "Просмотры публикаций недоступны через Bot API. Конверсия просмотров не показывается, чтобы не подменять её оценкой.",
    channelStats: "Подписки по каналам", referralsStats: "Реферальная воронка", systemHealth: "Состояние системы",
    database: "База данных", integrity: "Проверка целостности", lastBackup: "Последняя копия", uptime: "Время работы",
    node: "Node.js", processMemory: "Память процесса", latestEvent: "Последнее событие", noBackup: "Резервных копий не найдено.",
    healthy: "Проверка пройдена", notHealthy: "Есть проблема", searchButton: "Найти", allGiveaways: "Все розыгрыши",
    paidEntries: "Платные участия", check: "Проверено", errorReason: "Неизвестная ошибка",
  },
  en: {
    overview: "Overview", analytics: "Analytics", finance: "Finance", participants: "Participants",
    referrals: "Referrals", antifraud: "Anti-fraud", blacklist: "Blacklist", winners: "Results",
    system: "System", logout: "Sign out", breadcrumb: "CONSOLE", dataFooter: "Recorded data only · Telegram Giveaway Bot",
    navWorkspace: "WORKSPACE", navReview: "REVIEW & FINANCE", navSystem: "SYSTEM",
    adminLabel: "ADMIN", giveawayRecord: "GIVEAWAY", eventLog: "EVENT LOG",
    publishedTo: "PUBLISHED TO",
    freeEntries: "Free entries", paidEntries: "Paid entries",
    newParticipants: "Entries in 14 days", paymentBreakdown: "Financial summary",
    paymentCount: "Successful payments", refundCount: "Refunds", reviewQueue: "Awaiting review",
    giveawayGoal: "Participant goal", requiredChannels: "Subscription checks",
    progressToGoal: "Entry progress", timeLeft: "Time remaining",
    giveawayReached: "Goal reached", deadlinePassed: "Deadline passed", noDeadline: "No deadline set",
    modelGift: "Prize", modelTrophy: "Winners", modelStars: "Entry cost",
    modelSelectHint: "Select or hover an object",
    loadingView: "Loading verified data…", retry: "Retry",
    entryChecks: "subscribed / checked", drawChecks: "subscribed / checked",
    drawRechecks: "Rechecked at draw", activityTrend: "Entries over 14 days",
    activityLegend: "All entries · blue mark = paid",
    referralSummary: "Referral summary", referralVisits14: "Visits in 14 days",
    referralJoins14: "Entries from invites",     noChannelChecks: "No required channels are configured for this giveaway.",
    noRecentActivity: "No entries in this period.",
    panelStatus: "Session active", activeGiveaways: "Active giveaways",
    latestEvents: "Latest events", statusActive: "active", emptyGiveaways: "No giveaways yet.",
    participantsCount: "Participants", stars: "Stars collected", returned: "Stars refunded", netStars: "Net after refunds", refundDate: "Refund date", payments: "Payments",
    free: "Free", paid: "paid entry", ending: "Ends", channels: "Required channels",
    conditions: "Entry requirement", reactionRequired: "Add a reaction",
    noEvents: "No events yet.", viewAll: "Open list →", loadError: "Could not load data.",
    search: "Search ID, name, username, or giveaway", export: "Download CSV", noRows: "No records found.",
    paymentId: "Payment / entry", user: "Participant", giveaway: "Giveaway", amount: "Amount", date: "Date", status: "Status",
    joined: "Entry", checkedAtDraw: "Subscribed on recheck", joinedSubscribed: "Subscribed / checked at entry",
    visits: "Visits", joins: "Entries", conversion: "Conversion", uniqueVisits: "Unique visits",
    referralsNote: "A visit counts once per person and giveaway. Entry counts only after successful registration.",
    noReferrals: "No referral visits yet. The bot sends a “Invite a friend” link after registration.",
    repeatedCaptcha: "Repeated captcha failures", rapidEntries: "Frequent entries", signalNote: "Signals are for manual review, not proof of abuse.",
    attempts: "attempts", wrong: "wrong answers", last: "last", noSignals: "No risk signals under current rules.",
    addBlacklist: "Add ID", userId: "Telegram ID", reason: "Restriction reason", add: "Add",
    remove: "Remove", emptyBlacklist: "Blacklist is empty.", createdAt: "Added",
    selectedWinners: "Selected winners", noWinners: "No completed giveaways with saved winners yet.",
    dailyActivity: "Entries by day", hourActivity: "Activity by hour", days14: "14 days", days30: "30 days",
    days90: "90 days", periodComparison: "vs previous period",
    paidShare: "Paid entry share", referralConversion: "Referral conversion",
    channelRetention: "Subscription retention", periodStars: "Stars collected",
    interactiveActivity: "Entries by day", interactiveHint: "Drag to rotate · hover a column for values",
    giftModel: "Gifts · trophy · coins · drag to rotate",
    chartLoadError: "Could not load the 3D scene. The data table is available below.",
    dayDetails: "Daily data", performance: "Giveaway performance",
    paidShareColumn: "Paid share", referralsConversion: "Visits → entries",
    activeHours: "Peak hour", noPerformance: "No entries in this period.",
    comparisonUnavailable: "This server does not provide period comparison data.",
    noViews: "Post views are unavailable through the Bot API. View conversion is omitted rather than estimated.",
    channelStats: "Channel subscriptions", referralsStats: "Referral funnel", systemHealth: "System health",
    database: "Database", integrity: "Integrity check", lastBackup: "Latest backup", uptime: "Uptime",
    node: "Node.js", processMemory: "Process memory", latestEvent: "Latest event", noBackup: "No backups found.",
    healthy: "Check passed", notHealthy: "Issue detected", searchButton: "Search", allGiveaways: "All giveaways",
    paidEntries: "Paid entries", check: "Checked", errorReason: "Unknown error",
  },
};

let lang = localStorage.getItem("dashboard-language") || "ru";
let pendingLoginChallengeId = null;
let currentView = "overview";
let overview = null;
let analyticsData = null;
let destroyActivityScene = null;
let destroyGiftModel = null;
let toastTimer;
let activeOverviewGiveawayId = null;
let renderGeneration = 0;
const viewNames = {
  overview: { ru: "ОБЗОР", en: "OVERVIEW" }, analytics: { ru: "АНАЛИТИКА", en: "ANALYTICS" },
  payments: { ru: "ФИНАНСЫ", en: "FINANCE" }, participants: { ru: "УЧАСТНИКИ", en: "PARTICIPANTS" },
  referrals: { ru: "РЕФЕРАЛЫ", en: "REFERRALS" }, risk: { ru: "АНТИФРОД", en: "ANTI-FRAUD" },
  blacklist: { ru: "ЧЁРНЫЙ СПИСОК", en: "BLACKLIST" }, winners: { ru: "ИТОГИ", en: "RESULTS" },
  system: { ru: "СИСТЕМА", en: "SYSTEM" },
};

function t(key) { return strings[lang][key] || key; }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}
function number(value) { return new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US").format(Number(value || 0)); }
function dateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(Number(value)));
}
function detailDateTime(value) {
  const date = new Date(Number(value));
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  return `<time datetime="${date.toISOString()}"><span>${day}</span><span>${time}</span></time>`;
}
function percent(numerator, denominator) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : "—";
}
function periodChange(current, previous) {
  if (current === null || previous === null || current === undefined || previous === undefined) return "—";
  if (!previous) return current ? (lang === "ru" ? "новые данные" : "new data") : "—";
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}% ${t("periodComparison")}`;
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const type = response.headers.get("content-type") || "";
  const result = type.includes("json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(result?.error || t("loadError"));
  return result;
}
function applyLanguage() {
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  $("#language-button").textContent = lang === "ru" ? "EN" : "RU";
  $("#view-crumb").textContent = viewNames[currentView][lang];
  renderView().catch((error) => showToast(error.message));
}

function fmtStatus(status) {
  const labels = {
    active: lang === "ru" ? "Активен" : "Active",
    ended: lang === "ru" ? "Завершён" : "Ended",
    cancelled: lang === "ru" ? "Отменён" : "Cancelled",
    paid: lang === "ru" ? "Оплачен" : "Paid",
    refunded: lang === "ru" ? "Возврат" : "Refunded",
    review: lang === "ru" ? "Проверка" : "Review",
    pending: lang === "ru" ? "Ожидание" : "Pending",
    free: t("free"),
  };
  return `<span class="status-tag ${escapeHtml(status)}">${escapeHtml(labels[status] || status)}</span>`;
}
function heading(title, subtitle, actions = "") {
  return `<div class="page-intro"><div><h1>${title}</h1><p>${subtitle}</p></div>${actions}</div>`;
}
function sectionTitle(title, detail = "") {
  return `<div class="pane-heading"><h2>${title}</h2><span class="section-label">${detail}</span></div>`;
}
function empty(text) { return `<div class="empty-state">${escapeHtml(text)}</div>`; }
function pageError(message) {
  $("#view-content").innerHTML = `<div class="attention" role="alert">${escapeHtml(message || t("loadError"))}<button class="button button-outline" data-retry-view>${t("retry")}</button></div>`;
}
function loadingView() {
  return `<div class="loading-state" role="status"><span class="loading-mark"></span><span>${t("loadingView")}</span></div>`;
}
function countdownLabel(timestamp) {
  const remaining = Number(timestamp) - Date.now();
  if (remaining <= 0) return t("deadlinePassed");
  const totalMinutes = Math.floor(remaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return days
    ? `${number(days)} ${lang === "ru" ? "дн." : "d"} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
async function mountOverviewScene(giveaway) {
  const canvas = $("#overview-gift-canvas");
  if (!canvas) return;
  const { mountOverviewModels } = await import("/analytics-3d.js");
  if (!canvas.isConnected) return;
  destroyGiftModel = mountOverviewModels(canvas, {
    giveaway,
    locale: lang === "ru" ? "ru-RU" : "en-US",
    labels: { gift: t("modelGift"), trophy: t("modelTrophy"), stars: t("modelStars"), hint: t("modelSelectHint"), free: t("free") },
  });
}
function updateCountdowns() {
  if (currentView !== "overview") return;
  $$("[data-countdown]").forEach((node) => {
    node.textContent = countdownLabel(node.dataset.countdown);
  });
}
function metricCell(value, label) {
  return `<div class="data-cell"><strong class="data-value">${escapeHtml(value)}</strong><span class="data-label">${escapeHtml(label)}</span></div>`;
}
function metricTrendCell(value, label, trend) {
  return `<div class="data-cell"><strong class="data-value">${escapeHtml(value)}</strong><span class="data-label">${escapeHtml(label)}</span><small class="analytics-comparison">${escapeHtml(trend)}</small></div>`;
}
function safeTitle(row) { return escapeHtml(row.title || row.giveaway_title || `#${row.giveaway_id}`); }
function giveawayPoint(row, index, selectedId) {
  return `<button class="giveaway-row${row.id === selectedId ? " is-selected" : ""}" data-giveaway="${row.id}" aria-pressed="${row.id === selectedId}">
    <span class="giveaway-row-index">${String(index + 1).padStart(2, "0")}</span>
    <span class="giveaway-row-copy"><strong>${safeTitle(row)}</strong><small>#${row.id} · ${number(row.participant_count)} ${t("participants").toLowerCase()}</small></span>
    <span class="giveaway-row-state">${fmtStatus(row.status)}</span>
  </button>`;
}
function giveawayDetail(giveaway) {
  const model = `<div class="gift-model-stage">
    <div class="gift-model-viewport"><canvas id="overview-gift-canvas" role="img" aria-label="${escapeHtml(t("giftModel"))}"></canvas></div>
    <p id="overview-model-readout" class="model-readout" role="status">${t("modelSelectHint")}</p>
    <div class="model-controls" role="group" aria-label="${escapeHtml(t("giftModel"))}">
      <button type="button" data-model-role="gift" aria-pressed="true">${t("modelGift")}</button>
      <button type="button" data-model-role="trophy" aria-pressed="false">${t("modelTrophy")}</button>
      <button type="button" data-model-role="stars" aria-pressed="false">★ Stars</button>
    </div>
  </div>`;
  if (!giveaway) return `<div class="giveaway-detail giveaway-detail-empty"><div>${empty(t("emptyGiveaways"))}</div>${model}</div>`;
  const target = Number(giveaway.target_participants);
  const participants = Number(giveaway.participant_count);
  const progress = target > 0 ? Math.min(100, Math.round(participants / target * 100)) : null;
  return `<div class="giveaway-detail">
    <div class="detail-header"><span class="detail-id">${t("giveawayRecord")} / ${String(giveaway.id).padStart(4, "0")}</span>${fmtStatus(giveaway.status)}</div>
    <div class="detail-hero"><div><h2>${safeTitle(giveaway)}</h2>
    ${giveaway.prize ? `<p class="detail-prize">${escapeHtml(giveaway.prize)}</p>` : ""}</div>${model}</div>
    <div class="detail-data">
      <div class="detail-stat"><strong>${number(giveaway.participant_count)}</strong><span>${t("participantsCount")}</span></div>
      <div class="detail-stat"><strong>${giveaway.payment_stars ? `${number(giveaway.payment_stars)} ★` : t("free")}</strong><span>${giveaway.payment_stars ? t("paid") : t("status")}</span></div>
      <div class="detail-stat"><strong>${number(giveaway.winner_count)}</strong><span>${t("winners")}</span></div>
      <div class="detail-stat"><strong class="detail-date">${giveaway.ends_at ? detailDateTime(giveaway.ends_at) : "—"}</strong><span>${t("ending")}</span></div>
    </div>
    <div class="giveaway-momentum">
      ${target > 0 ? `<div class="progress-heading"><span>${t("progressToGoal")}</span><strong>${number(participants)} / ${number(target)} · ${progress}%</strong></div>
        <progress class="progress-track" aria-label="${escapeHtml(t("progressToGoal"))}" max="${target}" value="${Math.min(participants, target)}">${progress}%</progress>` : `<div class="progress-heading"><span>${t("progressToGoal")}</span><strong>${lang === "ru" ? "Цель не задана" : "No target set"}</strong></div>`}
      <div class="countdown-row"><span>${t("timeLeft")}</span><strong>${giveaway.ends_at ? `<time data-countdown="${Number(giveaway.ends_at)}">${countdownLabel(giveaway.ends_at)}</time>` : t("noDeadline")}</strong></div>
    </div>
    ${giveaway.publish_channel ? `<div class="detail-channel"><span>${t("publishedTo")}</span><strong>${escapeHtml(giveaway.publish_channel)}</strong></div>` : ""}
    ${giveaway.require_reaction ? `<div class="detail-channel"><span>${t("conditions")}</span><strong>${t("reactionRequired")}</strong></div>` : ""}
  </div>`;
}
function activityBars(analytics) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - 13 + index);
    return date.toISOString().slice(0, 10);
  });
  const entriesByDay = new Map(analytics.daily.map((entry) => [entry.day, entry]));
  const max = Math.max(1, ...analytics.daily.map((entry) => Number(entry.participants)));
  const total = analytics.daily.reduce((sum, entry) => sum + Number(entry.participants), 0);
  const paidTotal = analytics.daily.reduce((sum, entry) => sum + Number(entry.paid_entries), 0);
  const bars = days.map((day) => {
    const entry = entriesByDay.get(day);
    const participants = Number(entry?.participants || 0);
    const paid = Number(entry?.paid_entries || 0);
    const height = participants ? Math.max(5, Math.ceil(participants / max * 20) * 5) : 0;
    const paidHeight = paid ? Math.max(5, Math.ceil(paid / max * 20) * 5) : 0;
    const date = new Date(`${day}T12:00:00Z`);
    const label = new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" }).format(date);
    const dayLabel = new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric" }).format(date);
    return `<div class="activity-bar-column" title="${escapeHtml(label)}: ${number(participants)}">
      <div class="activity-bar-track"><span class="activity-bar${height ? ` h-${height}` : ""}"></span><span class="activity-bar paid${paidHeight ? ` h-${paidHeight}` : ""}"></span></div>
      <span class="activity-bar-day">${escapeHtml(dayLabel)}</span><span class="activity-bar-count">${participants ? number(participants) : ""}</span>
    </div>`;
  }).join("");
  return { bars, total, paidTotal };
}
function trendChart(title, days, series) {
  const width = 640;
  const height = 176;
  const inset = 18;
  const allValues = series.flatMap((line) => days.map((day) => Number(day[line.key] || 0)));
  const maxValue = Math.max(1, ...allValues);
  const xAt = (index) => days.length < 2 ? width / 2 : inset + index * (width - inset * 2) / (days.length - 1);
  const yAt = (value) => height - inset - (Number(value || 0) / maxValue) * (height - inset * 2);
  const lines = series.map((line) => {
    const points = days.map((day, index) => `${xAt(index).toFixed(1)},${yAt(day[line.key]).toFixed(1)}`).join(" ");
    const marks = days.map((day, index) => `<circle cx="${xAt(index).toFixed(1)}" cy="${yAt(day[line.key]).toFixed(1)}" r="2.2"><title>${escapeHtml(day.day)} · ${escapeHtml(line.label)}: ${number(day[line.key])}</title></circle>`).join("");
    return `<g class="trend-series ${line.color}"><polyline points="${points}"></polyline>${marks}</g>`;
  }).join("");
  const legend = series.map((line) => `<span><i class="${line.color}"></i>${escapeHtml(line.label)}</span>`).join("");
  const hasValues = allValues.some((value) => value > 0);
  return `<section class="trend-panel">
    <div class="pane-heading"><h2>${escapeHtml(title)}</h2><span class="section-label">${hasValues ? number(maxValue) : "0"}</span></div>
    ${hasValues ? `<svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${lines}</svg><div class="trend-legend">${legend}</div>`
    : `<div class="chart-empty">${lang === "ru" ? "За выбранный период событий нет." : "No events in this period."}</div>`}
  </section>`;
}
function channelCheckRows(giveaway) {
  const channels = giveaway?.required_channels || [];
  if (!channels.length) return empty(t("noChannelChecks"));
  const stats = new Map(overview.channelStats
    .filter((row) => row.giveaway_id === giveaway.id)
    .map((row) => [row.channel, row]));
  return `<div class="channel-check-list">${channels.map((channel) => {
    const row = stats.get(channel);
    return `<div class="channel-check-row">
      <strong>${escapeHtml(channel)}</strong>
      <span>${number(row?.checked_at_entry || 0)} / ${number(row?.checked_at_entry_total || 0)} <small>${t("entryChecks")}</small></span>
      <span>${number(row?.still_subscribed_at_draw || 0)} / ${number(row?.checked_at_draw || 0)} <small>${t("drawChecks")}</small></span>
    </div>`;
  }).join("")}</div>`;
}
function eventRows(events) {
  if (!events.length) return empty(t("noEvents"));
  const labels = lang === "ru"
    ? { created: "создан розыгрыш", edited: "изменён розыгрыш", participant_joined: "новый участник", payment_received: "получена оплата", payment_refunded: "возврат Stars", refund_failed: "ошибка возврата", ended: "розыгрыш завершён", cancelled: "розыгрыш отменён" }
    : { created: "giveaway created", edited: "giveaway updated", participant_joined: "new participant", payment_received: "payment received", payment_refunded: "Stars refunded", refund_failed: "refund failed", ended: "giveaway ended", cancelled: "giveaway cancelled" };
  return `<div class="event-list">${events.map((event) => `<div class="event-row">
    <span class="event-mark event-${escapeHtml(event.event_type)}"></span><div><strong>${escapeHtml(labels[event.event_type] || event.event_type)} · ${safeTitle(event)}</strong><small>${event.actor_id ? `ID ${escapeHtml(event.actor_id)} · ` : ""}${dateTime(event.created_at)}</small></div>
  </div>`).join("")}</div>`;
}
function renderOverview() {
  const active = overview.giveaways.filter((giveaway) => giveaway.status === "active");
  const selected = overview.giveaways.find((giveaway) => giveaway.id === activeOverviewGiveawayId)
    || active[0] || overview.giveaways[0];
  activeOverviewGiveawayId = selected?.id || null;
  $("#active-count").textContent = number(active.length);
  const total = overview.totals;
  const activity = activityBars(overview.analytics);
  const referrals = overview.analytics.referrals;
  return `${heading(lang === "ru" ? "Обзор розыгрышей" : "Giveaway overview",
    lang === "ru" ? "Розыгрыши, участники, платежи, приглашения и проверки подписок — по данным бота." : "Giveaway, participant, payment, invitation, and subscription-check data from the bot.",
    `<button class="button button-outline" data-go="system"><span class="button-glyph">⌘</span> ${t("systemHealth")}</button>`)}
    <div class="data-strip">
      ${metricCell(number(total.active_giveaways), t("activeGiveaways"))}
      ${metricCell(number(total.participants), t("participantsCount"))}
      ${metricCell(number(total.paid_entries), t("paidEntries"))}
      ${metricCell(number(total.free_entries), t("freeEntries"))}
    </div>
    <div class="overview-grid">
      <section class="overview-section selected-section">${sectionTitle(lang === "ru" ? "Выбранный розыгрыш" : "Selected giveaway", selected ? `ID ${selected.id}` : "—")}
        <div id="selected-giveaway">${giveawayDetail(selected)}</div>
        ${selected ? `<div class="pane-heading"><h2>${t("allGiveaways")}</h2><span class="section-label">${lang === "ru" ? "ВСЕГО" : "TOTAL"}</span></div>
          <div class="metric-bands">
          <div class="metric-band"><strong>${number(total.successful_payments)}</strong><span>${t("payments")}</span></div>
          <div class="metric-band"><strong>${number(total.review_items)}</strong><span>${lang === "ru" ? "Требуют проверки" : "Need review"}</span></div>
          <div class="metric-band"><strong>${number(total.stars_net)} ★</strong><span>${t("netStars")}</span></div>
        </div>` : ""}
        <div class="detail-checks">${sectionTitle(t("requiredChannels"), lang === "ru" ? "ПО РОЗЫГРЫШУ" : "PER GIVEAWAY")}
          <div id="selected-channel-checks">${channelCheckRows(selected)}</div></div>
      </section>
      <section class="overview-section active-section">${sectionTitle(t("allGiveaways"), `${number(active.length)} ${lang === "ru" ? "АКТИВНО" : "ACTIVE"}`)}
        <div class="giveaway-list">${overview.giveaways.length ? overview.giveaways.slice(0, 12).map((giveaway, index) => giveawayPoint(giveaway, index, selected?.id)).join("") : empty(t("emptyGiveaways"))}</div>
        <button class="text-button" data-go="participants">${lang === "ru" ? "Участники" : "Participants"} →</button>
      </section>
      <section class="overview-section events-pane">${sectionTitle(t("latestEvents"), t("eventLog"))}
        ${eventRows(overview.events.slice(0, 6))}
        <div class="console-note">${lang === "ru" ? "Stars поступают на баланс бота. Платежи и возвраты отдельно записаны в финансовом журнале." : "Stars are credited to the bot. Payments and refunds are recorded in the finance ledger."}</div>
      </section>
    </div>
    <div class="overview-insights">
      <section class="overview-section activity-section">${sectionTitle(t("activityTrend"), lang === "ru" ? "UTC · ПО ДНЯМ" : "UTC · BY DAY")}
        <div class="activity-summary"><strong>${number(activity.total)}</strong><span>${t("newParticipants").toLowerCase()}</span><span>${number(activity.paidTotal)} ${t("paidEntries").toLowerCase()}</span></div>
        ${activity.total ? `<div class="activity-chart" role="img" aria-label="${escapeHtml(t("activityTrend"))}: ${number(activity.total)}">
          ${activity.bars}</div><div class="activity-legend"><span class="legend-all"></span>${t("activityLegend")}</div>` : empty(t("noRecentActivity"))}
      </section>
      <section class="overview-section finance-section">${sectionTitle(t("paymentBreakdown"), "STARS")}
        <div class="finance-ledger">
          <div><span>${t("stars")}</span><strong>${number(total.stars_collected)} ★</strong></div>
          <div><span>${t("returned")}</span><strong>${number(total.stars_refunded)} ★</strong></div>
          <div><span>${t("netStars")}</span><strong>${number(total.stars_net)} ★</strong></div>
          <div><span>${t("paymentCount")}</span><strong>${number(total.successful_payments)}</strong></div>
          <div><span>${t("refundCount")}</span><strong>${number(total.refund_count)}</strong></div>
          <button class="finance-review-link" data-go="payments"><span>${t("reviewQueue")}</span><strong>${number(total.pending_payments + total.failed_refunds)} →</strong></button>
        </div>
      </section>
      <section class="overview-section referral-section">${sectionTitle(t("referralSummary"), "14 DAYS")}
        <div class="referral-ledger">
          <div><strong>${number(referrals.visits)}</strong><span>${t("referralVisits14")}</span></div>
          <div><strong>${number(referrals.joins)}</strong><span>${t("referralJoins14")}</span></div>
          <div><strong>${percent(referrals.joins, referrals.visits)}</strong><span>${t("conversion")}</span></div>
        </div>
        <button class="finance-review-link" data-go="referrals">${lang === "ru" ? "Подробная статистика" : "Full referral report"} →</button>
      </section>
    </div>`;
}
function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}">${empty(t("noRows"))}</td></tr>`}</tbody></table></div>`;
}
function searchToolbar(kind) {
  return `<div class="toolbar"><input class="search-control" id="table-search" type="search" placeholder="${t("search")}" aria-label="${t("search")}">
  <a class="button button-outline" href="/api/export/${kind}.csv">${t("export")} ↓</a></div>`;
}
async function renderAnalytics() {
  const requestedDays = Number(new URLSearchParams(location.search).get("days"));
  const days = [14, 30, 90].includes(requestedDays) ? requestedDays : 14;
  const data = await api(`/api/analytics?days=${days}`);
  analyticsData = data;
  const dailyByDate = new Map(data.daily.map((entry) => [entry.day, entry]));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dailySeries = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - days + index + 1);
    const day = date.toISOString().slice(0, 10);
    const row = dailyByDate.get(day);
    return {
      day,
      participants: Number(row?.participants || 0),
      paid_entries: Number(row?.paid_entries || 0),
      stars_collected: Number(row?.stars_collected || 0),
      stars_refunded: Number(row?.stars_refunded || 0),
      referral_visits: Number(row?.referral_visits || 0),
      referral_joins: Number(row?.referral_joins || 0),
    };
  });
  const maxHour = Math.max(1, ...data.hourly.map((entry) => entry.participants));
  const hourCells = data.hourly.map((entry) => {
    const level = Math.ceil((entry.participants / maxHour) * 3);
    return `<div class="hour-cell" data-level="${level}" title="${entry.hour}:00 — ${entry.participants}">${String(entry.hour).padStart(2, "0")}</div>`;
  }).join("");
  const channelRows = data.channels.map((channel) => `<tr><td class="mono">${escapeHtml(channel.channel)}</td><td>${number(channel.joined_subscribed)} / ${number(channel.checked_at_entry)}</td><td>${number(channel.remained_subscribed)}</td><td>${number(channel.rechecked_at_draw)}</td></tr>`).join("");
  const comparisonAvailable = Boolean(data.comparison?.current && data.comparison?.previous);
  const currentPeriod = data.comparison?.current || {
    entries: dailySeries.reduce((sum, entry) => sum + entry.participants, 0),
    paid_entries: dailySeries.reduce((sum, entry) => sum + entry.paid_entries, 0),
    stars: null,
  };
  const previousPeriod = data.comparison?.previous || { entries: null, paid_entries: null, stars: null };
  const performance = Array.isArray(data.giveawayPerformance) ? data.giveawayPerformance : [];
  const totalEntries = currentPeriod.entries;
  const paidEntries = currentPeriod.paid_entries;
  const channelChecks = data.channels.reduce((sum, channel) => sum + Number(channel.rechecked_at_draw), 0);
  const retainedChecks = data.channels.reduce((sum, channel) => sum + Number(channel.remained_subscribed), 0);
  const peakHour = data.hourly.reduce((peak, entry) => entry.participants > peak.participants ? entry : peak, { hour: -1, participants: 0 });
  const dailyRows = dailySeries.map((entry) => {
    const label = new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", timeZone: "UTC" })
      .format(new Date(`${entry.day}T12:00:00Z`));
    return `<tr><td>${escapeHtml(label)}</td><td>${number(entry.participants)}</td><td>${number(entry.paid_entries)}</td>
      <td>${number(entry.referral_joins)}</td><td>${number(entry.stars_collected)} ★</td><td>${number(entry.stars_refunded)} ★</td></tr>`;
  }).join("");
  const performanceRows = performance.map((giveaway) => `<tr>
    <td>${escapeHtml(giveaway.title)} <span class="table-secondary">#${giveaway.giveaway_id}</span></td>
    <td>${number(giveaway.entries)}</td>
    <td>${percent(giveaway.paid_entries, giveaway.entries)}</td>
    <td>${number(giveaway.stars_collected)} ★</td>
    <td>${percent(giveaway.referral_joins, giveaway.referral_visits)}</td>
  </tr>`).join("");
  const hourlyPeak = peakHour.participants
    ? `${String(peakHour.hour).padStart(2, "0")}:00 · ${number(peakHour.participants)}`
    : "—";
  return `${heading(t("analytics"), lang === "ru" ? `Срез за ${days} дней; сравнение с предыдущими ${days} днями. Просмотры публикаций недоступны через Bot API.` : `${days}-day view compared with the previous ${days} days. Telegram post views are not available through the Bot API.`,
    `<select class="search-control" id="days-select" aria-label="${lang === "ru" ? "Период аналитики" : "Analytics period"}"><option value="14"${days === 14 ? " selected" : ""}>${t("days14")}</option><option value="30"${days === 30 ? " selected" : ""}>${t("days30")}</option><option value="90"${days === 90 ? " selected" : ""}>${t("days90")}</option></select>`)}
    <div class="data-strip analytics-summary">
      ${metricTrendCell(number(totalEntries), t("participantsCount"), comparisonAvailable ? periodChange(totalEntries, previousPeriod.entries) : "—")}
      ${metricCell(percent(paidEntries, totalEntries), t("paidShare"))}
      ${metricTrendCell(currentPeriod.stars === null ? "—" : `${number(currentPeriod.stars)} ★`, t("periodStars"), comparisonAvailable ? periodChange(currentPeriod.stars, previousPeriod.stars) : "—")}
      ${metricCell(percent(data.referrals.joins, data.referrals.visits), t("referralConversion"))}
      ${metricCell(percent(retainedChecks, channelChecks), t("channelRetention"))}
    </div>
    ${data.dailyMetricsAvailable ? `<div class="trend-grid">
      ${trendChart(lang === "ru" ? "Участия и приглашения" : "Entries & referrals", dailySeries, [
        { key: "participants", label: t("participantsCount"), color: "series-neutral" },
        { key: "referral_joins", label: lang === "ru" ? "Из приглашений" : "From referrals", color: "series-blue" },
      ])}
      ${trendChart(lang === "ru" ? "Операции в Stars" : "Stars ledger", dailySeries, [
        { key: "stars_collected", label: lang === "ru" ? "Получено" : "Collected", color: "series-neutral" },
        { key: "stars_refunded", label: t("returned"), color: "series-amber" },
      ])}
    </div>` : `<div class="chart-empty">${lang === "ru" ? "Финансовые графики недоступны в данных этого сервера." : "Financial charts are unavailable from this server."}</div>`}
    <div class="analytics-grid">
      <section class="analytics-3d-section">${sectionTitle(t("interactiveActivity"), "THREE.JS · " + days + " DAYS")}
        <p class="analytics-3d-hint">${t("interactiveHint")}</p>
        <div id="activity-3d-scene" class="activity-3d-scene">
          <canvas id="activity-3d-canvas" role="img" aria-label="${escapeHtml(t("interactiveActivity"))}"></canvas>
        </div>
        <p id="activity-3d-readout" class="activity-3d-readout" role="status">${dailySeries.some((entry) => entry.participants) ? t("interactiveHint") : t("noRecentActivity")}</p>
        <div class="activity-3d-legend"><span class="legend-neutral"></span>${lang === "ru" ? "Бесплатные" : "Free"}<span class="legend-paid"></span>${lang === "ru" ? "Платные" : "Paid"}</div>
        <details class="daily-data-details"><summary>${t("dayDetails")}</summary>
          ${table([t("date"), t("participantsCount"), t("paidEntries"), t("referralJoins14"), t("stars"), t("returned")], dailyRows)}</details>
      </section>
      <section>${sectionTitle(t("hourActivity"), t("activeHours") + " · " + hourlyPeak)}
        <div class="hour-grid">${hourCells}</div>
        <div class="section-label">${lang === "ru" ? "ЯРЧЕ = БОЛЬШЕ РЕГИСТРАЦИЙ · UTC" : "BRIGHTER = MORE ENTRIES · UTC"}</div>
      </section>
    </div>
    <div class="attention">${t("noViews")}</div>
    ${Array.isArray(data.giveawayPerformance) ? `<section class="analytics-performance">${sectionTitle(t("performance"), lang === "ru" ? `ТОП ${performance.length} · ${days} ДНЕЙ` : `TOP ${performance.length} · ${days} DAYS`)}
      ${table([t("giveaway"), t("participantsCount"), t("paidShareColumn"), t("periodStars"), t("referralsConversion")], performanceRows || `<tr><td colspan="5">${empty(performance.length ? t("noPerformance") : (data.giveawayPerformance ? t("noPerformance") : t("comparisonUnavailable")))}</td></tr>`)}</section>
    ` : ""}
    <section>${sectionTitle(t("channelStats"), lang === "ru" ? "РЕГИСТРАЦИЯ → ПОВТОРНАЯ ПРОВЕРКА" : "ENTRY → DRAW RECHECK")}
      ${table([t("user"), t("joinedSubscribed"), t("checkedAtDraw"), t("check")], channelRows)}</section>`;
}
async function renderPayments() {
  const rows = await api(`/api/payments?q=${encodeURIComponent($("#table-search")?.value || "")}`);
  const tableRows = rows.map((row) => `<tr>
    <td><span class="table-primary mono">${escapeHtml(row.payment_charge_id)}</span><span class="table-secondary">#${row.giveaway_id}</span></td>
    <td><span class="table-primary">${escapeHtml(row.first_name || "—")}</span><span class="table-secondary mono">${row.username ? `@${escapeHtml(row.username)}` : ""} · ${escapeHtml(row.user_id)}</span></td>
    <td>${safeTitle(row)}</td><td>${number(row.stars)} ★</td><td>${dateTime(row.joined_at)}</td><td>${row.refund_created_at ? dateTime(row.refund_created_at) : "—"}</td><td>${fmtStatus(row.status)}</td>
  </tr>`).join("");
  const total = overview?.totals || {};
  return `${heading(t("finance"), lang === "ru" ? "История оплат, возвратов и платежей, которые нужно проверить." : "Payment, refund, and payment-review history.")
    }<div class="data-strip">${metricCell(`${number(total.stars_collected)} ★`, t("stars"))}${metricCell(`${number(total.stars_refunded)} ★`, t("returned"))}${metricCell(`${number(total.stars_net)} ★`, t("netStars"))}${metricCell(number(total.successful_payments), t("payments"))}${metricCell(number(total.review_items), lang === "ru" ? "Требуют проверки" : "Need review")}</div>
    ${searchToolbar("payments")}<div id="table-content">${table([t("paymentId"), t("user"), t("giveaway"), t("amount"), t("date"), t("refundDate"), t("status")], tableRows)}</div>`;
}
async function renderParticipants() {
  const rows = await api(`/api/participants?q=${encodeURIComponent($("#table-search")?.value || "")}`);
  const tableRows = rows.map((row) => `<tr><td class="mono">${escapeHtml(row.user_id)}</td>
    <td><span class="table-primary">${escapeHtml(row.first_name || "—")}</span><span class="table-secondary">${row.username ? `@${escapeHtml(row.username)}` : ""}</span></td>
    <td>${safeTitle(row)} <span class="table-secondary">#${row.giveaway_id}</span></td>
    <td>${row.payment_charge_id ? fmtStatus("paid") : fmtStatus("free")}</td><td>${row.verified_channels ?? 0}</td>
    <td>${row.referrer_id ? escapeHtml(row.referrer_id) : "—"}</td><td>${dateTime(row.joined_at)}</td><td>${row.blocked_reason ? fmtStatus("review") : row.is_winner ? "✳" : "—"}</td></tr>`).join("");
  return `${heading(t("participants"), lang === "ru" ? "Участия, сохранённые проверки, реферальные связи и ограничения." : "Recorded entries, subscription checks, referrals, and restrictions.")
    }${searchToolbar("participants")}<div id="table-content">${table([t("userId"), t("user"), t("giveaway"), t("status"), t("check"), lang === "ru" ? "Реферер" : "Referrer", t("date"), lang === "ru" ? "Примечание" : "Note"], tableRows)}</div>`;
}
async function renderReferrals() {
  const rows = await api("/api/referrals");
  const visits = rows.reduce((sum, row) => sum + Number(row.visits), 0);
  const joins = rows.reduce((sum, row) => sum + Number(row.joins), 0);
  const tableRows = rows.map((row) => `<tr><td>${safeTitle(row)} <span class="table-secondary">#${row.giveaway_id}</span></td><td class="mono">${escapeHtml(row.referrer_id)}</td><td>${number(row.visits)}</td><td>${number(row.joins)}</td><td>${percent(row.joins, row.visits)}</td></tr>`).join("");
  return `${heading(t("referrals"), t("referralsNote"))}
    <div class="data-strip">${metricCell(number(visits), t("uniqueVisits"))}${metricCell(number(joins), t("joins"))}${metricCell(percent(joins, visits), t("conversion"))}${metricCell(number(rows.length), t("allGiveaways"))}</div>
    <div class="toolbar"><span class="muted">${t("referralsNote")}</span><a class="button button-outline" href="/api/export/referrals.csv">${t("export")} ↓</a></div>
    ${table([t("giveaway"), lang === "ru" ? "ID пригласившего" : "Referrer ID", t("visits"), t("joins"), t("conversion")], tableRows)}`;
}
async function renderRisk() {
  const data = await api("/api/risk");
  const captcha = data.repeatedCaptcha.map((row) => `<tr><td>${safeTitle(row)}</td><td class="mono">${row.user_id}</td><td>${number(row.attempts)} ${t("attempts")}</td><td>${number(row.wrong_answers)} ${t("wrong")}</td><td>${dateTime(row.last_attempt)}</td></tr>`).join("");
  const rapid = data.rapidEntries.map((row) => `<tr><td class="mono">${row.user_id}</td><td>${number(row.entries)}</td><td>${dateTime(row.first_join)}</td><td>${dateTime(row.last_join)}</td></tr>`).join("");
  return `${heading(t("antifraud"), t("signalNote"))}
    <div class="attention">${t("signalNote")}</div>
    <section>${sectionTitle(t("repeatedCaptcha"), "≥ 3 WRONG ANSWERS")}${table([t("giveaway"), t("userId"), t("attempts"), t("wrong"), t("last"),], captcha)}</section>
    <section class="section-spaced">${sectionTitle(t("rapidEntries"), "≥ 4 / 24H")}${table([t("userId"), t("joins"), lang === "ru" ? "Первое участие" : "First entry", t("last")], rapid)}</section>`;
}
async function renderBlacklist() {
  const rows = await api("/api/blacklist");
  const tableRows = rows.map((row) => `<tr><td class="mono">${escapeHtml(row.user_id)}</td><td>${escapeHtml(row.reason)}</td>
    <td class="mono">${escapeHtml(row.created_by)}</td><td>${dateTime(row.created_at)}</td>
    <td><button class="button button-danger" data-remove-user="${row.user_id}">${t("remove")}</button></td></tr>`).join("");
  return `${heading(t("blacklist"), lang === "ru" ? "Ограничения применяются перед выдачей участия и перед подтверждением оплаты." : "Restrictions apply before entry and before payment confirmation.")
    }<form class="inline-form" id="blacklist-form"><input name="userId" type="number" min="1" required placeholder="${t("userId")}" aria-label="${t("userId")}">
    <input name="reason" type="text" maxlength="500" required placeholder="${t("reason")}" aria-label="${t("reason")}">
    <button class="button button-primary" type="submit">＋ ${t("add")}</button></form>
    <div class="section-spaced">${table([t("userId"), t("reason"), lang === "ru" ? "Кем добавлен" : "Added by", t("createdAt"), ""], tableRows)}</div>`;
}
async function renderWinners() {
  const rows = await api("/api/winners");
  const tableRows = rows.map((row) => `<tr><td>${safeTitle(row)} <span class="table-secondary">#${row.giveaway_id}</span></td>
    <td><span class="table-primary">${escapeHtml(row.first_name || "—")}</span><span class="table-secondary">${row.username ? `@${escapeHtml(row.username)}` : ""}</span></td>
    <td class="mono">${escapeHtml(row.user_id)}</td><td>${dateTime(row.selected_at)}</td></tr>`).join("");
  return `${heading(t("winners"), lang === "ru" ? "Победители, сохранённые при завершении розыгрышей." : "Winners recorded when giveaways finished.")
    }<div class="toolbar"><span class="muted">${lang === "ru" ? "Имена доступны только администраторам." : "Winner identities are visible to administrators only."}</span><a class="button button-outline" href="/api/export/winners.csv">${t("export")} ↓</a></div>
    ${table([t("giveaway"), t("user"), t("userId"), t("date")], tableRows)}`;
}
async function renderSystem() {
  const data = await api("/api/system");
  const isHealthy = data.databaseCheck === "ok";
  const backup = data.lastBackup
    ? `${dateTime(data.lastBackup.createdAt)} · ${number(data.lastBackup.size)} B`
    : t("noBackup");
  return `${heading(t("systemHealth"), lang === "ru" ? "Технические сведения процесса и локальной базы данных." : "Runtime and local database status.")
    }<div class="attention"><span class="status-dot"></span>${isHealthy ? t("healthy") : t("notHealthy")}: ${escapeHtml(data.databaseCheck)}</div>
    <div class="split-layout"><section>${sectionTitle(t("systemHealth"), "RUNTIME")}
      ${table([lang === "ru" ? "Показатель" : "Measure", lang === "ru" ? "Значение" : "Value"], [
        `<tr><td>${t("database")}</td><td>${escapeHtml(data.databasePath)} · ${number(data.databaseBytes)} B</td></tr>`,
        `<tr><td>${t("integrity")}</td><td>${escapeHtml(data.databaseCheck)}</td></tr>`,
        `<tr><td>${t("lastBackup")}</td><td>${backup}</td></tr>`,
        `<tr><td>${t("uptime")}</td><td>${number(Math.floor(data.uptimeSeconds / 3600))} h</td></tr>`,
        `<tr><td>${t("node")}</td><td class="mono">${escapeHtml(data.nodeVersion)}</td></tr>`,
        `<tr><td>${t("processMemory")}</td><td>${number(Math.round(data.memoryBytes / 1048576))} MB</td></tr>`,
        `<tr><td>${t("latestEvent")}</td><td>${dateTime(data.latestEventAt)}</td></tr>`,
      ].join(""))}</section>
      <aside class="note-panel"><h3>${lang === "ru" ? "Хранение" : "Storage"}</h3><p>${lang === "ru" ? "Резервная копия создаётся ботом в Telegram-панели администратора. Копии на том же диске не защищают от потери хранилища." : "Backups are created from the Telegram admin controls. A copy on the same disk does not protect against storage loss."}</p></aside></div>`;
}

async function renderView() {
  if ($("#dashboard").hidden) return;
  const generation = ++renderGeneration;
  if (destroyActivityScene) {
    destroyActivityScene();
    destroyActivityScene = null;
  }
  if (destroyGiftModel) {
    destroyGiftModel();
    destroyGiftModel = null;
  }
  $("#view-content").setAttribute("aria-busy", "true");
  $("#view-content").innerHTML = loadingView();
  $("#view-crumb").textContent = viewNames[currentView][lang];
  try {
    if (currentView === "overview") {
      const [overviewData, analytics] = await Promise.all([
        api("/api/overview"),
        api("/api/analytics?days=14"),
      ]);
      if (generation !== renderGeneration) return;
      overview = { ...overviewData, analytics };
      if (!overview.giveaways.some((giveaway) => giveaway.id === activeOverviewGiveawayId)) {
        activeOverviewGiveawayId = overview.giveaways.find((giveaway) => giveaway.status === "active")?.id
          || overview.giveaways[0]?.id
          || null;
      }
      $("#view-content").innerHTML = renderOverview();
      try {
        await mountOverviewScene(overview.giveaways.find((giveaway) => giveaway.id === activeOverviewGiveawayId));
      } catch (error) {
        console.error("Could not initialize the overview 3D models:", error);
        const viewport = $(".gift-model-viewport");
        if (viewport) viewport.dataset.error = lang === "ru" ? "3D-модель недоступна" : "3D model unavailable";
      }
    } else if (currentView === "analytics") {
      const content = await renderAnalytics();
      if (generation !== renderGeneration) return;
      $("#view-content").innerHTML = content;
      try {
        const { mountActivityScene } = await import("/analytics-3d.js");
        if (generation !== renderGeneration) return;
        destroyActivityScene = mountActivityScene(analyticsData.daily, lang === "ru" ? "ru-RU" : "en-US");
      } catch (error) {
        console.error("Could not initialize the analytics 3D scene:", error);
        $("#activity-3d-scene").textContent = t("chartLoadError");
        $("#activity-3d-readout").textContent = error.message;
      }
    } else if (currentView === "payments") {
      const content = await renderPayments();
      if (generation !== renderGeneration) return;
      $("#view-content").innerHTML = content;
    } else if (currentView === "participants") {
      const content = await renderParticipants();
      if (generation !== renderGeneration) return;
      $("#view-content").innerHTML = content;
    } else if (currentView === "referrals") {
      const content = await renderReferrals();
      if (generation !== renderGeneration) return;
      $("#view-content").innerHTML = content;
    } else if (currentView === "risk") {
      const content = await renderRisk();
      if (generation !== renderGeneration) return;
      $("#view-content").innerHTML = content;
    } else if (currentView === "blacklist") {
      const content = await renderBlacklist();
      if (generation !== renderGeneration) return;
      $("#view-content").innerHTML = content;
    } else if (currentView === "winners") {
      const content = await renderWinners();
      if (generation !== renderGeneration) return;
      $("#view-content").innerHTML = content;
    } else if (currentView === "system") {
      const content = await renderSystem();
      if (generation !== renderGeneration) return;
      $("#view-content").innerHTML = content;
    }
  } catch (error) {
    if (generation === renderGeneration) pageError(error.message);
  } finally {
    if (generation === renderGeneration) $("#view-content").setAttribute("aria-busy", "false");
  }
}
async function openView(view) {
  currentView = view;
  $$(".nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === view);
    item.setAttribute("aria-current", item.dataset.view === view ? "page" : "false");
  });
  $("#sidebar").classList.remove("is-open");
  await renderView();
}
async function checkSession() {
  try {
    const session = await api("/api/session");
    if (!session.authenticated) throw new Error("Unauthenticated");
    $("#admin-id").textContent = session.adminId;
    $("#login-screen").hidden = true;
    $("#dashboard").hidden = false;
    $("#today-date").textContent = new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium" }).format(new Date());
    await renderView();
  } catch {
    $("#dashboard").hidden = true;
    $("#login-screen").hidden = false;
  }
}
async function requestLogin() {
  const button = $("#login-button");
  const status = $("#login-status");
  button.disabled = true;
  status.textContent = lang === "ru" ? "Отправляю код в Telegram…" : "Sending a code to Telegram…";
  try {
    const login = await api("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    pendingLoginChallengeId = login.challengeId;
    $("#login-code-form").hidden = false;
    $("#login-code").value = "";
    $("#login-code").focus();
    status.textContent = lang === "ru"
      ? `Код отправлен в личный чат с ботом. Он действует 5 минут.${login.deliveryWarning ? " Не всем администраторам удалось доставить сообщение." : ""}`
      : `The code was sent to your private chat with the bot. It expires in 5 minutes.${login.deliveryWarning ? " Delivery failed for some administrators." : ""}`;
    button.disabled = false;
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
}

$("#login-button").addEventListener("click", requestLogin);
$("#login-code-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!pendingLoginChallengeId) return;
  const button = $("#login-verify-button");
  const status = $("#login-status");
  button.disabled = true;
  status.textContent = lang === "ru" ? "Проверяю код…" : "Verifying code…";
  try {
    await api("/api/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: pendingLoginChallengeId, code: $("#login-code").value.trim() }),
    });
    status.textContent = lang === "ru" ? "Код принят. Открываю панель…" : "Code accepted. Opening dashboard…";
    await checkSession();
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});
$("#language-button").addEventListener("click", () => {
  lang = lang === "ru" ? "en" : "ru";
  localStorage.setItem("dashboard-language", lang);
  applyLanguage();
});
$("#logout-button").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  location.reload();
});
$("#menu-button").addEventListener("click", () => {
  const isOpen = $("#sidebar").classList.toggle("is-open");
  $("#menu-button").setAttribute("aria-expanded", String(isOpen));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("#sidebar").classList.contains("is-open")) {
    $("#sidebar").classList.remove("is-open");
    $("#menu-button").setAttribute("aria-expanded", "false");
    $("#menu-button").focus();
  }
});
$("#sidebar").addEventListener("click", (event) => {
  const item = event.target.closest("[data-view]");
  if (item) {
    $("#sidebar").classList.remove("is-open");
    $("#menu-button").setAttribute("aria-expanded", "false");
    openView(item.dataset.view);
  }
});
$("#view-content").addEventListener("click", async (event) => {
  const point = event.target.closest("[data-giveaway]");
  if (point && overview) {
    const selected = overview.giveaways.find((giveaway) => giveaway.id === Number(point.dataset.giveaway));
    activeOverviewGiveawayId = selected.id;
    $$(".giveaway-row").forEach((item) => {
      const active = item === point;
      item.classList.toggle("is-selected", active);
      item.setAttribute("aria-pressed", String(active));
    });
    $("#selected-giveaway").innerHTML = giveawayDetail(selected);
    $("#selected-channel-checks").innerHTML = channelCheckRows(selected);
    if (destroyGiftModel) destroyGiftModel();
    destroyGiftModel = null;
    mountOverviewScene(selected).catch((error) => {
      console.error("Could not update the overview 3D models:", error);
      const viewport = $(".gift-model-viewport");
      if (viewport) viewport.dataset.error = lang === "ru" ? "3D-модель недоступна" : "3D model unavailable";
    });
    return;
  }
  const retry = event.target.closest("[data-retry-view]");
  if (retry) { await renderView(); return; }
  const route = event.target.closest("[data-go]");
  if (route) { await openView(route.dataset.go); return; }
  const remove = event.target.closest("[data-remove-user]");
  if (remove && confirm(lang === "ru" ? "Убрать пользователя из чёрного списка?" : "Remove this user from the blacklist?")) {
    try {
      await api(`/api/blacklist/${remove.dataset.removeUser}`, { method: "DELETE" });
      await renderView();
      showToast(lang === "ru" ? "Ограничение снято." : "Restriction removed.");
    } catch (error) { showToast(error.message); }
  }
});
$("#view-content").addEventListener("input", (event) => {
  if (event.target.id === "table-search" && ["payments", "participants"].includes(currentView)) {
    clearTimeout(event.target.searchTimer);
    event.target.searchTimer = setTimeout(() => renderView(), 250);
  }
});
$("#view-content").addEventListener("change", (event) => {
  if (event.target.id === "days-select") {
    history.replaceState(null, "", `?days=${event.target.value}`);
    renderView();
  }
});
$("#view-content").addEventListener("submit", async (event) => {
  if (event.target.id !== "blacklist-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const button = event.target.querySelector("button");
  button.disabled = true;
  try {
    await api("/api/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: form.get("userId"), reason: form.get("reason") }),
    });
    await renderView();
    showToast(lang === "ru" ? "Пользователь добавлен в список." : "User added to blacklist.");
  } catch (error) { showToast(error.message); button.disabled = false; }
});

applyLanguage();
checkSession();
setInterval(updateCountdowns, 60_000);
