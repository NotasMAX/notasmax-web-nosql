import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import NotasForms from './NotasForms';

describe('NotasForms', () => {
  // Baseline-only characterization of an existing render defect, not an approved UI contract.
  it('registra a falha atual de renderização por dados ausentes no componente', () => {
    expect(() => render(<NotasForms actionTitle="Salvar" />)).toThrow(ReferenceError);
  });
});
