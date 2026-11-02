function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const storageKey = "hearth-harbor-preview";
const companionChatKey = "hearth-harbor-companion-chat";

const initialState = {
  view: "dashboard", // Always open at Overview
  plannerView: "agenda",
  plannerDate: getLocalDateStr(),
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedDate: getLocalDateStr(),
  colorTheme: "gold",
  comfortableText: false,
  bannerVisible: true,
  welcomed: false,
  name: "Poppy",
  reflection: "",
  settings: {
    companionPermission: true,
    researchMode: true,
    rememberAcrossConversations: true,
    proactiveSuggestions: true
  },
  tasks: [
    { id: 1, title: "Pick up library books", date: getLocalDateStr(), time: "16:30", list: "progress", done: false, detail: "Historical biographies waiting" },
    { id: 2, title: "Try Sunday lemon rice recipe", date: getLocalDateStr(), time: "10:00", list: "todo", done: false, detail: "Simple, generous cooking" },
    { id: 3, title: "Read for twenty minutes", date: getLocalDateStr(), time: "21:00", list: "todo", done: false, detail: "Before evening rest" }
  ]
};

let state = loadState();
// Force opening view to overview (dashboard) on every fresh load
state.view = "dashboard";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const icons = { check: '<svg><use href="#i-check"/></svg>' };

const poppyWisdomQuotes = [
  { text: "“A father’s wisdom is a quiet lamp that lights every road ahead. Take time today to pause, breathe, and enjoy the moments you’ve earned, Poppy.”", author: "— Dedicated with love" },
  { text: "“The best days begin with a quiet cup of tea, clean morning air, and the peace of knowing you are cherished.”", author: "— Morning thought" },
  { text: "“To plant a garden is to believe in tomorrow. Tend to your quiet routines and let contentment grow around you.”", author: "— Nature and tranquility" },
  { text: "“You don’t have to rush through the day, Poppy. One gentle priority at a time is the secret to a restful life.”", author: "— Gentle reminder" },
  { text: "“Memories of good food, warm laughter, and peaceful evenings are the greatest treasures a home can hold.”", author: "— Hearth & Harbor" },
  { text: "“Rest is not idleness, Poppy; it is the gift you give your mind so tomorrow can bloom with clarity.”", author: "— Evening reflection" },
  { text: "“Look back at how much you have nurtured and built. Today is for taking your time and smiling at the quiet.”", author: "— Daily appreciation" }
];
let currentWisdomIndex = Math.floor(Math.random() * poppyWisdomQuotes.length);

function rotateWisdomQuote() {
  currentWisdomIndex = (currentWisdomIndex + 1) % poppyWisdomQuotes.length;
  const q = poppyWisdomQuotes[currentWisdomIndex];
  const textEl = $("#wisdomQuoteText");
  const authorEl = $("#wisdomAuthor");
  if (textEl && authorEl) {
    textEl.style.opacity = "0.2";
    textEl.style.transition = "opacity 0.25s ease";
    setTimeout(() => {
      textEl.textContent = q.text;
      authorEl.textContent = q.author;
      textEl.style.opacity = "1";
    }, 200);
  }
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const stateName = (parsed.name && parsed.name !== "Dad") ? parsed.name : "Poppy";
    return {
      ...initialState,
      ...parsed,
      name: stateName,
      view: "dashboard", // Always open at Overview
      colorTheme: parsed.colorTheme || initialState.colorTheme,
      comfortableText: Boolean(parsed.comfortableText),
      calendarYear: Number.isInteger(parsed.calendarYear) ? parsed.calendarYear : initialState.calendarYear,
      calendarMonth: Number.isInteger(parsed.calendarMonth) ? parsed.calendarMonth : initialState.calendarMonth,
      selectedDate: parsed.selectedDate || initialState.selectedDate,
      settings: { ...initialState.settings, ...(parsed.settings || {}) },
      tasks: (Array.isArray(parsed.tasks) ? parsed.tasks : [...initialState.tasks]).filter(task => !task.done && task.list !== "done")
    };
  }
  catch { return { ...initialState, view: "dashboard" }; }
}

function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }

/* ========================================================
   THEME PALETTE & READING COMFORT
   ======================================================== */
function applyTheme(theme) {
  state.colorTheme = theme || "gold";
  document.body.dataset.theme = state.colorTheme;
  $$(".color-swatch-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.themeColor === state.colorTheme);
  });
  $$(".theme-card-option").forEach(card => {
    card.classList.toggle("active", card.dataset.themeColor === state.colorTheme);
  });
  saveState();
}

function applyTextComfort(enabled) {
  state.comfortableText = Boolean(enabled);
  document.body.classList.toggle("comfortable-text", state.comfortableText);
  const toggle = $("#comfortableTextToggle");
  if (toggle) toggle.checked = state.comfortableText;
  saveState();
}

/* ========================================================
   GLOBAL UNDO & REDO STATE MANAGEMENT
   ======================================================== */
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 30;

function getSnapshot() {
  return {
    tasks: JSON.parse(JSON.stringify(state.tasks)),
    reflection: state.reflection,
    settings: JSON.parse(JSON.stringify(state.settings)),
    name: state.name,
    colorTheme: state.colorTheme,
    comfortableText: state.comfortableText
  };
}

function pushHistory() {
  undoStack.push(getSnapshot());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const undoBtn = $("#undoBtn");
  const redoBtn = $("#redoBtn");
  if (undoBtn) {
    undoBtn.disabled = false;
    undoBtn.classList.toggle("is-inactive", undoStack.length === 0);
  }
  if (redoBtn) {
    redoBtn.disabled = false;
    redoBtn.classList.toggle("is-inactive", redoStack.length === 0);
  }
}

function undo() {
  if (!$("#vaultModal")?.classList.contains("hidden")) {
    undoNoteChange();
    return;
  }
  if (undoStack.length === 0) {
    showToast("Nothing to undo yet — changes to your tasks or notes will appear here.");
    return;
  }
  redoStack.push(getSnapshot());
  const snapshot = undoStack.pop();
  state.tasks = snapshot.tasks;
  state.reflection = snapshot.reflection;
  state.settings = snapshot.settings;
  state.name = snapshot.name;
  state.colorTheme = snapshot.colorTheme || "gold";
  state.comfortableText = Boolean(snapshot.comfortableText);
  saveState();
  applyTheme(state.colorTheme);
  applyTextComfort(state.comfortableText);
  updateNameUI(state.name);
  renderTasks();
  renderCalendar();
  if ($("#reflectionText")) $("#reflectionText").value = state.reflection || "";
  setupPersistentToggles();
  updateUndoRedoButtons();
  showToast("Action undone ↶");
}

function redo() {
  if (!$("#vaultModal")?.classList.contains("hidden")) {
    redoNoteChange();
    return;
  }
  if (redoStack.length === 0) {
    showToast("Nothing to redo.");
    return;
  }
  undoStack.push(getSnapshot());
  const snapshot = redoStack.pop();
  state.tasks = snapshot.tasks;
  state.reflection = snapshot.reflection;
  state.settings = snapshot.settings;
  state.name = snapshot.name;
  state.colorTheme = snapshot.colorTheme || "gold";
  state.comfortableText = Boolean(snapshot.comfortableText);
  saveState();
  applyTheme(state.colorTheme);
  applyTextComfort(state.comfortableText);
  updateNameUI(state.name);
  renderTasks();
  renderCalendar();
  if ($("#reflectionText")) $("#reflectionText").value = state.reflection || "";
  setupPersistentToggles();
  updateUndoRedoButtons();
  showToast("Action redone ↷");
}

