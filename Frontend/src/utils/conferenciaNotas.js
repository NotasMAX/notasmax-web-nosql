// Cópia de validarConferencia e calcularNotas de Backend/services/conferenciaNotas.js, para recalcular a tela a
// cada alteração. O servidor repete as mesmas checagens ao confirmar, e Backend/test/conferencia-notas.test.js
// garante que as duas versões dão o mesmo resultado.

const PRAZO_EDICAO_EM_DIAS = 16;
const NOTA_MAXIMA = 10;
const TOLERANCIA = 0.001;

const problema = (codigo, mensagem, celulas = [], coluna = null) => ({ codigo, mensagem, celulas, coluna });

export const decimal = (valor) => Number(valor).toFixed(2).replace('.', ',');

const pesoValido = (peso) => Number.isInteger(peso) && peso > 0 && peso <= 100;

// Mesmo limite da tela de edição do simulado.
const questoesValidas = (questoes) => Number.isInteger(questoes) && questoes > 0 && questoes <= 100;

// As telas de cadastro e edição numeram os simulados de 1 a 10.
const numeroValido = (numero) => Number.isInteger(numero) && numero >= 1 && numero <= 10;

const dataValida = (data) => typeof data === 'string' && data !== '' && !Number.isNaN(new Date(data).getTime());

// Peso sugerido para uma disciplina nova: o fator da fórmula da Nota Objetivo, quando ele vira um peso válido.
const pesoDoFator = (fator) => {
    if (typeof fator !== 'number') return '';
    const peso = Math.round(fator * 100);
    return pesoValido(peso) && Math.abs(fator * 100 - peso) <= TOLERANCIA ? peso : '';
};

const conteudoNovo = ({ turma_disciplina_id, quantidade_questoes = '', peso = '' }) => ({
    turma_disciplina_id,
    novo: true,
    quantidade_questoes,
    questoesOriginal: null,
    peso,
    pesoOriginal: null,
    alunosComResultado: 0,
    acertosAtuais: null,
});

// Meia-noite local do dia, como a tela de cadastro grava a data de realização.
const inicioDoDia = (agora) => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();

const simuladoNovo = ({ numero, tipo = 'objetivo', data_realizacao, conteudos = [] }, agora) => ({
    _id: `novo-${numero}`,
    novo: true,
    numero,
    tipo,
    tipoOriginal: tipo,
    data_realizacao,
    foraDoPrazo: false,
    dataFutura: dataValida(data_realizacao) && new Date(data_realizacao).getTime() > agora.getTime(),
    alunosComResultado: 0,
    conteudos,
});

/**
 * Completa o estado com o que falta cadastrar: um simulado novo para cada linha SIM sem simulado e uma disciplina
 * nova para cada coluna com acertos num simulado que não a tem. Preserva o que o admin já digitou e tira as
 * disciplinas novas cuja coluna mudou de disciplina ou ficou sem acertos.
 */
