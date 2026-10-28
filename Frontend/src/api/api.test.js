import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../utils/api.js', () => ({ default: api }));

import * as auth from './auth.js';
import * as materias from './materiaApi.js';
import * as simulados from './simuladoApi.js';
import * as turmas from './turmasapi.js';
import * as usuarios from './usuariosapi.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auth API', () => {
  it('sends login credentials and returns the response body', async () => {
    api.post.mockResolvedValue({ data: { usuario: { id: 'user-1' } } });

    await expect(auth.login('aluno@example.test', 'senha')).resolves.toEqual({ usuario: { id: 'user-1' } });
    expect(api.post).toHaveBeenCalledWith('/Auth/login', { email: 'aluno@example.test', senha: 'senha' });
  });

  it('logs out through the current session endpoint', async () => {
    await auth.logout();

    expect(api.post).toHaveBeenCalledWith('/Auth/logout');
  });

  it('loads the current profile and password recovery responses', async () => {
    api.get.mockResolvedValueOnce({ data: { usuario: { id: 'user-1' } } });
    api.post.mockResolvedValueOnce({ data: { message: 'sent' } }).mockResolvedValueOnce({ data: { message: 'reset' } });

    await expect(auth.getProfile()).resolves.toEqual({ usuario: { id: 'user-1' } });
    await expect(auth.forgot('aluno@example.test')).resolves.toEqual({ message: 'sent' });
    await expect(auth.reset('token-1', 'nova-senha')).resolves.toEqual({ message: 'reset' });
    expect(api.get).toHaveBeenCalledWith('/Auth/me');
    expect(api.post).toHaveBeenNthCalledWith(1, '/Auth/forgot', { email: 'aluno@example.test' });
    expect(api.post).toHaveBeenNthCalledWith(2, '/Auth/reset', { token: 'token-1', novaSenha: 'nova-senha' });
  });
});

describe('materia API', () => {
  it('delegates CRUD and encoded search requests', () => {
    const data = { nome: 'Matemática' };

    materias.listarMaterias();
    materias.cadastrarMateria(data);
    materias.getMateriaById('m-1');
    materias.editarMateria('m-1', data);
    materias.buscarMateriasPorNome('matemática avançada');

    expect(api.get).toHaveBeenNthCalledWith(1, '/Materias');
    expect(api.post).toHaveBeenCalledWith('/Materias/Cadastrar', data);
    expect(api.get).toHaveBeenNthCalledWith(2, '/Materia/m-1');
    expect(api.put).toHaveBeenCalledWith('/Materias/Editar/m-1', data);
    expect(api.get).toHaveBeenNthCalledWith(3, '/Materias/Buscar?text=matem%C3%A1tica%20avan%C3%A7ada');
  });
});

describe('simulado API', () => {
  it('delegates lookup, creation, update, and content requests', () => {
    const payload = { nome: 'Simulado' };

    simulados.getByTurma('t-1');
    simulados.cadastrarSimulado(payload);
    simulados.getOne('s-1');
    simulados.getAll();
    simulados.getTurma('t-1');
    simulados.getByAlunoAndBimestre('a-1', 2, 's-1');
    simulados.findSimuladoByBimestreAnoSerie(2, 2026, 1);
    simulados.updateSimulado('s-1', payload);
    simulados.getSimuladosByTurma('t-1');
    simulados.atualizarConteudos('s-1', payload);
    simulados.getOneSimple('s-1');

    expect(api.get).toHaveBeenNthCalledWith(1, '/Turmas/ByTurma/t-1');
    expect(api.post).toHaveBeenCalledWith('/Simulado/Create', payload);
    expect(api.get).toHaveBeenNthCalledWith(2, '/Simulado/s-1');
    expect(api.get).toHaveBeenNthCalledWith(3, '/Simulados');
    expect(api.get).toHaveBeenNthCalledWith(4, '/Turma/Simulado/t-1');
    expect(api.get).toHaveBeenNthCalledWith(5, '/Simulado/getByAluno/a-1/2/s-1');
    expect(api.get).toHaveBeenNthCalledWith(6, '/Simulados/FindByBimestreAnoSerie/2/2026/1');
    expect(api.patch).toHaveBeenNthCalledWith(1, '/Simulado/Editar/s-1', payload);
    expect(api.get).toHaveBeenNthCalledWith(7, '/Simulados/Turma/t-1');
    expect(api.patch).toHaveBeenNthCalledWith(2, '/Simulado/AtualizarConteudos/s-1', payload);
    expect(api.get).toHaveBeenNthCalledWith(8, '/Simulado/Simple/s-1');
  });
});