/* ========================================================
   DATE & TIME UTILITIES
   ======================================================== */
function formatTime(time) {
  if (typeof time !== "string" || !/^\d{1,2}:\d{2}$/.test(time)) return "Any time";
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return "Any time";
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatDate(date) {
  const parsed = new Date(`${date || ""}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Unscheduled";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(parsed);
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/* ========================================================
   RENDERERS: WEEK, TASKS, CALENDAR & VAULT
   ======================================================== */
function renderWeekProgress() {
  const dashboardDate = new Date("2026-10-30T12:00:00");
  const monday = new Date(dashboardDate);
  monday.setDate(dashboardDate.getDate() - ((dashboardDate.getDay() + 6) % 7));
  let completedThisWeek = 0;
  $$(".bar-col").forEach((column, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const date = day.toISOString().slice(0, 10);
    const dayTasks = state.tasks.filter(task => task.date === date);
    const completed = dayTasks.filter(task => task.done).length;
    completedThisWeek += completed;
    const bar = $(".bar i", column);
    if (bar) bar.style.height = `${dayTasks.length ? Math.round((completed / dayTasks.length) * 100) : 0}%`;
    column.classList.toggle("current", date === getLocalDateStr());
  });
  $(".progress-footer strong").textContent = `${completedThisWeek} this week`;
}

function renderTasks() {
  const dashboardDate = getLocalDateStr();
  const agendaDate = state.plannerDate || dashboardDate;

  const now = new Date();
  const todayFormatted = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  if ($("#todayLabel")) $("#todayLabel").textContent = todayFormatted;
  const dashboardTasks = state.tasks.filter(task => task.date === dashboardDate);
  const agendaTasks = state.tasks.filter(task => task.date === agendaDate);

  $("#todayTasks").innerHTML = dashboardTasks.slice(0, 3).map(task => {
    const title = escapeHtml(task.title || "Untitled task");
    return `<div class="task-row"><button class="task-check ${task.done ? "done" : ""}" data-task-id="${task.id}" aria-label="Mark ${title} ${task.done ? "open" : "done"}">${task.done ? icons.check : ""}</button><span>${title}</span><span class="task-time">${formatTime(task.time)}</span></div>`;
  }).join("");

  $("#agendaList").innerHTML = agendaTasks.length ? agendaTasks.map(task => {
    const title = escapeHtml(task.title || "Untitled task");
    const detail = escapeHtml(task.detail || "Planner task");
    return `<div class="agenda-item ${task.done ? "done" : ""}"><span class="agenda-time">${formatTime(task.time)}</span><span class="agenda-line"></span><div class="agenda-main"><strong>${title}</strong><span>${detail}</span></div><button class="task-check ${task.done ? "done" : ""}" data-task-id="${task.id}" aria-label="Mark ${title} ${task.done ? "open" : "done"}">${task.done ? icons.check : ""}</button></div>`;
  }).join("") : `<div class="empty-state">Nothing planned for ${escapeHtml(formatDate(agendaDate))}.</div>`;

  $("#fullTaskList").innerHTML = state.tasks.map(task => {
    const title = escapeHtml(task.title || "Untitled task");
    return `<div class="full-task"><button class="task-check ${task.done ? "done" : ""}" data-task-id="${task.id}" aria-label="Mark ${title} ${task.done ? "open" : "done"}">${task.done ? icons.check : ""}</button><div class="full-task-body"><strong>${title}</strong><span>${escapeHtml(formatDate(task.date))} · ${formatTime(task.time)}</span></div><span class="task-tag ${task.list}">${task.list === "progress" ? "In progress" : task.list === "done" ? "Done" : "To do"}</span></div>`;
  }).join("");

  $("#taskCount").textContent = `${state.tasks.filter(task => !task.done).length} open · ${state.tasks.length} total`;

  $$(".kanban-stack").forEach(stack => {
    const list = stack.dataset.column;
    stack.innerHTML = state.tasks.filter(task => task.list === list).map(task => `<div class="kanban-card" draggable="true" data-task-id="${task.id}" tabindex="0"><strong>${escapeHtml(task.title || "Untitled task")}</strong><span>${escapeHtml(formatDate(task.date))} · ${formatTime(task.time)}</span></div>`).join("") || `<div class="kanban-card"><span>Nothing here yet.</span></div>`;
  });

  $$(".kanban-column").forEach(column => {
    const stack = $(".kanban-stack", column);
    $(".column-count", column).textContent = state.tasks.filter(task => task.list === stack.dataset.column).length;
  });

  const openToday = dashboardTasks.filter(task => !task.done).length;
  const progressTitle = $(".day-progress strong");
  if (progressTitle) progressTitle.textContent = openToday === 0 ? "All priorities completed" : `${openToday} gentle priorit${openToday === 1 ? "y" : "ies"} left`;
  const progressSubtitle = $(".day-progress p");
  if (progressSubtitle) progressSubtitle.textContent = openToday === 0 ? "Time to rest and enjoy the quiet evening." : "One thing at a time is plenty.";

  const completed = state.tasks.filter(task => task.done).length;
  const percent = state.tasks.length ? Math.round((completed / state.tasks.length) * 100) : 0;
  const progressRing = $(".progress-ring");
  if (progressRing) {
    progressRing.style.background = `conic-gradient(var(--gold) 0 ${percent}%, rgba(255,255,255,.08) ${percent}% 100%)`;
    $("#progressPercent").textContent = `${percent}%`;
  }

  $("#openTaskBadge").textContent = String(openToday);
  $("#plannerDate").textContent = formatDate(agendaDate);
  const agendaParsed = new Date(`${agendaDate}T12:00:00`);
  $("#agendaDayLabel").textContent = agendaDate === dashboardDate ? "Today" : Number.isNaN(agendaParsed.getTime()) ? "Selected day" : new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(agendaParsed);

  renderWeekProgress();
  renderCalendar();
}

function renderCalendar() {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const year = state.calendarYear || 2026;
  const month = state.calendarMonth ?? 9;
  const selectedDate = state.selectedDate || "2026-10-30";
  const todayDate = "2026-10-30";

  const monthLabel = $("#calendarMonthLabel");
  if (monthLabel) monthLabel.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
  let html = "";

  for (let i = 0; i < totalCells; i++) {
    let dayNumber, cellDateStr, isOtherMonth = false;
    if (i < startDayOfWeek) {
      dayNumber = daysInPrevMonth - (startDayOfWeek - 1 - i);
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      cellDateStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
      isOtherMonth = true;
    } else if (i < startDayOfWeek + daysInMonth) {
      dayNumber = i - startDayOfWeek + 1;
      cellDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    } else {
      dayNumber = i - (startDayOfWeek + daysInMonth) + 1;
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      cellDateStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
      isOtherMonth = true;
    }

    const dayTasks = state.tasks.filter(t => t.date === cellDateStr);
    const isToday = cellDateStr === todayDate;
    const isSelected = cellDateStr === selectedDate;

    const dotsHtml = dayTasks.slice(0, 4).map(t => 
      `<span class="calendar-task-dot ${t.done ? "done" : ""}" title="${escapeHtml(t.title || 'Task')}"></span>`
    ).join("");

    html += `
      <div class="calendar-day-cell ${isOtherMonth ? "other-month" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}" data-date="${cellDateStr}" tabindex="0" role="button" aria-label="${cellDateStr}">
        <span class="calendar-day-number">${dayNumber}</span>
        <div class="calendar-day-dots">${dotsHtml}</div>
      </div>
    `;
  }

  const calendarDaysElem = $("#calendarDays");
  if (calendarDaysElem) calendarDaysElem.innerHTML = html;

  const selectedParsed = new Date(`${selectedDate}T12:00:00`);
  const titleFormatted = Number.isNaN(selectedParsed.getTime())
    ? selectedDate
    : new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(selectedParsed);

  if ($("#calendarSelectedTitle")) $("#calendarSelectedTitle").textContent = titleFormatted;

  const selectedTasks = state.tasks.filter(t => t.date === selectedDate);
  const summaryElem = $("#calendarSelectedTasks");
  if (summaryElem) {
    if (selectedTasks.length === 0) {
      summaryElem.innerHTML = `<p class="heading-subtitle" style="margin: 8px 0; color: var(--muted);">No tasks planned for this day.</p>`;
    } else {
      summaryElem.innerHTML = selectedTasks.map(t => {
        const title = escapeHtml(t.title || "Untitled task");
        return `
          <div class="calendar-task-card ${t.done ? "done" : ""}">
            <button class="task-check ${t.done ? "done" : ""}" data-task-id="${t.id}" aria-label="Mark ${title} ${t.done ? "open" : "done"}">${t.done ? icons.check : ""}</button>
            <strong>${title}</strong>
            <span>${formatTime(t.time)}</span>
          </div>
        `;
      }).join("");
    }
  }
}

const defaultVaultNotes = [
  { icon: "🌱", title: "Garden notes", text: "Planting ideas, seasonal reminders, and the things that are thriving.", meta: "12 notes", color: "gold" },
  { icon: "🍋", title: "Recipes to keep", text: "Simple, generous food for Sundays and the people around the table.", meta: "8 notes", color: "green" },
  { icon: "🗺️", title: "Places to go", text: "Small trips, long weekends, and places worth taking your time in.", meta: "5 notes", color: "blue" },
  { icon: "📚", title: "Things to learn", text: "Questions, references, and rabbit holes for a curious afternoon.", meta: "21 notes", color: "rose" },
  { icon: "🧰", title: "Home projects", text: "Practical ideas for making the house a little more yours.", meta: "9 notes", color: "gold" },
  { icon: "✦", title: "Saved thoughts", text: "Calm ideas, reflections, and reminders ready whenever you need them.", meta: "4 notes", color: "blue" }
];

function loadVaultNotes() {
  try {
    const notes = [...defaultVaultNotes, ...(JSON.parse(localStorage.getItem("hearth-harbor-vault-notes") || "[]"))];
    const annotations = JSON.parse(localStorage.getItem("hearth-harbor-vault-annotations") || "{}");
    return notes.map(note => annotations[note.title]?.text ? { ...note, text: annotations[note.title].text } : note);
  }
  catch { return [...defaultVaultNotes]; }
}

function saveVaultNote(note) {
  try {
    const customNotes = JSON.parse(localStorage.getItem("hearth-harbor-vault-notes") || "[]");
    customNotes.push(note);
    localStorage.setItem("hearth-harbor-vault-notes", JSON.stringify(customNotes));
  } catch {}
}

function renderVault(search = "") {
  const notes = loadVaultNotes();
  const filtered = notes.filter(note => `${note.title} ${note.text}`.toLowerCase().includes(search.toLowerCase()));
  $("#vaultGrid").innerHTML = filtered.length ? filtered.map(note => {
    const title = escapeHtml(note.title || "Untitled note");
    const text = escapeHtml(note.text || "");
    const icon = escapeHtml(note.icon || "📝");
    const meta = escapeHtml(note.meta || "Private note");
    const colorClass = ({ gold: "gold", green: "green", blue: "blue", rose: "rose", purple: "purple" })[note.color] || "blue";
    return `<article class="vault-card note-card ${colorClass}" tabindex="0" role="button" aria-label="Open ${title}"><div class="note-preview"><span class="note-label">PRIVATE NOTE</span><div class="note-card-icon">${icon}</div><h3>${title}</h3><p>${text}</p><span class="note-card-prompt">Open to annotate →</span></div><div class="vault-meta"><span>${meta}</span><strong>Open note →</strong></div></article>`;
  }).join("") : `<div class="card" style="grid-column:1/-1"><p class="heading-subtitle">No notes match that search yet.</p></div>`;
}

function switchView(view) {
  if (!$(`#view-${view}`)) view = "dashboard";
  state.view = view;
  saveState();

  // If opening overview, rotate wisdom quote automatically
  if (view === "dashboard") {
    rotateWisdomQuote();
  }

  $$(".page-view").forEach(page => page.classList.toggle("active", page.id === `view-${view}`));
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  $$(".bottom-nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));

  const active = $(`.nav-item[data-view="${view}"]`);
  $("#crumbCurrent").textContent = active ? active.querySelector("span").textContent : "Overview";
  $("#crumbParent").textContent = view === "dashboard" ? "Home" : "Hearth & Harbor";
  $("#sidebar").classList.remove("open");
  $("#sidebarScrim")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateNameUI(name) {
  const displayName = String(name || "Poppy").trim().slice(0, 40) || "Poppy";
  const greeting = greetingForNow();
  const heading = $(".dashboard-heading h1");
  if (heading && heading.firstChild) heading.firstChild.textContent = `${greeting}, ${displayName}`;
  const topbarUser = $(".topbar-user strong");
  if (topbarUser) topbarUser.textContent = displayName;
  const topbarGreeting = $(".topbar-user span");
  if (topbarGreeting) topbarGreeting.textContent = greeting;
  const profileChip = $(".profile-chip strong");
  if (profileChip) profileChip.textContent = displayName;
  $$(".avatar-gold").forEach(av => av.textContent = displayName.slice(0, 1).toUpperCase());
}

function updateAgendaDate(offset) {
  const current = new Date(`${state.plannerDate || "2026-10-30"}T12:00:00`);
  if (Number.isNaN(current.getTime())) current.setTime(new Date("2026-10-30T12:00:00").getTime());
  current.setDate(current.getDate() + offset);
  state.plannerDate = current.toISOString().slice(0, 10);
  saveState();
  renderTasks();
}

/* ========================================================
   NOTE ANNOTATOR WITH SAME UNDO/REDO & AUTOSAVE
   ======================================================== */
let draggedTaskId = null;
let wasDragged = false;
let activeVaultTitle = "";
let selectedNoteTool = "select";
let selectedNoteColor = "#e2a84a";
let currentNoteStrokes = [];
let noteRedoStrokes = [];
let autosaveTimer = null;

const noteColorMap = {
  gold: "#e2a84a",
  emerald: "#38b27d",
  ocean: "#3da9fc",
  coral: "#f27244",
  violet: "#a78bfa",
  rose: "#f43f5e",
  mint: "#2dd4bf",
  white: "#f8fafc"
};

function updateDrawingMode() {
  $("#vaultDrawCanvas")?.classList.toggle("is-drawing", selectedNoteTool !== "select");
}

function updateNoteUndoRedoUI() {
  const undoBtn = $("#noteUndoBtn");
  const redoBtn = $("#noteRedoBtn");
  if (undoBtn) {
    undoBtn.disabled = false;
    undoBtn.classList.toggle("is-inactive", currentNoteStrokes.length === 0);
  }
  if (redoBtn) {
    redoBtn.disabled = false;
    redoBtn.classList.toggle("is-inactive", noteRedoStrokes.length === 0);
  }
}

function resizeVaultCanvas() {
  const canvas = $("#vaultDrawCanvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
  redrawVaultCanvas();
}

function redrawVaultCanvas() {
  const canvas = $("#vaultDrawCanvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  currentNoteStrokes.forEach(stroke => {
    if (!stroke.points || stroke.points.length === 0) return;
    context.save();
    context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = stroke.color;
    context.globalAlpha = stroke.tool === "highlight" ? 0.35 : 1;
    context.lineWidth = stroke.width || (stroke.tool === "highlight" ? 14 : 3);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      context.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    context.stroke();
    context.restore();
  });
}

function autosaveNote() {
  const badge = $("#vaultAutosaveBadge");
  if (badge) {
    badge.classList.add("saving");
    badge.innerHTML = '<span class="autosave-dot"></span> Saving…';
  }
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      const annotations = JSON.parse(localStorage.getItem("hearth-harbor-vault-annotations") || "{}");
      if (activeVaultTitle) {
        annotations[activeVaultTitle] = {
          text: $("#vaultDetailText")?.value.trim() || "",
          strokes: currentNoteStrokes,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem("hearth-harbor-vault-annotations", JSON.stringify(annotations));
      }
      renderVault($("#vaultSearch")?.value || "");
      if (badge) {
        badge.classList.remove("saving");
        badge.innerHTML = '<span class="autosave-dot"></span> Autosaved';
      }
    } catch {}
  }, 400);
}

function undoNoteChange() {
  if (currentNoteStrokes.length) {
    const popped = currentNoteStrokes.pop();
    noteRedoStrokes.push(popped);
    redrawVaultCanvas();
    updateNoteUndoRedoUI();
    autosaveNote();
    showToast("Last drawing stroke undone ↶");
    return;
  }
  const input = $(".modal-backdrop:not(.hidden) [data-note-input]");
  if (input) {
    input.focus();
    document.execCommand("undo");
    autosaveNote();
    showToast("Last text change undone.");
  }
}

function redoNoteChange() {
  if (noteRedoStrokes.length) {
    const restored = noteRedoStrokes.pop();
    currentNoteStrokes.push(restored);
    redrawVaultCanvas();
    updateNoteUndoRedoUI();
    autosaveNote();
    showToast("Drawing stroke redone ↷");
    return;
  }
  const input = $(".modal-backdrop:not(.hidden) [data-note-input]");
  if (input) {
    input.focus();
    document.execCommand("redo");
    autosaveNote();
    showToast("Text change redone.");
  }
}

function setupVaultDrawing() {
  const canvas = $("#vaultDrawCanvas");
  if (!canvas || canvas.dataset.ready) return;
  canvas.dataset.ready = "true";
  resizeVaultCanvas();
  window.addEventListener("resize", resizeVaultCanvas);
  let drawing = false;
  let activeStroke = null;
  const point = event => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  
  canvas.addEventListener("pointerdown", event => {
    drawing = true;
    const pt = point(event);
    activeStroke = {
      tool: selectedNoteTool,
      color: selectedNoteColor,
      width: selectedNoteTool === "highlight" ? 14 : 3,
      points: [pt]
    };
    currentNoteStrokes.push(activeStroke);
    noteRedoStrokes = []; // Clear redo on new action
    updateNoteUndoRedoUI();
    canvas.setPointerCapture(event.pointerId);

    const context = canvas.getContext("2d");
    context.save();
    context.globalCompositeOperation = selectedNoteTool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = selectedNoteColor;
    context.globalAlpha = selectedNoteTool === "highlight" ? 0.35 : 1;
    context.lineWidth = selectedNoteTool === "highlight" ? 14 : 3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(pt.x, pt.y);
    context.lineTo(pt.x + 0.1, pt.y + 0.1);
    context.stroke();
    context.restore();
  });

  canvas.addEventListener("pointermove", event => {
    if (!drawing || !activeStroke) return;
    const nextPoint = point(event);
    const lastPoint = activeStroke.points[activeStroke.points.length - 1];
    activeStroke.points.push(nextPoint);
    
    const context = canvas.getContext("2d");
    context.save();
    context.globalCompositeOperation = selectedNoteTool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = selectedNoteColor;
    context.globalAlpha = selectedNoteTool === "highlight" ? 0.35 : 1;
    context.lineWidth = selectedNoteTool === "highlight" ? 14 : 3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    context.restore();
  });

  canvas.addEventListener("pointerup", () => {
    drawing = false;
    activeStroke = null;
    autosaveNote();
  });
  canvas.addEventListener("pointercancel", () => {
    drawing = false;
    activeStroke = null;
  });
}

function openVaultDetails(card) {
  const title = $("h3", card)?.textContent || "Knowledge Vault item";
  const summary = $("p", card)?.textContent || "Note ready to edit.";
  const meta = $(".vault-meta span", card)?.textContent.trim() || "Private note";
  activeVaultTitle = title;
  $("#vaultModalTitle").textContent = title;
  $("#vaultModalMeta").textContent = meta;
  $("#vaultDetailText").value = summary;
  noteRedoStrokes = [];
  openModal("#vaultModal");
  requestAnimationFrame(() => {
    resizeVaultCanvas();
    const canvas = $("#vaultDrawCanvas");
    if (!canvas) return;
    try {
      const saved = JSON.parse(localStorage.getItem("hearth-harbor-vault-annotations") || "{}")[activeVaultTitle];
      currentNoteStrokes = Array.isArray(saved?.strokes) ? saved.strokes : [];
      redrawVaultCanvas();
    } catch { currentNoteStrokes = []; }
    updateNoteUndoRedoUI();
  });
}

/* ========================================================
   BUILT-IN AI COMPANION CHATBOT ENGINE (FOR POPPY)
   ======================================================== */
const defaultCompanionHistory = [
  {
    role: "assistant",
    text: "Good day, Poppy! ✦ I’m your private built-in companion. You can chat with me about anything — ask for stories, recipes, gardening tips, or ask me to manage your day, like:\n\n• “Please note the task pickup library books finished”\n• “What’s on my plan today?”\n• “Tell me a calm story”\n• “Suggest a soothing tea recipe”\n\nHow can I help you right now, Poppy?",
    time: "Just now"
  }
];

function loadCompanionHistory() {
  try {
    const raw = localStorage.getItem(companionChatKey);
    if (!raw) return [...defaultCompanionHistory];
    let saved = JSON.parse(raw);
    if (!Array.isArray(saved) || !saved.length) return [...defaultCompanionHistory];
    // Replace any legacy mentions of "Dad" with "Poppy"
    saved = saved.map(msg => ({
      ...msg,
      text: msg.text ? msg.text.replace(/\bDad\b/g, "Poppy") : ""
    }));
    return saved;
  } catch {
    return [...defaultCompanionHistory];
  }
}

function saveCompanionHistory(history) {
  try {
    localStorage.setItem(companionChatKey, JSON.stringify(history.slice(-50)));
  } catch {}
}

let companionHistory = loadCompanionHistory();

function renderCompanionChat() {
  const container = $("#companionMessages");
  if (!container) return;
  container.innerHTML = companionHistory.map(msg => {
    const isUser = msg.role === "user";
    const avatar = isUser ? "P" : "✦";
    const textHtml = escapeHtml(msg.text).replace(/\n/g, "<br>");
    const taskDoneHtml = msg.taskDone ? `<div class="task-pill-done"><svg><use href="#i-check"/></svg> ${escapeHtml(msg.taskDone)}</div>` : "";
    return `
      <div class="companion-msg ${isUser ? "user" : "assistant"}">
        <div class="msg-avatar">${avatar}</div>
        <div class="msg-bubble">
          <div>${textHtml}</div>
          ${taskDoneHtml}
        </div>
      </div>
    `;
  }).join("");
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = $("#companionMessages");
  if (!container) return;
  const typingEl = document.createElement("div");
  typingEl.id = "companionTypingEl";
  typingEl.className = "companion-msg assistant";
  typingEl.innerHTML = `
    <div class="msg-avatar">✦</div>
    <div class="msg-bubble">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  container.appendChild(typingEl);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  $("#companionTypingEl")?.remove();
}

// Conversational AI Chatbot Brain for Poppy
function handleCompanionInput(userText) {
  userText = userText.trim();
  if (!userText) return;

  // Add user message
  companionHistory.push({ role: "user", text: userText, time: "Just now" });
  renderCompanionChat();
  showTypingIndicator();

  const lower = userText.toLowerCase();

  setTimeout(() => {
    removeTypingIndicator();

    // 1. Task Finished / Completed command
    const isDoneCommand = lower.includes("finished") || lower.includes("done") || lower.includes("completed") || lower.includes("finish") || lower.includes("check off");
    if (isDoneCommand) {
      let matchedTask = null;
      let highestScore = 0;

      state.tasks.forEach(task => {
        const taskWords = task.title.toLowerCase().split(/\s+/);
        let matchCount = 0;
        taskWords.forEach(word => {
          if (word.length > 2 && lower.includes(word)) matchCount++;
        });
        if (matchCount > highestScore) {
          highestScore = matchCount;
          matchedTask = task;
        }
      });

      if (matchedTask && highestScore > 0) {
        pushHistory();
        matchedTask.done = true;
        matchedTask.list = "done";
        saveState();
        renderTasks();
        renderCalendar();

        companionHistory.push({
          role: "assistant",
          text: `Done, Poppy! ✦ I’ve marked “${matchedTask.title}” as finished in your planner. Take some time to sit back and relax!`,
          taskDone: `Completed: ${matchedTask.title}`,
          time: "Just now"
        });
        saveCompanionHistory(companionHistory);
        renderCompanionChat();
        showToast(`“${matchedTask.title}” marked finished.`);
        return;
      }
    }

    // 2. What's on today's plan / schedule
    if (lower.includes("what's on") || lower.includes("today's plan") || lower.includes("today's task") || lower.includes("schedule") || lower.includes("agenda")) {
      const today = state.plannerDate || "2026-10-30";
      const todayTasks = state.tasks.filter(t => t.date === today);
      const openTasks = todayTasks.filter(t => !t.done);
      const completedTasks = todayTasks.filter(t => t.done);

      let reply = "";
      if (todayTasks.length === 0) {
        reply = "You have an open, clear day today, Poppy! No urgent priorities scheduled. A wonderful afternoon for a cup of tea, some quiet reading, or a stroll in the garden.";
      } else {
        reply = `Here is your day at a glance, Poppy:\n• ${openTasks.length} open priorities left\n• ${completedTasks.length} priorities already finished\n\n`;
        if (openTasks.length) {
          reply += "Next priorities: " + openTasks.map(t => `“${t.title}” at ${formatTime(t.time)}`).join(", ") + ".";
        } else {
          reply += "Everything for today is checked off and finished! Enjoy the well-deserved quiet.";
        }
      }

      companionHistory.push({ role: "assistant", text: reply, time: "Just now" });
      saveCompanionHistory(companionHistory);
      renderCompanionChat();
      return;
    }

    // 3. Calendar command
    if (lower.includes("calendar") || lower.includes("month view")) {
      companionHistory.push({
        role: "assistant",
        text: "Opening your monthly calendar right now, Poppy. You can see all your scheduled days and event dots there.",
        time: "Just now"
      });
      saveCompanionHistory(companionHistory);
      renderCompanionChat();
      setTimeout(() => {
        switchView("planner");
        state.plannerView = "calendar";
        saveState();
        $("[data-planner-view]").forEach(tab => tab.classList.toggle("active", tab.dataset.plannerView === "calendar"));
        $("#planner-agenda, #planner-calendar, #planner-tasks, #planner-kanban").forEach(panel => panel.classList.add("hidden"));
        $("#planner-calendar")?.classList.remove("hidden");
        renderCalendar();
      }, 600);
      return;
    }

    // 4. Add task command
    if (lower.includes("add task") || lower.includes("add a task") || lower.startsWith("plan ") || lower.startsWith("remind me to") || lower.startsWith("note to ")) {
      const cleanTitle = userText.replace(/^(please )?(add task|add a task|plan to|remind me to|note to)\s+/i, "").trim();
      if (cleanTitle) {
        pushHistory();
        const newTask = {
          id: Date.now(),
          title: cleanTitle.slice(0, 60),
          date: state.plannerDate || "2026-10-30",
          time: "12:00",
          list: "todo",
          done: false,
          detail: "Added by your companion"
        };
        state.tasks.push(newTask);
        saveState();
        renderTasks();
        renderCalendar();

        companionHistory.push({
          role: "assistant",
          text: `I've noted that down for you, Poppy! “${newTask.title}” is now safely on your planner.`,
          time: "Just now"
        });
        saveCompanionHistory(companionHistory);
        renderCompanionChat();
        showToast("Task added to planner.");
        return;
      }
    }

    // 5. Friendly Greetings
    if (lower.includes("hello") || lower.includes("hi ") || lower === "hi" || lower.includes("good morning") || lower.includes("good evening") || lower.includes("how are you")) {
      const greetings = [
        "Good day, Poppy! ☀️ It's so nice to hear from you. Everything in your sanctuary is calm and running smoothly. How can I help you right now?",
        "Hello Poppy! I hope you're having a restful day. I'm right here whenever you need to check your plans or chat.",
        "Good day, Poppy! ✦ The kettle's warm, your notes are safe, and your planner is ready. What's on your mind today?"
      ];
      const reply = greetings[Math.floor(Math.random() * greetings.length)];
      companionHistory.push({ role: "assistant", text: reply, time: "Just now" });
      saveCompanionHistory(companionHistory);
      renderCompanionChat();
      return;
    }

    // 6. Calming Stories
    if (lower.includes("story") || lower.includes("tell me a story") || lower.includes("tale") || lower.includes("bedtime")) {
      const stories = [
        "Here is a peaceful story for you, Poppy:\n\nIn a quiet coastal harbor, an old cedar boat rested by the stone pier. Every morning, the water turned a soft silver as the sun peeked over the pine-covered hills. The harbor keeper never rushed; he brewed a pot of cardamom tea, listened to the gentle lap of the waves, and watched the gulls glide above.\n\nHe knew that some days are meant for building, and some days are meant simply for watching the tide come and go with a grateful heart. Today is your day to enjoy that same calm tide.",
        "A quiet memory for you, Poppy:\n\nHigh on a gentle hill, there stood an old olive tree with roots as deep as the earth itself. Season after season, through rain and sunshine, it offered shade to travelers and quiet shelter to nesting songbirds. It didn't strive to grow faster than the clouds or outshine the mountains—it simply stood tall, sturdy, and true.\n\nLike that grand tree, all the care and wisdom you have shared over the years continues to shade and protect the people who love you.",
        "A peaceful garden tale for Poppy:\n\nAt dawn in a small mountain valley, dew gathered on fresh mint and rosemary leaves. The garden was silent except for the gentle rustle of a warm breeze through the bamboo fence. The gardener walked through with a clay cup of warm tea, admiring how patiently the little seeds grew into tall green branches.\n\nNature reminds us that life doesn't need to be rushed to be beautiful. Each day blooms in its own perfect time."
      ];
      const reply = stories[Math.floor(Math.random() * stories.length)];
      companionHistory.push({ role: "assistant", text: reply, time: "Just now" });
      saveCompanionHistory(companionHistory);
      renderCompanionChat();
      return;
    }

    // 7. Gardening Wisdom
    if (lower.includes("garden") || lower.includes("plant") || lower.includes("mint") || lower.includes("verbena") || lower.includes("soil") || lower.includes("flower")) {
      const gardenTips = [
        "Here is a lovely garden tip for you, Poppy: Fresh mint and lemon verbena love bright morning sunlight and damp soil, but make sure their roots don't sit in water. If you pinch the topmost leaves every couple of weeks, the plant grows much bushier and releases that incredible citrus aroma!",
        "For your herbs, Poppy: Early morning is always the gentlest time to water plants. The water reaches the roots before the midday sun can evaporate it, and the leaves dry naturally in the morning breeze to stay healthy.",
        "A thought for the garden, Poppy: If you're tending to potted herbs, gently scratching the top half-inch of soil with a small fork helps aerate the roots and lets morning dew penetrate deep down."
      ];
      const reply = gardenTips[Math.floor(Math.random() * gardenTips.length)];
      companionHistory.push({ role: "assistant", text: reply, time: "Just now" });
      saveCompanionHistory(companionHistory);
      renderCompanionChat();
      return;
    }

    // 8. Tea & Food Ideas
    if (lower.includes("tea") || lower.includes("recipe") || lower.includes("drink") || lower.includes("lemon rice") || lower.includes("cook")) {
      const foodTips = [
        "A wonderful tea idea for Poppy: Fresh ginger slices, crushed cardamom pods, and a thin slice of lemon steeped in simmering water for 5 minutes, then sweetened with a spoonful of raw honey. It warms the chest and brings immediate calm.",
        "For a soothing evening drink, Poppy: Chamomile flowers steeped with fresh mint leaves and a drop of honey. It relaxes the muscles and prepares the mind for deep, undisturbed sleep.",
        "For Sunday lemon rice, Poppy: Gently temper mustard seeds, roasted cashews, and fresh curry leaves in a little ghee before folding them into fluffy basmati rice with freshly squeezed lemon juice and turmeric. Simple, fragrant, and comforting."
      ];
      const reply = foodTips[Math.floor(Math.random() * foodTips.length)];
      companionHistory.push({ role: "assistant", text: reply, time: "Just now" });
      saveCompanionHistory(companionHistory);
      renderCompanionChat();
      return;
    }

    // 9. Rest, Peace & Wellbeing
    if (lower.includes("tired") || lower.includes("sleep") || lower.includes("rest") || lower.includes("peace") || lower.includes("walk") || lower.includes("headache")) {
      const restReplies = [
        "Take it easy right now, Poppy. Sit back in your favorite chair, close your eyes for a few quiet minutes, and let the day wait. Nothing is more important than your rest.",
        "A gentle reminder for Poppy: Take three slow, deep breaths. You've earned every bit of peace today. Let me handle noting down any reminders so you don't have to keep them in mind.",
        "Rest is the greatest medicine, Poppy. Pour yourself some warm water or tea, put on soft music, and allow your mind to wander gently."
      ];
      const reply = restReplies[Math.floor(Math.random() * restReplies.length)];
      companionHistory.push({ role: "assistant", text: reply, time: "Just now" });
      saveCompanionHistory(companionHistory);
      renderCompanionChat();
      return;
    }

    // 10. Thank you & Love
    if (lower.includes("thank") || lower.includes("thanks") || lower.includes("love you") || lower.includes("appreciate")) {
      const thanksReplies = [
        "You are so very welcome, Poppy! It is my absolute pleasure to be here with you. ✦",
        "Always happy to help you, Poppy. Remember that this entire app was built with immense love and care just for you.",
        "Anytime, Poppy! Enjoy your quiet time today."
      ];
      const reply = thanksReplies[Math.floor(Math.random() * thanksReplies.length)];
      companionHistory.push({ role: "assistant", text: reply, time: "Just now" });
      saveCompanionHistory(companionHistory);
      renderCompanionChat();
      return;
    }

    // 11. General Conversational Fallback
    const conversationalFallbacks = [
      "I hear you, Poppy! That's a wonderful thought. Here in Hearth & Harbor, we keep things simple, meaningful, and calm. Tell me more, or let me know if you want me to organize anything for you.",
      "That sounds like a great reflection, Poppy. Sometimes taking a moment to sit back and observe is the best part of the day. How else can I help you?",
      "Always right here with you, Poppy. Whether you want to plan your week, save a note in your vault, or just chat, I'm listening.",
      "I appreciate you sharing that with me, Poppy. Let me know if you'd like me to note anything on your planner or in your personal reflection space."
    ];
    const reply = conversationalFallbacks[Math.floor(Math.random() * conversationalFallbacks.length)];
    companionHistory.push({ role: "assistant", text: reply, time: "Just now" });
    saveCompanionHistory(companionHistory);
    renderCompanionChat();
  }, 450);
}/* ========================================================
   MODALS, AUTOSAVE & PERSISTENCE
   ======================================================== */
