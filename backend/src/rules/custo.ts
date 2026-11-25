// Custo pelo preço por unidade: "100 reais o litro, usei 1 litro e 200" dá R$ 120.
// A IA só lê o preço e a unidade da fala; a conta é feita aqui, sem IA, para não errar.

// Quanto cada unidade vale na unidade base do grupo (litro para volume, quilo para massa).
const GRUPOS: Record<string, { grupo: string; fator: number }> = {
  L: { grupo: 'volume', fator: 1 },
  mL: { grupo: 'volume', fator: 0.001 },
  kg: { grupo: 'massa', fator: 1 },
  g: { grupo: 'massa', fator: 0.001 },
  t: { grupo: 'massa', fator: 1000 }
};

// Quantas unidades de "unidadeDoPreco" cabem em uma "unidade": de mL para L, 0,001.
// Unidades que não se convertem (sc, ha, un) só valem quando são iguais. Sem conversão: null.
export function fatorDeConversao(unidade: string, unidadeDoPreco: string): number | null {
  if (unidade === unidadeDoPreco) return 1;

  const de = GRUPOS[unidade];
  const para = GRUPOS[unidadeDoPreco];

  if (!de || !para || de.grupo !== para.grupo) return null;

  return de.fator / para.fator;
}

export function custoPeloPreco(input: {
  quantidade: number | null;
  unidade: string | null;
  precoPorUnidade: number | null;
  // Unidade do preço ("o litro"). Sem ela, vale a mesma da quantidade.
  unidadeDoPreco: string | null;
}): number | null {
  const { quantidade, precoPorUnidade } = input;

  if (!quantidade || quantidade <= 0 || !precoPorUnidade || precoPorUnidade <= 0) return null;

  const unidade = input.unidade;
  const unidadeDoPreco = input.unidadeDoPreco ?? unidade;

  if (!unidade || !unidadeDoPreco) return null;

  const fator = fatorDeConversao(unidade, unidadeDoPreco);

  if (fator === null) return null;

  return Math.round(quantidade * fator * precoPorUnidade * 100) / 100;
}
