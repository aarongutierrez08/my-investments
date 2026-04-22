import { NextResponse } from 'next/server';
import { storage } from '../../../../lib/storage';

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
