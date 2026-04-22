import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storage } from '../../../lib/storage';
import type { Investment } from '../../../lib/types';

const investmentSchema = z.object({
  instrument: z.string().trim().min(1, 'Instrument is required'),
  amount: z.number().positive('Amount must be a positive number'),
  price: z.number().positive('Price must be a positive number'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  labelIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = investmentSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`)
      .join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const investment: Investment = {
    id: crypto.randomUUID(),
    instrument: parsed.data.instrument,
    amount: parsed.data.amount,
    price: parsed.data.price,
    purchaseDate: parsed.data.purchaseDate,
    categoryId: parsed.data.categoryId,
    labelIds: parsed.data.labelIds,
    ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
  };

  await storage.addInvestment(investment);

  return NextResponse.json(investment, { status: 201 });
}
