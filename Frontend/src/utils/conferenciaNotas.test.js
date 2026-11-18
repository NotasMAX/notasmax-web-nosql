import { describe, expect, it } from 'vitest';
import { dataDoCampo, dataParaCampo, decimal, interpretarAcertos, interpretarPeso, montarConfirmacao } from './conferenciaNotas';

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
    expect(interpretarAcertos('-1')).toEqual({ status: 'invalida', bruto: '-1' });
    expect(interpretarAcertos('faltou')).toEqual({ status: 'nao_fez', bruto: 'faltou' });
    expect(interpretarAcertos('Não fez')).toEqual({ status: 'nao_fez', bruto: 'Não fez' });
    expect(interpretarAcertos('ausente')).toEqual({ status: 'nao_fez', bruto: 'ausente' });
    expect(interpretarAcertos('2,')).toEqual({ status: 'nao_fez', bruto: '2,' });
  });

  it('interpreta o que o admin digita no peso', () => {
    expect(interpretarPeso('30')).toBe(30);
    expect(interpretarPeso('12.5')).toBe(12.5);
    expect(interpretarPeso('')).toBe('');
  });

  it('manda só o tipo e o peso que mudaram, e não fez como nulo', () => {
    const estado = {
      disciplinas: [{ _id: 'd1', materia: 'Física', professor: 'Lourdes Prado', materia_id: 'm1', professor_id: 'p1' }],
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

    expect(montarConfirmacao({ estado, aluno_id: 'a1', turma_id: 't1', bimestre: '2', aba: 'Maria Silva' })).toEqual({
      aluno_id: 'a1',
      turma_id: 't1',
      bimestre: '2',
      aba: 'Maria Silva',
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
      questoes: [],
      conteudosNovos: [],
      novos: [],
      disciplinasNovas: [],
    });
  });

  it('manda as questões alteradas, as disciplinas novas e os simulados novos à parte', () => {
    const estado = {
      // A disciplina nova só vai quando alguma coluna a usa; a escolhida e depois trocada fica de fora.
      disciplinas: [
        { _id: 'nova-1', nova: true, materia: 'Artes', materia_id: null, professor: 'Rita Lima', professor_id: 'p4' },
        { _id: 'nova-2', nova: true, materia: 'Games', materia_id: 'm9', professor: 'Toni Almeida', professor_id: 'p3' },
      ],
      colunas: [{ coluna: 'B', turma_disciplina_id: 'nova-1' }],
      linhas: [],
      simulados: [
        {
          _id: 's1', tipo: 'objetivo', tipoOriginal: 'objetivo',
          conteudos: [
            { turma_disciplina_id: 'd1', peso: 30, pesoOriginal: 30, quantidade_questoes: 5, questoesOriginal: 3 },
            { turma_disciplina_id: 'd2', novo: true, peso: 20, pesoOriginal: null, quantidade_questoes: 4, questoesOriginal: null },
          ],
        },
        {
          _id: 'novo-7', novo: true, numero: 7, tipo: 'dissertativo', tipoOriginal: 'dissertativo', data_realizacao: '2026-11-18T03:00:00.000Z',
          conteudos: [{ turma_disciplina_id: 'd1', novo: true, peso: 10, pesoOriginal: null, quantidade_questoes: 2, questoesOriginal: null }],
        },
      ],
    };

    const enviado = montarConfirmacao({ estado, aluno_id: 'a1', turma_id: 't1', bimestre: '2', aba: 'x' });

    expect(enviado.tipos).toEqual([]);
    expect(enviado.pesos).toEqual([]);
    expect(enviado.questoes).toEqual([{ simulado_id: 's1', turma_disciplina_id: 'd1', quantidade_questoes: 5 }]);
    expect(enviado.conteudosNovos).toEqual([{ simulado_id: 's1', turma_disciplina_id: 'd2', quantidade_questoes: 4, peso: 20 }]);
    expect(enviado.novos).toEqual([{
      numero: 7, tipo: 'dissertativo', data_realizacao: '2026-11-18T03:00:00.000Z',
      conteudos: [{ turma_disciplina_id: 'd1', quantidade_questoes: 2, peso: 10 }],
    }]);
    expect(enviado.disciplinasNovas).toEqual([{ id: 'nova-1', materia_id: null, materia_nome: 'Artes', professor_id: 'p4' }]);
  });

  it('converte a data entre o campo e a meia-noite local', () => {
    const data = dataDoCampo('2026-11-18');
    expect(data).toBe(new Date(2026, 10, 18).toISOString());
    expect(dataParaCampo(data)).toBe('2026-11-18');
    expect(dataDoCampo('')).toBe('');
    expect(dataParaCampo('')).toBe('');
    expect(dataParaCampo('não é data')).toBe('');
  });
});
