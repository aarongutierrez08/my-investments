import { describe, it, expect, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createLabel,
  deleteLabel,
  getLabel,
  listLabels,
  updateLabel,
} from './storage';
import type { Label } from '../types';

type Row = Record<string, unknown>;

interface FakeDb {
  labels: Row[];
}

function makeFakeClient(db: FakeDb): SupabaseClient {
  function from(table: 'labels') {
    const filters: Array<[string, unknown]> = [];
    let op: 'select' | 'insert' | 'update' | 'delete' | null = null;
    let payload: unknown = null;
    let single = false;
    let orderColumn: string | null = null;

    function execute(): { data: unknown; error: null } {
      let rows = (db[table] as Row[]).slice();
      for (const [col, val] of filters) {
        rows = rows.filter((row) => row[col] === val);
      }

      switch (op) {
        case 'select': {
          let data: unknown[] = rows;
          if (orderColumn !== null) {
            const col = orderColumn;
            data = rows.slice().sort((a, b) => {
              const av = a[col] as string;
              const bv = b[col] as string;
              return av < bv ? -1 : av > bv ? 1 : 0;
            });
          }
          if (single) {
            return { data: data[0] ?? null, error: null };
          }
          return { data, error: null };
        }
        case 'insert': {
          const list = Array.isArray(payload) ? payload : [payload];
          (db[table] as Row[]).push(...(list as Row[]));
          return { data: list, error: null };
        }
        case 'update': {
          for (const row of rows) {
            Object.assign(row, payload);
          }
          return { data: rows, error: null };
        }
        case 'delete': {
          const target = db[table] as Row[];
          const remaining = target.filter((row) => !rows.includes(row));
          target.length = 0;
          target.push(...remaining);
          return { data: rows, error: null };
        }
        default:
          throw new Error('Operation not set on fake client.');
      }
    }

    const builder = {
      select() {
        op = 'select';
        return builder;
      },
      insert(value: unknown) {
        op = 'insert';
        payload = value;
        return builder;
      },
      update(value: unknown) {
        op = 'update';
        payload = value;
        return builder;
      },
      delete() {
        op = 'delete';
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return builder;
      },
      order(col: string) {
        orderColumn = col;
        return builder;
      },
      maybeSingle() {
        single = true;
        return builder;
      },
      then(
        onFulfilled: (result: { data: unknown; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(execute()).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return { from } as unknown as SupabaseClient;
}

function dbRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'lbl-1',
    name: 'long-term',
    color: '#3366CC',
    ...overrides,
  };
}

describe('lib/labels/storage', () => {
  let db: FakeDb;
  let client: SupabaseClient;

  beforeEach(() => {
    db = { labels: [] };
    client = makeFakeClient(db);
  });

  describe('listLabels', () => {
    it('returns an empty array when there are no rows', async () => {
      expect(await listLabels(client)).toEqual([]);
    });

    it('returns every label with id, name and color', async () => {
      db.labels.push(dbRow({ id: 'lbl-1', name: 'long-term', color: '#3366CC' }));
      db.labels.push(dbRow({ id: 'lbl-2', name: 'high-risk', color: '#CC3333' }));

      const result = await listLabels(client);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { id: 'lbl-1', name: 'long-term', color: '#3366CC' },
          { id: 'lbl-2', name: 'high-risk', color: '#CC3333' },
        ]),
      );
    });

    it('throws when a row is missing required fields (Zod validation)', async () => {
      db.labels.push({ id: 'lbl-1', name: 'long-term' });

      await expect(listLabels(client)).rejects.toThrow();
    });
  });

  describe('getLabel', () => {
    it('returns null when the id does not exist', async () => {
      expect(await getLabel('missing', client)).toBeNull();
    });

    it('returns the matching label when it exists', async () => {
      db.labels.push(dbRow({ id: 'lbl-1', name: 'long-term', color: '#3366CC' }));

      const label = await getLabel('lbl-1', client);

      expect(label).toEqual({ id: 'lbl-1', name: 'long-term', color: '#3366CC' });
    });
  });

  describe('createLabel', () => {
    it('inserts the row and returns the persisted label', async () => {
      const label: Label = { id: 'lbl-1', name: 'long-term', color: '#3366CC' };

      const created = await createLabel(label, client);

      expect(created).toEqual(label);
      expect(db.labels).toHaveLength(1);
      expect(db.labels[0]).toMatchObject({
        id: 'lbl-1',
        name: 'long-term',
        color: '#3366CC',
      });
    });
  });

  describe('updateLabel', () => {
    beforeEach(() => {
      db.labels.push(dbRow({ id: 'lbl-1', name: 'long-term', color: '#3366CC' }));
    });

    it('returns null when the id does not exist', async () => {
      expect(await updateLabel('missing', { name: 'whatever' }, client)).toBeNull();
    });

    it('renames the label when name is patched', async () => {
      const updated = await updateLabel('lbl-1', { name: 'core' }, client);

      expect(updated?.name).toBe('core');
      expect(updated?.color).toBe('#3366CC');
      expect(db.labels[0].name).toBe('core');
    });

    it('updates only the columns present in the patch', async () => {
      const updated = await updateLabel('lbl-1', { color: '#000000' }, client);

      expect(updated?.color).toBe('#000000');
      expect(updated?.name).toBe('long-term');
      expect(db.labels[0].color).toBe('#000000');
      expect(db.labels[0].name).toBe('long-term');
    });
  });

  describe('deleteLabel', () => {
    it('removes the row when it exists', async () => {
      db.labels.push(dbRow({ id: 'lbl-1' }));

      await deleteLabel('lbl-1', client);

      expect(db.labels).toHaveLength(0);
    });

    it('throws when the id does not exist', async () => {
      await expect(deleteLabel('missing', client)).rejects.toThrow(/not found/);
    });
  });
});
