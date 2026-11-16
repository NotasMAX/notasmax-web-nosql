import { normalizarTexto } from './planilhaNotasParser.js';

// validarConferencia e calcularNotas têm uma cópia em Frontend/src/utils/conferenciaNotas.js, que
// recalcula a tela a cada alteração. test/conferencia-notas.test.js garante que as duas dão o mesmo resultado.

const UM_DIA = 24 * 60 * 60 * 1000;
const PRAZO_EDICAO_EM_DIAS = 16;
const NOTA_MAXIMA = 10;
const TOLERANCIA = 0.001;
const TIPOS = ['objetivo', 'dissertativo'];

// Problemas da leitura que a conferência recalcula, porque o admin pode corrigi-los na tela.
const CODIGOS_RECALCULADOS = ['ACERTOS_INVALIDO', 'CELULAS_VAZIAS'];

const problema = (codigo, mensagem, celulas = [], coluna = null) => ({ codigo, mensagem, celulas, coluna });

const decimal = (valor) => Number(valor).toFixed(2).replace('.', ',');

const pesoValido = (peso) => Number.isInteger(peso) && peso > 0 && peso <= 100;

/**
 * Soma as notas de uma disciplina. Simulado que não está na planilha conta com a nota já lançada.
 */
export const calcularNotas = ({ colunas, simulados, linhas }, turma_disciplina_id) => {
    const coluna = colunas.find((c) => c.turma_disciplina_id === turma_disciplina_id);
    const notas = { objetiva: 0, dissertativa: 0, final: 0, totalAcertos: 0, totalQuestoes: 0 };

    simulados.forEach((simulado) => {
        const conteudo = simulado.conteudos.find((c) => c.turma_disciplina_id === turma_disciplina_id);
        if (!conteudo) return;

        const linha = linhas.find(({ numero }) => numero === simulado.numero);
        const celula = linha && coluna ? linha.celulas.find((c) => c.coluna === coluna.coluna) : null;
        // Sem célula, vale o que já está lançado: a confirmação só mexe nas células que existem.
        const acertos = celula ? (celula.status === 'acertos' ? celula.acertos : null) : conteudo.acertosAtuais;
        if (typeof acertos !== 'number') return;

        const nota = (acertos * (Number(conteudo.peso) || 0)) / 100;
        notas[simulado.tipo === 'dissertativo' ? 'dissertativa' : 'objetiva'] += nota;
        notas.final += nota;
        notas.totalAcertos += acertos;
        notas.totalQuestoes += conteudo.quantidade_questoes;
    });

    return notas;
};

/**
 * Aplica as regras da conferência sobre o estado atual, seja o da planilha ou o que o admin ajustou.
 */
