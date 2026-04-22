// lib/storage.ts
import { Investment, Label } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

let currentDataFilePath = path.join(process.cwd(), 'data', 'portfolio.json');

export function _setTestDataFilePath(filePath: string) {
  currentDataFilePath = filePath;
}

interface PortfolioData {
  investments: Investment[];
  labels: Label[];
}

async function ensureDataDirectory() {
  const dataDir = path.dirname(currentDataFilePath);
  await fs.mkdir(dataDir, { recursive: true });
}

function backfillInvestment(raw: Partial<Investment> & Record<string, unknown>): Investment {
  if (raw.category) {
    return raw as Investment;
  }
  return { ...(raw as Investment), category: 'Other' };
}

async function _readAll(): Promise<PortfolioData> {
  try {
    const data = await fs.readFile(currentDataFilePath, 'utf-8');
    const parsed = JSON.parse(data) as {
      investments?: Array<Partial<Investment> & Record<string, unknown>>;
      labels?: Label[];
    };
    return {
      investments: (parsed.investments ?? []).map(backfillInvestment),
      labels: parsed.labels ?? [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { investments: [], labels: [] };
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

async function updateInvestment(
  id: string,
  patch: Partial<Investment>,
): Promise<Investment | null> {
  const portfolio = await _readAll();
  const index = portfolio.investments.findIndex((inv) => inv.id === id);
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
  portfolio.investments = portfolio.investments.filter((inv) => inv.id !== id);
  await _writeAll(portfolio);
}

async function deleteInvestment(id: string): Promise<void> {
  const portfolio = await _readAll();
  const index = portfolio.investments.findIndex((inv) => inv.id === id);
  if (index === -1) {
    throw new Error(`Investment with id "${id}" not found.`);
  }
  portfolio.investments.splice(index, 1);
  await _writeAll(portfolio);
}

async function addLabel(label: Label): Promise<void> {
  const portfolio = await _readAll();
  portfolio.labels.push(label);
  await _writeAll(portfolio);
}

async function removeLabel(id: string): Promise<void> {
  const portfolio = await _readAll();
  portfolio.labels = portfolio.labels.filter((lbl) => lbl.id !== id);
  portfolio.investments = portfolio.investments.map((inv) => ({
    ...inv,
    labelIds: inv.labelIds.filter((labelId) => labelId !== id),
  }));
  await _writeAll(portfolio);
}

export const storage = {
  readAll: _readAll,
  addInvestment,
  updateInvestment,
  removeInvestment,
  deleteInvestment,
  addLabel,
  removeLabel,
};
