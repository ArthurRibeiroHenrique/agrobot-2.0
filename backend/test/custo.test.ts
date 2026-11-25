import { describe, expect, it } from 'vitest';

import { custoPeloPreco, fatorDeConversao } from '../src/rules/custo';

describe('custoPeloPreco', () => {
  it('fungicida a 100 reais o litro, 1 litro e 200: R$ 120', () => {
    expect(
      custoPeloPreco({ quantidade: 1.2, unidade: 'L', precoPorUnidade: 100, unidadeDoPreco: 'L' })
    ).toBe(120);
  });

  it('adubo foliar a 400 reais o litro, 250 mL: R$ 100', () => {
    expect(
      custoPeloPreco({ quantidade: 250, unidade: 'mL', precoPorUnidade: 400, unidadeDoPreco: 'L' })
    ).toBe(100);
  });

  it('500 g a 30 reais o quilo: R$ 15; 2 t a 3 reais o quilo: R$ 6.000', () => {
    expect(
      custoPeloPreco({ quantidade: 500, unidade: 'g', precoPorUnidade: 30, unidadeDoPreco: 'kg' })
    ).toBe(15);
    expect(
      custoPeloPreco({ quantidade: 2, unidade: 't', precoPorUnidade: 3, unidadeDoPreco: 'kg' })
    ).toBe(6000);
  });

  it('preço sem unidade vale a unidade da quantidade', () => {
    expect(
      custoPeloPreco({ quantidade: 10, unidade: 'sc', precoPorUnidade: 80, unidadeDoPreco: null })
    ).toBe(800);
  });

  it('unidades que não se convertem não viram conta', () => {
    expect(
      custoPeloPreco({ quantidade: 10, unidade: 'L', precoPorUnidade: 80, unidadeDoPreco: 'kg' })
    ).toBeNull();
    expect(
      custoPeloPreco({ quantidade: 10, unidade: 'sc', precoPorUnidade: 80, unidadeDoPreco: 'kg' })
    ).toBeNull();
  });

  it('sem quantidade, sem preço ou sem unidade: null', () => {
    expect(
      custoPeloPreco({ quantidade: null, unidade: 'L', precoPorUnidade: 100, unidadeDoPreco: 'L' })
    ).toBeNull();
    expect(
      custoPeloPreco({ quantidade: 2, unidade: 'L', precoPorUnidade: null, unidadeDoPreco: 'L' })
    ).toBeNull();
    expect(
      custoPeloPreco({ quantidade: 2, unidade: null, precoPorUnidade: 100, unidadeDoPreco: null })
    ).toBeNull();
  });

  it('arredonda nos centavos', () => {
    expect(
      custoPeloPreco({ quantidade: 0.333, unidade: 'L', precoPorUnidade: 10, unidadeDoPreco: 'L' })
    ).toBe(3.33);
  });
});

describe('fatorDeConversao', () => {
  it('mL para L e kg para t', () => {
    expect(fatorDeConversao('mL', 'L')).toBe(0.001);
    expect(fatorDeConversao('kg', 't')).toBe(0.001);
    expect(fatorDeConversao('un', 'un')).toBe(1);
  });
});
