# Requirements Document

## Introduction

The Expense and Budget Visualizer is a mobile-friendly, client-side web application that lets users record daily expenses, monitor total spending against an optional budget limit, and visualize spending distribution by category. All data is stored in the browser via `localStorage`. There is no backend, no login, and no network requests beyond loading Chart.js from CDN.

**Technology stack:** HTML5, CSS3, vanilla JavaScript (no frameworks), Browser `localStorage` API, Chart.js (CDN).

**File layout:** single `index.html`, one stylesheet (`css/style.css`), one script (`js/script.js`), no build step.

**Technical constraints:**
- Exactly one CSS file: `css/style.css`
- Exactly one JS file: `js/script.js`
- No frameworks, no build step — open `index.html` directly in any browser
- No backend, no server, no cookies, no network requests except Chart.js CDN

## Requirements

### Requirement 1: Input Format

**User Story:** As a user, I want to add a new expense transaction using an input form so that I can keep a record of my daily spending.

#### Acceptance Criteria

1. WHEN the user submits the form with a non-empty item name, a positive amount, a selected category (Food, Transport, or Fun), and a date, THE SYSTEM SHALL save the transaction to `localStorage` under key `ebv_transactions` and refresh all UI sections.
2. WHEN any required field (item name, amount, category, or date) is empty or invalid on submit, THE SYSTEM SHALL display an inline error message for each invalid field and NOT save the transaction.
3. WHEN a valid transaction is saved, THE SYSTEM SHALL reset all form fields to their default empty state.
4. WHEN the user enters a value in the optional budget limit field and submits, THE SYSTEM SHALL save it to `localStorage` under key `ebv_budget_limit` so it persists across page reloads.

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a list so that I can review my spending history.

#### Acceptance Criteria

1. WHEN the page loads or any transaction is added or deleted, THE SYSTEM SHALL display every stored transaction in the list showing date, item name, category badge, and amount.
2. WHEN the user clicks the Delete button on a transaction row, THE SYSTEM SHALL remove that transaction from `localStorage` and re-render the list without it.
3. WHEN there are no transactions, THE SYSTEM SHALL display an empty-state message in the transaction list.

### Requirement 3: Total Expenses

**User Story:** As a user, I want to see my total expenses in a prominent balance card so that I always know how much I have spent.

#### Acceptance Criteria

1. WHEN any transaction is added or deleted, THE SYSTEM SHALL recalculate and display the updated sum of all transaction amounts in the balance card.
2. WHEN total spending is strictly less than the budget limit, or no budget limit is set, THE SYSTEM SHALL display the balance card with a normal blue gradient and no warning.
3. WHEN total spending equals or exceeds the budget limit, THE SYSTEM SHALL display the balance card in red with a warning strip and a left-border accent.

### Requirement 4: Spending Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can quickly understand where my money is going.

#### Acceptance Criteria

1. WHEN there is at least one transaction, THE SYSTEM SHALL display the pie chart with one segment per category whose total amount is greater than zero, sized proportionally to its share of total spending.
2. WHEN a transaction is added or deleted, THE SYSTEM SHALL update the pie chart immediately to reflect the new category totals.
3. WHEN there are no transactions, THE SYSTEM SHALL display an empty-state placeholder in the chart area instead of an empty chart.

### Requirement 5: Monthly Summary

**User Story:** As a user, I want to see a monthly summary of my spending so that I can track trends over time.

#### Acceptance Criteria

1. WHEN the page renders, THE SYSTEM SHALL display one month card per calendar month that contains at least one transaction, showing the month name, total spend, and transaction count for that month.
2. WHEN multiple month cards are present, THE SYSTEM SHALL sort them newest-first.
3. WHEN a monthly total equals or exceeds the budget limit applicable to that month, THE SYSTEM SHALL highlight that month card in red. IF a user-configured limit for that specific month has been set, THEN that limit is used; otherwise the global budget limit applies.

### Requirement 6: Transaction Sorting

**User Story:** As a user, I want to sort my transactions so that I can find or compare entries more easily.

#### Acceptance Criteria

