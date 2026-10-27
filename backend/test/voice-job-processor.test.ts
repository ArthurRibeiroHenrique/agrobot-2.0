import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExtractedActivity, Extraction } from '../src/schemas/activity.schema';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const JOB_ID = '22222222-2222-4222-8222-222222222222';

const mocks = vi.hoisted(() => ({
  findVoiceJobById: vi.fn(),
  updateVoiceJob: vi.fn(),
  transcribeAudio: vi.fn(),
  extractActivityFromTranscript: vi.fn(),
  listFields: vi.fn(),
  askFromVoice: vi.fn()
}));

vi.mock('../src/services/voice-job.service', () => ({
  findVoiceJobById: mocks.findVoiceJobById,
  updateVoiceJob: mocks.updateVoiceJob
}));

vi.mock('../src/services/transcription.service', () => ({
  transcribeAudio: mocks.transcribeAudio
}));

vi.mock('../src/services/extraction.service', () => ({
  extractActivityFromTranscript: mocks.extractActivityFromTranscript
}));

vi.mock('../src/services/farm.service', () => ({
  listFields: mocks.listFields
}));

vi.mock('../src/services/assistant.service', () => ({
  askFromVoice: mocks.askFromVoice
}));

import { processVoiceJob } from '../src/services/voice-job-processor';

const ANSWER = {
  message_id: 'm1',
  question: 'Quando posso colher o Talhão 2?',
  answer: 'Confira a carência na bula.',
  needs_technician: true,
  reason: 'carencia_ou_seguranca'
};

const APLICACAO: ExtractedActivity = {
  activity_type: 'aplicacao',
  product: 'glifosato',
  quantity: 20,
  unit: 'L',
  field_name: 'Talhão 2',
  occurred_at: '2026-10-24',
  cost: null,
  currency: null
};

function extraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    intent: 'registro',
    question: null,
    activities: [APLICACAO],
    confidence: 0.9,
    ...overrides
  };
}

// Último update é o que define o resultado do processamento.
function finalUpdate() {
  return mocks.updateVoiceJob.mock.calls.at(-1)?.[1];
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findVoiceJobById.mockResolvedValue({
    id: JOB_ID,
    user_id: USER_ID,
    status: 'queued',
    audio_path: `${USER_ID}/a.m4a`,
    attempts: 0,
    metadata: { timezone: 'America/Sao_Paulo' }
  });
  mocks.updateVoiceJob.mockResolvedValue(null);
  mocks.transcribeAudio.mockResolvedValue('fala do produtor');
  mocks.listFields.mockResolvedValue([{ id: 'f2', name: 'Talhão 2', crop: 'milho' }]);
  mocks.askFromVoice.mockResolvedValue(ANSWER);
});

describe('processVoiceJob por intenção', () => {
  it('registro: monta o rascunho sem chamar o assistente', async () => {
    mocks.extractActivityFromTranscript.mockResolvedValue(extraction());

    await processVoiceJob(JOB_ID, { isLastAttempt: false });

    expect(mocks.askFromVoice).not.toHaveBeenCalled();
    expect(finalUpdate()).toMatchObject({
      status: 'needs_confirmation',
      intent: 'registro',
      answer: null,
      draft: expect.objectContaining({ product: 'glifosato', field_id: 'f2' })
    });
  });

  it('pergunta: responde e já marca como respondida', async () => {
    mocks.extractActivityFromTranscript.mockResolvedValue(
      extraction({
        intent: 'pergunta',
        question: 'Quando posso colher o Talhão 2?',
        activities: []
      })
    );

    await processVoiceJob(JOB_ID, { isLastAttempt: false });

    expect(mocks.askFromVoice).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        voiceJobId: JOB_ID,
        question: 'Quando posso colher o Talhão 2?',
        pendingReport: null
      })
    );
    expect(finalUpdate()).toMatchObject({
      status: 'answered',
      intent: 'pergunta',
      answer: ANSWER
    });
  });

  it('ambos: monta o rascunho e responde com a fala como contexto', async () => {
    mocks.extractActivityFromTranscript.mockResolvedValue(
      extraction({ intent: 'ambos', question: 'Quando posso colher o Talhão 2?' })
    );

    await processVoiceJob(JOB_ID, { isLastAttempt: false });

    expect(mocks.askFromVoice).toHaveBeenCalledWith(
      expect.objectContaining({ pendingReport: 'fala do produtor' })
    );
    expect(finalUpdate()).toMatchObject({
      status: 'needs_confirmation',
      intent: 'ambos',
      answer: ANSWER,
      draft: expect.objectContaining({ product: 'glifosato' })
    });
  });

  it('vários talhões: guarda um rascunho por talhão e o primeiro em draft', async () => {
    mocks.listFields.mockResolvedValue([
      { id: 'f1', name: 'Talhão 1', crop: 'soja' },
      { id: 'f2', name: 'Talhão 2', crop: 'milho' }
    ]);
    mocks.extractActivityFromTranscript.mockResolvedValue(
      extraction({
        activities: [
          { ...APLICACAO, field_name: 'Talhão 1' },
          { ...APLICACAO, field_name: 'Talhão 2' }
        ]
      })
    );

    await processVoiceJob(JOB_ID, { isLastAttempt: false });

    const update = finalUpdate();

    expect(update.drafts.map((draft: { field_id: string }) => draft.field_id)).toEqual([
      'f1',
      'f2'
    ]);
    expect(update.draft).toEqual(update.drafts[0]);
  });

  it('incerto: deixa o produtor escolher, sem responder', async () => {
    mocks.extractActivityFromTranscript.mockResolvedValue(
      extraction({ intent: 'incerto' })
    );

    await processVoiceJob(JOB_ID, { isLastAttempt: false });

    expect(mocks.askFromVoice).not.toHaveBeenCalled();
    expect(finalUpdate()).toMatchObject({ status: 'needs_confirmation', intent: 'incerto' });
  });

  it('passa os nomes dos talhões para a transcrição', async () => {
    mocks.extractActivityFromTranscript.mockResolvedValue(extraction());

    await processVoiceJob(JOB_ID, { isLastAttempt: false });

    expect(mocks.transcribeAudio).toHaveBeenCalledWith(`${USER_ID}/a.m4a`, ['Talhão 2']);
  });

  it('pergunta sem a versão reescrita usa a transcrição', async () => {
    mocks.extractActivityFromTranscript.mockResolvedValue(
      extraction({ intent: 'pergunta', question: null })
    );

    await processVoiceJob(JOB_ID, { isLastAttempt: false });

    expect(mocks.askFromVoice).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'fala do produtor' })
    );
  });

  it('falha do assistente volta para a fila', async () => {
    mocks.extractActivityFromTranscript.mockResolvedValue(
      extraction({ intent: 'pergunta', question: 'Oi?' })
    );
    mocks.askFromVoice.mockRejectedValue(new Error('timeout'));

    await expect(processVoiceJob(JOB_ID, { isLastAttempt: false })).rejects.toThrow('timeout');
    expect(finalUpdate()).toMatchObject({ status: 'queued', error: 'timeout' });
  });
});
