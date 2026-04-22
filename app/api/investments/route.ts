import { NextResponse } from 'next/server';
import { storage } from '../../../lib/storage';
import { investmentSchema } from './schema';
import type { Investment } from '../../../lib/types';

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
    category: parsed.data.category,
    labelIds: parsed.data.labelIds,
    ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
  };

  await storage.addInvestment(investment);

  return NextResponse.json(investment, { status: 201 });
}
