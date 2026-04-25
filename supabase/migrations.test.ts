import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const EXPECTED_TABLES = ['users', 'labels', 'investments', 'investment_labels'];
const EXPECTED_MONEY_COLUMNS = ['amount', 'price'];
const FORBIDDEN_NUMERIC_TYPES = ['real', 'double precision', 'float'];

function listMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function readAllMigrations(): string {
  return listMigrationFiles()
    .map((file) => fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8'))
    .join('\n');
}

function readInitialMigration(): string {
  const files = listMigrationFiles();
  expect(files.length).toBeGreaterThan(0);
  const initial = files.find((file) => file.endsWith('_init.sql'));
  expect(initial, 'expected an *_init.sql migration to exist').toBeDefined();
  return fs.readFileSync(path.join(MIGRATIONS_DIR, initial as string), 'utf-8');
}

describe('Supabase migrations', () => {
  it('keeps the initial *_init.sql migration as the schema starting point', () => {
    const initFiles = listMigrationFiles().filter((file) => file.endsWith('_init.sql'));
    expect(initFiles).toHaveLength(1);
  });

  it('declares every table documented in SCHEMA.md in the initial migration', () => {
    const sql = readInitialMigration();
    for (const table of EXPECTED_TABLES) {
      const re = new RegExp(
        `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${table}\\b`,
        'i',
      );
      expect(sql, `expected migration to create table "${table}"`).toMatch(re);
    }
  });

  it('declares every money column as NUMERIC and never as a floating-point type', () => {
    const sql = readAllMigrations();
    for (const column of EXPECTED_MONEY_COLUMNS) {
      const numericRe = new RegExp(`\\b${column}\\b\\s+numeric\\s*\\(`, 'i');
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
