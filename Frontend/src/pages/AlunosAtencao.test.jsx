import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AlunosAtencao from "./AlunosAtencao";
import { gerarSugestoesAluno, getAlunosEmAtencao } from "../api/usuariosapi";
import { getAllTurmas } from "../api/turmasapi";

vi.mock("../api/usuariosapi", () => ({
  gerarSugestoesAluno: vi.fn(),
  getAlunosEmAtencao: vi.fn()
}));

vi.mock("../api/turmasapi", () => ({
  getAllTurmas: vi.fn()
}));

describe("AlunosAtencao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllTurmas.mockResolvedValue({ data: { turmas: [] } });
    getAlunosEmAtencao.mockResolvedValue({
      data: {
        resumo: { totalAlunos: 2 },
        alunos: [
          {
            alunoId: "a1",
            nome: "Ana",
            turma: "1º EM - 2026",
            mediaAtual: 5,
            mediaAnterior: 6,
            mediaTurma: 7,
            variacao: -1,
            percentualAcertos: 50,
            nivel: "alto",
            motivos: ["Nota baixa"],
            disciplinasCriticas: [],
            recomendacoes: []
          },
          {
            alunoId: "a2",
            nome: "Bia",
            turma: "1º EM - 2026",
            mediaAtual: 5.5,
            mediaAnterior: 6,
            mediaTurma: 7,
            variacao: -0.5,
            percentualAcertos: 55,
            nivel: "moderado",
            motivos: ["Variacao negativa"],
            disciplinasCriticas: [],
            recomendacoes: []
          }
        ]
      }
    });
  });

  it("remove a sugestao da IA ao abrir a analise de outro aluno", async () => {
    gerarSugestoesAluno.mockResolvedValue({
      data: { resumo: "Sugestao exclusiva da Ana", sugestoes: ["Reforco de matematica"] }
    });

    render(<AlunosAtencao />);

    const botoes = await screen.findAllByRole("button", { name: "Ver análise" });
    fireEvent.click(botoes[0]);
    fireEvent.click(screen.getByRole("button", { name: "Pedir sugestão para a IA" }));

    expect(await screen.findByText("Sugestao exclusiva da Ana")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Ver análise" })[1]);

    expect(screen.queryByText("Sugestao exclusiva da Ana")).not.toBeInTheDocument();
    expect(screen.queryByText("Reforco de matematica")).not.toBeInTheDocument();
  });

  it("ignora uma resposta da IA que chegar depois da troca de aluno", async () => {
    let resolverAna;
    gerarSugestoesAluno.mockImplementation(() => new Promise((resolve) => {
      resolverAna = resolve;
    }));

    render(<AlunosAtencao />);

    const botoes = await screen.findAllByRole("button", { name: "Ver análise" });
    fireEvent.click(botoes[0]);
    fireEvent.click(screen.getByRole("button", { name: "Pedir sugestão para a IA" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Ver análise" })[1]);
    resolverAna({ data: { resumo: "Sugestao da Ana atrasada", sugestoes: [] } });

    await waitFor(() => {
      expect(screen.queryByText("Sugestao da Ana atrasada")).not.toBeInTheDocument();
    });
  });
});
