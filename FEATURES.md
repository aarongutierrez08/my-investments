# FEATURES.md

Authoritative ledger of capabilities already shipped. The Planner reads this to avoid proposing duplicates. The Developer appends a new line every time a user-visible capability ships.

Format: `- <one-line capability from the user's perspective> — \`<primary file path>\``

## Data model

- Investment entity with instrument, amount, price, purchase date, category, labels and notes — `lib/types.ts`
- JSON-file storage for investments and labels — `lib/storage.ts`

## Create

- Users can create an investment through a form — `app/add/AddInvestmentForm.tsx`
- Users can pick a category from a fixed list when creating an investment — `app/add/AddInvestmentForm.tsx`
- Users can attach custom labels when creating an investment — `app/add/AddInvestmentForm.tsx`
- Users can set a purchase date when creating an investment — `app/add/AddInvestmentForm.tsx`
- Users can add free-form notes when creating an investment — `app/add/AddInvestmentForm.tsx`

## Edit

- Users can edit an existing investment (name, amount, price) — `app/edit/[id]/EditInvestmentForm.tsx`
- Users can edit the custom labels of an investment — `app/edit/[id]/EditInvestmentForm.tsx`
- Users can edit the purchase date of an investment — `app/edit/[id]/EditInvestmentForm.tsx`
- Users can change the category of an investment while editing — `app/edit/[id]/EditInvestmentForm.tsx`
- Users can edit or clear the notes of an existing investment — `app/edit/[id]/EditInvestmentForm.tsx`

## Delete

- Users can delete an investment from the list with a confirmation prompt — `app/InvestmentsTable.tsx`

## List view

- Home page shows all investments in a table — `app/InvestmentsTable.tsx`
- List shows each investment's custom labels — `app/InvestmentsTable.tsx`
- List shows each investment's purchase date — `app/InvestmentsTable.tsx`
- List shows the total invested amount across all investments — `app/InvestmentsTable.tsx`
- List shows total invested per category — `app/InvestmentsTable.tsx`
- List shows total invested per custom label — `app/InvestmentsTable.tsx`
- List shows total invested per purchase year (descending), reflecting the current filter — `app/InvestmentsTable.tsx`
- List shows each category's percentage of the total portfolio — `app/InvestmentsTable.tsx`
- List shows total invested for the currently filtered view — `app/InvestmentsTable.tsx`
- List shows how many investments match the current filter — `app/InvestmentsTable.tsx`
- List shows each investment's notes, truncated with the full text on hover — `app/InvestmentsTable.tsx`
- List shows the average purchase amount (mean of amount × price) for the currently filtered view — `app/InvestmentsTable.tsx`
- List shows the median purchase amount (median of amount × price) for the currently filtered view — `app/InvestmentsTable.tsx`
- List shows the min and max purchase amount (min/max of amount × price) for the currently filtered view — `app/InvestmentsTable.tsx`

## Filter

- Users can filter the list by category — `app/InvestmentsTable.tsx`
- Users can filter the list by custom label — `app/InvestmentsTable.tsx`
- Users can search investments by name — `app/InvestmentsTable.tsx`
- Users can filter investments by a purchase date range — `app/InvestmentsTable.tsx`
- Users can filter by name OR label through a single unified search box — `app/InvestmentsTable.tsx`
- Users can search investments by text contained in their notes through the unified search box — `app/InvestmentsTable.tsx`
- Users can filter investments by a purchase amount range (min/max) — `app/InvestmentsTable.tsx`
- Users can clear all active filters at once with a single "Clear filters" button — `app/InvestmentsTable.tsx`
- Users can toggle an "Only with notes" filter to show only investments whose notes are non-empty — `app/InvestmentsTable.tsx`

## Export

- Users can export the currently shown investments list to a CSV file named `investments.csv` — `app/InvestmentsTable.tsx`

## Sort

- Investments are sorted by purchase amount descending by default — `app/InvestmentsTable.tsx`
- Users can sort the list by amount — `app/InvestmentsTable.tsx`
- Users can sort the list by investment name — `app/InvestmentsTable.tsx`
- Users can sort the list by category name (A→Z and Z→A) — `app/InvestmentsTable.tsx`
- Users can sort the list by purchase date (newest first and oldest first) — `app/InvestmentsTable.tsx`
- Users can sort the list by custom label (A→Z and Z→A) — `app/InvestmentsTable.tsx`
- Users can sort the list by notes presence (with-notes first or without-notes first) — `app/InvestmentsTable.tsx`
