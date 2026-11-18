import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ID = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  remove: vi.fn(),
  deleteUser: vi.fn()
}));

vi.mock('../src/lib/supabase', () => ({
  supabaseAdmin: {
    storage: { from: () => ({ list: mocks.list, remove: mocks.remove }) },
    auth: { admin: { deleteUser: mocks.deleteUser } }
  }
}));

import { deleteAccount } from '../src/services/account.service';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.remove.mockResolvedValue({ error: null });
  mocks.deleteUser.mockResolvedValue({ error: null });
});

describe('deleteAccount', () => {
  it('apaga os áudios que sobraram e depois o usuário', async () => {
    mocks.list
      .mockResolvedValueOnce({ data: [{ name: 'a.m4a' }, { name: 'b.m4a' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await deleteAccount(USER_ID);

    expect(mocks.list).toHaveBeenCalledWith(USER_ID, { limit: 100 });
    expect(mocks.remove).toHaveBeenCalledWith([`${USER_ID}/a.m4a`, `${USER_ID}/b.m4a`]);
    expect(mocks.deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it('apaga o usuário mesmo sem áudios guardados', async () => {
    mocks.list.mockResolvedValue({ data: [], error: null });

    await deleteAccount(USER_ID);

    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it('não apaga o usuário se os áudios não saírem, para dar para tentar de novo', async () => {
    mocks.list.mockResolvedValue({ data: [{ name: 'a.m4a' }], error: null });
    mocks.remove.mockResolvedValue({ error: new Error('storage fora do ar') });

    await expect(deleteAccount(USER_ID)).rejects.toThrow('storage fora do ar');
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('repassa o erro do Supabase Auth', async () => {
    mocks.list.mockResolvedValue({ data: [], error: null });
    mocks.deleteUser.mockResolvedValue({ error: new Error('usuário não encontrado') });

    await expect(deleteAccount(USER_ID)).rejects.toThrow('usuário não encontrado');
  });
});
