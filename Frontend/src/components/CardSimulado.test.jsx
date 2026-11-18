import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CardSimulado from './CardSimulado.jsx';

describe('CardSimulado', () => {
  it('displays the simulation number and formats the realization date', () => {
    render(<MemoryRouter><CardSimulado simulado={{ _id: 'sim-1', numero: 7, createdAt: new Date().toISOString(), data_realizacao: '2026-10-28T12:00:00Z' }} onView={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('Simulado 7')).toBeInTheDocument();
    expect(screen.getByText('28/10/2026')).toBeInTheDocument();
  });

  it('calls the view callback and disables editing for an old simulation', () => {
    const onView = vi.fn();
    render(<MemoryRouter><CardSimulado simulado={{ _id: 'old', numero: 1, createdAt: '2020-01-01', data_realizacao: null }} onView={onView} /></MemoryRouter>);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
    fireEvent.click(buttons[1]);
    expect(onView).toHaveBeenCalledOnce();
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