function openModal(id) {
  $(id).classList.remove("hidden");
  if (id === "#taskModal" && $("#taskModalDate")) {
    $("#taskModalDate").value = state.plannerDate || getLocalDateStr();
  }
  setTimeout(() => $(id).querySelector("input, textarea, select, button:not(.modal-close), [tabindex]")?.focus(), 30);
}
function closeModal(id) { $(id).classList.add("hidden"); }

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function setupPersistentToggles() {
  const comfortToggle = $("#comfortableTextToggle");
  if (comfortToggle) {
    comfortToggle.checked = Boolean(state.comfortableText);
    comfortToggle.onchange = () => {
      pushHistory();
      applyTextComfort(comfortToggle.checked);
      showToast(state.comfortableText ? "Comfort reading text enabled." : "Standard text enabled.");
    };
  }
}

function setupFormAccessibility() {
  [["taskTitle", "#taskForm input[name=title]"], ["taskDate", "#taskForm input[name=date]"], ["taskTime", "#taskForm input[name=time]"], ["taskList", "#taskForm select[name=list]"], ["welcomeName", "#welcomeForm input[name=name]"], ["welcomeFocus", "#welcomeForm select[name=focus]"]].forEach(([id, selector]) => {
    const input = $(selector);
    if (!input) return;
    input.id = id;
    input.closest("label")?.setAttribute("for", id);
  });
}

