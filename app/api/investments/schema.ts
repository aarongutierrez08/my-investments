import { z } from 'zod';
import { CATEGORIES } from '../../../lib/types';

export const investmentSchema = z.object({
  instrument: z.string().trim().min(1, 'Instrument is required'),
  amount: z.number().positive('Amount must be a positive number'),
  price: z.number().positive('Price must be a positive number'),
  purchaseDate: z.iso.date('Purchase date must be a valid ISO date (YYYY-MM-DD)'),
  category: z.enum(CATEGORIES, {
    message: `Category must be one of: ${CATEGORIES.join(', ')}`,
  }),
  labelIds: z.array(z.string()).default([]),
  notes: z
    .string()
    .optional()
    .transform((raw) => {
      if (raw === undefined) {
        return undefined;
      }
      const trimmed = raw.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }),
});
