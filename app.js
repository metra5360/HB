const months = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

const state = {
  user: null,
  birthdays: [],
  search: "",
};

const $ = (selector) => document.querySelector(selector);

const authView = $("#authView");
const calendarView = $("#calendarView");
const authForm = $("#authForm");
const authMessage = $("#authMessage");
const usernameInput = $("#usernameInput");
const passwordInput = $("#passwordInput");
const registerButton = $("#registerButton");
const logoutButton = $("#logoutButton");
const currentUserLabel = $("#currentUserLabel");
const monthInput = $("#monthInput");
const dayInput = $("#dayInput");
const personInput = $("#personInput");
const noteInput = $("#noteInput");
const entryId = $("#entryId");
const birthdayForm = $("#birthdayForm");
const cancelEditButton = $("#cancelEditButton");
const monthsGrid = $("#monthsGrid");
const searchInput = $("#searchInput");
const upcomingList = $("#upcomingList");
const reminderModal = $("#reminderModal");
const reminderText = $("#reminderText");
const closeReminderButton = $("#closeReminderButton");
const imageGenerator = $("#imageGenerator");
const hideGeneratorButton = $("#hideGeneratorButton");
const genNameInput = $("#genNameInput");
const genStyleInput = $("#genStyleInput");
const promptOutput = $("#promptOutput");
const makePromptButton = $("#makePromptButton");
const copyPromptButton = $("#copyPromptButton");
const downloadCardButton = $("#downloadCardButton");
const cardCanvas = $("#cardCanvas");

function userKey(username) {
  return `birthday-app:user:${username.toLowerCase()}`;
}

function sessionKey() {
  return "birthday-app:session";
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getUser(username) {
  const raw = localStorage.getItem(userKey(username));
  return raw ? JSON.parse(raw) : null;
}

function saveUser(username, data) {
  localStorage.setItem(userKey(username), JSON.stringify(data));
}

function saveBirthdays() {
  if (!state.user) return;
  const user = getUser(state.user);
  saveUser(state.user, { ...user, birthdays: state.birthdays });
}

function setAuthMessage(message) {
  authMessage.textContent = message;
}

function showApp(username) {
  state.user = username;
  const user = getUser(username);
  state.birthdays = user?.birthdays || [];
  localStorage.setItem(sessionKey(), username);
  currentUserLabel.textContent = username;
  authView.classList.add("hidden");
  calendarView.classList.remove("hidden");
  render();
  checkTomorrowReminder();
}

function showAuth() {
  state.user = null;
  state.birthdays = [];
  localStorage.removeItem(sessionKey());
  authView.classList.remove("hidden");
  calendarView.classList.add("hidden");
}

async function handleLogin(event) {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const user = getUser(username);

  if (!user) {
    setAuthMessage("Такого акаунта ще немає. Натисніть “Створити акаунт”.");
    return;
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    setAuthMessage("Неправильний пароль.");
    return;
  }

  setAuthMessage("");
  passwordInput.value = "";
  showApp(username);
}

async function handleRegister() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (username.length < 3 || password.length < 4) {
    setAuthMessage("Логін має мати від 3 символів, пароль - від 4.");
    return;
  }

  if (getUser(username)) {
    setAuthMessage("Такий акаунт уже існує.");
    return;
  }

  const passwordHash = await hashPassword(password);
  saveUser(username, { passwordHash, birthdays: [] });
  setAuthMessage("");
  passwordInput.value = "";
  showApp(username);
}

function fillMonthSelect() {
  monthInput.innerHTML = months
    .map((month, index) => `<option value="${index + 1}">${month}</option>`)
    .join("");
}