function updateReflectionWordCount() {
  const text = $("#reflectionText")?.value.trim() || "";
  const words = text ? text.split(/\s+/).length : 0;
  const countEl = $("#reflectionWordCount");
  if (countEl) countEl.textContent = `${words} word${words === 1 ? "" : "s"}`;
}

let reflectionAutosaveTimer = null;
function autosaveReflection() {
  const badge = $("#reflectionAutosaveStatus");
  if (badge) {
    badge.classList.add("saving");
    badge.innerHTML = '<span class="autosave-dot"></span> Saving…';
  }
  clearTimeout(reflectionAutosaveTimer);
  reflectionAutosaveTimer = setTimeout(() => {
    state.reflection = $("#reflectionText")?.value || "";
    saveState();
    if (badge) {
      badge.classList.remove("saving");
      badge.innerHTML = '<span class="autosave-dot"></span> Saved';
    }
  }, 400);
}

/* ========================================================
   GLOBAL EVENT ROUTER
   ======================================================== */
document.addEventListener("click", event => {
  if (event.target.closest(".notification-button")) {
    showToast("All clear. Your personal space is calm and up to date.");
    return;
  }
  if (event.target.closest('[aria-label="Profile menu"]')) {
    showToast("Profile: Poppy · Personal Sanctuary.");
    return;
  }

  // Accent theme swatch or card option clicked
  const themeBtn = event.target.closest("[data-theme-color]");
  if (themeBtn) {
    applyTheme(themeBtn.dataset.themeColor);
    showToast(`Accent colour updated to ${themeBtn.getAttribute("title") || themeBtn.dataset.themeColor}.`);
    return;
  }

  // Companion suggested prompt chips
  const promptChip = event.target.closest(".prompt-chip");
  if (promptChip) {
    const promptText = promptChip.dataset.prompt;
    const input = $("#companionInput");
    if (input) input.value = promptText;
    handleCompanionInput(promptText);
    if (input) input.value = "";
    return;
  }

  // Personal reflection insert prompt tag
  const promptTag = event.target.closest("[data-action='insert-prompt']");
  if (promptTag) {
    const text = promptTag.dataset.text;
    const textarea = $("#reflectionText");
    if (textarea) {
      textarea.value = (textarea.value ? textarea.value + "\n\n" : "") + text;
      textarea.focus();
      autosaveReflection();
      updateReflectionWordCount();
    }
    return;
  }

  const settingsTab = event.target.closest(".settings-nav button");
  if (settingsTab) {
    $$(".settings-nav button").forEach(tab => tab.classList.toggle("active", tab === settingsTab));
    const sectionHeading = {
      "Appearance": "Accent Colours",
      "AI companion": "Built-in AI Assistant",
      "Privacy & security": "Sign-in & recovery",
      "Offline & App": "Always Available"
    }[settingsTab.textContent.trim()];
    const section = $$(".settings-content .settings-section").find(candidate => candidate.textContent.includes(sectionHeading || "Accent Colours"));
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(`${settingsTab.textContent.trim()} settings selected.`);
    return;
  }

  const vaultCard = event.target.closest(".vault-card");
  if (vaultCard) { openVaultDetails(vaultCard); return; }

  const noteTool = event.target.closest("[data-note-tool]");
  if (noteTool) {
    selectedNoteTool = noteTool.dataset.noteTool;
    $$("[data-note-tool]").forEach(tool => tool.classList.toggle("active", tool.dataset.noteTool === selectedNoteTool));
    updateDrawingMode();
    showToast(`${selectedNoteTool} note tool selected.`);
    return;
  }

  const noteColor = event.target.closest("[data-note-color]");
  if (noteColor) {
    selectedNoteColor = noteColorMap[noteColor.dataset.noteColor] || noteColorMap.gold;
    $$("[data-note-color]").forEach(color => color.classList.toggle("active", color.dataset.noteColor === noteColor.dataset.noteColor));
    showToast(`${noteColor.dataset.noteColor} ink colour selected.`);
    return;
  }

  const noteAction = event.target.closest("[data-note-action]");
  if (noteAction) {
    if (noteAction.dataset.noteAction === "undo") undoNoteChange();
    if (noteAction.dataset.noteAction === "redo") redoNoteChange();
    return;
  }

  const nav = event.target.closest("[data-view]");
  if (nav) { switchView(nav.dataset.view); return; }

  const bottomNav = event.target.closest(".bottom-nav-item[data-view]");
  if (bottomNav) { switchView(bottomNav.dataset.view); return; }

  const target = event.target.closest("[data-view-target]");
  if (target) {
    switchView(target.dataset.viewTarget);
    if (target.dataset.plannerTarget === "calendar") {
      state.plannerView = "calendar";
      saveState();
      $$("[data-planner-view]").forEach(tab => tab.classList.toggle("active", tab.dataset.plannerView === "calendar"));
      $$("#planner-agenda, #planner-calendar, #planner-tasks, #planner-kanban").forEach(panel => panel.classList.add("hidden"));
      $("#planner-calendar")?.classList.remove("hidden");
      renderCalendar();
    }
    return;
  }

  const plannerTab = event.target.closest("[data-planner-view]");
  if (plannerTab) {
    state.plannerView = plannerTab.dataset.plannerView;
    saveState();
    $$("[data-planner-view]").forEach(tab => tab.classList.toggle("active", tab.dataset.plannerView === plannerTab));
    $$("#planner-agenda, #planner-calendar, #planner-tasks, #planner-kanban").forEach(panel => panel.classList.add("hidden"));
    $(`#planner-${state.plannerView}`)?.classList.remove("hidden");
    if (state.plannerView === "calendar") renderCalendar();
    return;
  }

  const dayCell = event.target.closest(".calendar-day-cell");
  if (dayCell && dayCell.dataset.date) {
    state.selectedDate = dayCell.dataset.date;
    saveState();
    renderCalendar();
    return;
  }

  const kanbanCard = event.target.closest(".kanban-card[data-task-id]");
  if (kanbanCard) {
    if (wasDragged) return;
    const item = state.tasks.find(entry => entry.id === Number(kanbanCard.dataset.taskId));
    if (item) {
      pushHistory();
      item.list = item.list === "todo" ? "progress" : item.list === "progress" ? "done" : "todo";
      item.done = item.list === "done";
      saveState();
      renderTasks();
      showToast(`Moved to ${item.list === "todo" ? "To do" : item.list === "progress" ? "In progress" : "Done"}.`);
    }
    return;
  }

  const task = event.target.closest("[data-task-id]");
  if (task) {
    const item = state.tasks.find(entry => entry.id === Number(task.dataset.taskId));
    if (item) {
      pushHistory();
      item.done = !item.done;
      if (item.done) item.list = "done";
      else if (item.list === "done") item.list = "todo";
      saveState();
      renderTasks();
    }
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action) {
    const name = action.dataset.action;
    if (name === "undo") { undo(); return; }
    if (name === "redo") { redo(); return; }

    if (name === "clear-completed") {
      const completedCount = state.tasks.filter(t => t.done || t.list === "done").length;
      if (completedCount === 0) {
        showToast("No completed tasks to clear.");
        return;
      }
      pushHistory();
      state.tasks = state.tasks.filter(t => !t.done && t.list !== "done");
      saveState();
      renderTasks();
      renderCalendar();
      showToast(`Cleared ${completedCount} completed task${completedCount === 1 ? "" : "s"}.`);
      return;
    }
    if (name === "next-wisdom") {
      rotateWisdomQuote();
      showToast("Next quiet thought for Poppy ✦");
      return;
    }
    if (name === "calendar-prev-month") {
      if (state.calendarMonth === 0) {
        state.calendarMonth = 11;
        state.calendarYear = (state.calendarYear || 2026) - 1;
      } else {
        state.calendarMonth = (state.calendarMonth ?? 9) - 1;
      }
      saveState();
      renderCalendar();
      return;
    }
    if (name === "calendar-next-month") {
      if (state.calendarMonth === 11) {
        state.calendarMonth = 0;
        state.calendarYear = (state.calendarYear || 2026) + 1;
      } else {
        state.calendarMonth = (state.calendarMonth ?? 9) + 1;
      }
      saveState();
      renderCalendar();
      return;
    }
    if (name === "calendar-today") {
      state.calendarYear = 2026;
      state.calendarMonth = 9;
      state.selectedDate = "2026-10-30";
      saveState();
      renderCalendar();
      showToast("Returned to today.");
      return;
    }
    if (name === "calendar-add-task") {
      const taskDateInput = $("#taskForm input[name=date]");
      if (taskDateInput) taskDateInput.value = state.selectedDate || "2026-10-30";
      openModal("#taskModal");
      return;
    }
    if (name === "add-task") openModal("#taskModal");
    if (name === "close-modal") closeModal("#taskModal");
    if (name === "close-vault-modal") closeModal("#vaultModal");
    if (name === "add-note") openModal("#noteModal");
    if (name === "close-note-modal") closeModal("#noteModal");
    if (name === "focus-reflection") { switchView("personal"); requestAnimationFrame(() => $("#reflectionText")?.focus()); }
    if (name === "save-reflection") {
      pushHistory();
      state.reflection = $("#reflectionText")?.value || "";
      saveState();
      const badge = $("#reflectionAutosaveStatus");
      if (badge) badge.innerHTML = '<span class="autosave-dot"></span> Saved';
      showToast("Your reflection is saved privately on this device.");
    }
    if (name === "agenda-prev") updateAgendaDate(-1);
    if (name === "agenda-next") updateAgendaDate(1);
    if (name === "planner-menu") showToast("Planner options are ready for setup.");
    if (name === "show-notifications") showToast("All clear. Your space is calm and up to date.");
    if (name === "open-welcome") openModal("#welcomeModal");
    if (name === "close-welcome") closeModal("#welcomeModal");
    if (name === "dismiss-banner") { state.bannerVisible = false; saveState(); $(".birthday-banner").remove(); }
    if (name === "dismiss-ios-banner") { $("#iosInstallBanner")?.remove(); }
    if (name === "approve-suggestion") {
      pushHistory();
      state.tasks.push({ id: Date.now(), title: "Quiet afternoon garden project", date: "2026-10-30", time: "14:30", list: "todo", done: false, detail: "Gentle companion suggestion" });
      saveState();
      renderTasks();
      renderCalendar();
      showToast("Suggestion approved — garden time added to your planner.");
    }
    if (name === "toast") showToast(action.dataset.toast || "This action is ready.");
    return;
  }
  if (event.target.classList.contains("modal-backdrop")) event.target.classList.add("hidden");
});

