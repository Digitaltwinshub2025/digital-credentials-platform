const KEY = "demo_saved_logins_v3"; // new key (keeps older demos separate)

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const saveForm = document.getElementById("saveForm");
const clearBtn = document.getElementById("clearBtn");
const msg = document.getElementById("msg");

const listEl = document.getElementById("list");
const emptyStateEl = document.getElementById("emptyState");
const togglePassBtn = document.getElementById("togglePassBtn");
const revealNewPwBtn = document.getElementById("revealNewPwBtn");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

const countChip = document.getElementById("countChip");
const pwChip = document.getElementById("pwChip");

const toastEl = document.getElementById("toast");

const pwMeterFill = document.getElementById("pwMeterFill");
const pwMeterText = document.getElementById("pwMeterText");

let showPasswords = false;
let showNewPw = false;

function loadAll() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAll(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

function clearAll() {
  localStorage.removeItem(KEY);
}

function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  window.clearTimeout(toastEl._t);
  toastEl._t = window.setTimeout(() => toastEl.classList.remove("show"), 1400);
}

function setMsg(text, kind = "info") {
  msg.textContent = text || "";
  msg.style.color =
    kind === "danger" ? "rgba(251,113,133,.95)"
    : kind === "ok" ? "rgba(52,211,153,.95)"
    : "var(--muted)";
}

function mask(s) {
  if (!s) return "—";
  return "•".repeat(Math.min(s.length, 12));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function getStrength(pw) {
  const s = String(pw || "");
  if (!s) return { pct: 0, label: "—" };

  let score = 0;
  if (s.length >= 8) score++;
  if (s.length >= 12) score++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) score++;
  if (/\d/.test(s)) score++;
  if (/[^a-zA-Z0-9]/.test(s)) score++;

  // map 0..5 to %
  const pct = Math.min(100, Math.max(10, (score / 5) * 100));
  const label =
    score <= 1 ? "Weak"
    : score === 2 ? "Okay"
    : score === 3 ? "Good"
    : score === 4 ? "Strong"
    : "Very strong";

  return { pct, label };
}

function updateStrengthUI() {
  const { pct, label } = getStrength(passwordInput.value);
  pwMeterFill.style.width = `${passwordInput.value ? pct : 0}%`;
  pwMeterText.textContent = `Strength: ${label}`;
}

function applySort(items) {
  const mode = sortSelect.value;
  const copy = [...items];

  if (mode === "newest") {
    copy.sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  } else if (mode === "oldest") {
    copy.sort((a, b) => (a.savedAt || "").localeCompare(b.savedAt || ""));
  } else if (mode === "az") {
    copy.sort((a, b) => (a.username || "").localeCompare(b.username || "", undefined, { sensitivity: "base" }));
  } else if (mode === "za") {
    copy.sort((a, b) => (b.username || "").localeCompare(a.username || "", undefined, { sensitivity: "base" }));
  }
  return copy;
}

