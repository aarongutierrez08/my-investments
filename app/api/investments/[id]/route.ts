import { NextResponse } from 'next/server';
import { storage } from '../../../../lib/storage';
import { investmentSchema } from '../schema';
import type { Investment } from '../../../../lib/types';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await storage.deleteInvestment(id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete investment.' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

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

  const patch: Partial<Investment> = {
    instrument: parsed.data.instrument,
    amount: parsed.data.amount,
    price: parsed.data.price,
    purchaseDate: parsed.data.purchaseDate,
    categoryId: parsed.data.categoryId,
    labelIds: parsed.data.labelIds,
    ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
  };

  const updated = await storage.updateInvestment(id, patch);
  if (updated === null) {
    return NextResponse.json(
      { error: `Investment with id "${id}" not found.` },
      { status: 404 },
    );
  }

  return NextResponse.json(updated, { status: 200 });
}