export const completarSimulados = (estado, agora = new Date()) => {
    const ligadas = estado.colunas.filter((c) => c.turma_disciplina_id);

    const simulados = estado.simulados.map((simulado) => {
        const linha = estado.linhas.find(({ numero }) => numero === simulado.numero);
        const precisam = ligadas.filter(({ coluna }) => (simulado.novo
            ? Boolean(linha)
            : Boolean(linha?.celulas.some((c) => c.coluna === coluna && c.status === 'acertos'))));
        const ids = precisam.map(({ turma_disciplina_id }) => turma_disciplina_id);

        const mantidos = simulado.conteudos.filter((c) => !c.novo || ids.includes(c.turma_disciplina_id));
        const faltam = precisam
            .filter(({ turma_disciplina_id }) => !mantidos.some((c) => c.turma_disciplina_id === turma_disciplina_id))
            .map(({ turma_disciplina_id, fator }) => conteudoNovo({ turma_disciplina_id, peso: pesoDoFator(fator) }));

        if (faltam.length === 0 && mantidos.length === simulado.conteudos.length) return simulado;
        return { ...simulado, conteudos: [...mantidos, ...faltam] };
    });

    estado.linhas
        .filter(({ numero }) => !simulados.some((s) => s.numero === numero))
        .forEach(({ numero }) => {
            const conteudos = ligadas.map(({ turma_disciplina_id, fator }) => conteudoNovo({ turma_disciplina_id, peso: pesoDoFator(fator) }));
            simulados.push(simuladoNovo({ numero, data_realizacao: inicioDoDia(agora), conteudos }, agora));
        });

    return { ...estado, simulados };
};

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
        notas.totalQuestoes += Number(conteudo.quantidade_questoes) || 0;
    });

    return notas;
};

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

    // Disciplina escolhida na revisão para uma coluna sem dono só é cadastrada na turma ao confirmar.
    colunasLigadas.forEach(({ coluna, cabecalhoOriginal, turma_disciplina_id: id }) => {
        const disciplina = disciplinas.find(({ _id }) => _id === id);
        if (!disciplina?.nova) return;
        const comMateria = disciplina.materia_id ? '' : `, com a matéria nova ${disciplina.materia}`;
        avisos.push(problema('DISCIPLINA_NOVA', `Coluna ${coluna} ("${cabecalhoOriginal}"): ${disciplina.materia} - ${disciplina.professor} será cadastrada na turma ao confirmar${comMateria}.`, [], coluna));
    });

    linhas.forEach(({ numero, celulas }) => {
        // Linha sem simulado vira um simulado novo em completarSimulados.
        const doNumero = simulados.filter((s) => s.numero === numero);
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
                bloqueios.push(problema('ACERTOS_INVALIDO', `Célula ${celula}: "${bruto}" não é válido. Use um número inteiro de 0 para cima; qualquer texto vale como nulo.`, [celula], coluna));
                return;
            }

            const id = colunas.find((c) => c.coluna === coluna)?.turma_disciplina_id;
            if (!simulado || !id) return;

            // Disciplina que falta no simulado vira uma disciplina nova em completarSimulados.
            const conteudo = simulado.conteudos.find((c) => c.turma_disciplina_id === id);
            if (!conteudo) return;

            // Questões alteradas para um valor inválido já bloqueiam; a comparação só vale com um número aceito.
            const { quantidade_questoes: questoes, questoesOriginal } = conteudo;
            const questoesAceitas = typeof questoes === 'number' && (questoes === questoesOriginal || questoesValidas(questoes));
            if (status === 'acertos' && questoesAceitas && acertos > questoes) {
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
        const { numero, tipo, tipoOriginal, novo, foraDoPrazo, dataFutura, data_realizacao, alunosComResultado, conteudos } = simulado;
        const estaNaPlanilha = linhas.some((linha) => linha.numero === numero);
        const tipoAlterado = !novo && tipo !== tipoOriginal;

        if (novo) {
            const quando = dataValida(data_realizacao) ? `, com data ${new Date(data_realizacao).toLocaleDateString('pt-BR')}` : '';
            avisos.push(problema('SIMULADO_NOVO', `SIM ${numero}: não está cadastrado e será criado ao confirmar, para a turma toda, como ${tipo}${quando}.`));
            if (!numeroValido(numero)) {
                bloqueios.push(problema('SIM_NUMERO_FORA_DO_LIMITE', `SIM ${numero}: só dá para criar simulados de número 1 a 10, como nas telas de cadastro e edição.`));
            }
            if (!dataValida(data_realizacao)) {
                bloqueios.push(problema('DATA_INVALIDA', `SIM ${numero}: informe a data de realização do simulado novo.`));
            }
        }

        if (tipoAlterado) {
            avisos.push(problema('TIPO_ALTERADO', `Simulado ${numero}: a troca de tipo vale para todas as disciplinas e para todos os alunos da turma. Alunos com resultado lançado: ${alunosComResultado}.`));
        }

        const adicionadas = novo ? [] : conteudos.filter((c) => c.novo);
        adicionadas.forEach(({ turma_disciplina_id: id }) => {
            avisos.push(problema('NOVO_RESPONSAVEL', `Simulado ${numero}: ${nomeDe(id)} não fazia parte do simulado e será adicionada a ele, para a turma toda.`, [], colunaDe(id)));
        });

        const questoesAlteradas = conteudos.filter((c) => c.novo || c.quantidade_questoes !== c.questoesOriginal);
        questoesAlteradas.forEach(({ turma_disciplina_id: id, quantidade_questoes, novo: disciplinaNova, alunosComResultado: comResultado }) => {
            if (!questoesValidas(quantidade_questoes)) {
                bloqueios.push(problema('QUESTOES_INVALIDAS', `Simulado ${numero}, ${nomeDe(id)}: o número de questões deve ser um inteiro de 1 a 100.`, [], colunaDe(id)));
            } else if (!disciplinaNova) {
                avisos.push(problema('QUESTOES_ALTERADAS', `Simulado ${numero}, ${nomeDe(id)}: a troca do número de questões vale para todos os alunos da turma e recalcula a nota deles. Alunos com resultado lançado: ${comResultado}.`, [], colunaDe(id)));
            }
        });

        const pesosAlterados = conteudos.filter((c) => c.novo || c.peso !== c.pesoOriginal);
        pesosAlterados.forEach(({ turma_disciplina_id: id, peso, novo: disciplinaNova, alunosComResultado: comResultado }) => {
            if (!pesoValido(peso)) {
                bloqueios.push(problema('PESO_INVALIDO', `Simulado ${numero}, ${nomeDe(id)}: o peso deve ser um número inteiro maior que 0 e no máximo 100.`, [], colunaDe(id)));
            } else if (!disciplinaNova) {
                avisos.push(problema('PESO_ALTERADO', `Simulado ${numero}, ${nomeDe(id)}: a troca de peso vale para todos os alunos da turma. Alunos com resultado lançado: ${comResultado}.`, [], colunaDe(id)));
            }
        });

        // Num simulado existente, qualquer disciplina nova ou valor alterado mexe no cadastro.
        const mexeuNoCadastro = tipoAlterado || adicionadas.length > 0
            || questoesAlteradas.some((c) => !c.novo) || pesosAlterados.some((c) => !c.novo);
        if (mexeuNoCadastro && foraDoPrazo) {
            avisos.push(problema('FORA_DO_PRAZO', `Simulado ${numero}: já passou do prazo de ${PRAZO_EDICAO_EM_DIAS} dias da tela de edição. Só o admin pode alterar tipo, peso, questões e disciplinas, por esta conferência.`));
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
            .filter((peso) => peso !== undefined && peso !== '');
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

// Vazio ou qualquer texto fica sem nota; o texto é guardado só para continuar no campo enquanto o admin digita.
// Número negativo ou decimal parece acerto digitado errado e fica marcado até o admin corrigir.
export const interpretarAcertos = (texto) => {
    const valor = String(texto).trim();
    if (valor === '') return { status: 'nao_fez' };
    if (/^\d+$/.test(valor)) return { status: 'acertos', acertos: Number(valor) };
    if (/^-?\d+([.,]\d+)?$/.test(valor)) return { status: 'invalida', bruto: texto };
    return { status: 'nao_fez', bruto: texto };
};

export const interpretarPeso = (texto) => (String(texto).trim() === '' ? '' : Number(texto));

export const montarConfirmacao = ({ estado, aluno_id, turma_id, bimestre, aba }) => ({
    aluno_id,
    turma_id,
    bimestre,
    aba,
    colunas: estado.colunas.map(({ coluna, cabecalho, cabecalhoOriginal, fator, notaDissertativaPlanilha, turma_disciplina_id, trocada }) => ({
        coluna, cabecalho, cabecalhoOriginal, fator, notaDissertativaPlanilha, turma_disciplina_id, trocada: Boolean(trocada),
    })),
    linhas: estado.linhas.map(({ numero, celulas }) => ({
        numero,
        celulas: celulas.map(({ coluna, celula, status, acertos, bruto }) => ({
            coluna,
            celula,
            acertos: status === 'acertos' ? acertos : status === 'invalida' ? bruto : null,
        })),
    })),
    tipos: existentes(estado)
        .filter(({ tipo, tipoOriginal }) => tipo !== tipoOriginal)
        .map(({ _id, tipo }) => ({ simulado_id: _id, tipo })),
    pesos: existentes(estado).flatMap(({ _id, conteudos }) => conteudos
        .filter(({ novo, peso, pesoOriginal }) => !novo && peso !== pesoOriginal)
        .map(({ turma_disciplina_id, peso }) => ({ simulado_id: _id, turma_disciplina_id, peso }))),
    questoes: existentes(estado).flatMap(({ _id, conteudos }) => conteudos
        .filter(({ novo, quantidade_questoes, questoesOriginal }) => !novo && quantidade_questoes !== questoesOriginal)
        .map(({ turma_disciplina_id, quantidade_questoes }) => ({ simulado_id: _id, turma_disciplina_id, quantidade_questoes }))),
    conteudosNovos: existentes(estado).flatMap(({ _id, conteudos }) => conteudos
        .filter(({ novo }) => novo)
        .map(({ turma_disciplina_id, quantidade_questoes, peso }) => ({ simulado_id: _id, turma_disciplina_id, quantidade_questoes, peso }))),
    novos: estado.simulados
        .filter(({ novo }) => novo)
        .map(({ numero, tipo, data_realizacao, conteudos }) => ({
            numero,
            tipo,
            data_realizacao,
            conteudos: conteudos.map(({ turma_disciplina_id, quantidade_questoes, peso }) => ({ turma_disciplina_id, quantidade_questoes, peso })),
        })),
    // Disciplinas escolhidas na revisão para colunas sem dono: o servidor só as cadastra ao confirmar.
    disciplinasNovas: estado.disciplinas
        .filter(({ _id, nova }) => nova && estado.colunas.some(({ turma_disciplina_id }) => turma_disciplina_id === _id))
        .map(({ _id, materia, materia_id, professor_id }) => ({ id: _id, materia_id: materia_id ?? null, materia_nome: materia, professor_id })),
});

const existentes = (estado) => estado.simulados.filter(({ novo }) => !novo);

// O campo de data trabalha com AAAA-MM-DD; o banco guarda a meia-noite local, como a tela de cadastro.
export const dataParaCampo = (data) => {
    if (!data) return '';
    const dia = new Date(data);
    if (Number.isNaN(dia.getTime())) return '';
    const doisDigitos = (n) => String(n).padStart(2, '0');
    return `${dia.getFullYear()}-${doisDigitos(dia.getMonth() + 1)}-${doisDigitos(dia.getDate())}`;
};

export const dataDoCampo = (texto) => {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto));
    return partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])).toISOString() : '';
};
