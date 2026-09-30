# 📋 MS Forms Auto-Filler

A browser-console toolkit for **Microsoft Forms** that:
- **Scrapes correct answers** from a review/results page after you submit
- **Auto-fills** the same quiz on a fresh attempt

Works entirely in the browser — no extension, no install, just paste into DevTools Console.

> ⚠️ **Honest disclaimer first:** This tool cannot magically know the right answers.
> It can only **replay** what you or the review page already told it.
> The correct answers live on Microsoft's server, not in the page. If MS Forms never
> reveals them (some quizzes hide the answer key), no script can recover them.

---

## 🧠 How it works (in one paragraph)

Microsoft Forms quizzes don't expose correct answers on the quiz page. But on the
**review page** — the one showing you what you got right and wrong after submitting —
the correct answers *are* visible in the DOM. This tool:
1. Reads them from the review page and saves them to `localStorage`
2. On the next attempt, reads them back and auto-fills the same fields

The matching is done by **normalized question text**, so small changes like
`(1 poäng)`, `Ett alternativ.`, or punctuation don't break the lookup.

---

## 🚀 Quick start

### Step 1 — Scrape correct answers (do this once)
1. Submit the quiz, then open the **review page** (the one showing your score)
2. Press `F12` → **Console** tab
3. Paste **[scraper.js](scraper.js)** → Enter
4. You'll see a table of every question and its correct answer(s)

### Step 2 — Auto-fill a fresh attempt (do this every retake)
1. Open a **new attempt** of the quiz
2. `F12` → **Console**
3. Paste **[filler.js](filler.js)** → Enter
4. A panel appears top-right. Click **Answer All**.
5. Question 8 (ranking) shows its correct order in the panel — drag the items manually to match.

---

## 📁 Files

| File | Purpose |
|---|---|
| `scraper.js` | Run on the **review page**. Extracts correct answers and saves them. |
| `filler.js` | Run on the **quiz page**. Reads saved answers and fills the form. |
| `README.md` | This file. |

---

## 🎯 Supported question types

| Type | Scraper | Filler |
|---|---|---|
| Multiple choice (radio) | ✅ | ✅ |
| Multiple answers (checkbox) | ✅ | ✅ |
| Short text answer | ✅ (all accepted variants) | ✅ (fills first variant) |
| Ranking / drag-and-drop | ❌* | ⚠️ Shows order, you drag manually |

\* MS Forms does not expose the correct ranking order on the review page, so the scraper
falls back to your submitted order. A correct order for the specific quiz must be supplied
manually (see "Fixing a ranking answer" below).

---

## 🔧 Fixing a ranking answer

If a ranking question was scraped wrong, run this once:

```js
const STORE_KEY = "ms_forms_auto_v3";
const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");

saved["ordna följande i rätt ordning"] = [
  "First item",
  "Second item",
  "Third item",
  // ...
];

localStorage.setItem(STORE_KEY, JSON.stringify(saved));
