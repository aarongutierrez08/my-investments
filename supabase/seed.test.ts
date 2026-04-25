import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.join(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const SEED_PATH = path.join(REPO_ROOT, 'supabase', 'seed.sql');

const FORBIDDEN_FLOAT_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: '::float cast', re: /::\s*float\b/i },
  { name: '::real cast', re: /::\s*real\b/i },
  { name: '::double precision cast', re: /::\s*double\s+precision\b/i },
  { name: 'scientific notation literal', re: /\b\d+\.?\d*e[-+]?\d+\b/i },
];

function readSeed(): string {
  expect(
    fs.existsSync(SEED_PATH),
    `expected seed file at ${SEED_PATH}`,
  ).toBe(true);
  return fs.readFileSync(SEED_PATH, 'utf-8');
}

function countInsertsInto(sql: string, table: string): number {
  const re = new RegExp(
    `insert\\s+into\\s+(?:public\\.)?${table}\\b`,
    'gi',
  );
  return (sql.match(re) ?? []).length;
}

describe('db:reset npm script', () => {
  it('exposes db:reset that runs supabase db reset', () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    expect(pkg.scripts['db:reset']).toBe('supabase db reset');
  });
});

describe('supabase/seed.sql', () => {
  it('inserts at least one row into the investments table', () => {
    const sql = readSeed();
    expect(countInsertsInto(sql, 'investments')).toBeGreaterThanOrEqual(1);
  });

  it('inserts at least one row into the labels table', () => {
    const sql = readSeed();
    expect(countInsertsInto(sql, 'labels')).toBeGreaterThanOrEqual(1);
  });

  it('uses NUMERIC-compatible money literals (no float casts, no scientific notation)', () => {
    const sql = readSeed();
    for (const { name, re } of FORBIDDEN_FLOAT_PATTERNS) {
      expect(sql, `seed must not contain ${name}`).not.toMatch(re);
    }
  });
});
