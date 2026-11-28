/**
 * Expense & Budget Visualizer
 * script.js — all application logic (Vanilla JS, no frameworks)
 *
 * Modules:
 *   1. Storage   — read / write Local Storage
 *   2. Form      — validation & submission
 *   3. List      — render + sort + delete
 *   4. Balance   — total & spending-limit highlight
 *   5. Chart     — Chart.js pie chart lifecycle
 *   6. Summary   — monthly breakdown
 */

(function () {
  'use strict';

  /* ============================================================
     CONSTANTS
     ============================================================ */
  const STORAGE_KEY       = 'ebv_transactions';
  const LIMIT_STORAGE_KEY = 'ebv_budget_limit';

  const CATEGORIES = ['Food', 'Transport', 'Fun'];

  const CATEGORY_COLORS = {
    Food:      '#f59e0b',
    Transport: '#3b82f6',
    Fun:       '#ec4899',
  };

  /* ============================================================
     1. STORAGE MODULE
     ============================================================ */
  const Storage = {
    /** @returns {Array} */
    load() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      } catch {
        return [];
      }
    },

    /** @param {Array} transactions */
    save(transactions) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    },

    /** @returns {number|null} null when no limit is set or the stored value is invalid */
    loadLimit() {
      const raw = localStorage.getItem(LIMIT_STORAGE_KEY);
      if (raw === null) return null;
      const val = parseFloat(raw);
      return isNaN(val) ? null : val;
    },

    /** @param {number} limit */
    saveLimit(limit) {
      localStorage.setItem(LIMIT_STORAGE_KEY, limit.toString());
    },
  };

  /* ============================================================
     2. UTILITY HELPERS
     ============================================================ */

  /** Format a number as Indonesian Rupiah */
  function formatRupiah(amount) {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  }

  /** Generate a simple unique ID using timestamp + random */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /**
   * Parse a Date object from an ISO string and return a
   * human-readable date string (DD/MM/YYYY).
   */
  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  /**
   * Return the month key "YYYY-MM" for grouping.
   * Derived from a real Date object so timezone-shifted strings are handled correctly.
   */
  function monthKey(isoString) {
    const d = new Date(isoString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  /**
   * Return a nicely formatted month name from "YYYY-MM".
   */
  function formatMonthKey(key) {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  /* ============================================================
     3. FORM MODULE
     ============================================================ */

  const Form = (function () {
    const formEl    = document.getElementById('transactionForm');
    const nameEl    = document.getElementById('itemName');
    const amountEl  = document.getElementById('amount');
    const catEl     = document.getElementById('category');
    const limitEl   = document.getElementById('budgetLimit');
    const txDateEl  = document.getElementById('txDate');

    const nameErr   = document.getElementById('itemNameError');
    const amountErr = document.getElementById('amountError');
    const catErr    = document.getElementById('categoryError');
    const txDateErr = document.getElementById('txDateError');

    function clearErrors() {
      [nameEl, amountEl, catEl, txDateEl].forEach(el => el.classList.remove('invalid'));
      [nameErr, amountErr, catErr, txDateErr].forEach(el => el.classList.add('hidden'));
    }

    function validate(name, amount, category, date) {
      let valid = true;

      if (!name.trim()) {
        nameEl.classList.add('invalid');
        nameErr.classList.remove('hidden');
        valid = false;
      }

      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        amountEl.classList.add('invalid');
        amountErr.classList.remove('hidden');
        valid = false;
      }

      if (!category) {
        catEl.classList.add('invalid');
        catErr.classList.remove('hidden');
        valid = false;
      }

      if (!date) {
        txDateEl.classList.add('invalid');
        txDateErr.classList.remove('hidden');
        valid = false;
      }

      return valid;
    }

    function init() {
      /* Pre-fill the budget limit field from storage */
      const savedLimit = Storage.loadLimit();
      if (savedLimit > 0) limitEl.value = savedLimit;

      formEl.addEventListener('submit', function (e) {
        e.preventDefault();
        clearErrors();

        const name     = nameEl.value;
        const amount   = amountEl.value;
        const category = catEl.value;
        const txDate   = txDateEl.value;          // 'YYYY-MM-DD' from the date input
        const limitVal = parseFloat(limitEl.value) || 0;

        if (!validate(name, amount, category, txDate)) return;

        /* Persist the budget limit */
        Storage.saveLimit(limitVal);

        /* Build transaction object */
        // Convert the local date string ('YYYY-MM-DD') to a noon-UTC ISO string so
        // the date is never shifted by timezone offset when parsed later.
        const txDateISO = new Date(txDate + 'T12:00:00').toISOString();
        const transaction = {
          id:       generateId(),
          name:     name.trim(),
          amount:   parseFloat(amount),
          category: category,
          date:     txDateISO,
        };

        const transactions = Storage.load();
        transactions.push(transaction);
        Storage.save(transactions);

        /* Reset form fields (keep limit) */
        nameEl.value   = '';
        amountEl.value = '';
        catEl.value    = '';
        txDateEl.value = '';

        /* Refresh all UI */
        App.refresh();
      });
    }

    return { init };
  })();

  /* ============================================================
     4. BALANCE MODULE
     ============================================================ */

  const Balance = (function () {
    const totalEl   = document.getElementById('totalAmount');
    const limitInfo = document.getElementById('limitInfo');
    const limitDisp = document.getElementById('limitDisplay');
    const warningEl = document.getElementById('limitWarning');
    const cardEl    = document.getElementById('balanceCard');

    function render(transactions) {
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      const limit = Storage.loadLimit();

      totalEl.textContent = formatRupiah(total);

      if (limit > 0) {
        limitInfo.classList.remove('hidden');
        limitDisp.textContent = formatRupiah(limit);
        if (total >= limit) {
          warningEl.classList.remove('hidden');
          cardEl.classList.add('over-limit');
        } else {
          warningEl.classList.add('hidden');
          cardEl.classList.remove('over-limit');
        }
      } else {
        limitInfo.classList.add('hidden');
        warningEl.classList.add('hidden');
        cardEl.classList.remove('over-limit');
      }
    }

    return { render };
  })();

  /* ============================================================
     5. LIST MODULE
     ============================================================ */

  const List = (function () {
    const tbody     = document.getElementById('transaction-body');
    const emptyEl   = document.getElementById('listEmpty');
    const tableWrap = document.getElementById('tableWrapper');
    const sortBtns  = document.querySelectorAll('.sort-btn');

    let currentSort = 'date'; // default sort

    /* ----- Sort buttons ----- */
    sortBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        sortBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentSort = this.dataset.sort;
        const transactions = Storage.load();
        render(transactions);
      });
    });

    /** Sort a copy of the transactions array by currentSort */
    function sorted(transactions) {
      const copy = [...transactions];
      switch (currentSort) {
        case 'amount-desc':
          return copy.sort((a, b) => b.amount - a.amount);
        case 'amount-asc':
          return copy.sort((a, b) => a.amount - b.amount);
        case 'category':
          return copy.sort((a, b) => a.category.localeCompare(b.category));
        default: /* 'date' */
          return copy.sort((a, b) => new Date(b.date) - new Date(a.date));
      }
    }

    function handleDelete(id) {
      let transactions = Storage.load();
      transactions = transactions.filter(t => t.id !== id);
      Storage.save(transactions);
      App.refresh();
    }

    function render(transactions) {
      tbody.innerHTML = '';

      if (transactions.length === 0) {
        tableWrap.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        return;
      }

      tableWrap.classList.remove('hidden');
      emptyEl.classList.add('hidden');

      const list = sorted(transactions);

      list.forEach(t => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
          <td class="date-cell" data-label="Date">${formatDate(t.date)}</td>
          <td data-label="Item">${escapeHtml(t.name)}</td>
          <td data-label="Category"><span class="badge badge-${t.category}">${t.category}</span></td>
          <td class="amount-cell text-right" data-label="Amount">${formatRupiah(t.amount)}</td>
          <td class="text-center" data-label="Delete">
            <button class="btn-delete" aria-label="Delete ${escapeHtml(t.name)}" data-id="${t.id}">
              🗑️ Delete
            </button>
          </td>
        `;

        tbody.appendChild(tr);
      });

      /* Attach delete listeners after DOM insertion */
      tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function () {
          handleDelete(this.dataset.id);
        });
      });
    }

    return { render };
  })();

  /* ============================================================
     6. CHART MODULE
     ============================================================ */

  const ChartModule = (function () {
    const canvas   = document.getElementById('spendingChart');
    const wrapper  = document.getElementById('chartWrapper');
    const emptyEl  = document.getElementById('chartEmpty');
    let chartInstance = null;

    /** Aggregate total amount per category */
    function aggregate(transactions) {
      const totals = {};
      CATEGORIES.forEach(c => { totals[c] = 0; });
      transactions.forEach(t => {
        if (totals[t.category] !== undefined) {
          totals[t.category] += t.amount;
        }
      });
      return totals;
    }

    function render(transactions) {
      const totals = aggregate(transactions);
      const hasData = transactions.length > 0;

      /* Show/hide empty state */
      if (!hasData) {
        wrapper.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
        return;
      }

      wrapper.classList.remove('hidden');
      emptyEl.classList.add('hidden');

      /* Only include categories with spend > 0 in the chart */
      const labels  = CATEGORIES.filter(c => totals[c] > 0);
      const data    = labels.map(c => totals[c]);
      const colors  = labels.map(c => CATEGORY_COLORS[c]);

      if (chartInstance) {
        /* Update existing chart without destroying canvas context */
        chartInstance.data.labels        = labels;
        chartInstance.data.datasets[0].data            = data;
        chartInstance.data.datasets[0].backgroundColor = colors;
        chartInstance.update();
        return;
      }

      /* Create fresh chart */
      chartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 3,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { family: "'Segoe UI', system-ui, sans-serif", size: 13 },
                padding: 16,
                usePointStyle: true,
              },
            },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const val = ctx.parsed;
                  const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${formatRupiah(val)}  (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }

    return { render };
  })();

  /* ============================================================
     7. MONTHLY SUMMARY MODULE
     ============================================================ */

  const Summary = (function () {
    const gridEl   = document.getElementById('monthlyGrid');
    const emptyEl  = document.getElementById('summaryEmpty');

    function render(transactions) {
      gridEl.innerHTML = '';

      if (transactions.length === 0) {
        emptyEl.classList.remove('hidden');
        return;
      }

      emptyEl.classList.add('hidden');
      const limit = Storage.loadLimit();

      /* Group by YYYY-MM */
      const groups = {};
      transactions.forEach(t => {
        const key = monthKey(t.date);
        if (!groups[key]) groups[key] = { total: 0, count: 0 };
        groups[key].total += t.amount;
        groups[key].count += 1;
      });

      /* Sort months newest first */
      const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

      keys.forEach(key => {
        const { total, count } = groups[key];
        const overLimit = limit > 0 && total >= limit;

        const card = document.createElement('div');
        card.className = 'month-card' + (overLimit ? ' over-limit' : '');
        card.innerHTML = `
          <div class="month-label">${formatMonthKey(key)}</div>
          <div class="month-amount">${formatRupiah(total)}</div>
          <div class="month-count">${count} transaction${count !== 1 ? 's' : ''}</div>
          ${overLimit ? '<div class="field-error" style="margin-top:4px;font-size:.75rem;">Over budget!</div>' : ''}
        `;
        gridEl.appendChild(card);
      });
    }

    return { render };
  })();

  /* ============================================================
     8. ESCAPE HELPER (XSS prevention)
     ============================================================ */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ============================================================
     9. APP — Orchestrator
     ============================================================ */
  const App = {
    refresh() {
      const transactions = Storage.load();
      Balance.render(transactions);
      List.render(transactions);
      ChartModule.render(transactions);
      Summary.render(transactions);
    },

    init() {
      Form.init();
      this.refresh();
    },
  };

  /* ---- Boot ---- */
  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})();
