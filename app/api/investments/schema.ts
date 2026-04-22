import { z } from 'zod';
import { CATEGORIES } from '../../../lib/types';

function sanitizeLabels(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export const investmentSchema = z.object({
  instrument: z.string().trim().min(1, 'Instrument is required'),
  amount: z.number().positive('Amount must be a positive number'),
  price: z.number().positive('Price must be a positive number'),
  purchaseDate: z.iso.date('Purchase date must be a valid ISO date (YYYY-MM-DD)'),
  category: z.enum(CATEGORIES, {
    message: `Category must be one of: ${CATEGORIES.join(', ')}`,
  }),
  labelIds: z.array(z.string()).default([]),
  labels: z
    .array(z.string(), { message: 'labels must be an array of strings' })
    .optional()
    .transform((raw) => (raw === undefined ? undefined : sanitizeLabels(raw))),
  notes: z.string().optional(),
});
