import { describe, expect, it } from 'vitest';

import { montarResumo, RegistroParaResumo, unidadePadrao } from '../src/rules/resumo';

function registro(parcial: Partial<RegistroParaResumo>): RegistroParaResumo {
  return {
    activity_type: 'outro',
    product: null,
    quantity: null,
    unit: null,
    field_name: null,
    occurred_at: '2026-11-10',
    cost: null,
    currency: null,
    created_at: '2026-11-10T12:00:00Z',
    ...parcial
  };
}

describe('montarResumo', () => {
  it('diário vazio: tudo zerado, sem datas', () => {
    expect(montarResumo([], '2026-11-24')).toEqual({
      total: 0,
      primeiro_registro: null,
      ultimo_registro: null,
      este_mes: 0,
      por_tipo: [],
      produtos: [],
      talhoes: [],
      gastos: { total: 0, este_mes: 0 }
    });
  });

  it('conta desde o primeiro registro e separa o mês atual', () => {
    const resumo = montarResumo(
      [
        registro({ occurred_at: '2026-09-02', activity_type: 'plantio' }),
        registro({ occurred_at: '2026-11-03', activity_type: 'aplicacao' }),
        registro({ occurred_at: '2026-11-20', activity_type: 'aplicacao' }),
        // Sem data do serviço: vale o dia em que foi anotado.
        registro({ occurred_at: null, created_at: '2026-10-15T09:00:00Z' })
      ],
      '2026-11-24'
    );

    expect(resumo.total).toBe(4);
    expect(resumo.primeiro_registro).toBe('2026-09-02');
    expect(resumo.ultimo_registro).toBe('2026-11-20');
    expect(resumo.este_mes).toBe(2);
    expect(resumo.por_tipo).toEqual([
      { tipo: 'aplicacao', quantidade: 2 },
      { tipo: 'outro', quantidade: 1 },
      { tipo: 'plantio', quantidade: 1 }
    ]);
  });

  it('junta o mesmo produto escrito de jeitos diferentes e soma por unidade', () => {
    const resumo = montarResumo(
      [
        registro({ activity_type: 'aplicacao', product: 'Glifosato', quantity: 20, unit: 'litros', occurred_at: '2026-10-01' }),
        registro({ activity_type: 'aplicacao', product: 'glifosato ', quantity: 15.5, unit: 'L', occurred_at: '2026-11-01' }),
        registro({ activity_type: 'aplicacao', product: 'GLIFOSATO', quantity: 2, unit: 'kg', occurred_at: '2026-11-05' }),
        registro({ activity_type: 'aplicacao', product: 'Glifosato', quantity: null, occurred_at: '2026-09-01' }),
        registro({ activity_type: 'adubacao', product: 'Ureia', quantity: 300, unit: 'kg' })
      ],
      '2026-11-24'
    );

    expect(resumo.produtos).toEqual([
      {
        produto: 'GLIFOSATO',
        tipo: 'aplicacao',
        vezes: 4,
        totais: [
          { quantidade: 35.5, unidade: 'L' },
          { quantidade: 2, unidade: 'kg' }
        ]
      },
      { produto: 'Ureia', tipo: 'adubacao', vezes: 1, totais: [{ quantidade: 300, unidade: 'kg' }] }
    ]);
  });

  it('produto de irrigação, colheita ou custo não entra na lista de produtos', () => {
    const resumo = montarResumo(
      [
        registro({ activity_type: 'colheita', product: 'Soja', quantity: 50, unit: 'sacas' }),
        registro({ activity_type: 'custo', product: 'Diesel', cost: 400 })
      ],
      '2026-11-24'
    );

    expect(resumo.produtos).toEqual([]);
  });

  it('mostra só os cinco mais usados', () => {
    const registros = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((nome, i) =>
      Array.from({ length: 6 - i }, () =>
        registro({ activity_type: 'aplicacao', product: `Produto ${nome}`, field_name: `Talhão ${nome}` })
      )
    );
    const resumo = montarResumo(registros, '2026-11-24');

    expect(resumo.produtos.map((p) => p.produto)).toEqual([
      'Produto A',
      'Produto B',
      'Produto C',
      'Produto D',
      'Produto E'
    ]);
    expect(resumo.talhoes).toHaveLength(5);
    expect(resumo.talhoes[0]).toEqual({ talhao: 'Talhão A', quantidade: 6 });
  });

  it('soma gastos em reais, no total e no mês', () => {
    const resumo = montarResumo(
      [
        registro({ cost: 100.1, occurred_at: '2026-10-01' }),
        registro({ cost: 50.2, currency: 'BRL', occurred_at: '2026-11-02' }),
        registro({ cost: 999, currency: 'USD', occurred_at: '2026-11-02' })
      ],
      '2026-11-24'
    );

    expect(resumo.gastos).toEqual({ total: 150.3, este_mes: 50.2 });
  });
});

describe('textos vazios da extração', () => {
  it('"/null" e "não informado" não viram talhão nem produto', () => {
    const resumo = montarResumo(
      [
        registro({ activity_type: 'aplicacao', product: 'null', field_name: '/null' }),
        registro({ activity_type: 'aplicacao', product: 'Não informado', field_name: 'Talhão 1' })
      ],
      '2026-11-24'
    );

    expect(resumo.produtos).toEqual([]);
    expect(resumo.talhoes).toEqual([{ talhao: 'Talhão 1', quantidade: 1 }]);
    expect(resumo.total).toBe(2);
  });
});

describe('unidadePadrao', () => {
  it('reconhece os jeitos comuns de escrever', () => {
    expect(unidadePadrao('Litros')).toBe('L');
    expect(unidadePadrao('lts')).toBe('L');
    expect(unidadePadrao('quilos')).toBe('kg');
    expect(unidadePadrao('sc')).toBe('sacos');
    expect(unidadePadrao('  ')).toBeNull();
    expect(unidadePadrao('bombas')).toBe('bombas');
  });
});
