// ===== Notes Toolkit: Day 3 assignment =====

// ---------- Starting data ----------
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// Allowed categories (the order here is the order used in the summary)
const CATEGORIES = ["personal", "work", "study"];
const MAX_LENGTH = 200;

// Lower-case, trim and collapse repeated spaces so "  Call   MUM " matches "call mum"
function normalise(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------- 1. searchNotes ----------
function searchNotes(word) {
  const search = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(search));
}

// ---------- 2. longestNote ----------
function longestNote() {
  if (notes.length === 0) {
    return null; // handle the empty array first
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// ---------- 3. countByCategory ----------
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category] === undefined) {
      counts[note.category] = 0; // first time we see this category
    }
    counts[note.category]++;
  }
  return counts;
}

// ---------- 4. getSummary ----------
function getSummary() {
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";

  if (total === 0) {
    return `${total} ${word}.`;
  }

  const counts = countByCategory();
  const parts = CATEGORIES
    .filter((category) => counts[category] > 0)
    .map((category) => `${counts[category]} ${category}`);

  return `${total} ${word}: ${parts.join(", ")}.`;
}

// ---------- 5. isDuplicate ----------
function isDuplicate(text) {
  const wanted = normalise(text);
  return notes.some((note) => normalise(note.text) === wanted);
}

// ---------- 6. addNote ----------
function addNote(text, category) {
  if (typeof text !== "string") {
    console.log("Rejected: the note text must be a string.");
    return false;
  }

  const cleaned = text.trim();

  if (cleaned.length < 1 || cleaned.length > MAX_LENGTH) {
    console.log(`Rejected: the note must be 1-${MAX_LENGTH} characters.`);
    return false;
  }
  if (!CATEGORIES.includes(category)) {
    console.log(`Rejected: category must be one of ${CATEGORIES.join(", ")}.`);
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log("Rejected: that note already exists.");
    return false;
  }

  const newId = notes.length === 0 ? 1 : Math.max(...notes.map((n) => n.id)) + 1;
  notes.push({ id: newId, text: cleaned, category: category });
  console.log(`Added: "${cleaned}" (${category})`);
  return true;
}

// =====================================================
// TESTS (expected output is written in the comment)
// =====================================================

// To test the empty-array cases we swap in an empty array, then restore the real one.
const originalNotes = notes;

console.log("--- searchNotes ---");
console.log(searchNotes("MILK")); // [{ id: 1, text: "Buy milk and bread", category: "personal" }]
console.log(searchNotes("xyz")); // [] (edge case: no results)
console.log(searchNotes("the").map((n) => n.id)); // [2, 3] (matches "the" in notes 2 and 3)

console.log("--- longestNote ---");
console.log(longestNote()); // { id: 3, text: "Email the project report to Grace", category: "work" }
notes = [];
console.log(longestNote()); // null (edge case: empty array)
notes = originalNotes;

console.log("--- countByCategory ---");
console.log(countByCategory()); // { personal: 2, study: 2, work: 1 } (key order follows first appearance)
notes = [];
console.log(countByCategory()); // {} (edge case: no notes)
notes = originalNotes;

console.log("--- getSummary ---");
console.log(getSummary()); // "5 notes: 2 personal, 1 work, 2 study."
notes = [{ id: 1, text: "Only note", category: "work" }];
console.log(getSummary()); // "1 note: 1 work." (edge case: singular)
notes = [];
console.log(getSummary()); // "0 notes." (edge case: empty)
notes = originalNotes;

console.log("--- isDuplicate ---");
console.log(isDuplicate("call mum")); // true
console.log(isDuplicate("  CALL    Mum  ")); // true (edge case: different case and extra spaces)
console.log(isDuplicate("Call dad")); // false

console.log("--- addNote ---");
console.log(addNote("Water the plants", "personal")); // logs Added: "Water the plants" (personal), then true
console.log(addNote("  water the PLANTS ", "personal")); // logs "Rejected: that note already exists.", then false
console.log(addNote("   ", "work")); // logs "Rejected: the note must be 1-200 characters.", then false
console.log(addNote("a".repeat(201), "work")); // logs "Rejected: the note must be 1-200 characters.", then false
console.log(addNote("Plan the week", "hobby")); // logs "Rejected: category must be one of personal, work, study.", then false
console.log(getSummary()); // "6 notes: 3 personal, 1 work, 2 study." (only "Water the plants" was added)