export const validarConferencia = (estado) => {
    const { colunas, disciplinas, simulados, linhas, bimestre } = estado;
    const bloqueios = [];
    const avisos = [];

    const nomeDe = (id) => {
        const disciplina = disciplinas.find(({ _id }) => _id === id);
        return disciplina ? `${disciplina.materia} - ${disciplina.professor}` : 'Disciplina';
    };
    const colunaDe = (id) => colunas.find((c) => c.turma_disciplina_id === id)?.coluna ?? null;

    colunas.filter((c) => !c.turma_disciplina_id).forEach(({ coluna, cabecalhoOriginal }) => {
        bloqueios.push(problema('COLUNA_SEM_DISCIPLINA', `Coluna ${coluna} ("${cabecalhoOriginal}"): escolha a disciplina da turma.`, [], coluna));
    });

    const colunasLigadas = colunas.filter((c) => c.turma_disciplina_id);
    new Set(colunasLigadas.map((c) => c.turma_disciplina_id)).forEach((id) => {
        const iguais = colunasLigadas.filter((c) => c.turma_disciplina_id === id);
        if (iguais.length < 2) return;
        const nomes = iguais.map(({ coluna, cabecalhoOriginal }) => `${coluna} ("${cabecalhoOriginal}")`).join(' e ');
        iguais.forEach(({ coluna }) => {
            bloqueios.push(problema('COLUNAS_MESMA_DISCIPLINA', `As colunas ${nomes} estão ligadas à mesma disciplina: ${nomeDe(id)}.`, [], coluna));
        });
    });

    linhas.forEach(({ numero, celulas }) => {
        const doNumero = simulados.filter((s) => s.numero === numero);
        if (doNumero.length === 0) {
            bloqueios.push(problema('SIM_SEM_SIMULADO', `A linha SIM ${numero} não tem simulado cadastrado para esta turma no ${bimestre}º bimestre.`));
        }
        if (doNumero.length > 1) {
            bloqueios.push(problema('SIMULADO_DUPLICADO', `Há mais de um simulado com o número ${numero} para esta turma no ${bimestre}º bimestre.`));
        }
        const simulado = doNumero.length === 1 ? doNumero[0] : null;

        const vazias = celulas.filter(({ status }) => status === 'vazia').map(({ celula }) => celula);
        if (vazias.length > 0) {
            avisos.push(problema('CELULAS_VAZIAS', `SIM ${numero}: sem valor em ${vazias.join(', ')}; vale como nulo.`, vazias));
        }

        celulas.forEach(({ coluna, celula, status, acertos, bruto }) => {
            if (status === 'invalida') {
                bloqueios.push(problema('ACERTOS_INVALIDO', `Célula ${celula}: "${bruto}" não é válido. Use um número inteiro de acertos, "não fez" ou "faltou".`, [celula], coluna));
                return;
            }

            const id = colunas.find((c) => c.coluna === coluna)?.turma_disciplina_id;
            if (!simulado || !id) return;

            const conteudo = simulado.conteudos.find((c) => c.turma_disciplina_id === id);
            if (!conteudo) {
                if (status === 'acertos') {
                    bloqueios.push(problema('DISCIPLINA_FORA_DO_SIMULADO', `Célula ${celula}: ${nomeDe(id)} não faz parte do simulado ${numero}.`, [celula], coluna));
                }
                return;
            }

            if (status === 'acertos' && acertos > conteudo.quantidade_questoes) {
                bloqueios.push(problema('ACERTOS_ACIMA_DO_LIMITE', `Célula ${celula}: ${acertos} acertos é mais do que as ${conteudo.quantidade_questoes} questões de ${nomeDe(id)} no simulado ${numero}.`, [celula], coluna));
            }

            const novo = status === 'acertos' ? acertos : null;
            if (typeof conteudo.acertosAtuais === 'number' && conteudo.acertosAtuais !== novo) {
                const destino = novo === null ? 'nulo, e a nota lançada será removida' : String(novo);
                avisos.push(problema('JA_TEM_RESULTADO', `Célula ${celula}: o aluno já tem ${conteudo.acertosAtuais} acerto(s) em ${nomeDe(id)} no simulado ${numero}; vai passar para ${destino}.`, [celula], coluna));
            }
        });
    });

    simulados.forEach((simulado) => {
        const { numero, tipo, tipoOriginal, foraDoPrazo, dataFutura, data_realizacao, alunosComResultado, conteudos } = simulado;
        const estaNaPlanilha = linhas.some((linha) => linha.numero === numero);
        const tipoAlterado = tipo !== tipoOriginal;

        if (tipoAlterado) {
            avisos.push(problema('TIPO_ALTERADO', `Simulado ${numero}: a troca de tipo vale para todas as disciplinas e para todos os alunos da turma. Alunos com resultado lançado: ${alunosComResultado}.`));
        }

        const pesosAlterados = conteudos.filter(({ peso, pesoOriginal }) => peso !== pesoOriginal);
        pesosAlterados.forEach(({ turma_disciplina_id: id, peso, alunosComResultado: comResultado }) => {
            if (pesoValido(peso)) {
                avisos.push(problema('PESO_ALTERADO', `Simulado ${numero}, ${nomeDe(id)}: a troca de peso vale para todos os alunos da turma. Alunos com resultado lançado: ${comResultado}.`, [], colunaDe(id)));
            } else {
                bloqueios.push(problema('PESO_INVALIDO', `Simulado ${numero}, ${nomeDe(id)}: o peso deve ser um número inteiro maior que 0 e no máximo 100.`, [], colunaDe(id)));
            }
        });

        if ((tipoAlterado || pesosAlterados.length > 0) && foraDoPrazo) {
            avisos.push(problema('FORA_DO_PRAZO', `Simulado ${numero}: já passou do prazo de ${PRAZO_EDICAO_EM_DIAS} dias da tela de edição. Só o admin pode alterar tipo e peso, por esta conferência.`));
        }
        if (dataFutura && estaNaPlanilha) {
            avisos.push(problema('DATA_FUTURA', `Simulado ${numero}: a data de realização (${new Date(data_realizacao).toLocaleDateString('pt-BR')}) ainda não chegou. As notas só aparecem no desempenho depois dela.`));
        }
        if (!estaNaPlanilha && conteudos.some(({ acertosAtuais }) => typeof acertosAtuais === 'number')) {
            avisos.push(problema('SIMULADO_FORA_DA_PLANILHA', `Simulado ${numero}: não está na planilha, e as notas já lançadas dele continuam valendo.`));
        }
    });

    colunasLigadas.forEach(({ coluna, turma_disciplina_id: id, fator, notaDissertativaPlanilha }) => {
        const { dissertativa, final } = calcularNotas(estado, id);
        if (final > NOTA_MAXIMA + TOLERANCIA) {
            bloqueios.push(problema('NOTA_ACIMA_DE_10', `${nomeDe(id)}: a nota final daria ${decimal(final)}, e o máximo é ${NOTA_MAXIMA}. Corrija o peso ou os acertos.`, [], coluna));
        }

        const pesos = simulados
            .filter((s) => linhas.some((linha) => linha.numero === s.numero))
            .map((s) => s.conteudos.find((c) => c.turma_disciplina_id === id)?.peso)
            .filter((peso) => peso !== undefined);
        const diferentes = [...new Set(pesos)].filter((peso) => Math.abs(fator * 100 - Number(peso)) > TOLERANCIA);
        if (typeof fator === 'number' && diferentes.length > 0) {
            avisos.push(problema('FATOR_DIFERENTE', `${nomeDe(id)}: a fórmula da Nota Objetivo usa o fator ${String(fator).replace('.', ',')}, mas o peso cadastrado é ${diferentes.join(' e ')}.`, [], coluna));
        }

        if (typeof notaDissertativaPlanilha === 'number' && Math.abs(notaDissertativaPlanilha - dissertativa) > TOLERANCIA) {
            avisos.push(problema('NOTA_DISSERTATIVA_DIFERENTE', `${nomeDe(id)}: a nota dissertativa calculada é ${decimal(dissertativa)}, e a da planilha é ${decimal(notaDissertativaPlanilha)}.`, [], coluna));
        }
    });

    return { bloqueios, avisos };
};

