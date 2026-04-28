// lib/types.ts

export const CATEGORIES = [
  'Stocks',
  'Crypto',
  'Real Estate',
  'Bonds',
  'Cash',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Investment {
  id: string; // uuid
  instrument: string; // e.g., "AAPL" or "BTC"
  amount: number; // how many units
  price: number; // price per unit at purchase
  purchaseDate: string; // ISO date string
  category: Category;
  labelIds: string[]; // array of references to Label.id
  labels: string[]; // free-text custom tags
  notes?: string; // optional string
}

export interface Label {
  id: string; // uuid
  name: string; // e.g., "long-term", "high-risk"
  color: string; // hex string
}

export interface Portfolio {
  investments: Investment[];
  labels: Label[];
}
