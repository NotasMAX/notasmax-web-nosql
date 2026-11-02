// Cópia de validarConferencia e calcularNotas de Backend/services/conferenciaNotas.js, para recalcular a tela a
// cada alteração. O servidor repete as mesmas checagens ao confirmar, e Backend/test/conferencia-notas.test.js
// garante que as duas versões dão o mesmo resultado.

const PRAZO_EDICAO_EM_DIAS = 16;
const NOTA_MAXIMA = 10;
const TOLERANCIA = 0.001;

const problema = (codigo, mensagem, celulas = [], coluna = null) => ({ codigo, mensagem, celulas, coluna });

export const decimal = (valor) => Number(valor).toFixed(2).replace('.', ',');

const pesoValido = (peso) => Number.isInteger(peso) && peso > 0 && peso <= 100;

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

const TEXTOS_SEM_NOTA = ['nao fez', 'faltou'];

const semAcento = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Vazio, "não fez" e "faltou" ficam sem nota; o que não for um número inteiro fica marcado até o admin corrigir.
export const interpretarAcertos = (texto) => {
    const valor = String(texto).trim();
    if (valor === '' || TEXTOS_SEM_NOTA.includes(semAcento(valor))) return { status: 'nao_fez' };
    if (/^\d+$/.test(valor)) return { status: 'acertos', acertos: Number(valor) };
    return { status: 'invalida', bruto: texto };
};

export const interpretarPeso = (texto) => (String(texto).trim() === '' ? '' : Number(texto));

export const montarConfirmacao = ({ estado, aluno_id, turma_id, bimestre }) => ({
    aluno_id,
    turma_id,
    bimestre,
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
    tipos: estado.simulados
        .filter(({ tipo, tipoOriginal }) => tipo !== tipoOriginal)
        .map(({ _id, tipo }) => ({ simulado_id: _id, tipo })),
    pesos: estado.simulados.flatMap(({ _id, conteudos }) => conteudos
        .filter(({ peso, pesoOriginal }) => peso !== pesoOriginal)
        .map(({ turma_disciplina_id, peso }) => ({ simulado_id: _id, turma_disciplina_id, peso }))),
});