function render() {
  const all = loadAll();
  const q = (searchInput.value || "").trim().toLowerCase();

  const filtered = q
    ? all.filter((x) => (x.username || "").toLowerCase().includes(q))
    : all;

  const items = applySort(filtered);

  // chips
  countChip.textContent = String(all.length);
  pwChip.textContent = showPasswords ? "Visible" : "Hidden";

  emptyStateEl.style.display = all.length ? "none" : "block";
  listEl.innerHTML = "";

  if (!items.length && all.length) {
    // no matches
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="kv">
        <div><strong>No matches</strong></div>
        <div class="muted small">Try a different search.</div>
      </div>
    `;
    listEl.appendChild(div);
    return;
  }

  for (const item of items) {
    const pwDisplay = showPasswords ? (item.password || "—") : mask(item.password || "");
    const when = formatWhen(item.savedAt);

    const strength = getStrength(item.password || "");
    const badgeText =
      strength.label === "Weak" ? "Weak password"
      : strength.label === "Okay" ? "Okay password"
      : strength.label === "Good" ? "Good password"
      : strength.label === "Strong" ? "Strong password"
      : "Very strong password";

    const row = document.createElement("div");
    row.className = "item";
    row.setAttribute("role", "listitem");

    row.innerHTML = `
      <div class="itemTop">
        <div class="kv">
          <div><span class="label">Username:</span> <strong>${escapeHtml(item.username || "—")}</strong></div>
          <div><span class="label">Password:</span> <span>${escapeHtml(pwDisplay)}</span></div>
          <div class="muted small">${when ? `Saved: ${escapeHtml(when)}` : ""}</div>
          <div class="badgeRow">
            <span class="badge">${escapeHtml(badgeText)}</span>
          </div>
        </div>

        <div class="actions">
          <button class="iconBtn" data-action="copy" data-id="${escapeHtml(item.id)}" title="Copy username + password">Copy</button>
          <button class="iconBtn" data-action="copyUser" data-id="${escapeHtml(item.id)}" title="Copy username only">Copy user</button>
          <button class="iconBtn danger" data-action="delete" data-id="${escapeHtml(item.id)}" title="Delete this entry">Delete</button>
        </div>
      </div>
    `;

    listEl.appendChild(row);
  }
}

function addAccount(username, password) {
  const items = loadAll();

  // prevent exact duplicate usernames
  if (items.some((x) => (x.username || "").toLowerCase() === username.toLowerCase())) {
    setMsg("That username already exists. Use a different one, or delete the old entry.", "danger");
    toast("Username already exists");
    return;
  }

  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
    username,
    password,
    savedAt: new Date().toISOString(),
  };

  items.unshift(newItem);
  saveAll(items);

  setMsg("Saved account! (Stored in this browser)", "ok");
  toast("Saved ✅");
  render();
}

function deleteAccount(id) {
  const items = loadAll().filter((x) => x.id !== id);
  saveAll(items);
  setMsg("Deleted.", "ok");
  toast("Deleted 🗑️");
  render();
}

async function copyAccount(id, mode = "both") {
  const items = loadAll();
  const item = items.find((x) => x.id === id);
  if (!item) return;

  const text =
    mode === "user"
      ? `${item.username}`
      : `Username: ${item.username}\nPassword: ${item.password}`;

  try {
    await navigator.clipboard.writeText(text);
    setMsg("Copied to clipboard.", "ok");
    toast("Copied 📋");
  } catch {
    setMsg("Copy failed (browser blocked clipboard).", "danger");
    toast("Copy blocked");
  }
}

// --- events

saveForm.addEventListener("submit", (e) => {
  e.preventDefault();
  setMsg("");

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    setMsg("Please enter both username and password.", "danger");
    toast("Missing fields");
    return;
  }

  addAccount(username, password);

  usernameInput.value = "";
  passwordInput.value = "";
  updateStrengthUI();
  usernameInput.focus();
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Clear ALL saved accounts from this browser?")) return;
  clearAll();
  setMsg("Cleared all.", "ok");
  toast("Cleared");
  render();
});

togglePassBtn.addEventListener("click", () => {
  showPasswords = !showPasswords;
  togglePassBtn.textContent = showPasswords ? "Hide passwords" : "Show passwords";
  render();
});

revealNewPwBtn.addEventListener("click", () => {
  showNewPw = !showNewPw;
  passwordInput.type = showNewPw ? "text" : "password";
  revealNewPwBtn.textContent = showNewPw ? "Hide" : "Show";
});

passwordInput.addEventListener("input", updateStrengthUI);

searchInput.addEventListener("input", () => render());
sortSelect.addEventListener("change", () => render());

// event delegation for Copy/Delete buttons
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");
  if (!action || !id) return;

  if (action === "delete") {
    if (!confirm("Delete this entry?")) return;
    deleteAccount(id);
  }

  if (action === "copy") copyAccount(id, "both");
  if (action === "copyUser") copyAccount(id, "user");
});

// initial
updateStrengthUI();
render();
