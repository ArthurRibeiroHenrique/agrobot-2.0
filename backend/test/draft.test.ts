import { describe, expect, it } from 'vitest';

import { compareCase, summarize } from '../eval/compare';
import { Extraction } from '../src/schemas/activity.schema';
import {
  buildDraft,
  matchField,
  normalizeUnit,
  todayInTimezone
} from '../src/services/draft.service';

const FIELDS = [
  { id: 'f1', name: 'Talhão 1', crop: 'soja' },
  { id: 'f2', name: 'Talhão 2', crop: 'milho' },
  { id: 'f3', name: 'Baixada', crop: null }
];

const TODAY = '2026-10-07';

function extraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    intent: 'registro',
    question: null,
    activity_type: 'aplicacao',
    product: 'glifosato',
    quantity: 20,
    unit: 'litros',
    field_name: 'talhão dois',
    occurred_at: '2026-10-06',
    cost: null,
    currency: null,
    confidence: 0.9,
    ...overrides
  };
}

function draftFor(overrides: Partial<Extraction> = {}, preselectedFieldId?: string) {
  return buildDraft(extraction(overrides), {
    transcript: 'fala',
    fields: FIELDS,
    today: TODAY,
    preselectedFieldId
  });
}

describe('normalizeUnit', () => {
  it('converte nomes falados para a unidade padrão', () => {
    expect(normalizeUnit('litros')).toBe('L');
    expect(normalizeUnit('Quilos')).toBe('kg');
    expect(normalizeUnit('sacas')).toBe('sc');
    expect(normalizeUnit('ML')).toBe('mL');
  });

  it('mantém unidade desconhecida', () => {
    expect(normalizeUnit('carroça')).toBe('carroça');
    expect(normalizeUnit(null)).toBeNull();
  });
});

describe('matchField', () => {
  it('acha o talhão com acento, número por extenso ou só o número', () => {
    expect(matchField('talhao dois', FIELDS)?.id).toBe('f2');
    expect(matchField('Talhão 2', FIELDS)?.id).toBe('f2');
    expect(matchField('2', FIELDS)?.id).toBe('f2');
    expect(matchField('baixada', FIELDS)?.id).toBe('f3');
  });

  it('não adivinha quando não há correspondência ou há nomes repetidos', () => {
    expect(matchField('morro', FIELDS)).toBeNull();
    expect(
      matchField('baixada', [...FIELDS, { id: 'f4', name: 'baixada', crop: null }])
    ).toBeNull();
  });
});

describe('todayInTimezone', () => {
  it('usa o fuso do produtor, não o do servidor', () => {
    const now = new Date('2026-10-07T01:30:00Z');

    expect(todayInTimezone('America/Sao_Paulo', now)).toBe('2026-10-06');
    expect(todayInTimezone('UTC', now)).toBe('2026-10-07');
  });

  it('cai no fuso padrão quando o informado é inválido', () => {
    const now = new Date('2026-10-07T01:30:00Z');

    expect(todayInTimezone('Fuso/Inexistente', now)).toBe('2026-10-06');
    expect(todayInTimezone(null, now)).toBe('2026-10-06');
  });
});

describe('buildDraft', () => {
  it('monta o rascunho completo sem campos faltando', () => {
    const draft = draftFor();

    expect(draft).toMatchObject({
      activity_type: 'aplicacao',
      product: 'glifosato',
      quantity: 20,
      unit: 'L',
      field_id: 'f2',
      field_name: 'Talhão 2',
      occurred_at: '2026-10-06',
      missing_fields: []
    });
  });

  it('lista o que falta para o tipo de atividade', () => {
    const draft = draftFor({ quantity: null, unit: null, field_name: null });

    expect(draft.missing_fields).toEqual(['quantity', 'unit', 'field_name']);
  });

  it('assume hoje quando a data não foi dita, é inválida ou está no futuro', () => {
    expect(draftFor({ occurred_at: null }).occurred_at).toBe(TODAY);
    expect(draftFor({ occurred_at: 'ontem' }).occurred_at).toBe(TODAY);
    expect(draftFor({ occurred_at: '2026-02-31' }).occurred_at).toBe(TODAY);
    expect(draftFor({ occurred_at: '2027-01-01' }).occurred_at).toBe(TODAY);
  });

  it('pede o vínculo quando o talhão falado não está cadastrado', () => {
    const draft = draftFor({ field_name: 'morro' });

    expect(draft.field_id).toBeNull();
    expect(draft.field_name).toBe('morro');
    expect(draft.missing_fields).toEqual(['field_id']);
  });

  it('usa o talhão escolhido no aplicativo quando a fala não cita local', () => {
    const draft = draftFor({ field_name: null }, 'f3');

    expect(draft.field_id).toBe('f3');
    expect(draft.field_name).toBe('Baixada');
    expect(draft.missing_fields).toEqual([]);
  });

  it('custo exige apenas o valor e assume reais', () => {
    const draft = draftFor({
      activity_type: 'custo',
      quantity: null,
      unit: null,
      field_name: null,
      cost: 450,
      currency: null
    });

    expect(draft.currency).toBe('BRL');
    expect(draft.missing_fields).toEqual([]);
  });

  it('trata quantidade 0 e talhão vazio como não ditos', () => {
    const draft = draftFor({ quantity: 0, field_name: '  ' });

    expect(draft.quantity).toBeNull();
    expect(draft.field_name).toBeNull();
    expect(draft.missing_fields).toEqual(['quantity', 'field_name']);
  });

  it('pede o produto quando a fala não disse qual foi', () => {
    for (const product of ['um produto', 'Produto', 'aquele negócio', 'uma coisa']) {
      const draft = draftFor({ product });

      expect(draft.product).toBeNull();
      expect(draft.missing_fields).toContain('product');
    }
  });

  it('mantém produto com nome, mesmo que tenha palavra genérica', () => {
    expect(draftFor({ product: 'produto biológico Trichoderma' }).product).toBe(
      'produto biológico Trichoderma'
    );
    expect(draftFor({ product: 'fungicida' }).product).toBe('fungicida');
  });
});

describe('avaliação', () => {
  it('compara só os campos esperados, tolerando unidade e produto equivalentes', () => {
    const results = compareCase(
      { product: 'glifosato', unit: 'L', quantity: 20, field_name: null },
      { product: 'herbicida Glifosato', unit: 'litros', quantity: 20, field_name: null }
    );

    expect(results).toHaveLength(4);
    expect(results.every((result) => result.correct)).toBe(true);
  });

  it('conta erros e calcula o acerto', () => {
    const results = compareCase(
      { activity_type: 'aplicacao', quantity: 20, field_name: 'Talhão 2' },
      { activity_type: 'aplicacao', quantity: 2, field_name: null }
    );
    const summary = summarize(results);

    expect(summary.correct).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.accuracy).toBeCloseTo(1 / 3);
  });
});
