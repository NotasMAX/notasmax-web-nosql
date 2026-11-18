import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SimuladoAlunoItem from './SimuladoAlunoItem';

const tooltip = vi.fn();
vi.mock('primereact/tooltip', () => ({ Tooltip: (props) => { tooltip(props); return null; } }));

describe('SimuladoAlunoItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soma acertos e questões e chama a ação de visualizar', () => {
    const onView = vi.fn();
    render(<SimuladoAlunoItem alunoResultado={{ nome: 'Ana', resultados: [
      { resultado: { acertos: 4 }, quantidade_questoes: 5 },
      { resultado: { acertos: 3 }, quantidade_questoes: 4 },
    ] }} onView={onView} />);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onView).toHaveBeenCalledOnce();
  });
});
