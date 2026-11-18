import { Router } from "express";
import TurmasController from "../Controllers/TurmasController.js";
import TurmaDisciplinasController from "../Controllers/TurmaDisciplinasController.js";
import UsuariosController from "../Controllers/UsuariosController.js";
import MateriasController from "../Controllers/MateriasController.js";
import { authenticateToken, authorizeAdmin, authorizeProfessor, authorizeAluno } from "../middlewares/authMiddleware.js";
import SimuladosController from '../Controllers/SimuladosController.js';
import PresencasController from "../Controllers/PresencasController.js";
import ImportacaoController from '../Controllers/ImportacaoController.js';
import FotosPerfilController from '../Controllers/FotosPerfilController.js';
import { receberPlanilha } from '../middlewares/uploadPlanilha.js';
import { receberFoto } from '../middlewares/uploadFoto.js';
import IAController from "../Controllers/IAController.js";


const routes = Router();

routes.get("/Turmas", authenticateToken, authorizeAdmin, TurmasController.getAll);
routes.get("/Turma/:id", authenticateToken, authorizeAdmin, TurmasController.getOne);
routes.get("/Turmas/Pesquisar/:ano", authenticateToken, authorizeAdmin, TurmasController.getByAno);
routes.post("/Turmas/Cadastrar", authenticateToken, authorizeAdmin, TurmasController.create);
routes.patch("/Turmas/Adicionar/Aluno", authenticateToken, authorizeAdmin, TurmasController.addAluno);
routes.delete("/Turmas/Remover/Aluno", authenticateToken, authorizeAdmin, TurmasController.removeAluno);
routes.get("/Turma/:id/desempenho", authenticateToken, authorizeAdmin, TurmasController.getDesempenhoByTurma);
routes.get("/Turma/:id/desempenho-materias", authenticateToken, authorizeAdmin, TurmasController.getDesempenhoMaterias);
routes.post("/Turmas/Adicionar/Disciplina", authenticateToken, authorizeAdmin, TurmaDisciplinasController.create);
routes.delete("/Turmas/Remover/Disciplina", authenticateToken, authorizeAdmin, TurmaDisciplinasController.remove);
routes.get("/Turmas/Disciplinas/:turma_disciplina_id", authenticateToken, authorizeAdmin, TurmaDisciplinasController.getOne);

routes.get("/Usuarios/Professores", authenticateToken, authorizeAdmin, UsuariosController.listarProfessores);
routes.get("/Usuarios/Alunos", authenticateToken, authorizeAdmin, UsuariosController.listarAlunos);
routes.get("/Usuarios/Aluno/:id/desempenho", authenticateToken, authorizeAdmin, UsuariosController.getDesempenhoByAluno);
routes.get("/Usuarios/Detalhes/:id", authenticateToken, UsuariosController.getUsuario); // removido authorizeAdmin - utilizado para acessar as informações do usuario
routes.put("/Usuarios/Editar/:id", authenticateToken, authorizeAdmin, UsuariosController.atualizarUsuario);
routes.post("/Usuarios/Professor", authenticateToken, authorizeAdmin, UsuariosController.cadastrarProfessor);
routes.post("/Usuarios/Aluno", authenticateToken, authorizeAdmin, UsuariosController.cadastrarAluno);

routes.get("/Usuarios/Buscar/Alunos", authenticateToken, authorizeAdmin, UsuariosController.getAlunoByNameOrEmail);
routes.get("/Usuarios/Buscar/Professores", authenticateToken, authorizeAdmin, UsuariosController.getProfessorByNameOrEmail);
routes.get("/Usuarios/:id", authenticateToken, authorizeAdmin, UsuariosController.getOne);
routes.get("/Usuarios/Fotos/Disponibilidade", authenticateToken, authorizeAdmin, FotosPerfilController.disponibilidade);
routes.put("/Usuarios/:id/Foto", authenticateToken, authorizeAdmin, receberFoto, FotosPerfilController.enviar);
routes.get("/Usuarios/:id/Foto", authenticateToken, FotosPerfilController.abrir);

