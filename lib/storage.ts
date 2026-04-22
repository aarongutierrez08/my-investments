// lib/storage.ts
import { Investment, Category, Label, Portfolio } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Made mutable for testing purposes. In a real app, this would likely be a constant
// or passed via dependency injection.
let currentDataFilePath = path.join(process.cwd(), 'data', 'portfolio.json');

// For testing purposes, allow setting a different data file path
export function _setTestDataFilePath(filePath: string) {
  currentDataFilePath = filePath;
}

interface PortfolioData {
  investments: Investment[];
  categories: Category[];
  labels: Label[];
}

// Helper function to ensure the data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(currentDataFilePath);
  await fs.mkdir(dataDir, { recursive: true });
}

async function _readAll(): Promise<PortfolioData> {
  try {
    const data = await fs.readFile(currentDataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return an empty portfolio
      return { investments: [], categories: [], labels: [] };
    }
    throw error;
  }
}

async function _writeAll(data: PortfolioData): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(currentDataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function addInvestment(investment: Investment): Promise<void> {
  const portfolio = await _readAll();
  portfolio.investments.push(investment);
  await _writeAll(portfolio);
}

async function updateInvestment(id: string, patch: Partial<Investment>): Promise<Investment | null> {
  const portfolio = await _readAll();
  const index = portfolio.investments.findIndex(inv => inv.id === id);
  if (index === -1) {
    return null;
  }
  const { id: _ignoredId, ...safePatch } = patch;
  const updated: Investment = { ...portfolio.investments[index], ...safePatch, id };
  portfolio.investments[index] = updated;
  await _writeAll(portfolio);
  return updated;
}

async function removeInvestment(id: string): Promise<void> {
  const portfolio = await _readAll();
  portfolio.investments = portfolio.investments.filter(inv => inv.id !== id);
  await _writeAll(portfolio);
}

async function deleteInvestment(id: string): Promise<void> {
  const portfolio = await _readAll();
  const index = portfolio.investments.findIndex(inv => inv.id === id);
  if (index === -1) {
    throw new Error(`Investment with id "${id}" not found.`);
  }
  portfolio.investments.splice(index, 1);
  await _writeAll(portfolio);
}

async function addCategory(category: Category): Promise<void> {
  const portfolio = await _readAll();
  portfolio.categories.push(category);
  await _writeAll(portfolio);
}

async function removeCategory(id: string): Promise<void> {
  const portfolio = await _readAll();
  const categoryInUse = portfolio.investments.some(inv => inv.categoryId === id);
  if (categoryInUse) {
    throw new Error('Category is in use by investments and cannot be removed.');
  }
  portfolio.categories = portfolio.categories.filter(cat => cat.id !== id);
  await _writeAll(portfolio);
}

async function addLabel(label: Label): Promise<void> {
  const portfolio = await _readAll();
  portfolio.labels.push(label);
  await _writeAll(portfolio);
}

async function removeLabel(id: string): Promise<void> {
  const portfolio = await _readAll();
  // Remove the label from the labels array
  portfolio.labels = portfolio.labels.filter(lbl => lbl.id !== id);

  // Strip the label ID from all investments
  portfolio.investments = portfolio.investments.map(inv => ({
    ...inv,
    labelIds: inv.labelIds.filter(labelId => labelId !== id),
  }));

  await _writeAll(portfolio);
}

export const storage = {
  readAll: _readAll,
  addInvestment: addInvestment,
  updateInvestment: updateInvestment,
  removeInvestment: removeInvestment,
  deleteInvestment: deleteInvestment,
  addCategory: addCategory,
  removeCategory: removeCategory,
  addLabel: addLabel,
  removeLabel: removeLabel, // Export removeLabel
};
