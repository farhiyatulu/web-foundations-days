// ---------- 1. Select the elements we need ----------
const textarea = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeBtn = document.querySelector("#theme-toggle");

const MAX_CHARS = 200;
const WARNING_AT = 180;
const DRAFT_KEY = "day4-draft";
const THEME_KEY = "day4-theme";

// ---------- 2. Update both counters and the warning classes ----------
function updateCounts() {
  const text = textarea.value;
  const chars = text.length;

  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

  charCount.textContent = chars + " / " + MAX_CHARS + " characters";
  wordCount.textContent = words + " words";

  charCount.classList.remove("warning", "over");
  if (chars > MAX_CHARS) {
    charCount.classList.add("over");
  } else if (chars > WARNING_AT) {
    charCount.classList.add("warning");
  }
}

// ---------- 3. Update and save on every input ----------
textarea.addEventListener("input", function () {
  updateCounts();
  localStorage.setItem(DRAFT_KEY, textarea.value);
});

// ---------- 4. Clear everything (button and Escape key) ----------
function clearAll() {
  textarea.value = "";
  updateCounts();
  localStorage.removeItem(DRAFT_KEY);
  textarea.focus();
}

clearBtn.addEventListener("click", clearAll);

textarea.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    clearAll();
  }
});

// ---------- 5. Theme toggle ----------
themeBtn.addEventListener("click", function () {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");

  themeBtn.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
});

// ---------- 6. Restore saved draft and theme, then draw ----------
const savedDraft = localStorage.getItem(DRAFT_KEY);
if (savedDraft !== null) {
  textarea.value = savedDraft;
}

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeBtn.textContent = "Light mode";
}

updateCounts();