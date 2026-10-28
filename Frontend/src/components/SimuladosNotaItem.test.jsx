import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SimuladosNotaItem from './SimuladosNotaItem.jsx';
import { getOneDisciplina } from '../api/turmasapi';

vi.mock('../api/turmasapi', () => ({ getOneDisciplina: vi.fn() }));

describe('SimuladosNotaItem', () => {
  const aluno = { _id: 'aluno-1' };

  it('loads and displays the discipline and the current result, then emits an updated result', async () => {
    getOneDisciplina.mockResolvedValue({ data: { disciplina: { materia: { nome: 'Biologia' }, professor: { nome: 'Davi' } } } });
    const onUpdate = vi.fn();
    const conteudo = { _id: 'c-1', turma_disciplina_id: 'd-1', quantidade_questoes: 20, resultados: [{ aluno_id: aluno._id, acertos: 8, nota: 4 }] };
    render(<SimuladosNotaItem conteudo={conteudo} aluno={aluno} onUpdate={onUpdate} />);

    expect(await screen.findByText('Biologia')).toBeInTheDocument();
    expect(screen.getByText('Davi')).toBeInTheDocument();
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(8);
    fireEvent.change(input, { target: { value: '10' } });
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ resultados: [expect.objectContaining({ aluno_id: aluno._id, acertos: 10, nota: 5, notificacao_enviada: 'pendente' })] })));
  });

  it('warns and keeps the current value when the new result exceeds the question count', async () => {
    getOneDisciplina.mockResolvedValue({ data: { disciplina: { materia: { nome: 'Física' }, professor: { nome: 'Bia' } } } });
    const toast = { current: { show: vi.fn() } };
    const onUpdate = vi.fn();
    render(<SimuladosNotaItem conteudo={{ turma_disciplina_id: 'd-2', quantidade_questoes: 5, resultados: [] }} aluno={aluno} onUpdate={onUpdate} toast={toast} />);
    const input = await screen.findByRole('spinbutton');
    fireEvent.change(input, { target: { value: '7' } });
    expect(toast.current.show).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn' }));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
