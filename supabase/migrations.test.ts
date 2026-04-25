import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const EXPECTED_TABLES = ['users', 'labels', 'investments', 'investment_labels'];
const EXPECTED_MONEY_COLUMNS = ['amount', 'price'];
const FORBIDDEN_NUMERIC_TYPES = ['real', 'double precision', 'float'];

function readSingleMigration(): string {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'));
  expect(files).toHaveLength(1);
  return fs.readFileSync(path.join(MIGRATIONS_DIR, files[0]), 'utf-8');
}

describe('Initial Supabase migration', () => {
  it('has exactly one .sql file in supabase/migrations/', () => {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'));
    expect(files).toHaveLength(1);
  });

  it('declares every table documented in SCHEMA.md', () => {
    const sql = readSingleMigration();
    for (const table of EXPECTED_TABLES) {
      const re = new RegExp(
        `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${table}\\b`,
        'i',
      );
      expect(sql, `expected migration to create table "${table}"`).toMatch(re);
    }
  });

  it('declares every money column as NUMERIC and never as a floating-point type', () => {
    const sql = readSingleMigration();
    for (const column of EXPECTED_MONEY_COLUMNS) {
      const numericRe = new RegExp(
        `\\b${column}\\b\\s+numeric\\s*\\(`,
        'i',
      );
      expect(
        sql,
        `expected money column "${column}" to be declared as NUMERIC(precision, scale)`,
      ).toMatch(numericRe);

      for (const forbidden of FORBIDDEN_NUMERIC_TYPES) {
        const forbiddenRe = new RegExp(
          `\\b${column}\\b\\s+${forbidden.replace(/\s+/g, '\\s+')}\\b`,
          'i',
        );
        expect(
          sql,
          `money column "${column}" must not use ${forbidden}`,
        ).not.toMatch(forbiddenRe);
      }
    }
  });
});
