import { describe, expect, it } from 'vitest';
import { capitalizarNome, normalizar, professorDoCabecalho, separarCabecalho } from './cabecalhoPlanilha';

describe('cabecalhoPlanilha', () => {
  it('deixa o nome da matéria como os do sistema quando o cabeçalho está todo em maiúsculas', () => {
    expect(capitalizarNome('ARTES')).toBe('Artes');
    expect(capitalizarNome('  LÍNGUA   PORTUGUESA ')).toBe('Língua Portuguesa');
    expect(capitalizarNome('HISTÓRIA DA ARTE E DO DESIGN')).toBe('História da Arte e do Design');
    expect(capitalizarNome('Ed. Física')).toBe('Ed. Física');
    expect(capitalizarNome('')).toBe('');
  });

  it('separa matéria e professor do cabeçalho, com qualquer tipo de traço', () => {
    expect(separarCabecalho('FÍSICA \u2013 TONI')).toEqual({ materia: 'FÍSICA', professor: 'TONI' });
    expect(separarCabecalho('ARTES')).toEqual({ materia: 'ARTES', professor: '' });
  });

  it('acha o professor pelo começo de uma palavra do nome, só quando há um só', () => {
    const professores = [{ _id: 'p1', nome: 'Toni Almeida' }, { _id: 'p2', nome: 'Antonio Reis' }];

    expect(professorDoCabecalho(professores, 'TONI')?._id).toBe('p1');
    expect(professorDoCabecalho(professores, 'ALM')?._id).toBe('p1');
    expect(professorDoCabecalho(professores, 'ONI')).toBeNull();
    expect(professorDoCabecalho(professores, '')).toBeNull();
    expect(normalizar('  Ação   Física ')).toBe('acao fisica');
  });
});
