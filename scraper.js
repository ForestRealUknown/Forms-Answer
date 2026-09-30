/**
 * MS Forms Scraper
 * Run on the review/results page (the one showing your score).
 * Extracts correct answers from radio, checkbox, and text questions.
 * Saves them to localStorage under ms_forms_auto_v3
 */

(function () {
  'use strict';

  const STORE_KEY = "ms_forms_auto_v3";
  const existing = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");

  // Wipe previous data — old scrapes can be wrong
  Object.keys(existing).forEach(k => delete existing[k]);

  function normKey(s) {
    return s
      .replace(/^\d+\.\s*/, "")
      .replace(/\(?\d+\s*poäng\)?/gi, "")
      .replace(/\(?\d+\s*points?\)?/gi, "")
      .replace(/Ett alternativ\.?/gi, "")
      .replace(/Flera alternativ\.?/gi, "")
      .replace(/Text med en rad\.?/gi, "")
      .replace(/Rankning\.?/gi, "")
      .replace(/[?!.,;:]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function getQuestionText(item) {
    const title = item.querySelector('[data-automation-id="questionTitle"]');
    if (!title) return "";
    const clone = title.cloneNode(true);
    clone.querySelectorAll('[aria-hidden="true"], button, svg').forEach(n => n.remove());
    return clone.textContent.trim();
  }

  // ---- 1. Choice (radio / checkbox) ----
  // Correct marker: a span with aria-label="Rätt svar" (Swedish).
  // For other locales change CORRECT_LABEL below.
  const CORRECT_LABEL = "Rätt svar";

  function scrapeChoice(item) {
    const choices = [...item.querySelectorAll('[data-automation-id="choiceItem"]')];
    if (!choices.length) return null;

    const correct = choices
      .filter(c => c.querySelector(`[aria-label="${CORRECT_LABEL}"]`))
      .map(c => c.querySelector('input')?.value?.trim())
      .filter(Boolean);

    if (!correct.length) return null;

    const isCheckbox = item.querySelector('input[type="checkbox"]');
    return isCheckbox ? correct : correct[0];
  }

  // ---- 2. Text input ----
  // Correct answers appear after "Rätta svar:" in a series of spans.
  function scrapeText(item) {
    const input = item.querySelector('[data-automation-id="textInput"]');
    if (!input) return null;

    const labelBlock = item.querySelector('.--P-345');
    if (!labelBlock) return null;

    const parent = labelBlock.parentElement;
    const accepted = [...parent.querySelectorAll('span.-gG-347')]
      .map(s => s.textContent.trim())
      .filter(Boolean);

    if (!accepted.length) return null;
    return accepted.length === 1 ? accepted[0] : accepted;
  }

  // ---- 3. Ranking ----
  // MS Forms does NOT expose the correct ranking order on the review page.
  // This returns the order shown (which is your submitted order).
  // You must correct the order manually after scraping (see README).
  function scrapeRanking(item) {
    const listbox = item.querySelector('[role="listbox"]');
    if (!listbox) return null;

    const items = [...listbox.querySelectorAll('[role="option"]')];
    if (!items.length) return null;

    const ordered = items
      .map(el => {
        const idxEl = el.querySelector('[data-index]') || el;
        const idx = parseInt(idxEl.getAttribute('data-index'), 10);
        const text = el.querySelector('[data-automation-id="rankingItemContent"]')?.textContent?.trim();
        return { idx, text };
      })
      .filter(x => x.text && !isNaN(x.idx))
      .sort((a, b) => a.idx - b.idx)
      .map(x => x.text);

    return ordered.length ? ordered : null;
  }

  // ---- Main ----
  const items = document.querySelectorAll('[data-automation-id="questionItem"]');
  console.log(`Found ${items.length} questions\n`);

  const summary = [];
  let saved = 0;

  items.forEach((item, i) => {
    const qText = getQuestionText(item);
    if (!qText) return;
    const key = normKey(qText);

    let value = scrapeChoice(item);
    let type = "choice";

    if (value === null) { value = scrapeText(item);    type = "text"; }
    if (value === null) { value = scrapeRanking(item); type = "ranking"; }

    if (value === null) {
      summary.push({ n: i + 1, q: qText.slice(0, 45), type: "?", result: "nothing found" });
      return;
    }

    existing[key] = value;
    saved++;
    summary.push({
      n: i + 1,
      q: qText.slice(0, 45),
      type,
      result: Array.isArray(value) ? value.join(" | ") : value
    });
  });

  localStorage.setItem(STORE_KEY, JSON.stringify(existing));
  console.log(`Saved ${saved}/${items.length} questions`);
  console.log("=== SUMMARY ===");
  console.table(summary);

  console.log("\n=== RAW SAVED DATA ===");
  console.log(JSON.stringify(existing, null, 2));

  console.log("\nNote: ranking questions show submitted order, not correct order.");
  console.log("See README for how to fix a ranking answer manually.");
})();
