import { describe, expect, it } from 'vitest';
import { decimal, interpretarAcertos, interpretarPeso, montarConfirmacao } from './conferenciaNotas';

describe('conferenciaNotas', () => {
  it('mostra decimal com vírgula e duas casas', () => {
    expect(decimal(2.1)).toBe('2,10');
    expect(decimal(0)).toBe('0,00');
  });

  it('interpreta o que o admin digita nos acertos', () => {
    expect(interpretarAcertos('2')).toEqual({ status: 'acertos', acertos: 2 });
    expect(interpretarAcertos(' 3 ')).toEqual({ status: 'acertos', acertos: 3 });
    expect(interpretarAcertos('')).toEqual({ status: 'nao_fez' });
    expect(interpretarAcertos('2,5')).toEqual({ status: 'invalida', bruto: '2,5' });
    expect(interpretarAcertos('faltou')).toEqual({ status: 'nao_fez' });
    expect(interpretarAcertos(' FALTOU ')).toEqual({ status: 'nao_fez' });
    expect(interpretarAcertos('Não fez')).toEqual({ status: 'nao_fez' });
    expect(interpretarAcertos('ausente')).toEqual({ status: 'invalida', bruto: 'ausente' });
    expect(interpretarAcertos('nulo')).toEqual({ status: 'invalida', bruto: 'nulo' });
  });

  it('interpreta o que o admin digita no peso', () => {
    expect(interpretarPeso('30')).toBe(30);
    expect(interpretarPeso('12.5')).toBe(12.5);
    expect(interpretarPeso('')).toBe('');
  });

  it('manda só o tipo e o peso que mudaram, e não fez como nulo', () => {
    const estado = {
      colunas: [{ coluna: 'B', cabecalho: 'fisica', cabecalhoOriginal: 'FÍSICA', fator: 0.3, notaDissertativaPlanilha: 0, turma_disciplina_id: 'd1', trocada: true, origemLigacao: null }],
      linhas: [{
        numero: 1,
        total: 3,
        celulas: [
          { coluna: 'B', celula: 'B4', status: 'acertos', acertos: 2 },
          { coluna: 'C', celula: 'C4', status: 'nao_fez' },
          { coluna: 'D', celula: 'D4', status: 'vazia' },
          { coluna: 'E', celula: 'E4', status: 'invalida', bruto: 'x' },
        ],
      }],
      simulados: [
        { _id: 's1', tipo: 'dissertativo', tipoOriginal: 'objetivo', conteudos: [{ turma_disciplina_id: 'd1', peso: 40, pesoOriginal: 30 }, { turma_disciplina_id: 'd2', peso: 30, pesoOriginal: 30 }] },
        { _id: 's2', tipo: 'objetivo', tipoOriginal: 'objetivo', conteudos: [{ turma_disciplina_id: 'd1', peso: 30, pesoOriginal: 30 }] },
      ],
    };

    expect(montarConfirmacao({ estado, aluno_id: 'a1', turma_id: 't1', bimestre: '2' })).toEqual({
      aluno_id: 'a1',
      turma_id: 't1',
      bimestre: '2',
      colunas: [{ coluna: 'B', cabecalho: 'fisica', cabecalhoOriginal: 'FÍSICA', fator: 0.3, notaDissertativaPlanilha: 0, turma_disciplina_id: 'd1', trocada: true }],
      linhas: [{
        numero: 1,
        celulas: [
          { coluna: 'B', celula: 'B4', acertos: 2 },
          { coluna: 'C', celula: 'C4', acertos: null },
          { coluna: 'D', celula: 'D4', acertos: null },
          { coluna: 'E', celula: 'E4', acertos: 'x' },
        ],
      }],
      tipos: [{ simulado_id: 's1', tipo: 'dissertativo' }],
      pesos: [{ simulado_id: 's1', turma_disciplina_id: 'd1', peso: 40 }],
    });
  });
});
