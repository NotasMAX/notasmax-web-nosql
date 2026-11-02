import "./conn.js";
import bcrypt from "bcryptjs";
import Usuario from "../Models/Usuario.js";
import Turma from "../Models/Turma.js";
import Materia from "../Models/Materia.js";
import TurmaDisciplina from "../Models/TurmaDisciplina.js";
import Simulado from "../Models/Simulado.js";
import MapeamentoColuna from "../Models/MapeamentoColuna.js";
import { normalizarTexto } from "../services/planilhaNotasParser.js";

// Dados fictícios para testar a importação de notas por planilha.
// ATENÇÃO: apaga usuários, turmas, matérias, disciplinas, simulados e colunas guardadas do banco local antes de inserir.

const SENHA = "admin123";
const UM_DIA = 24 * 60 * 60 * 1000;
const SIMULADOS_POR_BIMESTRE = 6;

const ADMIN = "Admin";

const PROFESSORES = [
    "Lourdes Prado", "Toni Almeida", "Ana Teixeira", "Duda Campos", "Beto Ramos",
    "Cida Moura", "Helena Vaz", "Igor Nunes", "Regina Reis", "Caio Dias",
];

// Mesma ordem das colunas da planilha de exemplo, com duas Físicas e duas Matemáticas.
// O peso é o fator da Nota Objetivo em porcentagem. Com 6 simulados, a nota nunca passa de 10.
const DISCIPLINAS = [
    { materia: "Física", professor: "Lourdes Prado", peso: 30, quantidade_questoes: 3 },
    { materia: "Inglês", professor: "Helena Vaz", peso: 60, quantidade_questoes: 2 },
    { materia: "Filosofia", professor: "Igor Nunes", peso: 60, quantidade_questoes: 2 },
    { materia: "Sociologia", professor: "Igor Nunes", peso: 60, quantidade_questoes: 2 },
    { materia: "Matemática", professor: "Ana Teixeira", peso: 30, quantidade_questoes: 3 },
    { materia: "Gramática", professor: "Regina Reis", peso: 60, quantidade_questoes: 2 },
    { materia: "Química", professor: "Beto Ramos", peso: 30, quantidade_questoes: 3 },
    { materia: "Literatura", professor: "Regina Reis", peso: 60, quantidade_questoes: 2 },
    { materia: "Física", professor: "Toni Almeida", peso: 30, quantidade_questoes: 3 },
    { materia: "História", professor: "Caio Dias", peso: 30, quantidade_questoes: 3 },
    { materia: "Biologia", professor: "Cida Moura", peso: 30, quantidade_questoes: 3 },
    { materia: "Geografia", professor: "Caio Dias", peso: 40, quantidade_questoes: 3 },
    { materia: "Matemática", professor: "Duda Campos", peso: 30, quantidade_questoes: 3 },
];

const TURMAS = [
    { serie: 1, alunos: ["Lucas Santos", "Sofia Oliveira", "Mateus Costa", "Isabela Pereira", "Gustavo Almeida"] },
    { serie: 2, alunos: ["Camila Rodrigues", "Rafael Lima", "Larissa Souza", "Bruno Fernandes", "Mariana Gomes"] },
    { serie: 3, alunos: ["Thiago Ribeiro", "Julia Carvalho", "Felipe Silva", "Amanda Torres", "Leonardo Mendes"] },
];

// Cada bimestre cobre um cenário da importação. Datas relativas a hoje, em dias.
const BIMESTRES = [
    // Notas já lançadas e cadastro antigo: a conferência mostra o valor antigo e o novo, com aviso de prazo.
    { bimestre: 1, criadoHaDias: 160, diaDoSimulado: (numero) => 7 * numero - 150, comNotas: true },
    // Provas realizadas, sem notas e cadastro antigo: importação com aviso de prazo.
    { bimestre: 2, criadoHaDias: 100, diaDoSimulado: (numero) => 7 * numero - 90 },
    // Provas realizadas, sem notas e cadastro recente: importação sem nenhum aviso.
    { bimestre: 3, diaDoSimulado: (numero) => numero - 7 },
    // Provas futuras: a conferência avisa que a data ainda não chegou.
    { bimestre: 4, diaDoSimulado: (numero) => 7 * numero },
];

const emailDe = (nome) => `${normalizarTexto(nome).replace(/ /g, ".")}@notasmax.test`;

const telefoneDe = (prefixo, indice) => `${prefixo}${String(indice).padStart(4, "0")}`;

const gerarResultados = (alunos, numero, indiceDisciplina, quantidade_questoes) => alunos
    // O último aluno da turma não fez o SIM 5: fica sem resultado, não com zero.
    .filter((_, indiceAluno) => numero !== 5 || indiceAluno !== alunos.length - 1)
    .map((aluno_id, indiceAluno) => {
        const acertos = (indiceAluno + indiceDisciplina + numero) % (quantidade_questoes + 1);
        return {
            aluno_id,
            acertos,
            nota: Math.round(((acertos / quantidade_questoes) * 10) * 100) / 100,
            notificacao_enviada: "enviada",
        };
    });

