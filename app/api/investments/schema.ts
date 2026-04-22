import { z } from 'zod';

export const investmentSchema = z.object({
  instrument: z.string().trim().min(1, 'Instrument is required'),
  amount: z.number().positive('Amount must be a positive number'),
  price: z.number().positive('Price must be a positive number'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  labelIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
