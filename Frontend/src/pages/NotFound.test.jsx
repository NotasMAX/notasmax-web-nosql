import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import NotFound from './NotFound';

function Destination() { return <p>Destino: {useLocation().pathname}</p>; }

describe('NotFound', () => {
  it('informa que a rota não existe e oferece retorno à página inicial', async () => {
    render(<MemoryRouter initialEntries={['/missing']}><Routes><Route path="/missing" element={<NotFound />} /><Route path="/" element={<Destination />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByText('Ops! Essa página não foi encontrada!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clique aqui para retornar' }));
    expect(await screen.findByText('Destino: /')).toBeInTheDocument();
  });
});