// Vault detail textarea typing autosave
$("#vaultDetailText")?.addEventListener("input", () => {
  autosaveNote();
});

// Personal space reflection textarea typing autosave & word count
$("#reflectionText")?.addEventListener("input", () => {
  autosaveReflection();
  updateReflectionWordCount();
});

// Companion chat submission
$("#companionForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const input = $("#companionInput");
  if (!input) return;
  const text = input.value;
  input.value = "";
  handleCompanionInput(text);
});

/* Drag & Drop */
document.addEventListener("dragstart", event => {
  const card = event.target.closest(".kanban-card[data-task-id]");
  if (card) { draggedTaskId = Number(card.dataset.taskId); wasDragged = true; card.classList.add("dragging"); }
});
document.addEventListener("dragend", event => { event.target.closest(".kanban-card")?.classList.remove("dragging"); setTimeout(() => { wasDragged = false; }, 250); });
document.addEventListener("dragover", event => { if (event.target.closest(".kanban-stack")) event.preventDefault(); });
document.addEventListener("drop", event => {
  const stack = event.target.closest(".kanban-stack");
  if (!stack || !draggedTaskId) return;
  event.preventDefault();
  const item = state.tasks.find(entry => entry.id === draggedTaskId);
  if (item) {
    pushHistory();
    item.list = stack.dataset.column;
    item.done = item.list === "done";
    saveState();
    renderTasks();
    showToast("Kanban task moved.");
  }
  draggedTaskId = null;
});

