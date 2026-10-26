import { describe, expect, it } from 'vitest';

import { AssistantAnswer } from '../src/schemas/assistant.schema';
import {
  applySafetyRules,
  buildAssistantPrompt
} from '../src/services/assistant.service';

function answer(overrides: Partial<AssistantAnswer> = {}): AssistantAnswer {
  return {
    answer: 'Você aplicou ureia no Talhão 2 em 06/10.',
    needs_technician: false,
    reason: 'nenhum',
    confidence: 0.9,
    ...overrides
  };
}

describe('applySafetyRules', () => {
  it('mantém resposta segura e confiante sem encaminhar', () => {
    const reply = applySafetyRules(answer());

    expect(reply.needs_technician).toBe(false);
    expect(reply.reason).toBe('nenhum');
  });

  it('respeita quando a IA pede o técnico', () => {
    const reply = applySafetyRules(
      answer({ needs_technician: true, reason: 'informacao_insuficiente' })
    );

    expect(reply.needs_technician).toBe(true);
  });

  it.each([
    'diagnostico_praga_doenca',
    'dose_ou_mistura_de_defensivo',
    'carencia_ou_seguranca'
  ] as const)('sempre encaminha assunto sensível (%s), mesmo que a IA não peça', (reason) => {
    const reply = applySafetyRules(answer({ reason, needs_technician: false }));

    expect(reply.needs_technician).toBe(true);
    expect(reply.reason).toBe(reason);
  });

  it('encaminha quando a confiança é baixa e explica o motivo', () => {
    const reply = applySafetyRules(answer({ confidence: 0.4 }));

    expect(reply.needs_technician).toBe(true);
    expect(reply.reason).toBe('informacao_insuficiente');
  });

  it('não encaminha pergunta fora do assunto só por incerteza', () => {
    const reply = applySafetyRules(answer({ reason: 'fora_do_escopo', confidence: 0.3 }));

    expect(reply.needs_technician).toBe(false);
  });

  it('limita a confiança entre 0 e 1 e nunca devolve resposta vazia', () => {
    const reply = applySafetyRules(answer({ answer: '   ', confidence: 1.7 }));

    expect(reply.confidence).toBe(1);
    expect(reply.answer).not.toBe('');
  });
});

describe('buildAssistantPrompt', () => {
  it('inclui talhões, histórico e a atividade ainda não salva', () => {
    const prompt = buildAssistantPrompt({
      today: '2026-10-24',
      fields: [{ id: 'f2', name: 'Talhão 2', crop: 'milho' }],
      activities: [
        {
          activity_type: 'adubacao',
          product: 'ureia',
          quantity: 200,
          unit: 'kg',
          field_name: 'Talhão 2',
          occurred_at: '2026-10-06',
          cost: null
        }
      ],
      pendingReport: 'Apliquei glifosato hoje no talhão 2'
    });

    expect(prompt).toContain('2026-10-24');
    expect(prompt).toContain('- Talhão 2 (milho)');
    expect(prompt).toContain('- 2026-10-06, adubacao, ureia, 200 kg, Talhão 2');
    expect(prompt).toContain('Apliquei glifosato hoje no talhão 2');
  });

  it('inclui o local da propriedade quando cadastrado', () => {
    const base = { today: '2026-10-24', fields: [], activities: [] };

    expect(buildAssistantPrompt({ ...base, location: 'Chapecó - SC' })).toContain(
      'Local da propriedade: Chapecó - SC.'
    );
    expect(buildAssistantPrompt(base)).toContain('Local da propriedade: não informado.');
  });
});
