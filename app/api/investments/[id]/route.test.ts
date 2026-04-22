import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from './route';
import { storage } from '../../../../lib/storage';

vi.mock('../../../../lib/storage', () => ({
  storage: {
    deleteInvestment: vi.fn(),
  },
}));

function makeRequest(id: string): Request {
  return new Request(`http://localhost/api/investments/${id}`, {
    method: 'DELETE',
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