const seedDatabase = async () => {
    try {
        console.log("🌱 Iniciando seed da importação...");

        await Usuario.deleteMany({});
        await Turma.deleteMany({});
        await Materia.deleteMany({});
        await TurmaDisciplina.deleteMany({});
        await Simulado.deleteMany({});
        await MapeamentoColuna.deleteMany({});
        console.log("✓ Coleções limpas");

        // ===== USUÁRIOS =====
        const senha = await bcrypt.hash(SENHA, 12);
        const usuario = (nome, tipo_usuario, telefone_contato) => ({ nome, email: emailDe(nome), telefone_contato, senha, tipo_usuario });

        const usuarios = await Usuario.insertMany([
            usuario(ADMIN, "administrador", "11990000000"),
            ...PROFESSORES.map((nome, indice) => usuario(nome, "professor", telefoneDe("1198000", indice))),
            ...TURMAS.flatMap(({ alunos }) => alunos).map((nome, indice) => ({
                ...usuario(nome, "aluno", telefoneDe("1197000", indice)),
                nome_responsavel: `Responsável de ${nome}`,
                telefone_responsavel: telefoneDe("1196000", indice),
            })),
        ]);
        const idDoUsuario = new Map(usuarios.map(({ nome, _id }) => [ nome, _id ]));
        console.log(`✓ ${usuarios.length} usuários criados`);

        // ===== MATÉRIAS =====
        const nomesDasMaterias = [ ...new Set(DISCIPLINAS.map(({ materia }) => materia)) ];
        const materias = await Materia.insertMany(nomesDasMaterias.map(nome => ({ nome })));
        const idDaMateria = new Map(materias.map(({ nome, _id }) => [ nome, _id ]));
        console.log(`✓ ${materias.length} matérias criadas`);

        // ===== TURMAS =====
        const ano = new Date().getFullYear();
        const turmas = await Turma.insertMany([
            ...TURMAS.map(({ serie, alunos }) => ({ serie, ano, alunos: alunos.map(nome => idDoUsuario.get(nome)) })),
            // Os alunos do 2º EM fizeram o 1º EM no ano passado, então aparecem em duas turmas.
            { serie: 1, ano: ano - 1, alunos: TURMAS[ 1 ].alunos.map(nome => idDoUsuario.get(nome)) },
        ]);
        console.log(`✓ ${turmas.length} turmas criadas`);

        // ===== TURMA-DISCIPLINAS =====
        const turmaDisciplinas = await TurmaDisciplina.insertMany(turmas.flatMap(turma => DISCIPLINAS.map(({ materia, professor }) => ({
            turma_id: turma._id,
            professor_id: idDoUsuario.get(professor),
            materia_id: idDaMateria.get(materia),
        }))));
        console.log(`✓ ${turmaDisciplinas.length} turma-disciplinas criadas`);

        // ===== SIMULADOS =====
        const emDias = (dias) => new Date(Date.now() + dias * UM_DIA);
        const simuladosData = [];

        for (const turma of turmas.filter(turma => turma.ano === ano)) {
            const disciplinasDaTurma = turmaDisciplinas.filter(({ turma_id }) => turma_id.equals(turma._id));

            for (const { bimestre, criadoHaDias, diaDoSimulado, comNotas } of BIMESTRES) {
                for (let numero = 1; numero <= SIMULADOS_POR_BIMESTRE; numero++) {
                    simuladosData.push({
                        numero,
                        tipo: numero === SIMULADOS_POR_BIMESTRE ? "dissertativo" : "objetivo",
                        bimestre,
                        data_realizacao: emDias(diaDoSimulado(numero)),
                        turma_id: turma._id,
                        conteudos: disciplinasDaTurma.map(({ _id }, indiceDisciplina) => {
                            const { peso, quantidade_questoes } = DISCIPLINAS[ indiceDisciplina ];
                            return {
                                turma_disciplina_id: _id,
                                peso,
                                quantidade_questoes,
                                resultados: comNotas ? gerarResultados(turma.alunos, numero, indiceDisciplina, quantidade_questoes) : [],
                            };
                        }),
                        ...(criadoHaDias && { createdAt: emDias(-criadoHaDias) }),
                    });
                }
            }
        }

        const simulados = await Simulado.insertMany(simuladosData);
        console.log(`✓ ${simulados.length} simulados criados`);

        console.log("✅ Seed da importação concluído!");
        console.log(`   Senha de todos os usuários: ${SENHA}`);
        console.log(`   Admin: ${emailDe(ADMIN)}`);
        console.log(`   Professor: ${emailDe(PROFESSORES[ 0 ])}`);
        console.log(`   Aluno: ${emailDe(TURMAS[ 0 ].alunos[ 0 ])}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Erro ao fazer o seed da importação:", error);
        process.exit(1);
    }
};

seedDatabase();
