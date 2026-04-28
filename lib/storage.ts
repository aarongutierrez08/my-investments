import { Investment, Label } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

const DEFAULT_DATA_FILE_PATH = path.join(process.cwd(), 'data', 'portfolio.json');

interface PortfolioData {
  investments: Investment[];
  labels: Label[];
}

function backfillInvestment(raw: Partial<Investment> & Record<string, unknown>): Investment {
  const investment = raw as Investment;
  if (investment.category) {
    return investment;
  }
  return { ...investment, category: 'Other' };
}

async function readAll(filePath: string = DEFAULT_DATA_FILE_PATH): Promise<PortfolioData> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
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

export const storage = {
  readAll,
};