/* Form submissions */
$("#taskForm")?.addEventListener("submit", event => {
  event.preventDefault();
  pushHistory();
  const form = new FormData(event.target);
  state.tasks.push({ id: Date.now(), title: form.get("title"), date: form.get("date") || state.plannerDate || getLocalDateStr(), time: form.get("time") || "12:00", list: form.get("list"), done: form.get("list") === "done", detail: "Added from your planner" });
  saveState(); renderTasks(); event.target.querySelector('[name="title"]').value = ""; event.target.querySelector('[name="title"]').focus(); showToast("Task added to your plan.");
});

$("#welcomeForm")?.addEventListener("submit", event => {
  event.preventDefault();
  pushHistory();
  const form = new FormData(event.target);
  state.name = String(form.get("name") || "Poppy").trim() || "Poppy";
  state.welcomed = true;
  state.bannerVisible = false;
  saveState();
  closeModal("#welcomeModal");
  $(".birthday-banner")?.remove();
  updateNameUI(state.name);
  showToast(`Welcome to your sanctuary, ${state.name}.`);
});

$("#noteForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.target);
  const title = String(form.get("title") || "").trim();
  const text = String(form.get("text") || "").trim();
  if (!title || !text) return;
  saveVaultNote({ icon: form.get("icon") || "📝", title, text, meta: "Just added", color: "gold" });
  renderVault($("#vaultSearch").value); closeModal("#noteModal"); event.target.reset(); showToast("Note added to your Knowledge Vault.");
});

