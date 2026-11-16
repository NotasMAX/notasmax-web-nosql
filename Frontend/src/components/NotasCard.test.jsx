import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotasCard from './NotasCard';

const turma_disciplina = { materia: 'Física', professor: 'Lourdes Prado' };

describe('NotasCard', () => {
  it('mostra os acertos do aluno na disciplina', () => {
    render(<NotasCard conteudo={{ turma_disciplina, quantidade_questoes: 3, resultado: { acertos: 2 } }} />);

    expect(screen.getByText('Física')).toBeInTheDocument();
    expect(screen.getByText('Lourdes Prado')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('mostra nulo quando o aluno não tem resultado na disciplina', () => {
    render(<NotasCard conteudo={{ turma_disciplina, quantidade_questoes: 3 }} />);

    expect(screen.getByText('nulo')).toBeInTheDocument();
  });
});
