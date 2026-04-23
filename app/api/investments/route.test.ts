import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { storage } from '../../../lib/storage';
import type { Investment } from '../../../lib/types';

vi.mock('../../../lib/storage', () => ({
  storage: {
    addInvestment: vi.fn(),
  },
}));

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/investments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/investments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a valid investment and returns 201 with the created entity', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: '2026-01-15',
      category: 'Stocks',
      labelIds: ['lbl-longterm'],
      notes: 'Initial position',
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(201);
    const body = (await response.json()) as Investment;
    expect(body.instrument).toBe('AAPL');
    expect(body.amount).toBe(10);
    expect(body.price).toBe(150);
    expect(body.purchaseDate).toBe('2026-01-15');
    expect(body.category).toBe('Stocks');
    expect(body.labelIds).toEqual(['lbl-longterm']);
    expect(body.notes).toBe('Initial position');
    expect(body.id).toMatch(UUID_REGEX);

    expect(storage.addInvestment).toHaveBeenCalledTimes(1);
    expect(storage.addInvestment).toHaveBeenCalledWith(body);
  });

  it('creates the investment without notes when notes is omitted', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: '2026-01-15',
      category: 'Stocks',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));
    const body = (await response.json()) as Investment;

    expect(response.status).toBe(201);
    expect(body.notes).toBeUndefined();
    expect(storage.addInvestment).toHaveBeenCalledWith(
      expect.not.objectContaining({ notes: expect.anything() }),
    );
  });

  it('treats an empty-string notes as not provided', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: '2026-01-15',
      category: 'Stocks',
      labelIds: [],
      notes: '',
    };

    const response = await POST(makeRequest(payload));
    const body = (await response.json()) as Investment;

    expect(response.status).toBe(201);
    expect(body.notes).toBeUndefined();
    expect(storage.addInvestment).toHaveBeenCalledWith(
      expect.not.objectContaining({ notes: expect.anything() }),
    );
  });

  it('treats whitespace-only notes as not provided and trims meaningful notes', async () => {
    const blankResponse = await POST(
      makeRequest({
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labelIds: [],
        notes: '   \n\t  ',
      }),
    );
    const blankBody = (await blankResponse.json()) as Investment;

    expect(blankResponse.status).toBe(201);
    expect(blankBody.notes).toBeUndefined();

    const trimmedResponse = await POST(
      makeRequest({
        instrument: 'BTC',
        amount: 0.5,
        price: 60000,
        purchaseDate: '2026-02-01',
        category: 'Crypto',
        labelIds: [],
        notes: '  Bought after dip  ',
      }),
    );
    const trimmedBody = (await trimmedResponse.json()) as Investment;

    expect(trimmedResponse.status).toBe(201);
    expect(trimmedBody.notes).toBe('Bought after dip');
  });

  it('generates the id server-side and ignores any client-provided id', async () => {
    const payload = {
      id: 'malicious-client-id',
      instrument: 'BTC',
      amount: 0.5,
      price: 60000,
      purchaseDate: '2026-02-01',
      category: 'Crypto',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));
    const body = (await response.json()) as Investment;

    expect(response.status).toBe(201);
    expect(body.id).not.toBe('malicious-client-id');
    expect(body.id).toMatch(UUID_REGEX);
  });

  it('returns 400 when required fields are missing', async () => {
    const payload = {
      instrument: 'AAPL',
      // amount missing
      price: 150,
      purchaseDate: '2026-01-15',
      category: 'Stocks',
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when amount is not positive', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: -5,
      price: 150,
      purchaseDate: '2026-01-15',
      category: 'Stocks',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when price is not positive', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 5,
      price: 0,
      purchaseDate: '2026-01-15',
      category: 'Stocks',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when instrument is empty', async () => {
    const payload = {
      instrument: '',
      amount: 5,
      price: 100,
      purchaseDate: '2026-01-15',
      category: 'Stocks',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when purchaseDate is missing', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      category: 'Stocks',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/purchaseDate/i);
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when purchaseDate is not a valid ISO date', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: 'not-a-date',
      category: 'Stocks',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/purchaseDate/i);
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when purchaseDate is not in YYYY-MM-DD format', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: '15/01/2026',
      category: 'Stocks',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when category is missing', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 5,
      price: 100,
      purchaseDate: '2026-01-15',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when category is not in CATEGORIES', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 5,
      price: 100,
      purchaseDate: '2026-01-15',
      category: 'NotARealCategory',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when the body is not valid JSON', async () => {
    const request = new Request('http://localhost/api/investments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(storage.addInvestment).not.toHaveBeenCalled();
  });

  it('defaults labelIds to an empty array when omitted', async () => {
    const payload = {
      instrument: 'AAPL',
      amount: 10,
      price: 150,
      purchaseDate: '2026-01-15',
      category: 'Stocks',
    };

    const response = await POST(makeRequest(payload));
    const body = (await response.json()) as Investment;

    expect(response.status).toBe(201);
    expect(body.labelIds).toEqual([]);
  });

  describe('custom labels (free-text)', () => {
    it('persists the provided labels on the created investment', async () => {
      const payload = {
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labels: ['long-term', 'tech'],
      };

      const response = await POST(makeRequest(payload));
      const body = (await response.json()) as Investment;

      expect(response.status).toBe(201);
      expect(body.labels).toEqual(['long-term', 'tech']);
      expect(storage.addInvestment).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['long-term', 'tech'] }),
      );
    });

    it('defaults labels to an empty array when omitted', async () => {
      const payload = {
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
      };

      const response = await POST(makeRequest(payload));
      const body = (await response.json()) as Investment;

      expect(response.status).toBe(201);
      expect(body.labels).toEqual([]);
    });

    it('returns 400 when labels is not an array', async () => {
      const payload = {
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labels: 'not-an-array',
      };

      const response = await POST(makeRequest(payload));

      expect(response.status).toBe(400);
      expect(storage.addInvestment).not.toHaveBeenCalled();
    });

    it('returns 400 when labels is an array but contains non-strings', async () => {
      const payload = {
        instrument: 'AAPL',
        amount: 10,
        price: 150,
        purchaseDate: '2026-01-15',
        category: 'Stocks',
        labels: ['ok', 42],
      };

      const response = await POST(makeRequest(payload));

      expect(response.status).toBe(400);
      expect(storage.addInvestment).not.toHaveBeenCalled();
    });

    it('trims whitespace and drops case-insensitive duplicates', async () => {
      const payload = {
        instrument: 'BTC',
        amount: 0.1,
        price: 60000,
        purchaseDate: '2026-02-01',
        category: 'Crypto',
        labels: ['crypto', 'CRYPTO', '  crypto  ', 'long-term'],
      };

      const response = await POST(makeRequest(payload));
      const body = (await response.json()) as Investment;

      expect(response.status).toBe(201);
      expect(body.labels).toEqual(['crypto', 'long-term']);
    });
  });
});
