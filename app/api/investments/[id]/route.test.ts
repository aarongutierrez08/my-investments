import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE, PUT } from './route';
import { storage } from '../../../../lib/storage';
import type { Investment } from '../../../../lib/types';

vi.mock('../../../../lib/storage', () => ({
  storage: {
    deleteInvestment: vi.fn(),
    updateInvestment: vi.fn(),
  },
}));

function makeRequest(id: string): Request {
  return new Request(`http://localhost/api/investments/${id}`, {
    method: 'DELETE',
  });
}

function makePutRequest(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/investments/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('DELETE /api/investments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 204 and removes the investment on success', async () => {
    (storage.deleteInvestment as unknown as vi.Mock).mockResolvedValue(undefined);

    const response = await DELETE(makeRequest('inv-001'), makeContext('inv-001'));

    expect(response.status).toBe(204);
    expect(storage.deleteInvestment).toHaveBeenCalledTimes(1);
    expect(storage.deleteInvestment).toHaveBeenCalledWith('inv-001');
  });

  it('returns 404 when the id is unknown', async () => {
    (storage.deleteInvestment as unknown as vi.Mock).mockRejectedValue(
      new Error('Investment with id "missing" not found.'),
    );

    const response = await DELETE(makeRequest('missing'), makeContext('missing'));

    expect(response.status).toBe(404);
    expect(storage.deleteInvestment).toHaveBeenCalledWith('missing');
  });

  it('returns 500 on unexpected errors', async () => {
    (storage.deleteInvestment as unknown as vi.Mock).mockRejectedValue(
      new Error('disk on fire'),
    );

    const response = await DELETE(makeRequest('inv-001'), makeContext('inv-001'));

    expect(response.status).toBe(500);
  });
});

describe('PUT /api/investments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPayload = {
    instrument: 'AAPL',
    amount: 12,
    price: 155,
    purchaseDate: '2026-01-15',
    categoryId: 'cat-stocks',
    labelIds: ['lbl-longterm'],
    notes: 'Updated position',
  };

  it('returns 200 and the updated investment on success', async () => {
    const updated: Investment = { id: 'inv-001', ...validPayload };
    (storage.updateInvestment as unknown as vi.Mock).mockResolvedValue(updated);

    const response = await PUT(
      makePutRequest('inv-001', validPayload),
      makeContext('inv-001'),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Investment;
    expect(body).toEqual(updated);
    expect(storage.updateInvestment).toHaveBeenCalledTimes(1);
    expect(storage.updateInvestment).toHaveBeenCalledWith('inv-001', validPayload);
  });

  it('returns 404 when the id does not exist', async () => {
    (storage.updateInvestment as unknown as vi.Mock).mockResolvedValue(null);

    const response = await PUT(
      makePutRequest('missing', validPayload),
      makeContext('missing'),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 when required fields are missing', async () => {
    const payload = {
      instrument: 'AAPL',
      // amount missing
      price: 150,
      purchaseDate: '2026-01-15',
      categoryId: 'cat-stocks',
    };

    const response = await PUT(
      makePutRequest('inv-001', payload),
      makeContext('inv-001'),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(storage.updateInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when amount is not positive', async () => {
    const response = await PUT(
      makePutRequest('inv-001', { ...validPayload, amount: -1 }),
      makeContext('inv-001'),
    );

    expect(response.status).toBe(400);
    expect(storage.updateInvestment).not.toHaveBeenCalled();
  });

  it('returns 400 when the body is not valid JSON', async () => {
    const request = new Request('http://localhost/api/investments/inv-001', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const response = await PUT(request, makeContext('inv-001'));

    expect(response.status).toBe(400);
    expect(storage.updateInvestment).not.toHaveBeenCalled();
  });

  it('ignores a client-provided id in the payload', async () => {
    const updated: Investment = { id: 'inv-001', ...validPayload };
    (storage.updateInvestment as unknown as vi.Mock).mockResolvedValue(updated);

    await PUT(
      makePutRequest('inv-001', { ...validPayload, id: 'attacker-id' }),
      makeContext('inv-001'),
    );

    expect(storage.updateInvestment).toHaveBeenCalledWith('inv-001', validPayload);
  });
});
