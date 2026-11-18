import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotasSimuladosCard from './NotasSimuladosCard';

describe('NotasSimuladosCard', () => {
  it('exibe número, tipo, peso formatado e resultado', () => {
    render(<NotasSimuladosCard simulado={{ numero: 3, tipo: 'objetivo' }} conteudo={{ peso: 12.5, resultado: { acertos: 8 }, quantidade_questoes: 10 }} />);
    expect(screen.getByText('Simulado 3')).toBeInTheDocument();
    expect(screen.getByText('objetivo')).toBeInTheDocument();
    expect(screen.getByText('12,50 %')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
