import { Types } from 'mongoose';
import Materia from '../Models/Materia.js';
import TurmaDisciplina from '../Models/TurmaDisciplina.js';
import Usuario from '../Models/Usuario.js';
import { normalizarTexto } from './planilhaNotasParser.js';

// A revisão não grava nada antes do Confirmar: uma disciplina escolhida para uma coluna sem dono chega aqui com
// um id provisório, e a matéria pode ainda não existir. Este módulo confere esses pedidos e só cadastra a
// matéria e a disciplina depois que a importação inteira passou nas validações.

const { ObjectId } = Types;

// Ids provisórios que a revisão dá às disciplinas que ainda não existem na turma.
const PREFIXO_PROVISORIO = 'nova-';

const problema = (mensagem) => ({ codigo: 'DISCIPLINA_NOVA_INVALIDA', mensagem, celulas: [], coluna: null });

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const lista = (valor) => (Array.isArray(valor) ? valor : []);

/**
 * Confere as disciplinas novas da revisão sem gravar nada. Matéria com o mesmo nome de uma que já existe é usada
 * em vez de criar outra; disciplina que a turma já tem troca o id provisório pelo real; a mesma disciplina pedida
 * duas vezes aponta para o primeiro pedido, e a conferência acusa as duas colunas na mesma disciplina.
 */
export const resolverDisciplinasNovas = async ({ pedidas, turma_id }) => {
    const existentes = new Map();
    const aCriar = [];
    const bloqueios = [];
    const pedidos = lista(pedidas);
    if (pedidos.length === 0) return { existentes, aCriar, bloqueios };

    const idsDeProfessores = pedidos.map((pedido) => pedido?.professor_id).filter((id) => ObjectId.isValid(id));
    const [materias, professores, daTurma] = await Promise.all([
        Materia.find({}),
        Usuario.find({ _id: { $in: idsDeProfessores }, tipo_usuario: 'professor' }),
        TurmaDisciplina.find({ turma_id }),
    ]);
    const planejadas = new Map();

    pedidos.forEach((pedido) => {
        const id = texto(pedido?.id);
        const nomeDaMateria = texto(pedido?.materia_nome);
        if (!id.startsWith(PREFIXO_PROVISORIO)) {
            bloqueios.push(problema('Uma das disciplinas novas veio sem identificação. Importe de novo.'));
            return;
        }

        let materia = null;
        if (pedido.materia_id) {
            materia = materias.find(({ _id }) => String(_id) === String(pedido.materia_id));
            if (!materia) {
                bloqueios.push(problema(`A matéria ${nomeDaMateria || 'escolhida'} não existe mais no sistema. Importe de novo.`));
                return;
            }
        } else if (!nomeDaMateria) {
            bloqueios.push(problema('Uma das disciplinas novas veio sem matéria.'));
            return;
        } else {
            materia = materias.find(({ nome }) => normalizarTexto(nome) === normalizarTexto(nomeDaMateria)) ?? null;
        }

        const professor = professores.find(({ _id, tipo_usuario }) => String(_id) === String(pedido.professor_id) && tipo_usuario === 'professor');
        if (!professor) {
            bloqueios.push(problema(`O professor escolhido para ${materia?.nome ?? nomeDaMateria} não existe mais no sistema. Importe de novo.`));
            return;
        }

        const naTurma = materia && daTurma.find((d) => String(d.materia_id) === String(materia._id) && String(d.professor_id) === String(professor._id));
        if (naTurma) {
            existentes.set(id, String(naTurma._id));
            return;
        }

        const chave = `${materia ? String(materia._id) : `nome:${normalizarTexto(nomeDaMateria)}`}|${String(professor._id)}`;
        if (planejadas.has(chave)) {
            existentes.set(id, planejadas.get(chave));
            return;
        }
        planejadas.set(chave, id);

        aCriar.push({
            id,
            materia_id: materia ? String(materia._id) : null,
            materia_nome: materia ? materia.nome : nomeDaMateria,
            professor_id: String(professor._id),
            professor_nome: professor.nome,
        });
    });

    return { existentes, aCriar, bloqueios };
};

/**
 * Disciplinas ainda não cadastradas, no formato da conferência, para os ids provisórios passarem na validação.
 */
export const comoDisciplinasDaConferencia = (aCriar, mapa = new Map()) => aCriar.map((item) => ({
    _id: mapa.get(item.id) ?? item.id,
    materia: item.materia_nome,
    professor: item.professor_nome,
    materia_id: item.materia_id,
    professor_id: item.professor_id,
    nova: !mapa.has(item.id),
}));

/**
 * Troca ids de disciplina no que veio da tela: um provisório pelo real, ou um provisório repetido pelo primeiro.
 * Tipo, peso e questões só mudam conteúdos que já existem, que nunca têm id provisório.
 */
export const trocarIdsDasDisciplinas = (corpo, mapa) => {
    if (mapa.size === 0) return corpo;
    const trocar = (item) => ({ ...item, turma_disciplina_id: mapa.get(item?.turma_disciplina_id) ?? item?.turma_disciplina_id });
    return {
        ...corpo,
        colunas: lista(corpo.colunas).map(trocar),
        conteudosNovos: lista(corpo.conteudosNovos).map(trocar),
        novos: lista(corpo.novos).map((simulado) => ({ ...simulado, conteudos: lista(simulado?.conteudos).map(trocar) })),
    };
};

/**
 * Apaga o que cadastrarDisciplinasNovas criou, da disciplina para a matéria. Erros só vão para o log.
 */
export const desfazerCadastro = async ({ materias, disciplinas }) => {
    const etapas = [[TurmaDisciplina, disciplinas], [Materia, materias]];
    for (const [Modelo, documentos] of etapas) {
        if (documentos.length === 0) continue;
        try {
            await Modelo.deleteMany({ _id: { $in: documentos.map(({ _id }) => _id) } });
        } catch (error) {
            console.error(`Erro ao desfazer o cadastro de ${Modelo.modelName} da importação:`, error.message);
        }
    }
};

/**
 * Cadastra as matérias novas e depois as disciplinas, só depois de a importação passar nas validações.
 * Matéria nova usada por mais de uma disciplina é cadastrada uma vez. Se algo falhar, desfaz o que já foi feito.
 */
export const cadastrarDisciplinasNovas = async ({ aCriar, turma_id }) => {
    const criados = { materias: [], disciplinas: [] };
    const mapa = new Map();
    const materiasNovas = new Map();

    try {
        for (const item of aCriar) {
            let materiaId = item.materia_id;
            if (!materiaId) {
                const chave = normalizarTexto(item.materia_nome);
                if (!materiasNovas.has(chave)) {
                    const materia = await Materia.create({ nome: item.materia_nome });
                    criados.materias.push(materia);
                    materiasNovas.set(chave, String(materia._id));
                }
                materiaId = materiasNovas.get(chave);
            }

            const disciplina = await TurmaDisciplina.create({ turma_id, materia_id: materiaId, professor_id: item.professor_id });
            criados.disciplinas.push(disciplina);
            mapa.set(item.id, String(disciplina._id));
        }
    } catch (error) {
        await desfazerCadastro(criados);
        throw error;
    }

    return { mapa, criados };
};
