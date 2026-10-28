import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import SimuladosPesquisarForm from './SimuladosPesquisarForm.jsx';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

describe('SimuladosPesquisarForm', () => {
  it('updates the route when the selected period or series changes', () => {
    const { container } = render(<MemoryRouter><SimuladosPesquisarForm initialData={{ ano: 2026, serie: 0, bimestre: 1 }} onSubmit={vi.fn()} /></MemoryRouter>);
    fireEvent.change(container.querySelector('#bimestre'), { target: { value: '3' } });
    expect(navigate).toHaveBeenLastCalledWith('/Simulados/3/2026', { replace: true });

    fireEvent.change(container.querySelector('#serie'), { target: { value: '2' } });
    expect(navigate).toHaveBeenLastCalledWith('/Simulados/3/2026/2', { replace: true });
  });
});
