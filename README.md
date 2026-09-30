# MS Forms Auto-Filler

A browser-console toolkit for Microsoft Forms that:

- Scrapes correct answers from a review/results page after you submit
- Auto-fills the same quiz on a fresh attempt

Runs entirely in the browser. No extension, no install. Paste into DevTools Console.

## Important disclaimer

This tool cannot magically know the right answers. It can only replay what you or
the review page already told it. Correct answers live on Microsoft's server, not in
the page. If MS Forms never reveals them (some quizzes hide the answer key), no
script can recover them.

## How it works

Microsoft Forms quizzes do not expose correct answers on the quiz page. But on the
review page (the one showing you what you got right and wrong after submitting), the
correct answers are visible in the DOM.

This tool:

1. Reads them from the review page and saves them to localStorage
2. On the next attempt, reads them back and auto-fills the same fields

Matching is done by normalized question text, so small changes like `(1 poäng)`,
`Ett alternativ.`, or punctuation do not break the lookup.

## Quick start

### Step 1 - Scrape correct answers (once)

1. Submit the quiz, then open the review page
2. Press F12, open the Console tab
3. Paste scraper.js, press Enter
4. You will see a table of every question and its correct answer(s)

### Step 2 - Auto-fill a fresh attempt (every retake)

1. Open a new attempt of the quiz
2. Press F12, open the Console
3. Paste filler.js, press Enter
4. A panel appears top-right. Click "Answer All".
5. Ranking questions show their correct order in the panel. Drag the items manually to match.

## Files

| File | Purpose |
|------|---------|
| scraper.js | Run on the review page. Extracts correct answers and saves them. |
| filler.js | Run on the quiz page. Reads saved answers and fills the form. |
| README.md | This file. |

## Supported question types

| Type | Scraper | Filler |
|------|---------|--------|
| Multiple choice (radio) | Yes | Yes |
| Multiple answers (checkbox) | Yes | Yes |
| Short text answer | Yes (all accepted variants) | Yes (fills first variant) |
| Ranking / drag-and-drop | Partial* | Shows order, drag manually |

* MS Forms does not expose the correct ranking order on the review page, so the
scraper falls back to your submitted order. A correct order must be supplied
manually (see "Fixing a ranking answer" below).

## Fixing a ranking answer

If a ranking question was scraped wrong, run this once on the quiz page:

    const STORE_KEY = "ms_forms_auto_v3";
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");

    saved["ordna följande i rätt ordning"] = [
      "First item",
      "Second item",
      "Third item"
    ];

    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    console.log("Saved");

Replace the array with the correct order. The key must match the normalized
question text (lowercase, no punctuation, no `(1 poäng)`, no `Ett alternativ.`).

## Technical details

### Storage

- Key: `ms_forms_auto_v3`
- Format: `{ [normalizedQuestionText]: answer | answerArray }`

### Normalization

Question text is normalized before saving and before lookup:

- Strips leading `N.`
- Removes `(1 poäng)` / `(1 point)`
- Removes `Ett alternativ.`, `Flera alternativ.`, `Text med en rad.`, `Rankning.`
- Removes punctuation `?!.,;:`
- Collapses whitespace
- Lowercases

This makes matching robust to small wording differences between attempts.

### MS Forms DOM markers used

| What | Selector |
|------|----------|
| Question container | `[data-automation-id="questionItem"]` |
| Question title | `[data-automation-id="questionTitle"]` |
| Choice wrapper | `[data-automation-id="choiceItem"]` |
| Correct choice marker | `[aria-label="Rätt svar"]` |
| Correct text answers | sibling of `.‑‑P-345` ("Rätta svar:") |
| Ranking items | `[role="listbox"] [role="option"]` |

These are internal MS Forms selectors. Microsoft can change them at any time
without notice. If the tool stops working, open DevTools, inspect the question
container, and check whether the selectors above still match.

### Locale

The correct-answer marker is locale-specific. Currently hard-coded for Swedish
(`Rätt svar`). For other locales, open scraper.js and change this line:

    const CORRECT_LABEL = "Rätt svar";

Examples for other locales:

- English: `"Correct answer"`
- German: `"Richtige Antwort"`
- French: `"Bonne réponse"`

## Limitations

### What this tool cannot do

- Invent correct answers that are not visible anywhere in the page
- Read answers from the quiz page before submission
- Auto-drag ranking items. MS Forms uses synthetic pointer events that scripts cannot reliably reproduce
- Work across different forms. Storage is tied to the specific questions scraped

### What this tool can do

- Remember answers you have already seen (on the review page)
- Replay them fast on the next attempt
- Handle checkbox, radio, and text questions automatically
- Survive page reloads via localStorage

### Browser-specific notes

- Works best in Chrome, Edge, or Firefox with DevTools open
- Some corporate or school-managed browsers block localStorage. You will see no
  saved data between sessions in that case
- Ad blockers may log errors from events.data.microsoft.com. Ignore them; they
  do not affect functionality

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Panel says "No questions found" | Wait 3 to 5 seconds for MS Forms to render, then re-run |
| Everything shows no match | You may be on the review page (read-only). Open a fresh attempt. |
| Checkbox questions do not fill | Run `document.querySelectorAll('input[type="checkbox"]:not([disabled])').length`. Should be greater than 0. |
| Ranking cannot be filled | Expected. Drag the items manually using the order shown in the panel. |
| Wrong answers saved | Run `localStorage.removeItem("ms_forms_auto_v3")` and re-scrape |

## License

MIT. No warranty.

## Credits

Built by reverse-engineering the DOM structure of Microsoft Forms. MS Forms is a
Microsoft product. This project is unaffiliated with Microsoft.