$("#vaultSearch")?.addEventListener("input", event => renderVault(event.target.value));

/* Sidebar controls */
const closeSidebar = () => { $("#sidebar").classList.remove("open"); $("#sidebarScrim").classList.remove("open"); };
$("#mobileMenu")?.addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#sidebarScrim").classList.add("open"); });
$("#sidebarClose")?.addEventListener("click", closeSidebar);
$("#sidebarScrim")?.addEventListener("click", closeSidebar);

/* Keyboard shortcuts */
document.addEventListener("keydown", event => {
  const isCtrlOrCmd = event.ctrlKey || event.metaKey;
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
  const isInput = (activeTag === "input" || activeTag === "textarea") && !document.activeElement.classList.contains("note-paper-input");

  if (isCtrlOrCmd && event.key.toLowerCase() === "z" && !event.shiftKey) {
    if (!isInput) {
      event.preventDefault();
      undo();
      return;
    }
  } else if (isCtrlOrCmd && (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey))) {
    if (!isInput) {
      event.preventDefault();
      redo();
      return;
    }
  }

  if (isCtrlOrCmd && event.key.toLowerCase() === "k") {
    event.preventDefault();
    switchView("vault");
    $("#vaultSearch")?.focus();
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".vault-card")) {
    event.preventDefault();
    openVaultDetails(event.target);
  }
  if (event.key === "Escape") {
    closeModal("#taskModal");
    closeModal("#welcomeModal");
    closeModal("#vaultModal");
    closeModal("#noteModal");
  }
});

/* PWA Service Worker Registration (Works Offline & Server Shut Down) */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then(() => {
      console.log("Service Worker registered successfully. App works offline.");
    }).catch(err => {
      console.log("Service Worker registration failed:", err);
    });
  });
}

// Show iPhone installation hint banner if on iOS and not yet in standalone mode
if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.navigator.standalone) {
  $("#iosInstallBanner")?.classList.remove("hidden");
}

/* INITIALIZATION */
if (!state.bannerVisible || state.welcomed) $(".birthday-banner")?.remove();
applyTheme(state.colorTheme);
applyTextComfort(state.comfortableText);
setupPersistentToggles();
setupFormAccessibility();
setupVaultDrawing();
updateNameUI(state.name);

if ($("#reflectionText")) {
  $("#reflectionText").value = state.reflection || "";
  updateReflectionWordCount();
}

// Always start on Overview and rotate wisdom quote
switchView("dashboard");
renderTasks();
renderVault();
renderCalendar();
renderCompanionChat();
updateUndoRedoButtons();
