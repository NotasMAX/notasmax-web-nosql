import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BimestreSections from './BimestreSections.jsx';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => navigate }));

describe('BimestreSections', () => {
  it('sorts simulations by number and routes to view or edit', () => {
    render(<BimestreSections simulados={[
      { _id: 's-2', numero: 2, createdAt: new Date().toISOString(), data_realizacao: null },
      { _id: 's-1', numero: 1, createdAt: new Date().toISOString(), data_realizacao: null },
    ]} />);
    const labels = screen.getAllByText(/Simulado [12]/).map((node) => node.textContent);
    expect(labels).toEqual(['Simulado 1', 'Simulado 2']);
    const cards = screen.getAllByRole('button');
    fireEvent.click(cards[1]);
    expect(navigate).toHaveBeenCalledWith('/Turmas/Simulado/Aluno/s-1');
    fireEvent.click(cards[0]);
    expect(navigate).toHaveBeenCalledWith('/Simulados/Editar/s-1');
  });

  it('renders an empty list without cards', () => {
    render(<BimestreSections simulados={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
