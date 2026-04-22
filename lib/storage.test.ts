// lib/storage.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { storage, _setTestDataFilePath } from './storage';
import { Investment, Portfolio, Category, Label } from './types';
import { v4 as uuidv4 } from 'uuid';

// Define a temporary directory for test data
const TEST_DATA_DIR = path.join(__dirname, '..', 'data_test');
const TEST_DATA_FILE = path.join(TEST_DATA_DIR, 'portfolio.json');

describe('Storage Module', () => {
  beforeEach(async () => {
    // Set the test data file path before each test
    _setTestDataFilePath(TEST_DATA_FILE);
    // Ensure test data directory exists before each test
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    // Initialize the test file with an empty portfolio
    await fs.writeFile(TEST_DATA_FILE, JSON.stringify({ investments: [], categories: [], labels: [] }, null, 2), 'utf-8');
  });

  afterEach(async () => {
    // Clean up the test data directory after each test
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  // AC-003: readAll() from empty file
  it('should return an empty portfolio if the data file does not exist', async () => {
    await fs.unlink(TEST_DATA_FILE); // Manually remove the file to simulate it not existing
    const portfolio = await storage.readAll();
    expect(portfolio).toEqual({ investments: [], categories: [], labels: [] });
  });

  // AC-002: addInvestment and AC-003: readAll
  it('should add an investment and retrieve it', async () => {
    const newInvestment: Investment = {
      id: uuidv4(),
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
      labelIds: [uuidv4()],
      notes: 'Initial purchase',
    };

    await storage.addInvestment(newInvestment);

    const portfolio = await storage.readAll();
    expect(portfolio.investments).toHaveLength(1);
    expect(portfolio.investments[0]).toEqual(newInvestment);
  });

  // AC-004: updateInvestment
  it('should update an existing investment', async () => {
    const initialInvestment: Investment = {
      id: uuidv4(),
      instrument: 'GOOG',
      amount: 5,
      price: 100,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
      labelIds: [],
      notes: 'Initial GOOG purchase',
    };
    await storage.addInvestment(initialInvestment);

    const patch = { price: 105, notes: 'Updated GOOG notes' };
    await storage.updateInvestment(initialInvestment.id, patch);

    const portfolio = await storage.readAll();
    const updatedInvestment = portfolio.investments.find(inv => inv.id === initialInvestment.id);

    expect(updatedInvestment).toBeDefined();
    expect(updatedInvestment?.price).toBe(105);
    expect(updatedInvestment?.notes).toBe('Updated GOOG notes');
    expect(updatedInvestment?.instrument).toBe('GOOG'); // Ensure other fields are unchanged
  });

  // AC-005: removeInvestment
  it('should remove an investment', async () => {
    const investmentToRemove: Investment = {
      id: uuidv4(),
      instrument: 'TSLA',
      amount: 1,
      price: 800,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
      labelIds: [],
      notes: 'Investment to be removed',
    };
    const investmentToKeep: Investment = {
      id: uuidv4(),
      instrument: 'AMZN',
      amount: 2,
      price: 3000,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
      labelIds: [],
      notes: 'Investment to keep',
    };

    await storage.addInvestment(investmentToRemove);
    await storage.addInvestment(investmentToKeep);

    await storage.removeInvestment(investmentToRemove.id);

    const portfolio = await storage.readAll();
    expect(portfolio.investments).toHaveLength(1);
    expect(portfolio.investments[0]).toEqual(investmentToKeep);
    expect(portfolio.investments.find(inv => inv.id === investmentToRemove.id)).toBeUndefined();
  });

  it('deleteInvestment removes the matching investment and persists the new list', async () => {
    const investmentToDelete: Investment = {
      id: uuidv4(),
      instrument: 'NFLX',
      amount: 3,
      price: 500,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
      labelIds: [],
      notes: 'To be deleted',
    };
    const investmentToKeep: Investment = {
      id: uuidv4(),
      instrument: 'GOOG',
      amount: 4,
      price: 120,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
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
      categoryId: uuidv4(),
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
      categoryId: uuidv4(),
      labelIds: [],
    };
    const b: Investment = {
      id: uuidv4(),
      instrument: 'B',
      amount: 2,
      price: 2,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
      labelIds: [],
    };
    const c: Investment = {
      id: uuidv4(),
      instrument: 'C',
      amount: 3,
      price: 3,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
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

  // AC-006: addCategory
  it('should add a category and retrieve it', async () => {
    const newCategory: Category = {
      id: uuidv4(),
      name: 'Stocks',
      color: '#FF0000',
    };

    await storage.addCategory(newCategory);

    const portfolio = await storage.readAll();
    expect(portfolio.categories).toHaveLength(1);
    expect(portfolio.categories[0]).toEqual(newCategory);
  });

  // AC-007: removeCategory (successful)
  it('should remove a category if it is not linked to any investment', async () => {
    const categoryToRemove: Category = {
      id: uuidv4(),
      name: 'Bonds',
      color: '#0000FF',
    };
    const categoryToKeep: Category = {
      id: uuidv4(),
      name: 'Crypto',
      color: '#CCCCCC',
    };

    await storage.addCategory(categoryToRemove);
    await storage.addCategory(categoryToKeep);

    await storage.removeCategory(categoryToRemove.id);

    const portfolio = await storage.readAll();
    expect(portfolio.categories).toHaveLength(1);
    expect(portfolio.categories[0]).toEqual(categoryToKeep);
    expect(portfolio.categories.find(cat => cat.id === categoryToRemove.id)).toBeUndefined();
  });

  // AC-008: removeCategory (failure if in use)
  it('should fail to remove a category if it is linked to an investment', async () => {
    const categoryInUse: Category = {
      id: uuidv4(),
      name: 'Stocks',
      color: '#FF0000',
    };
    await storage.addCategory(categoryInUse);

    const investment: Investment = {
      id: uuidv4(),
      instrument: 'MSFT',
      amount: 10,
      price: 200,
      purchaseDate: new Date().toISOString(),
      categoryId: categoryInUse.id, // Linked to the category
      labelIds: [],
      notes: 'Investment using category',
    };
    await storage.addInvestment(investment);

    await expect(storage.removeCategory(categoryInUse.id)).rejects.toThrow('Category is in use by investments and cannot be removed.');

    const portfolio = await storage.readAll();
    expect(portfolio.categories).toHaveLength(1);
    expect(portfolio.categories[0]).toEqual(categoryInUse); // Ensure category is still there
  });

  // AC-009: addLabel
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

  // AC-010: removeLabel (strips from investments)
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
      categoryId: uuidv4(),
      labelIds: [labelToRemove.id, labelToKeep.id], // References both
      notes: 'Crypto investment',
    };
    const investment2: Investment = {
      id: uuidv4(),
      instrument: 'ETH',
      amount: 5,
      price: 3000,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
      labelIds: [labelToRemove.id], // References only labelToRemove
      notes: 'Another crypto investment',
    };
    const investment3: Investment = {
      id: uuidv4(),
      instrument: 'SPY',
      amount: 10,
      price: 400,
      purchaseDate: new Date().toISOString(),
      categoryId: uuidv4(),
      labelIds: [], // References no labels
      notes: 'ETF investment',
    };
    await storage.addInvestment(investment1);
    await storage.addInvestment(investment2);
    await storage.addInvestment(investment3);

    // This call will fail until removeLabel is implemented
    await storage.removeLabel(labelToRemove.id);

    const portfolio = await storage.readAll();

    // Assert label is removed
    expect(portfolio.labels).toHaveLength(1);
    expect(portfolio.labels[0]).toEqual(labelToKeep);
    expect(portfolio.labels.find(lbl => lbl.id === labelToRemove.id)).toBeUndefined();

    // Assert label is stripped from investments
    const updatedInvestment1 = portfolio.investments.find(inv => inv.id === investment1.id);
    expect(updatedInvestment1?.labelIds).toEqual([labelToKeep.id]);

    const updatedInvestment2 = portfolio.investments.find(inv => inv.id === investment2.id);
    expect(updatedInvestment2?.labelIds).toEqual([]); // Should be empty

    const updatedInvestment3 = portfolio.investments.find(inv => inv.id === investment3.id);
    expect(updatedInvestment3?.labelIds).toEqual([]); // Should remain empty
  });
});
