import { describe, expect, it } from 'vitest';

import {
  chaveDeTexto,
  deveAparecerNosAlertas,
  diasEntre,
  escolherSugestao,
  situacaoDaCarencia,
  somarDias
} from '../src/rules/carencia';

describe('somarDias e diasEntre', () => {
  it('atravessa virada de mês e de ano', () => {
    expect(somarDias('2026-11-20', 30)).toBe('2026-12-20');
    expect(somarDias('2026-12-20', 15)).toBe('2027-01-04');
    expect(somarDias('2028-02-20', 10)).toBe('2028-03-01'); // ano bissexto
    expect(diasEntre('2026-12-20', '2027-01-04')).toBe(15);
  });

  it('não escorrega um dia no horário de verão', () => {
    expect(somarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(diasEntre('2026-10-31', '2026-11-02')).toBe(2);
  });
});

describe('situacaoDaCarencia', () => {
  it('carência de 30 dias: em carência até o dia anterior à liberação', () => {
    expect(situacaoDaCarencia('2026-11-01', 30, '2026-11-30')).toEqual({
      estado: 'em_carencia',
      liberaEm: '2026-12-01',
      diasRestantes: 1
    });
  });

  it('libera exatamente na data da aplicação mais os dias de carência', () => {
    expect(situacaoDaCarencia('2026-11-01', 30, '2026-12-01')).toEqual({
      estado: 'liberado',
      liberaEm: '2026-12-01',
      diasDesdeLiberacao: 0
    });
  });

  it('carência zero libera no mesmo dia', () => {
    expect(situacaoDaCarencia('2026-11-22', 0, '2026-11-22')).toMatchObject({
      estado: 'liberado',
      liberaEm: '2026-11-22'
    });
  });

  it('sem os dias da bula, nunca chuta: pede a carência', () => {
    expect(situacaoDaCarencia('2026-11-22', null, '2026-11-22')).toEqual({
      estado: 'sem_carencia'
    });
    expect(situacaoDaCarencia('2026-11-22', undefined, '2026-11-22')).toEqual({
      estado: 'sem_carencia'
    });
  });

  it('número fora do possível também é tratado como sem carência', () => {
    expect(situacaoDaCarencia('2026-11-22', -3, '2026-11-22').estado).toBe('sem_carencia');
    expect(situacaoDaCarencia('2026-11-22', 7.5, '2026-11-22').estado).toBe('sem_carencia');
    expect(situacaoDaCarencia('2026-11-22', 900, '2026-11-22').estado).toBe('sem_carencia');
  });
});

describe('deveAparecerNosAlertas', () => {
  const hoje = '2026-11-22';

  it('mostra tudo que está em carência', () => {
    expect(
      deveAparecerNosAlertas(situacaoDaCarencia('2026-06-01', 365, hoje), '2026-06-01', hoje)
    ).toBe(true);
  });

  it('mostra liberado por uma semana e depois esconde', () => {
    const liberouHa7 = situacaoDaCarencia('2026-11-05', 10, hoje);
    const liberouHa8 = situacaoDaCarencia('2026-11-04', 10, hoje);

    expect(deveAparecerNosAlertas(liberouHa7, '2026-11-05', hoje)).toBe(true);
    expect(deveAparecerNosAlertas(liberouHa8, '2026-11-04', hoje)).toBe(false);
  });

  it('pede a bula de aplicações dos últimos 60 dias', () => {
    const semCarencia = situacaoDaCarencia('2026-09-23', null, hoje);

    expect(deveAparecerNosAlertas(semCarencia, '2026-09-23', hoje)).toBe(true);
    expect(deveAparecerNosAlertas(semCarencia, '2026-09-22', hoje)).toBe(false);
  });
});

describe('chaveDeTexto', () => {
  it('ignora acentos, maiúsculas e pontuação', () => {
    expect(chaveDeTexto('  Glifosato  ATAR. ')).toBe('glifosato atar');
    expect(chaveDeTexto('Feijão')).toBe(chaveDeTexto('feijao'));
    expect(chaveDeTexto(null)).toBe('');
  });
});

describe('escolherSugestao', () => {
  const catalogo = { days: 30, source: 'Bula conferida', registration_number: '1234' };

  it('prefere o que o produtor já leu na bula', () => {
    expect(escolherSugestao({ days: 15 }, catalogo)).toEqual({
      dias: 15,
      origem: 'bula_anterior',
      referencia: null
    });
  });

  it('usa o catálogo conferido, com a referência', () => {
    expect(escolherSugestao(null, catalogo)).toEqual({
      dias: 30,
      origem: 'catalogo',
      referencia: 'Bula conferida (registro MAPA 1234)'
    });
  });

  it('sem nada conhecido, não sugere', () => {
    expect(escolherSugestao(null, null)).toBeNull();
  });
});