/**
 * Liga uma coluna a uma disciplina: primeiro pela escolha guardada, depois pela matéria e, se ela se repetir,
 * pelo professor. Sem certeza, deixa a coluna sem dono para o admin escolher.
 */
export const ligarColuna = ({ cabecalho, materia, professor }, disciplinas, mapeamentos = []) => {
    const guardada = mapeamentos.find((m) => m.cabecalho === cabecalho);
    if (guardada && disciplinas.some(({ _id }) => _id === String(guardada.turma_disciplina_id))) {
        return { turma_disciplina_id: String(guardada.turma_disciplina_id), origemLigacao: 'guardada' };
    }

    const daMateria = disciplinas.filter((d) => normalizarTexto(d.materia) === materia);
    const candidatas = daMateria.length > 1 && professor
        ? daMateria.filter((d) => {
            const nome = normalizarTexto(d.professor);
            return nome.startsWith(professor) || nome.split(' ').some((palavra) => palavra.startsWith(professor));
        })
        : daMateria;

    return candidatas.length === 1
        ? { turma_disciplina_id: candidatas[0]._id, origemLigacao: 'automatica' }
        : { turma_disciplina_id: null, origemLigacao: null };
};

const paraTexto = (id) => String(id);

/**
 * Traduz os simulados do banco para o formato usado na conferência, do ponto de vista de um aluno.
 */
