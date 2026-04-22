// lib/storage.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { storage, _setTestDataFilePath } from './storage';
import { Investment, Label } from './types';
import { v4 as uuidv4 } from 'uuid';

// Define a temporary directory for test data
const TEST_DATA_DIR = path.join(__dirname, '..', 'data_test');
const TEST_DATA_FILE = path.join(TEST_DATA_DIR, 'portfolio.json');

describe('Storage Module', () => {
  beforeEach(async () => {
    _setTestDataFilePath(TEST_DATA_FILE);
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
    const portfolio = await storage.readAll();
    expect(portfolio).toEqual({ investments: [], labels: [] });
  });

  it('should add an investment and retrieve it', async () => {
    const newInvestment: Investment = {
      id: uuidv4(),
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [uuidv4()],
      notes: 'Initial purchase',
    };

    await storage.addInvestment(newInvestment);

    const portfolio = await storage.readAll();
    expect(portfolio.investments).toHaveLength(1);
    expect(portfolio.investments[0]).toEqual(newInvestment);
  });

  it('should update an existing investment', async () => {
    const initialInvestment: Investment = {
      id: uuidv4(),
      instrument: 'GOOG',
      amount: 5,
      price: 100,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
      notes: 'Initial GOOG purchase',
    };
    await storage.addInvestment(initialInvestment);

    const patch = { price: 105, notes: 'Updated GOOG notes' };
    await storage.updateInvestment(initialInvestment.id, patch);

    const portfolio = await storage.readAll();
    const updatedInvestment = portfolio.investments.find(
      (inv) => inv.id === initialInvestment.id,
    );

    expect(updatedInvestment).toBeDefined();
    expect(updatedInvestment?.price).toBe(105);
    expect(updatedInvestment?.notes).toBe('Updated GOOG notes');
    expect(updatedInvestment?.instrument).toBe('GOOG');
  });

  it('updateInvestment returns the updated investment on success', async () => {
    const initial: Investment = {
      id: uuidv4(),
      instrument: 'MSFT',
      amount: 2,
      price: 200,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
    };
    await storage.addInvestment(initial);

    const result = await storage.updateInvestment(initial.id, { price: 250 });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(initial.id);
    expect(result?.price).toBe(250);
    expect(result?.instrument).toBe('MSFT');
  });

  it('updateInvestment returns null when the id does not exist', async () => {
    const result = await storage.updateInvestment('non-existent-id', { price: 999 });
    expect(result).toBeNull();

    const portfolio = await storage.readAll();
    expect(portfolio.investments).toHaveLength(0);
  });

  it('updateInvestment preserves the original id even if the patch tries to change it', async () => {
    const initial: Investment = {
      id: uuidv4(),
      instrument: 'NVDA',
      amount: 1,
      price: 500,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
    };
    await storage.addInvestment(initial);

    const result = await storage.updateInvestment(initial.id, {
      id: 'attacker-supplied-id',
      price: 550,
    } as Partial<Investment>);

    expect(result?.id).toBe(initial.id);

    const portfolio = await storage.readAll();
    expect(portfolio.investments).toHaveLength(1);
    expect(portfolio.investments[0].id).toBe(initial.id);
    expect(
      portfolio.investments.find((inv) => inv.id === 'attacker-supplied-id'),
    ).toBeUndefined();
  });

  it('should remove an investment', async () => {
    const investmentToRemove: Investment = {
      id: uuidv4(),
      instrument: 'TSLA',
      amount: 1,
      price: 800,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
      notes: 'Investment to be removed',
    };
    const investmentToKeep: Investment = {
      id: uuidv4(),
      instrument: 'AMZN',
      amount: 2,
      price: 3000,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
      notes: 'Investment to keep',
    };

    await storage.addInvestment(investmentToRemove);
    await storage.addInvestment(investmentToKeep);

    await storage.removeInvestment(investmentToRemove.id);

    const portfolio = await storage.readAll();
    expect(portfolio.investments).toHaveLength(1);
    expect(portfolio.investments[0]).toEqual(investmentToKeep);
    expect(
      portfolio.investments.find((inv) => inv.id === investmentToRemove.id),
    ).toBeUndefined();
  });

  it('deleteInvestment removes the matching investment and persists the new list', async () => {
    const investmentToDelete: Investment = {
      id: uuidv4(),
      instrument: 'NFLX',
      amount: 3,
      price: 500,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
      notes: 'To be deleted',
    };
    const investmentToKeep: Investment = {
      id: uuidv4(),
      instrument: 'GOOG',
      amount: 4,
      price: 120,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
      notes: 'Keeper',
    };

    await storage.addInvestment(investmentToDelete);
    await storage.addInvestment(investmentToKeep);

    await storage.deleteInvestment(investmentToDelete.id);

    const portfolio = await storage.readAll();
    expect(portfolio.investments).toHaveLength(1);
    expect(portfolio.investments[0]).toEqual(investmentToKeep);
  });

  it('deleteInvestment throws when the id does not exist', async () => {
    const existing: Investment = {
      id: uuidv4(),
      instrument: 'AAPL',
      amount: 1,
      price: 100,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
    };
    await storage.addInvestment(existing);

    await expect(storage.deleteInvestment('non-existent-id')).rejects.toThrow();

    const portfolio = await storage.readAll();
    expect(portfolio.investments).toHaveLength(1);
    expect(portfolio.investments[0]).toEqual(existing);
  });

  it('deleteInvestment leaves other investments untouched', async () => {
    const a: Investment = {
      id: uuidv4(),
      instrument: 'A',
      amount: 1,
      price: 1,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
    };
    const b: Investment = {
      id: uuidv4(),
      instrument: 'B',
      amount: 2,
      price: 2,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
    };
    const c: Investment = {
      id: uuidv4(),
      instrument: 'C',
      amount: 3,
      price: 3,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
    };

    await storage.addInvestment(a);
    await storage.addInvestment(b);
    await storage.addInvestment(c);

    await storage.deleteInvestment(b.id);

    const portfolio = await storage.readAll();
    expect(portfolio.investments).toHaveLength(2);
    expect(portfolio.investments).toEqual([a, c]);
  });

  it('should add a label and retrieve it', async () => {
    const newLabel: Label = {
      id: uuidv4(),
      name: 'high-risk',
      color: '#FF0000',
    };

    await storage.addLabel(newLabel);

    const portfolio = await storage.readAll();
    expect(portfolio.labels).toHaveLength(1);
    expect(portfolio.labels[0]).toEqual(newLabel);
  });

  it('should remove a label and strip it from investments that reference it', async () => {
    const labelToRemove: Label = {
      id: uuidv4(),
      name: 'long-term',
      color: '#00FF00',
    };
    const labelToKeep: Label = {
      id: uuidv4(),
      name: 'short-term',
      color: '#FFFF00',
    };
    await storage.addLabel(labelToRemove);
    await storage.addLabel(labelToKeep);

    const investment1: Investment = {
      id: uuidv4(),
      instrument: 'BTC',
      amount: 1,
      price: 50000,
      purchaseDate: new Date().toISOString(),
      category: 'Crypto',
      labelIds: [labelToRemove.id, labelToKeep.id],
      notes: 'Crypto investment',
    };
    const investment2: Investment = {
      id: uuidv4(),
      instrument: 'ETH',
      amount: 5,
      price: 3000,
      purchaseDate: new Date().toISOString(),
      category: 'Crypto',
      labelIds: [labelToRemove.id],
      notes: 'Another crypto investment',
    };
    const investment3: Investment = {
      id: uuidv4(),
      instrument: 'SPY',
      amount: 10,
      price: 400,
      purchaseDate: new Date().toISOString(),
      category: 'Stocks',
      labelIds: [],
      notes: 'ETF investment',
    };
    await storage.addInvestment(investment1);
    await storage.addInvestment(investment2);
    await storage.addInvestment(investment3);

    await storage.removeLabel(labelToRemove.id);

    const portfolio = await storage.readAll();

    expect(portfolio.labels).toHaveLength(1);
    expect(portfolio.labels[0]).toEqual(labelToKeep);
    expect(portfolio.labels.find((lbl) => lbl.id === labelToRemove.id)).toBeUndefined();

    const updatedInvestment1 = portfolio.investments.find((inv) => inv.id === investment1.id);
    expect(updatedInvestment1?.labelIds).toEqual([labelToKeep.id]);

    const updatedInvestment2 = portfolio.investments.find((inv) => inv.id === investment2.id);
    expect(updatedInvestment2?.labelIds).toEqual([]);

    const updatedInvestment3 = portfolio.investments.find((inv) => inv.id === investment3.id);
    expect(updatedInvestment3?.labelIds).toEqual([]);
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

      const portfolio = await storage.readAll();

      expect(portfolio.investments).toHaveLength(1);
      expect(portfolio.investments[0]).toEqual({
        ...legacyRecord,
        category: 'Other',
      });
    });

    it('does not rewrite the file when backfilling missing categories on read', async () => {
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
      const serialized = JSON.stringify(fileContents, null, 2);
      await fs.writeFile(TEST_DATA_FILE, serialized, 'utf-8');

      await storage.readAll();

      const onDisk = await fs.readFile(TEST_DATA_FILE, 'utf-8');
      expect(onDisk).toBe(serialized);
    });

    it('preserves an explicit category from disk', async () => {
      const record = {
        id: 'inv-1',
        instrument: 'AAPL',
        amount: 1,
        price: 100,
        purchaseDate: '2026-01-01',
        category: 'Stocks',
        labelIds: [],
      };
      await fs.writeFile(
        TEST_DATA_FILE,
        JSON.stringify({ investments: [record], labels: [] }, null, 2),
        'utf-8',
      );

      const portfolio = await storage.readAll();

      expect(portfolio.investments[0].category).toBe('Stocks');
    });
  });
});
