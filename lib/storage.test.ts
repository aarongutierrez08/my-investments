// lib/storage.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { storage } from './storage';

const TEST_DATA_DIR = path.join(__dirname, '..', 'data_test');
const TEST_DATA_FILE = path.join(TEST_DATA_DIR, 'portfolio.json');

describe('Storage Module (legacy JSON read)', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    await fs.writeFile(
      TEST_DATA_FILE,
      JSON.stringify({ investments: [], labels: [] }, null, 2),
      'utf-8',
    );
  });

  afterEach(async () => {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  it('should return an empty portfolio if the data file does not exist', async () => {
    await fs.unlink(TEST_DATA_FILE);
    const portfolio = await storage.readAll(TEST_DATA_FILE);
    expect(portfolio).toEqual({ investments: [], labels: [] });
  });

  describe('legacy category backfill', () => {
    it('reads investments without a category as category "Other"', async () => {
      const legacyRecord = {
        id: 'inv-legacy',
        instrument: 'LEGACY',
        amount: 1,
        price: 10,
        purchaseDate: '2026-01-01',
        labelIds: [],
      };
      const fileContents = {
        investments: [legacyRecord],
        labels: [],
      };
      await fs.writeFile(TEST_DATA_FILE, JSON.stringify(fileContents, null, 2), 'utf-8');

      const portfolio = await storage.readAll(TEST_DATA_FILE);

      expect(portfolio.investments).toHaveLength(1);
      expect(portfolio.investments[0]).toEqual({
        ...legacyRecord,
        category: 'Other',
      });
    });

    it('does not rewrite the file when reading legacy records', async () => {
      const legacyRecord = {
        id: 'inv-legacy',
        instrument: 'LEGACY',
        amount: 1,
        price: 10,
        purchaseDate: '2026-01-01',
        labelIds: [],
      };
      const serialized = JSON.stringify(
        { investments: [legacyRecord], labels: [] },
        null,
        2,
      );
      await fs.writeFile(TEST_DATA_FILE, serialized, 'utf-8');

      await storage.readAll(TEST_DATA_FILE);

      const onDisk = await fs.readFile(TEST_DATA_FILE, 'utf-8');
      expect(onDisk).toBe(serialized);
    });
  });
});