export const montarSimulados = (simulados, aluno_id, agora = new Date()) => simulados.map((simulado) => {
    const comResultado = new Set(simulado.conteudos.flatMap(({ resultados }) => resultados.map((r) => paraTexto(r.aluno_id))));

    return {
        _id: paraTexto(simulado._id),
        numero: simulado.numero,
        tipo: simulado.tipo,
        tipoOriginal: simulado.tipo,
        data_realizacao: simulado.data_realizacao,
        foraDoPrazo: agora.getTime() - new Date(simulado.createdAt).getTime() >= PRAZO_EDICAO_EM_DIAS * UM_DIA,
        dataFutura: new Date(simulado.data_realizacao).getTime() > agora.getTime(),
        alunosComResultado: comResultado.size,
        conteudos: simulado.conteudos.map(({ turma_disciplina_id, peso, quantidade_questoes, resultados }) => ({
            turma_disciplina_id: paraTexto(turma_disciplina_id),
            peso,
            pesoOriginal: peso,
            quantidade_questoes,
            alunosComResultado: resultados.length,
            acertosAtuais: resultados.find((r) => paraTexto(r.aluno_id) === paraTexto(aluno_id))?.acertos ?? null,
        })),
    };
});

/**
 * Monta a resposta da prévia a partir da leitura da planilha e do cadastro da turma.
 */
export const montarPrevia = ({ leitura, bimestreTela, aluno, turma, disciplinas, simulados, mapeamentos, agora = new Date() }) => {
    const bloqueiosDaPlanilha = leitura.bloqueios.filter(({ codigo }) => !CODIGOS_RECALCULADOS.includes(codigo));
    const avisosDaPlanilha = leitura.avisos.filter(({ codigo }) => !CODIGOS_RECALCULADOS.includes(codigo));

    if (leitura.bimestre !== null && leitura.bimestre !== bimestreTela) {
        bloqueiosDaPlanilha.push(problema('BIMESTRE_DIFERENTE', `A planilha é do ${leitura.bimestre}º bimestre, mas a tela está no ${bimestreTela}º bimestre.`, ['A2']));
    }

    const colunas = leitura.colunas.map((coluna) => ({
        coluna: coluna.coluna,
        cabecalho: coluna.cabecalho,
        cabecalhoOriginal: coluna.cabecalhoOriginal,
        fator: coluna.fator,
        notaDissertativaPlanilha: coluna.notaDissertativa,
        ...ligarColuna(coluna, disciplinas, mapeamentos),
    }));

    const estado = {
        bimestre: bimestreTela,
        colunas,
        disciplinas,
        simulados: montarSimulados(simulados, aluno._id, agora),
        linhas: leitura.linhas,
    };
    const { bloqueios, avisos } = validarConferencia(estado);

    return {
        ...estado,
        aba: leitura.aba,
        abas: leitura.abas,
        aluno,
        turma,
        podeConferir: leitura.bimestre === bimestreTela && colunas.length > 0 && leitura.linhas.length > 0,
        problemasDaPlanilha: { bloqueios: bloqueiosDaPlanilha, avisos: avisosDaPlanilha },
        bloqueios: [...bloqueiosDaPlanilha, ...bloqueios],
        avisos: [...avisosDaPlanilha, ...avisos],
    };
};

