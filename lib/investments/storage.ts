import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase as defaultClient } from '../supabase';
import { CATEGORIES, type Investment } from '../types';

const dbRowSchema = z.object({
  id: z.string(),
  instrument: z.string(),
  amount: z.string().transform((value) => Number(value)),
  price: z.string().transform((value) => Number(value)),
  category: z.enum(CATEGORIES),
  purchase_date: z.string(),
  notes: z.string().nullable(),
  labels: z
    .array(z.string())
    .nullable()
    .transform((value) => value ?? []),
  investment_labels: z
    .array(z.object({ label_id: z.string() }))
    .nullable()
    .transform((value) => value ?? []),
});

type DbInvestmentRow = z.infer<typeof dbRowSchema>;

const SELECT_WITH_LABELS = '*, investment_labels(label_id)';

function rowToInvestment(row: DbInvestmentRow): Investment {
  const investment: Investment = {
    id: row.id,
    instrument: row.instrument,
    amount: row.amount,
    price: row.price,
    purchaseDate: row.purchase_date,
    category: row.category,
    labelIds: row.investment_labels.map((link) => link.label_id),
    labels: row.labels,
  };
  if (row.notes !== null) {
    investment.notes = row.notes;
  }
  return investment;
}

function moneyToString(value: number): string {
  return value.toString();
}

export async function listInvestments(
  client: SupabaseClient = defaultClient,
): Promise<Investment[]> {
  const { data, error } = await client
    .from('investments')
    .select(SELECT_WITH_LABELS);

  if (error) {
    throw new Error(error.message);
  }

  const rows = z.array(dbRowSchema).parse(data ?? []);
  return rows.map(rowToInvestment);
}

export async function getInvestment(
  id: string,
  client: SupabaseClient = defaultClient,
): Promise<Investment | null> {
  const { data, error } = await client
    .from('investments')
    .select(SELECT_WITH_LABELS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (data === null) {
    return null;
  }

  return rowToInvestment(dbRowSchema.parse(data));
}

export async function createInvestment(
  investment: Investment,
  client: SupabaseClient = defaultClient,
): Promise<Investment> {
  const insertRow = {
    id: investment.id,
    instrument: investment.instrument,
    amount: moneyToString(investment.amount),
    price: moneyToString(investment.price),
    purchase_date: investment.purchaseDate,
    category: investment.category,
    notes: investment.notes ?? null,
    labels: investment.labels,
  };

  const { error: insertError } = await client
    .from('investments')
    .insert(insertRow);
  if (insertError) {
    throw new Error(insertError.message);
  }

  if (investment.labelIds.length > 0) {
    const joinRows = investment.labelIds.map((labelId) => ({
      investment_id: investment.id,
      label_id: labelId,
    }));
    const { error: joinError } = await client
      .from('investment_labels')
      .insert(joinRows);
    if (joinError) {
      throw new Error(joinError.message);
    }
  }

  const created = await getInvestment(investment.id, client);
  if (created === null) {
    throw new Error(`Failed to read back created investment "${investment.id}".`);
  }
  return created;
}

export async function updateInvestment(
  id: string,
  patch: Partial<Investment>,
  client: SupabaseClient = defaultClient,
): Promise<Investment | null> {
  const existing = await getInvestment(id, client);
  if (existing === null) {
    return null;
  }

  const columnUpdate: Record<string, unknown> = {};
  if (patch.instrument !== undefined) {
    columnUpdate.instrument = patch.instrument;
  }
  if (patch.amount !== undefined) {
    columnUpdate.amount = moneyToString(patch.amount);
  }
  if (patch.price !== undefined) {
    columnUpdate.price = moneyToString(patch.price);
  }
  if (patch.purchaseDate !== undefined) {
    columnUpdate.purchase_date = patch.purchaseDate;
  }
  if (patch.category !== undefined) {
    columnUpdate.category = patch.category;
  }
  if (patch.labels !== undefined) {
    columnUpdate.labels = patch.labels;
  }
  if ('notes' in patch) {
    columnUpdate.notes = patch.notes ?? null;
  }

  if (Object.keys(columnUpdate).length > 0) {
    const { error } = await client
      .from('investments')
      .update(columnUpdate)
      .eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }

  if (patch.labelIds !== undefined) {
    const { error: deleteError } = await client
      .from('investment_labels')
      .delete()
      .eq('investment_id', id);
    if (deleteError) {
      throw new Error(deleteError.message);
    }
    if (patch.labelIds.length > 0) {
      const joinRows = patch.labelIds.map((labelId) => ({
        investment_id: id,
        label_id: labelId,
      }));
      const { error: insertError } = await client
        .from('investment_labels')
        .insert(joinRows);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  }

  return getInvestment(id, client);
}

export async function deleteInvestment(
  id: string,
  client: SupabaseClient = defaultClient,
): Promise<void> {
  const existing = await getInvestment(id, client);
  if (existing === null) {
    throw new Error(`Investment with id "${id}" not found.`);
  }
  const { error } = await client.from('investments').delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
}
