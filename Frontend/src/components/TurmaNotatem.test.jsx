import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import TurmaNotatem from './TurmaNotatem';

describe('TurmaNotatem', () => {
  // Baseline-only characterization of an existing render defect, not an approved UI contract.
  it('registra a falha atual de renderização sem a variável aluno', () => {
    expect(() => render(<TurmaNotatem />)).toThrow(ReferenceError);
  });
});