const normalizarCelula = ({ coluna, celula, acertos, bruto }) => {
    if (acertos === null || acertos === undefined) return { coluna, celula, status: 'nao_fez' };
    return Number.isInteger(acertos) && acertos >= 0
        ? { coluna, celula, status: 'acertos', acertos }
        : { coluna, celula, status: 'invalida', bruto: String(bruto ?? acertos) };
};

/**
 * Reconstrói o estado com o que o admin mandou, sem confiar no que veio da tela: tudo é validado sobre o cadastro atual.
 */
export const montarEstadoDaConfirmacao = ({ payload, disciplinas, simulados, aluno_id, bimestre, agora = new Date() }) => {
    const bloqueios = [];
    const estadoSimulados = montarSimulados(simulados, aluno_id, agora);
    const idsDasDisciplinas = disciplinas.map(({ _id }) => _id);

    (payload.tipos ?? []).forEach(({ simulado_id, tipo }) => {
        const simulado = estadoSimulados.find(({ _id }) => _id === simulado_id);
        if (!simulado) bloqueios.push(problema('SIMULADO_INVALIDO', 'Um dos simulados alterados não existe mais nesta turma e bimestre.'));
        else if (!TIPOS.includes(tipo)) bloqueios.push(problema('TIPO_INVALIDO', `Simulado ${simulado.numero}: o tipo deve ser objetivo ou dissertativo.`));
        else simulado.tipo = tipo;
    });

    (payload.pesos ?? []).forEach(({ simulado_id, turma_disciplina_id, peso }) => {
        const simulado = estadoSimulados.find(({ _id }) => _id === simulado_id);
        const conteudo = simulado?.conteudos.find((c) => c.turma_disciplina_id === turma_disciplina_id);
        if (!conteudo) bloqueios.push(problema('SIMULADO_INVALIDO', 'Um dos pesos alterados é de uma disciplina que não está mais no simulado.'));
        else conteudo.peso = peso;
    });

    const estado = {
        bimestre,
        disciplinas,
        simulados: estadoSimulados,
        colunas: (payload.colunas ?? []).map(({ coluna, cabecalho, cabecalhoOriginal, fator, notaDissertativaPlanilha, turma_disciplina_id }) => ({
            coluna,
            cabecalho,
            cabecalhoOriginal,
            fator: fator ?? null,
            notaDissertativaPlanilha: notaDissertativaPlanilha ?? null,
            turma_disciplina_id: idsDasDisciplinas.includes(turma_disciplina_id) ? turma_disciplina_id : null,
        })),
        linhas: (payload.linhas ?? []).map(({ numero, celulas }) => ({ numero, celulas: (celulas ?? []).map(normalizarCelula) })),
    };

    return { estado, bloqueios };
};

/**
 * Peso alterado vale para a turma inteira, então a nota dos outros alunos também não pode passar do máximo.
 */
export const validarOutrosAlunos = ({ estado, simulados, aluno_id, nomesDosAlunos }) => {
    const bloqueios = [];
    const alteradas = new Set(estado.simulados.flatMap(({ conteudos }) => conteudos
        .filter(({ peso, pesoOriginal }) => peso !== pesoOriginal)
        .map(({ turma_disciplina_id }) => turma_disciplina_id)));

    alteradas.forEach((id) => {
        const somas = new Map();
        simulados.forEach((simulado) => {
            const conteudo = simulado.conteudos.find((c) => paraTexto(c.turma_disciplina_id) === id);
            const peso = estado.simulados.find(({ _id }) => _id === paraTexto(simulado._id))
                ?.conteudos.find((c) => c.turma_disciplina_id === id)?.peso;
            (conteudo?.resultados ?? []).forEach(({ aluno_id: outro, acertos }) => {
                const chave = paraTexto(outro);
                if (chave !== paraTexto(aluno_id)) somas.set(chave, (somas.get(chave) ?? 0) + (acertos * Number(peso)) / 100);
            });
        });

        const disciplina = estado.disciplinas.find(({ _id }) => _id === id);
        somas.forEach((nota, chave) => {
            if (nota > NOTA_MAXIMA + TOLERANCIA) {
                bloqueios.push(problema('NOTA_DE_OUTRO_ALUNO_ACIMA_DE_10', `Com esse peso, a nota de ${nomesDosAlunos.get(chave) ?? 'outro aluno'} em ${disciplina?.materia} - ${disciplina?.professor} daria ${decimal(nota)}, e o máximo é ${NOTA_MAXIMA}.`));
            }
        });
    });

    return bloqueios;
};