describe('turma API', () => {
  it('delegates class, student, subject, and performance requests', () => {
    const payload = { nome: 'Turma' };

    turmas.cadastrarTurma(payload);
    turmas.getAllTurmas();
    turmas.getOne('t-1');
    turmas.getTurmasPorAno(2026);
    turmas.getTurmaById('t-1');
    turmas.addAluno(payload);
    turmas.removeAluno('t-1', 'a-1');
    turmas.addDisciplina(payload);
    turmas.removeDisciplina('td-1');
    turmas.getDesempenhoTurma('t-1');
    turmas.getDesempenhoMaterias('t-1', 3);
    turmas.getOneDisciplina('td-1');

    expect(api.post).toHaveBeenNthCalledWith(1, '/Turmas/Cadastrar', payload);
    expect(api.get).toHaveBeenNthCalledWith(1, '/Turmas');
    expect(api.get).toHaveBeenNthCalledWith(2, '/Turma/t-1');
    expect(api.get).toHaveBeenNthCalledWith(3, '/Turmas/Pesquisar/2026');
    expect(api.get).toHaveBeenNthCalledWith(4, '/Turma/t-1');
    expect(api.patch).toHaveBeenCalledWith('/Turmas/Adicionar/Aluno', payload);
    expect(api.delete).toHaveBeenNthCalledWith(1, '/Turmas/Remover/Aluno?turma_id=t-1&aluno_id=a-1');
    expect(api.post).toHaveBeenNthCalledWith(2, '/Turmas/Adicionar/Disciplina', payload);
    expect(api.delete).toHaveBeenNthCalledWith(2, '/Turmas/Remover/Disciplina?id=td-1');
    expect(api.get).toHaveBeenNthCalledWith(5, '/Turma/t-1/desempenho');
    expect(api.get).toHaveBeenNthCalledWith(6, '/Turma/t-1/desempenho-materias?bimestre=3');
    expect(api.get).toHaveBeenNthCalledWith(7, '/Turmas/Disciplinas/td-1');
  });
});

describe('usuario API', () => {
  it('delegates user, enrollment, search, and performance requests', () => {
    const data = { nome: 'Usuário' };

    usuarios.getProfessores();
    usuarios.createProfessor(data);
    usuarios.getAlunos();
    usuarios.createAluno(data);
    usuarios.getDesempenhoAluno('a-1', 2026, 't-1', 2);
    usuarios.getUsuario('u-1');
    usuarios.updateUsuario('u-1', data);
    usuarios.buscarAlunosPorNomeOuEmail('maria silva');
    usuarios.buscarProfessoresPorNomeOuEmail('joão@example.test');
    usuarios.cadastrarAluno(data);

    expect(api.get).toHaveBeenNthCalledWith(1, '/Usuarios/Professores');
    expect(api.post).toHaveBeenNthCalledWith(1, '/Usuarios/Professor', data);
    expect(api.get).toHaveBeenNthCalledWith(2, '/Usuarios/Alunos');
    expect(api.post).toHaveBeenNthCalledWith(2, '/Usuarios/Aluno', data);
    expect(api.get).toHaveBeenNthCalledWith(3, '/Usuarios/Aluno/a-1/desempenho', {
      params: { ano: 2026, turmaId: 't-1', bimestre: 2 },
    });
    expect(api.get).toHaveBeenNthCalledWith(4, '/Usuarios/Detalhes/u-1');
    expect(api.put).toHaveBeenCalledWith('/Usuarios/Editar/u-1', data);
    expect(api.get).toHaveBeenNthCalledWith(5, '/Usuarios/Buscar/Alunos?text=maria%20silva');
    expect(api.get).toHaveBeenNthCalledWith(6, '/Usuarios/Buscar/Professores?text=jo%C3%A3o%40example.test');
    expect(api.post).toHaveBeenNthCalledWith(3, '/Usuarios/CadastrarAluno', data);
  });
});
