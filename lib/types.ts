// lib/types.ts

export interface Investment {
  id: string; // uuid
  instrument: string; // e.g., "AAPL" or "BTC"
  amount: number; // how many units
  price: number; // price per unit at purchase
  purchaseDate: string; // ISO date string
  categoryId: string; // reference to Category.id
  labelIds: string[]; // array of references to Label.id
  notes?: string; // optional string
}

export interface Category {
  id: string; // uuid
  name: string; // e.g., "Stocks", "Crypto", "Bonds"
  color: string; // hex string
}

export interface Label {
  id: string; // uuid
  name: string; // e.g., "long-term", "high-risk"
  color: string; // hex string
}

export interface Portfolio {
  investments: Investment[];
  categories: Category[];
  labels: Label[];
}