function isValidDate(month, day) {
  const currentYear = new Date().getFullYear();
  const date = new Date(currentYear, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day;
}

function handleBirthdaySubmit(event) {
  event.preventDefault();
  const month = Number(monthInput.value);
  const day = Number(dayInput.value);
  const name = personInput.value.trim();
  const note = noteInput.value.trim();

  if (!isValidDate(month, day)) {
    dayInput.setCustomValidity("У цьому місяці немає такого дня.");
    dayInput.reportValidity();
    return;
  }

  dayInput.setCustomValidity("");

  if (entryId.value) {
    state.birthdays = state.birthdays.map((entry) =>
      entry.id === entryId.value ? { ...entry, name, month, day, note } : entry
    );
  } else {
    state.birthdays.push({
      id: crypto.randomUUID(),
      name,
      month,
      day,
      note,
      createdAt: new Date().toISOString(),
    });
  }

  resetBirthdayForm();
  saveBirthdays();
  render();
}

function resetBirthdayForm() {
  entryId.value = "";
  personInput.value = "";
  noteInput.value = "";
  dayInput.value = "";
  monthInput.value = String(new Date().getMonth() + 1);
  cancelEditButton.classList.add("hidden");
}

function editEntry(id) {
  const entry = state.birthdays.find((item) => item.id === id);
  if (!entry) return;
  entryId.value = entry.id;
  personInput.value = entry.name;
  monthInput.value = String(entry.month);
  dayInput.value = String(entry.day);
  noteInput.value = entry.note || "";
  cancelEditButton.classList.remove("hidden");
  personInput.focus();
}

function deleteEntry(id) {
  const entry = state.birthdays.find((item) => item.id === id);
  if (!entry) return;
  const confirmed = window.confirm(`Видалити запис "${entry.name}"?`);
  if (!confirmed) return;
  state.birthdays = state.birthdays.filter((item) => item.id !== id);
  saveBirthdays();
  render();
}

function daysUntil(month, day) {
  const today = startOfDay(new Date());
  const thisYear = today.getFullYear();
  let target = new Date(thisYear, month - 1, day);
  if (target < today) target = new Date(thisYear + 1, month - 1, day);
  return Math.round((target - today) / 86400000);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getFilteredEntries() {
  const term = state.search.trim().toLowerCase();
  const entries = [...state.birthdays].sort((a, b) => a.month - b.month || a.day - b.day || a.name.localeCompare(b.name));
  if (!term) return entries;
  return entries.filter((entry) =>
    `${entry.name} ${entry.note || ""} ${months[entry.month - 1]}`.toLowerCase().includes(term)
  );
}

function render() {
  renderMonths();
  renderUpcoming();
}

function renderMonths() {
  const entries = getFilteredEntries();
  monthsGrid.innerHTML = months
    .map((month, index) => {
      const monthNumber = index + 1;
      const items = entries.filter((entry) => entry.month === monthNumber);
      return `
        <article class="month-panel">
          <div class="month-title">
            <h3>${month}</h3>
            <span>${items.length}</span>
          </div>
          ${
            items.length
              ? `<div class="birthday-list">${items.map(renderBirthdayItem).join("")}</div>`
              : `<p class="empty-month">Поки немає записів</p>`
          }
        </article>
      `;
    })
    .join("");
}

function renderBirthdayItem(entry) {
  return `
    <div class="birthday-item">
      <strong>${entry.day} ${months[entry.month - 1]} - ${escapeHtml(entry.name)}</strong>
      ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}
      <div class="item-actions">
        <button class="small-button" type="button" data-action="edit" data-id="${entry.id}">Редагувати</button>
        <button class="small-button delete-button" type="button" data-action="delete" data-id="${entry.id}">Видалити</button>
      </div>
    </div>
  `;
}

function renderUpcoming() {
  const upcoming = [...state.birthdays]
    .map((entry) => ({ ...entry, distance: daysUntil(entry.month, entry.day) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  upcomingList.innerHTML = upcoming.length
    ? upcoming.map((entry) => `<li>${escapeHtml(entry.name)}: через ${entry.distance} дн.</li>`).join("")
    : "<li>Немає записів</li>";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function tomorrowDate() {
  const date = startOfDay(new Date());
  date.setDate(date.getDate() + 1);
  return date;
}

function reminderDismissKey(date) {
  return `birthday-app:reminder-dismissed:${state.user}:${date.toISOString().slice(0, 10)}`;
}

function checkTomorrowReminder() {
  const tomorrow = tomorrowDate();
  const matches = state.birthdays.filter(
    (entry) => entry.month === tomorrow.getMonth() + 1 && entry.day === tomorrow.getDate()
  );
  if (!matches.length) return;
  if (localStorage.getItem(reminderDismissKey(tomorrow))) return;

  const names = matches.map((entry) => entry.name).join(", ");
  reminderText.textContent = `ЗАВТРА ДН У ${names}`;
  genNameInput.value = names;
  makePrompt();
  reminderModal.classList.remove("hidden");
}

function closeReminder() {
  localStorage.setItem(reminderDismissKey(tomorrowDate()), "yes");
  reminderModal.classList.add("hidden");
  imageGenerator.classList.remove("hidden");
  imageGenerator.scrollIntoView({ behavior: "smooth", block: "start" });
}

function makePrompt() {
  const name = genNameInput.value.trim() || "іменинника";
  const style = genStyleInput.value;
  promptOutput.value = `Створи зображення для привітання з днем народження для ${name}. Стиль: ${style}. Додай святковий настрій, український текст "З днем народження!", без зайвих написів, висока якість.`;
  drawCard(name);
}

async function copyPrompt() {
  await navigator.clipboard.writeText(promptOutput.value);
  copyPromptButton.textContent = "Скопійовано";
  setTimeout(() => {
    copyPromptButton.textContent = "Скопіювати";
  }, 1400);
}

function drawCard(name) {
  const ctx = cardCanvas.getContext("2d");
  const width = cardCanvas.width;
  const height = cardCanvas.height;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff7ed");
  gradient.addColorStop(0.45, "#ccfbf1");
  gradient.addColorStop(1, "#ffe4e6");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(15, 118, 110, 0.16)";
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    ctx.arc(90 + i * 70, 110 + (i % 4) * 85, 26 + (i % 3) * 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#0f766e";
  ctx.font = "900 76px Arial";
  ctx.textAlign = "center";
  ctx.fillText("З днем народження!", width / 2, 300);

  ctx.fillStyle = "#e11d48";
  ctx.font = "900 62px Arial";
  wrapCanvasText(ctx, name, width / 2, 400, 920, 72);

  ctx.fillStyle = "#7c2d12";
  ctx.font = "700 34px Arial";
  ctx.fillText("Бажаю радості, тепла і красивого святкового дня", width / 2, 620);
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  words.forEach((word, index) => {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && index > 0) {
      ctx.fillText(line, x, currentY);
      line = `${word} `;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });
  ctx.fillText(line, x, currentY);
}

function downloadCard() {
  const link = document.createElement("a");
  link.download = "birthday-card.png";
  link.href = cardCanvas.toDataURL("image/png");
  link.click();
}

authForm.addEventListener("submit", handleLogin);
registerButton.addEventListener("click", handleRegister);
logoutButton.addEventListener("click", showAuth);
birthdayForm.addEventListener("submit", handleBirthdaySubmit);
cancelEditButton.addEventListener("click", resetBirthdayForm);
searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderMonths();
});
monthsGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "edit") editEntry(button.dataset.id);
  if (button.dataset.action === "delete") deleteEntry(button.dataset.id);
});
closeReminderButton.addEventListener("click", closeReminder);
hideGeneratorButton.addEventListener("click", () => imageGenerator.classList.add("hidden"));
makePromptButton.addEventListener("click", makePrompt);
genNameInput.addEventListener("input", makePrompt);
genStyleInput.addEventListener("change", makePrompt);
copyPromptButton.addEventListener("click", copyPrompt);
downloadCardButton.addEventListener("click", downloadCard);

fillMonthSelect();
resetBirthdayForm();

const lastSession = localStorage.getItem(sessionKey());
if (lastSession && getUser(lastSession)) {
  showApp(lastSession);
} else {
  showAuth();
}
