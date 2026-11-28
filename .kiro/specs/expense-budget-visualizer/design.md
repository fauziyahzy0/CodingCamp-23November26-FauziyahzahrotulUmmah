# Design — Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application for tracking personal transactions and comparing total spending against a user-defined budget limit. All data lives in the browser's `localStorage`; there is no backend, no login, and no network requests. The UI is built with plain HTML, CSS, and vanilla JavaScript (one IIFE module in `js/script.js`), plus Chart.js loaded from CDN for the pie chart.

## Architecture

The application is a single HTML page (`index.html`) that loads one stylesheet and one script. The script is wrapped in an IIFE that exposes seven internal modules; there is no build step and no bundler.

```
index.html
 ├── css/style.css       — all styles (CSS variables, layout, components, responsive)
 └── js/script.js        — all logic, structured as an IIFE with 7 internal modules
```

Data flows in one direction: user actions (form submit, delete, sort, limit change) call `App.refresh()`, which reads from `Storage` and re-renders every section. The chart is managed by `ChartModule`, which calls Chart.js's `.update()` or `.destroy()` / re-create as needed to avoid leaks.

## Components and Interfaces

### Page Sections (top to bottom)
1. **Header** — sticky gradient bar with app name and subtitle.
2. **Balance Card** — full-width gradient card showing total spent vs. budget limit; turns red when over budget.
3. **Top Grid** — two columns: Add Transaction form (left) + Pie Chart (right).
4. **Transaction List** — full-width table with sort controls (sort by name, amount, category, or date; toggles ascending/descending).
5. **Monthly Summary** — auto-generated grid of month cards, each showing per-month totals and an over-limit highlight.
6. **Footer** — static attribution line.

### JavaScript Module Interfaces (IIFE)

| Module | Public API |
|---|---|
| `Storage` | `load()`, `save(transactions)`, `loadLimit()`, `saveLimit(value)` |
| `Form` | `init()` — registers submit handler, restores saved limit, resets fields after save |
| `Balance` | `render(transactions, limit)` — calculates total, toggles `.over-limit` CSS class |
| `List` | `render(transactions)` — renders table rows; `deleteHandler(id)` removes one entry |
| `ChartModule` | `render(transactions)` — aggregates by category, creates or updates the Chart.js instance |
| `Summary` | `render(transactions, limit)` — groups by month, renders month cards, highlights over-limit months |
| `App` | `init()` — wires all modules; `refresh()` — calls every render function in sequence |

### Visual Design
- **Palette:** Blue and white — `--blue-900` (#0d2b55) through `--blue-50` (#eff6ff), danger red (#ef4444) for over-budget states.
- **Typography:** Segoe UI / system-ui stack, weights 400 / 600 / 700 / 800.
- **Components:** Rounded cards (`border-radius: 12px`), subtle shadows, smooth hover transitions.
- **Layout:** CSS Grid for the top two-column section; Flexbox for the header, sort controls, and balance card internals.

## Data Models

### Transaction (stored in `localStorage` key `"ebv_transactions"`)

```json
{
  "id":       "lc3k2a9f1",
  "name":     "Lunch",
  "amount":   25000,
  "category": "Food",
  "date":     "2026-11-27T07:30:00.000Z"
}
```

| Field | Type | Constraints |
|---|---|---|
| `id` | string | `Date.now().toString(36)` + random suffix; unique per transaction |
| `name` | string | Required; non-empty after trim |
| `amount` | number | Positive integer (currency units, e.g. IDR) |
| `category` | string | One of `"Food"`, `"Transport"`, `"Fun"` |
| `date` | string | ISO 8601 UTC timestamp |

### Budget Limit (stored in `localStorage` key `"ebv_budget_limit"`)

A plain number string, e.g. `"1000000"`. Absent or empty means no limit is set; the balance card renders without an over-budget comparison.

## Correctness Properties

- **Total accuracy:** `Balance.render` sums all `amount` values using `Array.reduce`; the displayed total must equal the arithmetic sum of every stored transaction.
- **Idempotent refresh:** Calling `App.refresh()` any number of times with the same `localStorage` state must produce the same DOM output.
- **Chart leak prevention:** `ChartModule` calls `.destroy()` on the previous Chart.js instance before creating a new one when the category set changes, so no phantom canvases accumulate.
- **Sort stability:** Clicking the same sort column twice toggles between ascending and descending; a third click on the same column returns to ascending. The original insertion order is never mutated.
- **XSS prevention:** All user-supplied strings are passed through `escapeHtml()` before assignment to `innerHTML`. No `eval` or `Function` constructor is used.
- **Responsive breakpoints:**

  | Breakpoint | Behaviour |
  |---|---|
  | ≥ 769 px | Two-column top grid, full table with header row |
  | ≤ 768 px | Single-column layout; table transforms to stacked card list using `data-label` pseudo-labels; sort controls scroll horizontally |
  | ≤ 400 px | Balance amount font reduced; monthly grid collapses to 1 column |

## Error Handling

- **Invalid form input:** `Form` validates that name is non-empty, amount is a positive number, category is one of the allowed values, and date is present. Invalid fields receive an `.error` CSS class and a visible message; submission is blocked until all fields are valid.
- **Corrupted `localStorage`:** `Storage.load()` wraps `JSON.parse` in a try/catch and returns an empty array on failure, so a corrupt store does not crash the app.
- **Missing budget limit:** If `ebv_budget_limit` is absent or non-numeric, `Balance.render` and `Summary.render` skip the over-budget comparison and render without a limit indicator.
- **Chart.js unavailable:** If the CDN fails to load, `ChartModule.render` checks for the global `Chart` object before attempting to create a chart instance and silently skips rendering rather than throwing.
- **Empty transaction list:** All render functions handle a zero-length array: the table shows an empty-state message, the pie chart shows a placeholder, and the monthly summary renders nothing.

## Testing Strategy

Because the app has no build step, tests focus on the pure functions that can be exercised in isolation.

- **Unit tests (pure logic):**
  - `Balance` total calculation with various transaction arrays, including empty and single-item arrays.
  - `Summary` month-grouping logic: verify correct aggregation across month and year boundaries.
  - `ChartModule` category aggregation: confirm amounts are summed correctly per category.
  - `escapeHtml`: confirm HTML special characters (`<`, `>`, `&`, `"`, `'`) are escaped.
  - `Storage.load`: confirm fallback to `[]` when `localStorage` contains invalid JSON.

- **Integration tests (DOM + module interaction):**
  - Submit the form with valid data and assert a new row appears in the transaction list and the balance updates.
  - Submit with invalid data and assert the form does not submit and error styles are applied.
  - Delete a transaction and assert it is removed from the list and the balance recalculates.
  - Change the budget limit and assert the balance card switches between normal and over-budget styles at the correct threshold.

- **Manual / visual checks:**
  - Responsive layout at 320 px, 768 px, and 1024 px viewport widths.
  - Pie chart renders correctly with one, two, and all three categories present.
  - Over-budget highlight appears on the balance card and the correct monthly summary cards.
