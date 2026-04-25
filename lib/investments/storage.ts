import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase as defaultClient } from '../supabase';
import { CATEGORIES, type Category, type Investment } from '../types';

const numericFromDb = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value : Number(value)))
  .refine((value) => Number.isFinite(value), {
    message: 'Numeric column must contain a finite number',
  });

const investmentRowSchema = z.object({
  id: z.string(),
  instrument: z.string().min(1).max(100),
  amount: numericFromDb,
  price: numericFromDb,
  category: z.enum(CATEGORIES),
  purchase_date: z.iso.date(),
  notes: z.string().nullable().optional(),
  investment_labels: z
    .array(z.object({ label_id: z.string() }))
    .nullable()
    .optional(),
});

type InvestmentRow = z.infer<typeof investmentRowSchema>;

const SELECT_FIELDS =
  'id, instrument, amount, price, category, purchase_date, notes, created_at, investment_labels(label_id)';

function rowToInvestment(row: InvestmentRow): Investment {
  const investment: Investment = {
    id: row.id,
    instrument: row.instrument,
    amount: row.amount,
    price: row.price,
    purchaseDate: row.purchase_date,
    category: row.category,
    labelIds: (row.investment_labels ?? []).map((link) => link.label_id),
    labels: [],
  };
  if (row.notes != null && row.notes.length > 0) {
    investment.notes = row.notes;
  }
  return investment;
}

export interface CreateInvestmentInput {
  instrument: string;
  amount: number;
  price: number;
  purchaseDate: string;
  category: Category;
  labelIds: string[];
  notes?: string;
}

export interface UpdateInvestmentInput {
  instrument?: string;
  amount?: number;
  price?: number;
  purchaseDate?: string;
  category?: Category;
  labelIds?: string[];
  notes?: string;
}

function fail(operation: string, details: string): never {
  throw new Error(`Failed to ${operation}: ${details}`);
}

export async function listInvestments(
  client: SupabaseClient = defaultClient,
): Promise<Investment[]> {
  const { data, error } = await client
    .from('investments')
    .select(SELECT_FIELDS)
    .order('created_at', { ascending: false });
  if (error) fail('list investments', error.message);
  return (data ?? []).map((row) => rowToInvestment(investmentRowSchema.parse(row)));
}

export async function getInvestment(
  id: string,
  client: SupabaseClient = defaultClient,
): Promise<Investment | null> {
  const { data, error } = await client
    .from('investments')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .maybeSingle();
  if (error) fail(`get investment ${id}`, error.message);
  if (!data) return null;
  return rowToInvestment(investmentRowSchema.parse(data));
}

export async function createInvestment(
  input: CreateInvestmentInput,
  client: SupabaseClient = defaultClient,
): Promise<Investment> {
  const { data, error } = await client
    .from('investments')
    .insert({
      instrument: input.instrument,
      amount: input.amount,
      price: input.price,
      purchase_date: input.purchaseDate,
      category: input.category,
      notes: input.notes ?? null,
    })
    .select('id')
    .single();
  if (error || !data) fail('create investment', error?.message ?? 'no row returned');

  const newId = (data as { id: string }).id;

  if (input.labelIds.length > 0) {
    const { error: linkError } = await client
      .from('investment_labels')
      .insert(input.labelIds.map((labelId) => ({ investment_id: newId, label_id: labelId })));
    if (linkError) fail('attach labels', linkError.message);
  }

  const created = await getInvestment(newId, client);
  if (!created) fail('read back created investment', `id=${newId}`);
  return created;
}

export async function updateInvestment(
  id: string,
  patch: UpdateInvestmentInput,
  client: SupabaseClient = defaultClient,
): Promise<Investment | null> {
  const updateRow: Record<string, unknown> = {};
  if (patch.instrument !== undefined) updateRow.instrument = patch.instrument;
  if (patch.amount !== undefined) updateRow.amount = patch.amount;
  if (patch.price !== undefined) updateRow.price = patch.price;
  if (patch.purchaseDate !== undefined) updateRow.purchase_date = patch.purchaseDate;
  if (patch.category !== undefined) updateRow.category = patch.category;
  if ('notes' in patch) updateRow.notes = patch.notes ?? null;

  if (Object.keys(updateRow).length > 0) {
    const { data, error } = await client
      .from('investments')
      .update(updateRow)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) fail(`update investment ${id}`, error.message);
    if (!data) return null;
  } else if ((await getInvestment(id, client)) === null) {
    return null;
  }

  if (patch.labelIds !== undefined) {
    const { error: deleteError } = await client
      .from('investment_labels')
      .delete()
      .eq('investment_id', id);
    if (deleteError) fail(`clear labels for investment ${id}`, deleteError.message);

    if (patch.labelIds.length > 0) {
      const { error: insertError } = await client
        .from('investment_labels')
        .insert(patch.labelIds.map((labelId) => ({ investment_id: id, label_id: labelId })));
      if (insertError) fail('attach labels', insertError.message);
    }
  }

  return getInvestment(id, client);
}

export async function deleteInvestment(
  id: string,
  client: SupabaseClient = defaultClient,
): Promise<void> {
  const { data, error } = await client
    .from('investments')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) fail(`delete investment ${id}`, error.message);
  if (!data || data.length === 0) {
    throw new Error(`Investment with id "${id}" not found.`);
  }
}
