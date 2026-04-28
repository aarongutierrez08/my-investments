import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase as defaultClient } from '../supabase';
import type { Label } from '../types';

const dbRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

type DbLabelRow = z.infer<typeof dbRowSchema>;

function rowToLabel(row: DbLabelRow): Label {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

export async function listLabels(
  client: SupabaseClient = defaultClient,
): Promise<Label[]> {
  const { data, error } = await client
    .from('labels')
    .select('id, name, color')
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  const rows = z.array(dbRowSchema).parse(data ?? []);
  return rows.map(rowToLabel);
}

export async function getLabel(
  id: string,
  client: SupabaseClient = defaultClient,
): Promise<Label | null> {
  const { data, error } = await client
    .from('labels')
    .select('id, name, color')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (data === null) {
    return null;
  }

  return rowToLabel(dbRowSchema.parse(data));
}

export async function createLabel(
  label: Label,
  client: SupabaseClient = defaultClient,
): Promise<Label> {
  const { error } = await client.from('labels').insert({
    id: label.id,
    name: label.name,
    color: label.color,
  });
  if (error) {
    throw new Error(error.message);
  }

  const created = await getLabel(label.id, client);
  if (created === null) {
    throw new Error(`Failed to read back created label "${label.id}".`);
  }
  return created;
}

export async function updateLabel(
  id: string,
  patch: Partial<Omit<Label, 'id'>>,
  client: SupabaseClient = defaultClient,
): Promise<Label | null> {
  const existing = await getLabel(id, client);
  if (existing === null) {
    return null;
  }

  const columnUpdate: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    columnUpdate.name = patch.name;
  }
  if (patch.color !== undefined) {
    columnUpdate.color = patch.color;
  }

  if (Object.keys(columnUpdate).length > 0) {
    const { error } = await client
      .from('labels')
      .update(columnUpdate)
      .eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }

  return getLabel(id, client);
}

export async function deleteLabel(
  id: string,
  client: SupabaseClient = defaultClient,
): Promise<void> {
  const existing = await getLabel(id, client);
  if (existing === null) {
    throw new Error(`Label with id "${id}" not found.`);
  }
  const { error } = await client.from('labels').delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
}
