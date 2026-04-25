import type { Investment } from './types';

const HEADER = 'name,category,amount,price,purchaseDate,notes';

function escapeField(value: string): string {
  if (value === '') return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildInvestmentsCsv(rows: Investment[]): string {
  const lines = [HEADER];
  for (const row of rows) {
    const fields = [
      escapeField(row.instrument),
      escapeField(row.category ?? ''),
      escapeField(String(row.amount)),
      escapeField(String(row.price)),
      escapeField(row.purchaseDate ?? ''),
      escapeField(row.notes ?? ''),
    ];
    lines.push(fields.join(','));
  }
  return lines.join('\n');
}