1. WHEN the user selects a sort option, THE SYSTEM SHALL re-render the transaction list in that order without altering the data stored in `localStorage`.
2. WHEN sort options are presented, THE SYSTEM SHALL include: Date (default, newest first), Amount descending, Amount ascending, and Category A to Z.
3. WHEN the user changes the sort option, THE SYSTEM SHALL apply the selected sort to the immediately following add or delete re-render. IF the user does not explicitly re-select a sort option, THEN the sort is not guaranteed to persist beyond that single subsequent re-render.

### Requirement 7: Budget Limit Warning

**User Story:** As a user, I want a budget limit warning so that I am immediately alerted when my total spending reaches or exceeds my set limit.

#### Acceptance Criteria

1. WHEN total spending equals or exceeds the budget limit, THE SYSTEM SHALL turn the balance card red and display a warning strip with a left-border accent.
2. WHEN total spending is strictly less than the budget limit, THE SYSTEM SHALL display the balance card with the normal blue gradient and no warning strip.
3. WHEN no budget limit has been set, THE SYSTEM SHALL display the balance card in its normal state without any warning indicator.
4. WHEN a monthly total equals or exceeds the applicable budget limit, THE SYSTEM SHALL highlight that month's summary card in red.

### Requirement 8: Local Storage and Data Persistence

**User Story:** As a user, I want my data to persist when I close and reopen the browser tab so that I do not lose my expense history.

#### Acceptance Criteria

1. WHEN the page is reloaded or the tab is reopened, THE SYSTEM SHALL load all previously saved transactions from `localStorage` and display them.
2. WHEN the page is reloaded, THE SYSTEM SHALL restore the previously saved budget limit into the limit field and use it in balance and monthly summary comparisons.
3. WHEN `localStorage` data for transactions is corrupted or unreadable, THE SYSTEM SHALL reset the transaction list to empty and independently attempt to restore the budget limit from its own `localStorage` key. IF the budget limit key is also unreadable, THEN the system SHALL default to no limit set rather than crashing.

### Requirement 9: Responsive Design

**User Story:** As a user, I want the app to work well on any screen size so that I can record and review expenses on both desktop and mobile devices.

#### Acceptance Criteria

1. WHEN the viewport is 769 px wide or wider, THE SYSTEM SHALL display the top section as a two-column grid (form on the left, pie chart on the right) and show the transaction table with a full header row.
2. WHEN the viewport is 768 px wide or narrower, THE SYSTEM SHALL switch to a single-column layout and transform the transaction table into a stacked card list using `data-label` pseudo-labels; sort controls SHALL scroll horizontally with the scrollbar hidden.
3. WHEN the viewport is 400 px wide or narrower, THE SYSTEM SHALL reduce the balance amount font size and collapse the monthly summary grid to a single column.

## Glossary

**Transaction** — A single recorded expense entry. Each transaction has a unique ID, item name, amount (positive integer), category, and ISO 8601 UTC date string. Stored as an element in the `ebv_transactions` JSON array in `localStorage`.

**Budget Limit** — An optional numeric threshold set by the user representing the maximum allowed total spending. Stored as a plain number string under `localStorage` key `ebv_budget_limit`. If absent or non-numeric, no limit comparison is performed.

**Category** — A fixed classification for a transaction. Allowed values: Food, Transport, Fun.

**Balance Card** — The prominent full-width UI card at the top of the page that displays the running total of all transaction amounts and indicates whether the budget limit has been reached.

**Monthly Summary** — A section of the page showing one card per calendar month derived from stored transactions, each displaying the month name, total spend, and transaction count.

**Spending Chart** — A pie chart rendered by Chart.js showing the proportional distribution of total spending across categories.

**Transaction List** — The full-width table (desktop) or stacked card list (mobile) showing all stored transactions with sort controls and per-row delete buttons.

**localStorage** — The browser-native Web Storage API used as the sole persistence layer. No server, database, or cookies are used.

**IIFE** — Immediately Invoked Function Expression; the JavaScript pattern used to encapsulate all application logic in `js/script.js` without polluting the global scope.

**escapeHtml** — An internal utility function in `js/script.js` that escapes HTML special characters in user-supplied strings before they are inserted into `innerHTML`, preventing XSS attacks.
