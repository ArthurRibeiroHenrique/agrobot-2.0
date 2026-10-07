import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const JOB_ID = '22222222-2222-4222-8222-222222222222';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  enqueueVoiceJob: vi.fn(),
  uploadAudio: vi.fn(),
  removeAudio: vi.fn(),
  createVoiceJob: vi.fn(),
  findVoiceJobByClientId: vi.fn(),
  getVoiceJob: vi.fn(),
  confirmVoiceJob: vi.fn(),
  listActivities: vi.fn()
}));

vi.mock('../src/lib/supabase', () => ({
  supabaseAdmin: { auth: { getUser: mocks.getUser } }
}));

vi.mock('../src/jobs/queue', () => ({
  enqueueVoiceJob: mocks.enqueueVoiceJob
}));

vi.mock('../src/services/storage.service', () => ({
  uploadAudio: mocks.uploadAudio,
  removeAudio: mocks.removeAudio
}));

vi.mock('../src/services/voice-job.service', () => ({
  createVoiceJob: mocks.createVoiceJob,
  findVoiceJobByClientId: mocks.findVoiceJobByClientId,
  getVoiceJob: mocks.getVoiceJob,
  confirmVoiceJob: mocks.confirmVoiceJob,
  listActivities: mocks.listActivities
}));

import { createApp } from '../src/app';

const app = createApp();
const auth = { Authorization: 'Bearer token-valido' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
});

describe('health', () => {
  it('responde sem autenticação', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('autenticação', () => {
  it('recusa requisição sem token', async () => {
    const res = await request(app).get('/v1/activities');

    expect(res.status).toBe(401);
    expect(mocks.listActivities).not.toHaveBeenCalled();
  });

  it('recusa token inválido', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });

    const res = await request(app).get('/v1/activities').set(auth);

    expect(res.status).toBe(401);
  });

  it('lista apenas as atividades do usuário do token', async () => {
    mocks.listActivities.mockResolvedValue([]);

    const res = await request(app).get('/v1/activities').set(auth);

    expect(res.status).toBe(200);
    expect(mocks.listActivities).toHaveBeenCalledWith(USER_ID);
  });
});

describe('POST /v1/voice-jobs', () => {
  it('retorna 400 sem arquivo de áudio', async () => {
    const res = await request(app).post('/v1/voice-jobs').set(auth);

    expect(res.status).toBe(400);
    expect(mocks.uploadAudio).not.toHaveBeenCalled();
  });

  it('salva o áudio, cria o registro e enfileira', async () => {
    mocks.uploadAudio.mockResolvedValue(`${USER_ID}/audio.m4a`);
    mocks.createVoiceJob.mockResolvedValue({
      job: { id: JOB_ID, status: 'queued' },
      duplicated: false,
      error: null
    });

    const res = await request(app)
      .post('/v1/voice-jobs')
      .set(auth)
      .attach('audio', Buffer.from('audio'), 'fala.m4a');

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ id: JOB_ID, status: 'queued' });
    expect(mocks.createVoiceJob).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, audioPath: `${USER_ID}/audio.m4a` })
    );
    expect(mocks.enqueueVoiceJob).toHaveBeenCalledWith(JOB_ID);
  });

  it('não duplica quando o mesmo client_id é reenviado', async () => {
    const clientId = '33333333-3333-4333-8333-333333333333';
    mocks.findVoiceJobByClientId.mockResolvedValue({ id: JOB_ID, status: 'extracting' });

    const res = await request(app)
      .post('/v1/voice-jobs')
      .set(auth)
      .field('client_id', clientId)
      .attach('audio', Buffer.from('audio'), 'fala.m4a');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(JOB_ID);
    expect(mocks.uploadAudio).not.toHaveBeenCalled();
    expect(mocks.enqueueVoiceJob).not.toHaveBeenCalled();
  });
});

describe('GET /v1/voice-jobs/:id', () => {
  it('retorna 404 para registro de outro usuário', async () => {
    mocks.getVoiceJob.mockResolvedValue(null);

    const res = await request(app).get(`/v1/voice-jobs/${JOB_ID}`).set(auth);

    expect(res.status).toBe(404);
    expect(mocks.getVoiceJob).toHaveBeenCalledWith(JOB_ID, USER_ID);
  });

  it('retorna 404 para id fora do formato', async () => {
    const res = await request(app).get('/v1/voice-jobs/abc').set(auth);

    expect(res.status).toBe(404);
    expect(mocks.getVoiceJob).not.toHaveBeenCalled();
  });
});

describe('erros', () => {
  it('não expõe detalhes internos em erro 500', async () => {
    mocks.listActivities.mockRejectedValue(new Error('senha do banco: 123'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/v1/activities').set(auth);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('senha');
  });
});
