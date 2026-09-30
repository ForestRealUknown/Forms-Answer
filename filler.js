/**
 * MS Forms Filler
 * Run on a fresh quiz attempt.
 * Reads saved answers from localStorage and fills the form.
 */

(function () {
  'use strict';

  const STORE_KEY = "ms_forms_auto_v3";
  const recorded = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");

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

  function getOptionText(input) {
    const aria = input.getAttribute("aria-labelledby") || "";
    const optId = aria.split(/\s+/).find(id => /^QuestionChoiceOption/.test(id));
    if (optId) {
      const span = document.getElementById(optId);
      if (span) return span.textContent.trim();
    }
    const autoWrap = input.closest('[data-automation-value]');
    if (autoWrap) {
      const v = autoWrap.getAttribute("data-automation-value");
      if (v) return v.trim();
    }
    return input.value?.trim() || "";
  }

  function getQuestions() {
    return [...document.querySelectorAll('[data-automation-id="questionItem"]')].map((el, idx) => {
      let qText = "";
      const title = el.querySelector('[data-automation-id="questionTitle"]');
      if (title) {
        const clone = title.cloneNode(true);
        clone.querySelectorAll('[aria-hidden="true"], button, svg').forEach(n => n.remove());
        qText = clone.textContent.trim();
      }

      const cbs  = el.querySelectorAll('input[type="checkbox"]:not([disabled])');
      const txs  = el.querySelectorAll('[data-automation-id="textInput"]:not([disabled])');
      const rank = el.querySelectorAll('[role="listbox"] [role="option"]');

      let type = "unknown", inputs = [];
      if (cbs.length)         { type = "checkbox"; inputs = [...cbs]; }
      else if (txs.length)    { type = "text";     inputs = [...txs]; }
      else if (rank.length)   { type = "ranking";  inputs = [...rank]; }

      return {
        element: el,
        questionText: qText,
        type,
        inputs,
        index: idx,
        key: normKey(qText)
      };
    }).filter(q => q.type !== "unknown");
  }

  function fillQuestion(q) {
    const saved = recorded[q.key];
    if (saved === undefined) return false;

    if (q.type === "checkbox") {
      const answers = (Array.isArray(saved) ? saved : [saved]).map(a => a.toLowerCase().trim());
      let filled = false;
      q.inputs.forEach(inp => {
        const text = getOptionText(inp).toLowerCase().trim();
        if (answers.some(a => text === a || text.includes(a) || a.includes(text))) {
          if (!inp.checked) inp.click();
          filled = true;
        }
      });
      return filled;
    }

    if (q.type === "text") {
      const val = Array.isArray(saved) ? saved[0] : saved;
      const inp = q.inputs[0];
      if (!inp || !val) return false;
      inp.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (setter) setter.call(inp, val);
      else inp.value = val;
      inp.dispatchEvent(new Event("input",  { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
      inp.blur();
      return true;
    }

    if (q.type === "ranking") return "ranking";
    return false;
  }

  function autoFill() {
    const qs = getQuestions();
    let ok = 0, rank = 0;
    qs.forEach(q => {
      const r = fillQuestion(q);
      if (r === true) ok++;
      else if (r === "ranking") rank++;
    });
    return { ok, rank, total: qs.length };
  }

  // ---- UI ----
  let currentQuestions = getQuestions();
  let statsEl, listBox;

  function updateStats() {
    if (statsEl) {
      statsEl.textContent = `Questions: ${currentQuestions.length} | Saved: ${Object.keys(recorded).length}`;
    }
  }

  function refreshTags() {
    if (!listBox) return;
    [...listBox.children].forEach(row => {
      const q = row.__q; if (!q) return;
      const tag = row.querySelector('.rec-tag'); if (!tag) return;
      const has = recorded[q.key] !== undefined;
      tag.textContent = has ? 'saved' : 'none';
      tag.style.background = has ? '#14532d' : '#333';
      tag.style.color = has ? '#86efac' : '#aaa';
    });
  }

  function createUI() {
    document.getElementById('ms-forms-filler')?.remove();

    const box = document.createElement('div');
    box.id = 'ms-forms-filler';
    box.style.cssText = `position:fixed;top:20px;right:20px;width:420px;max-height:85vh;
      background:#1e1e1e;color:#eee;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      border:1px solid #444;border-radius:12px;z-index:999999;box-shadow:0 20px 60px rgba(0,0,0,.5);
      overflow:hidden;font-size:13px;`;

    const header = document.createElement('div');
    header.style.cssText = `display:flex;justify-content:space-between;align-items:center;
      padding:12px 16px;background:#2d2d2d;border-bottom:1px solid #444;cursor:move;user-select:none;`;
    header.innerHTML = `<b style="color:#fff;">MS Forms Filler</b>`;

    const controls = document.createElement('div');
    const btnMin = document.createElement('button');
    btnMin.textContent = '-';
    btnMin.style.cssText = 'background:#4b5563;color:#fff;border:0;border-radius:4px;width:24px;height:24px;cursor:pointer;margin-right:4px;';
    const btnClose = document.createElement('button');
    btnClose.textContent = 'x';
    btnClose.style.cssText = 'background:#dc2626;color:#fff;border:0;border-radius:4px;width:24px;height:24px;cursor:pointer;';
    controls.append(btnMin, btnClose);
    header.appendChild(controls);

    const body = document.createElement('div');
    body.style.cssText = 'padding:16px;max-height:68vh;overflow-y:auto;';

    statsEl = document.createElement('div');
    statsEl.style.cssText = 'margin-bottom:12px;padding:8px 12px;background:#252525;border-radius:6px;font-size:12px;color:#aaa;';
    body.appendChild(statsEl);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;';

    const btnFillAll = document.createElement('button');
    btnFillAll.textContent = 'Answer All';
    btnFillAll.style.cssText = 'flex:1;padding:8px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:500;';
    btnFillAll.onclick = () => {
      const { ok, rank, total } = autoFill();
      statsEl.textContent = `Filled ${ok}/${total}${rank ? ` | ${rank} ranking (see below)` : ''}`;
    };

    const btnRescan = document.createElement('button');
    btnRescan.textContent = 'Rescan';
    btnRescan.style.cssText = 'padding:8px 12px;background:#7c3aed;color:#fff;border:0;border-radius:6px;cursor:pointer;';
    btnRescan.onclick = () => {
      currentQuestions = getQuestions();
      refreshTags();
      updateStats();
      autoFill();
    };

    actions.append(btnFillAll, btnRescan);
    body.appendChild(actions);

    listBox = document.createElement('div');
    body.appendChild(listBox);

    currentQuestions.forEach((q, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:10px;padding:10px;background:#252525;border-radius:6px;';
      row.__q = q;

      const qText = document.createElement('div');
      qText.style.cssText = 'font-weight:500;margin-bottom:6px;color:#fff;font-size:12px;';
      qText.textContent = `${i + 1}. ${q.questionText.slice(0, 65)}${q.questionText.length > 65 ? '...' : ''}`;
      qText.title = q.questionText;

      const qMeta = document.createElement('div');
      qMeta.style.cssText = 'font-size:11px;color:#888;display:flex;gap:8px;align-items:center;';
      const metaText = document.createElement('span');
      metaText.textContent = `${q.type} | ${q.inputs.length} options`;
      const recTag = document.createElement('span');
      recTag.className = 'rec-tag';
      const has = recorded[q.key] !== undefined;
      recTag.textContent = has ? 'saved' : 'none';
      recTag.style.cssText = `font-size:11px;padding:2px 6px;border-radius:3px;background:${has ? '#14532d' : '#333'};color:${has ? '#86efac' : '#aaa'};`;
      qMeta.append(metaText, recTag);

      row.append(qText, qMeta);

      if (q.type === 'ranking' && recorded[q.key]) {
        const ol = document.createElement('ol');
        ol.style.cssText = 'margin:8px 0 0 20px;padding:0;font-size:11px;color:#86efac;line-height:1.6;';
        (Array.isArray(recorded[q.key]) ? recorded[q.key] : [recorded[q.key]]).forEach(t => {
          const li = document.createElement('li');
          li.textContent = t;
          ol.appendChild(li);
        });
        row.appendChild(ol);
      }

      const btn = document.createElement('button');
      btn.textContent = 'Answer';
      btn.style.cssText = 'margin-top:8px;padding:4px 10px;background:#16a34a;color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:11px;';
      btn.onclick = () => {
        const r = fillQuestion(q);
        btn.textContent = r === true ? 'Filled' : r === 'ranking' ? 'See list' : 'No match';
        btn.style.background = r === true ? '#16a34a' : r === 'ranking' ? '#7c3aed' : '#dc2626';
        setTimeout(() => { btn.textContent = 'Answer'; btn.style.background = '#16a34a'; }, 1500);
      };
      row.appendChild(btn);

      listBox.appendChild(row);
    });

    box.append(header, body);
    document.body.appendChild(box);

    let minimized = false;
    btnMin.onclick = () => {
      minimized = !minimized;
      body.style.display = minimized ? 'none' : 'block';
      btnMin.textContent = minimized ? '+' : '-';
    };
    btnClose.onclick = () => box.remove();

    let dragging = false, sx, sy, sl, st;
    header.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      const r = box.getBoundingClientRect();
      sl = r.left; st = r.top;
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      box.style.left = (sl + e.clientX - sx) + 'px';
      box.style.top  = (st + e.clientY - sy) + 'px';
      box.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => dragging = false);

    updateStats();
  }

  createUI();

  [500, 1500, 3000].forEach(delay => {
    setTimeout(() => {
      const { ok, rank, total } = autoFill();
      if (ok || rank) console.log(`@${delay}ms -> filled ${ok}/${total}, ranking: ${rank}`);
      updateStats();
      refreshTags();
    }, delay);
  });
})();
