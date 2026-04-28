import { NextResponse } from 'next/server';
import {
  deleteInvestment,
  updateInvestment,
} from '../../../../lib/investments/storage';
import { investmentSchema } from '../schema';
import type { Investment } from '../../../../lib/types';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await deleteInvestment(id);
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

  const notesWasSent =
    typeof payload === 'object' && payload !== null && 'notes' in payload;

  const patch: Partial<Investment> = {
    instrument: parsed.data.instrument,
    amount: parsed.data.amount,
    price: parsed.data.price,
    purchaseDate: parsed.data.purchaseDate,
    category: parsed.data.category,
    labelIds: parsed.data.labelIds,
    ...(parsed.data.labels !== undefined && { labels: parsed.data.labels }),
    ...(notesWasSent && { notes: parsed.data.notes }),
  };

  const updated = await updateInvestment(id, patch);
  if (updated === null) {
    return NextResponse.json(
      { error: `Investment with id "${id}" not found.` },
      { status: 404 },
    );
  }

  return NextResponse.json(updated, { status: 200 });
}