/**
 * Traduz a conferência em operações de banco, sem substituir o array conteudos inteiro.
 */
export const montarOperacoes = ({ estado, aluno_id, agora = new Date() }) => {
    const operacoes = [];
    const contagem = { criados: 0, atualizados: 0, removidos: 0, ignorados: 0 };

    estado.simulados.forEach((simulado) => {
        const filtro = { _id: simulado._id };

        if (simulado.tipo !== simulado.tipoOriginal) {
            operacoes.push({ updateOne: { filter: filtro, update: { $set: { tipo: simulado.tipo } } } });
        }

        simulado.conteudos.filter(({ peso, pesoOriginal }) => peso !== pesoOriginal).forEach(({ turma_disciplina_id, peso }) => {
            operacoes.push({
                updateOne: {
                    filter: filtro,
                    update: { $set: { 'conteudos.$[c].peso': peso, 'conteudos.$[c].updatedAt': agora } },
                    arrayFilters: [{ 'c.turma_disciplina_id': turma_disciplina_id }],
                },
            });
        });

        const linha = estado.linhas.find(({ numero }) => numero === simulado.numero);
        if (!linha) return;

        linha.celulas.forEach(({ coluna, status, acertos }) => {
            const id = estado.colunas.find((c) => c.coluna === coluna)?.turma_disciplina_id;
            const conteudo = simulado.conteudos.find((c) => c.turma_disciplina_id === id);
            if (!conteudo) return;

            const naDisciplina = { 'c.turma_disciplina_id': id };
            const novo = status === 'acertos' ? acertos : null;
            const atual = conteudo.acertosAtuais;

            if (novo === atual) {
                contagem.ignorados += 1;
            } else if (novo === null) {
                contagem.removidos += 1;
                operacoes.push({
                    updateOne: {
                        filter: filtro,
                        update: { $pull: { 'conteudos.$[c].resultados': { aluno_id } } },
                        arrayFilters: [naDisciplina],
                    },
                });
            } else {
                // Mesma conta do salvarNotas: a nota do banco ignora o peso.
                const nota = Math.round(((novo / conteudo.quantidade_questoes) * 10) * 100) / 100;
                if (atual === null) {
                    contagem.criados += 1;
                    operacoes.push({
                        updateOne: {
                            filter: filtro,
                            update: { $push: { 'conteudos.$[c].resultados': { aluno_id, acertos: novo, nota, createdAt: agora, updatedAt: agora } } },
                            arrayFilters: [naDisciplina],
                        },
                    });
                } else {
                    contagem.atualizados += 1;
                    operacoes.push({
                        updateOne: {
                            filter: filtro,
                            update: { $set: { 'conteudos.$[c].resultados.$[r].acertos': novo, 'conteudos.$[c].resultados.$[r].nota': nota, 'conteudos.$[c].resultados.$[r].updatedAt': agora } },
                            arrayFilters: [naDisciplina, { 'r.aluno_id': aluno_id }],
                        },
                    });
                }
            }
        });
    });

    return { operacoes, contagem };
};
