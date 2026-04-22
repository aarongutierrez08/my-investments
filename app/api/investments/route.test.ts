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
      categoryId: 'cat-stocks',
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
    expect(body.categoryId).toBe('cat-stocks');
    expect(body.labelIds).toEqual(['lbl-longterm']);
    expect(body.notes).toBe('Initial position');
    expect(body.id).toMatch(UUID_REGEX);

    expect(storage.addInvestment).toHaveBeenCalledTimes(1);
    expect(storage.addInvestment).toHaveBeenCalledWith(body);
  });

  it('generates the id server-side and ignores any client-provided id', async () => {
    const payload = {
      id: 'malicious-client-id',
      instrument: 'BTC',
      amount: 0.5,
      price: 60000,
      purchaseDate: '2026-02-01',
      categoryId: 'cat-crypto',
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
      categoryId: 'cat-stocks',
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
      categoryId: 'cat-stocks',
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
      categoryId: 'cat-stocks',
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
      categoryId: 'cat-stocks',
      labelIds: [],
    };

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
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
      categoryId: 'cat-stocks',
    };

    const response = await POST(makeRequest(payload));
    const body = (await response.json()) as Investment;

    expect(response.status).toBe(201);
    expect(body.labelIds).toEqual([]);
  });
});