routes.post("/Materias/Cadastrar", authenticateToken, authorizeAdmin, MateriasController.criarMateria);
routes.get("/Materias", authenticateToken, authorizeAdmin, MateriasController.listarMaterias);
routes.get("/Materia/:id", authenticateToken, authorizeAdmin, MateriasController.buscarMateriaPorId);
routes.put("/Materias/Editar/:id", authenticateToken, authorizeAdmin, MateriasController.editarMateria);
routes.get("/Materias/Buscar", authenticateToken, authorizeAdmin, MateriasController.getMateriaByName);

routes.post('/Simulado/Create', authenticateToken, authorizeAdmin, SimuladosController.create);
routes.get('/Simulados/FindByBimestreAnoSerie/:bimestre/:ano/:serie', authenticateToken, authorizeAdmin, SimuladosController.findSimuladoByBimestreAnoSerie);
routes.get('/Simulado/:id', authenticateToken, authorizeAdmin, SimuladosController.getOne);
routes.get('/Simulados', authenticateToken, authorizeAdmin, SimuladosController.getAll);
routes.get('/Turmas/ByTurma/:turma_id', authenticateToken, authorizeAdmin, SimuladosController.getByTurma);
routes.get('/Simulado/getByAluno/:aluno/:bimestre/:simulado', authenticateToken, authorizeAdmin, SimuladosController.getByAlunoAndBimestre);
routes.patch('/Simulado/Editar/:id', authenticateToken, authorizeAdmin, SimuladosController.update);
routes.get('/Simulados/Turma/:id', authenticateToken, authorizeAdmin, SimuladosController.getSimuladosByTurma);
routes.patch('/Simulado/AtualizarConteudos/:id', authenticateToken, authorizeAdmin, SimuladosController.atualizarConteudos);
routes.get('/Simulado/Simple/:id', authenticateToken, authorizeAdmin, SimuladosController.getOneSimple);
routes.get("/IA/Alunos/Atencao", authenticateToken, authorizeAdmin, IAController.listarAlunosEmAtencao);
routes.post("/IA/Alunos/Atencao/Sugestoes", authenticateToken, authorizeAdmin, IAController.sugerirAcoesAluno);

// Metodos mobile
routes.post('/Simulado/:simuladoId/Disciplina/:disciplinaId/SalvarNotas', SimuladosController.salvarNotas);
routes.get('/Simulados/getByAluno/:aluno', authenticateToken, SimuladosController.getByAluno);
routes.get('/Simulados/getByProfessor/:professor', authenticateToken, SimuladosController.getByProfessor);


routes.get("/Turmas/ano=:ano/professor=:professor", TurmasController.getByAnoAndProfessor);
routes.get('/Simulado/Disciplina/id=:disciplina', SimuladosController.getDesempenhoByDisciplina);
routes.get('/Simulado/:simulado_id/Disciplina/:disciplina_id', SimuladosController.getSimuladoDisciplinaAlunos);
routes.get('/Desempenho/ano=:ano/aluno=:aluno', SimuladosController.getDesempenhoByAnoAndAluno);
routes.get('/Simulados/ano=:ano/aluno=:aluno', SimuladosController.getSimuladosByAnoAndAluno);
routes.get('/Desempenho/aluno=:aluno/simulado=:simulado', SimuladosController.getDesempenhoAlunoBySimulado);
routes.get('/Professor/:professor/data/anoAtual', SimuladosController.getProfessorDataCurrentYear);
routes.get('/Calendario/aluno=:aluno', SimuladosController.getCalendarioByAluno);


// Metodo para presença
routes.post("/Presenca/Qr/Gerar", authenticateToken, authorizeAdmin, PresencasController.gerarQr);
routes.get("/Presenca/Qr/Simulado/:simulado_id", authenticateToken, authorizeAdmin, PresencasController.obterQrAtivo);
routes.patch("/Presenca/Qr/:qr_id/Revogar", authenticateToken, authorizeAdmin, PresencasController.revogarQr);
routes.get("/Presenca/Simulado/:simulado_id", authenticateToken, authorizeAdmin, PresencasController.listarPorSimulado);
routes.post("/Presenca/Registrar", authenticateToken, authorizeAluno, PresencasController.registrar);

// Metodo para importacao excel
routes.post('/Importacoes/Notas/Previa', authenticateToken, authorizeAdmin, receberPlanilha, ImportacaoController.previa);
routes.post('/Importacoes/Notas/Confirmar', authenticateToken, authorizeAdmin, receberPlanilha, ImportacaoController.confirmar);

export default routes;