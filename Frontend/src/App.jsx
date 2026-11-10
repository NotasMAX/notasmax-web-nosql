import { BrowserRouter ,Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from "./components/Layout";
import Turmas from "./pages/Turmas";
import TurmasCadastrar from "./pages/TurmasCadastrar";
import TurmasEditar from "./pages/TurmasEditar";
import Home from "./pages/Home";
import Login from "./pages/LoginPage";
import RecuperarSenha from "./pages/RecuperarSenha";
import ResetSenha from "./pages/ResetSenha";
import MateriaCadastrar from "./pages/MateriaCadastrar";
import MateriaListar from "./pages/MateriaListar";
import MateriaEditar from "./pages/MateriaEditar";
import Simulados from "./pages/Simulados";
import TurmasSimulados from "./pages/TurmasSimulados";
import TurmaAlunosNotas from "./pages/TurmaAlunosNotas";
import TurmaAlunoBoletim from "./pages/TurmaAlunoBoletim";
import SimuladosAlunosList from "./pages/SimuladosAlunosList";
import SimuladoNotasPorMateria from "./pages/SimuladoNotasPorMateria";
import SimuladoNotasPorSimulado from "./pages/SimuladoNotasPorSimulado";
import AlunoCadastrar from "./pages/AlunoCadastrar";
import AlunoListar from "./pages/AlunoListar";
import AlunoEditar from "./pages/AlunoEditar";
import AlunoVisualizar from "./pages/AlunoVisualizar";
import ProfessorCadastrar from "./pages/ProfessorCadastrar";
import ProfessorListar from "./pages/ProfessorListar";
import ProfessorEditar from "./pages/ProfessorEditar";
import ProfessorVisualizar from "./pages/ProfessorVisualizar";
import SimuladosCadastrar from "./pages/SimuladosCadastrar";
import SimuladosEditar from "./pages/SimuladosEditar";
import AlunoDesempenho from "./pages/AlunoDesempenho";
import TurmaDesempenho from "./pages/TurmaDesempenho";
import TurmasAcertosPorMateria from "./pages/TurmasAcertosPorMateria";
import NotFound from "./pages/NotFound";
import SimuladosNotas from "./pages/SimuladosNotas";
import SimuladosNotasIndividual from "./pages/SimuladosNotasIndividual";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/Login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/Login" replace />;
  if (user && user.tipo_usuario !== 'administrador') return <div>Acesso negado.</div>;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/reset" element={
            <GuestRoute>
              <ResetSenha />
            </GuestRoute>
          } />

          <Route path="/Login" element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          } />

          <Route path="/Home" element={
            <AdminRoute>
              <Layout>
                <Home />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/" element={
            <AdminRoute>
              <Layout>
                <Home />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/recuperar-senha" element={
            <GuestRoute>
              <RecuperarSenha />
            </GuestRoute>
          } />

          <Route path="Turmas/Cadastrar" element={
            <AdminRoute>
              <Layout>
                <TurmasCadastrar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="Turmas/:ano?" element={
            <AdminRoute>
              <Layout>
                <Turmas />
              </Layout>
            </AdminRoute>
          } />

          <Route path="Turmas/Editar/:id" element={
            <AdminRoute>
              <Layout>
                <TurmasEditar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="Turmas/:id/Notas/Alunos" element={
            <AdminRoute><Layout><TurmaAlunosNotas /></Layout></AdminRoute>
          } />
          <Route path="Turmas/:id/Notas/Aluno/:alunoId" element={
            <AdminRoute><Layout><TurmaAlunoBoletim /></Layout></AdminRoute>
          } />

          <Route path="Turmas/Info/:id" element={
            <Layout>
              <TurmasSimulados />
            </Layout>
          } />

          <Route path="Turma/:id" element={
            <AdminRoute>
              <Layout>
                <TurmasSimulados />
              </Layout>
            </AdminRoute>
          } />

          <Route path="Turmas/:turma/Simulados/:simulado?/Notas/:aluno?" element={
            <AdminRoute>
              <Layout>
                <SimuladosNotas />
              </Layout>
            </AdminRoute>
          } />

          <Route path="Turmas/:turma/Aluno/:aluno/Simulado/:simulado/Notas/" element={
            <Layout>
              <SimuladosNotasIndividual />
            </Layout>
          } />


          <Route path="Turmas/Simulado/Aluno/:id" element={
            <Layout>
              <SimuladosAlunosList />
            </Layout>
          } />

          <Route path="/Simulados" element={
            <AdminRoute>
              <Layout>
                <Simulados />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Simulados/:bimestre/:ano/:serie?" element={
            <AdminRoute>
              <Layout>
                <Simulados />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Simulados/Notas/:simulado/:aluno" element={
            <AdminRoute>
              <Layout>
                <SimuladosNotas />
              </Layout>
            </AdminRoute>
          } />
          
          <Route path="/Simulados/Cadastrar" element={
            <AdminRoute>
              <Layout>
                <SimuladosCadastrar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Simulados/Editar/:id" element={
            <AdminRoute>
              <Layout>
                <SimuladosEditar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Simulados/Notas/:simuladoIdParams/:bimestre/:alunoId" element={
            <Layout>
              <SimuladoNotasPorSimulado />
            </Layout>
          } />

          <Route path="/Simulados/Notas/Materia/:simuladoIdParams/:bimestre/:alunoId" element={
            <Layout>
              <SimuladoNotasPorMateria />
            </Layout>
          } />

          <Route path="/Materias/Cadastrar" element={
            <AdminRoute>
              <Layout>
                <MateriaCadastrar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Materias" element={
            <AdminRoute>
              <Layout>
                <MateriaListar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Materias/Editar/:id" element={
            <AdminRoute>
              <Layout>
                <MateriaEditar />
              </Layout>
            </AdminRoute>
          } />

          {/* Rotas de Alunos */}
          <Route path="/Alunos/Cadastrar" element={
            <AdminRoute>
              <Layout>
                <AlunoCadastrar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Alunos" element={
            <AdminRoute>
              <Layout>
                <AlunoListar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Alunos/Visualizar/:id" element={
            <AdminRoute>
              <Layout>
                <AlunoVisualizar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Alunos/Editar/:id" element={
            <AdminRoute>
              <Layout>
                <AlunoEditar />
              </Layout>
            </AdminRoute>
          } />

          {/* Rotas de Professores */}
          <Route path="/Professores/Cadastrar" element={
            <AdminRoute>
              <Layout>
                <ProfessorCadastrar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Professores" element={
            <AdminRoute>
              <Layout>
                <ProfessorListar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Professores/Visualizar/:id" element={
            <AdminRoute>
              <Layout>
                <ProfessorVisualizar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Professores/Editar/:id" element={
            <AdminRoute>
              <Layout>
                <ProfessorEditar />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Usuarios/Aluno/:id/desempenho" element={
            <AdminRoute>
              <Layout>
                <AlunoDesempenho />
              </Layout>
            </AdminRoute>

          } />

          <Route path="/Turma/:id/desempenho" element={
            <AdminRoute>
              <Layout>
                <TurmaDesempenho />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/Turma/:id/desempenho-materias" element={
            <AdminRoute>
              <Layout>
                <TurmasAcertosPorMateria />
              </Layout>
            </AdminRoute>
          } />

          <Route path="/404" element={
            <NotFound />
          } />

          <Route path="*" element={
            <Navigate to="/404" replace />
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>

  );
}

export default App;