import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotasCard from './NotasCard.jsx';
import SimuladosItem from './SimuladosItem.jsx';
import TurmaItem from './TurmaItem.jsx';

describe('NotasCard', () => {
  it('shows subject, teacher, and the student result count', () => {
    render(<NotasCard conteudo={{ turma_disciplina: { materia: 'História', professor: 'Lia' }, resultado: { acertos: 8 }, quantidade_questoes: 10 }} />);
    expect(screen.getByText('História')).toBeInTheDocument();
    expect(screen.getByText('Lia')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('uses em dashes when subject or teacher values are missing', () => {
    render(<NotasCard conteudo={{ turma_disciplina: {}, resultado: { acertos: 0 }, quantidade_questoes: 0 }} />);
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});

describe('SimuladosItem', () => {
  it('renders a recent simulation edit link and its details', () => {
    const createdAt = new Date().toISOString();
    render(<SimuladosItem simulado={{ _id: 's-1', numero: 4, tipo: 'Simulado', turma: { serie: 2 }, data_realizacao: '2026-10-12', createdAt }} />);
    expect(screen.getByText('2º EM')).toBeInTheDocument();
    expect(screen.getByText('Simulado Nº 4')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/Simulados/Editar/s-1');
  });

  it('disables editing when the simulation is older than fifteen days', () => {
    render(<SimuladosItem simulado={{ _id: 's-old', numero: 2, tipo: 'Simulado', turma: { serie: 1 }, data_realizacao: '2026-01-01', createdAt: '2026-01-01' }} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '#');
  });
});

describe('TurmaItem', () => {
  it('links to the class details and edit page', () => {
    render(<MemoryRouter><TurmaItem turma={{ _id: 't-2', serie: 3 }} position={1} /></MemoryRouter>);
    expect(screen.getByText('3º EM').closest('a')).toHaveAttribute('href', '/Turmas/Info/t-2');
    expect(screen.getByRole('link', { name: 'Editar turma t-2' })).toHaveAttribute('href', '/Turmas/Editar/t-2');
  });
});
