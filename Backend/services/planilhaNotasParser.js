import ExcelJS from 'exceljs';

const CAMPOS_DE_REFERENCIA = new Map([
    ['resultado', 'resultado'],
    ['nota objetivo', 'notaObjetivo'],
    ['nota objetiva', 'notaObjetivo'],
    ['nota dissertativo', 'notaDissertativa'],
    ['nota dissertativa', 'notaDissertativa'],
    ['nota final', 'notaFinal'],
]);

const TOLERANCIA = 0.001;

// Além da célula vazia, estes textos valem como sem nota. O sistema mostra todos como "nulo".
const TEXTOS_SEM_NOTA = ['nao fez', 'faltou'];

const problema = (codigo, mensagem, celulas = []) => ({ codigo, mensagem, celulas });

/**
 * Deixa o texto sem acento, em minúsculas e sem espaços sobrando.
 */
export const normalizarTexto = (texto) => String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// O exceljs devolve objeto em célula de fórmula, rich text e link; aqui só interessa o valor.
const valorDaCelula = (celula) => {
    const { value } = celula;
    if (value === null || value === undefined) return null;
    if (typeof value !== 'object' || value instanceof Date) return value;
    if (value.richText) return value.richText.map(parte => parte.text).join('');
    if ('text' in value) return value.text;
    if ('formula' in value || 'sharedFormula' in value) return value.result ?? null;
    return value;
};

const paraNumero = (valor) => {
    if (typeof valor === 'number') return valor;
    if (typeof valor !== 'string' || !/^-?\d+([.,]\d+)?$/.test(valor.trim())) return null;
    return Number(valor.trim().replace(',', '.'));
};

const diferentes = (a, b) => Math.abs(a - b) > TOLERANCIA;

// O Excel guarda os números com ponto; nas mensagens, eles aparecem como o admin vê na planilha.
const comVirgula = (numero) => String(Number(numero.toFixed(2))).replace('.', ',');

const lerBimestre = (texto) => {
    const achado = normalizarTexto(texto).match(/(?<!\d)([1-4])\s*[ºª°o.]?\s*bimestre/);
    return achado ? Number(achado[1]) : null;
};

// Aceita B10*0.3, 0.3*B10 e B10*30%. Qualquer outra fórmula fica sem fator e não é conferida.
const lerFator = (formula) => {
    const texto = String(formula ?? '').replace(/\s/g, '');
    const achado = texto.match(/^=?\$?[A-Z]+\$?\d+\*(\d+(?:\.\d+)?)(%?)$/i)
        ?? texto.match(/^=?(\d+(?:\.\d+)?)(%?)\*\$?[A-Z]+\$?\d+$/i);
    if (!achado) return null;
    return achado[2] ? Number(achado[1]) / 100 : Number(achado[1]);
};

const separarCabecalho = (texto) => {
    const [materia, ...resto] = normalizarTexto(texto).split('-').map(parte => parte.trim());
    const professor = resto.filter(Boolean).join(' - ') || null;
    return {
        cabecalho: professor ? `${materia} - ${professor}` : materia,
        materia,
        professor,
    };
};

const lerAcertos = (celula) => {
    const valor = valorDaCelula(celula);
    if (valor === null || String(valor).trim() === '') return { status: 'vazia' };
    if (TEXTOS_SEM_NOTA.includes(normalizarTexto(valor))) return { status: 'nao_fez' };

    const acertos = paraNumero(valor);
    // O app mobile lê os acertos como inteiro, então decimal também não entra.
    if (!Number.isInteger(acertos) || acertos < 0) {
        return { status: 'invalida', bruto: typeof valor === 'number' ? comVirgula(valor) : valor.error ?? String(valor) };
    }
    return { status: 'acertos', acertos };
};

const somarAcertos = (celulas) => celulas.reduce((soma, { acertos }) => soma + (acertos ?? 0), 0);

const lerColunas = (linhaCabecalho) => {
    const colunas = [];
    let colunaTotal = null;

    linhaCabecalho.eachCell((celula, numeroColuna) => {
        const cabecalhoOriginal = String(valorDaCelula(celula) ?? '').trim();
        if (numeroColuna === 1 || colunaTotal || !cabecalhoOriginal) return;

        const coluna = celula.address.replace(/\d/g, '');
        if (normalizarTexto(cabecalhoOriginal) === 'total') {
            colunaTotal = coluna;
            return;
        }

        colunas.push({
            coluna,
            cabecalhoOriginal,
            ...separarCabecalho(cabecalhoOriginal),
            resultado: null,
            notaObjetivo: null,
            fator: null,
            notaDissertativa: null,
            notaFinal: null,
        });
    });

    return { colunas, colunaTotal };
};

const lerAba = (planilha) => {
    const bloqueios = [];
    const avisos = [];

    const rotulos = [];
    const linhasSim = [];
    planilha.eachRow((linha, numeroLinha) => {
        const rotulo = normalizarTexto(valorDaCelula(linha.getCell(1)));
        rotulos.push({ linha, numeroLinha, rotulo });

        const numero = rotulo.match(/^sim\s*(\d+)$/)?.[1];
        if (numero) linhasSim.push({ linha, numeroLinha, numero: Number(numero) });
    });

    const primeiraLinhaSim = linhasSim[0]?.numeroLinha ?? Infinity;
    const linhaBimestre = rotulos.find(({ rotulo, numeroLinha }) => numeroLinha < primeiraLinhaSim && rotulo.includes('bimestre'));
    const bimestre = lerBimestre(linhaBimestre?.rotulo);
    if (!bimestre) {
        const celula = linhaBimestre?.linha.getCell(1).address ?? 'A2';
        bloqueios.push(problema('BIMESTRE_ILEGIVEL', `Não foi possível ler o bimestre na célula ${celula}. O esperado é algo como "1º bimestre".`, [celula]));
    }

    if (linhasSim.length === 0) {
        bloqueios.push(problema('SEM_LINHAS_SIM', 'A aba não tem nenhuma linha "SIM n".'));
        return { bimestre, colunas: [], linhas: [], bloqueios, avisos };
    }

    // O cabeçalho é a linha logo acima do primeiro SIM; a célula A dela pode trazer "NOME ALUNO" ou o próprio nome.
    const { colunas, colunaTotal } = primeiraLinhaSim > 1
        ? lerColunas(planilha.getRow(primeiraLinhaSim - 1))
        : { colunas: [], colunaTotal: null };

    if (colunas.length === 0) {
        bloqueios.push(problema('SEM_DISCIPLINAS', 'Nenhuma coluna de disciplina encontrada na linha acima do primeiro SIM.'));
        return { bimestre, colunas, linhas: [], bloqueios, avisos };
    }

    const cabecalhosVistos = new Set();
    colunas.forEach(({ coluna, cabecalho, cabecalhoOriginal }) => {
        if (cabecalhosVistos.has(cabecalho)) {
            bloqueios.push(problema('CABECALHO_REPETIDO', `A coluna ${coluna} repete o cabeçalho "${cabecalhoOriginal}". Renomeie uma das colunas na planilha.`, [`${coluna}${primeiraLinhaSim - 1}`]));
        }
        cabecalhosVistos.add(cabecalho);
    });

    rotulos.forEach(({ linha, rotulo }) => {
        const campo = CAMPOS_DE_REFERENCIA.get(rotulo);
        if (!campo) return;

        colunas.forEach((coluna) => {
            const celula = linha.getCell(coluna.coluna);
            coluna[campo] = paraNumero(valorDaCelula(celula));
            if (campo === 'notaObjetivo') coluna.fator = lerFator(celula.formula);
        });
    });

    const numerosVistos = new Set();
    const linhas = linhasSim.map(({ linha, numeroLinha, numero }) => {
        if (numerosVistos.has(numero)) {
            bloqueios.push(problema('SIM_REPETIDO', `A linha SIM ${numero} aparece mais de uma vez.`, [`A${numeroLinha}`]));
        }
        numerosVistos.add(numero);

        const celulas = colunas.map(({ coluna }) => {
            const celula = linha.getCell(coluna);
            return { coluna, celula: celula.address, ...lerAcertos(celula) };
        });

        celulas.filter(({ status }) => status === 'invalida').forEach(({ celula, bruto }) => {
            bloqueios.push(problema('ACERTOS_INVALIDO', `Célula ${celula}: "${bruto}" não é válido. Use um número inteiro de acertos, "não fez" ou "faltou".`, [celula]));
        });

        const vazias = celulas.filter(({ status }) => status === 'vazia').map(({ celula }) => celula);
        if (vazias.length > 0) {
            avisos.push(problema('CELULAS_VAZIAS', `SIM ${numero}: sem valor em ${vazias.join(', ')}; vale como nulo.`, vazias));
        }

        const total = colunaTotal ? paraNumero(valorDaCelula(linha.getCell(colunaTotal))) : null;
        const soma = somarAcertos(celulas);
        if (total !== null && diferentes(total, soma)) {
            avisos.push(problema('TOTAL_DIFERENTE', `SIM ${numero}: a soma da linha dá ${comVirgula(soma)}, mas a coluna TOTAL mostra ${comVirgula(total)}.`, [`${colunaTotal}${numeroLinha}`]));
        }

        return { numero, linhaPlanilha: numeroLinha, total, celulas };
    });

    const numeroLinhaResultado = rotulos.find(({ rotulo }) => CAMPOS_DE_REFERENCIA.get(rotulo) === 'resultado')?.numeroLinha;
    colunas.forEach(({ coluna, cabecalhoOriginal, resultado }, indice) => {
        const soma = somarAcertos(linhas.map(({ celulas }) => celulas[indice]));
        if (resultado !== null && diferentes(resultado, soma)) {
            avisos.push(problema('RESULTADO_DIFERENTE', `${cabecalhoOriginal}: a soma dos SIMs dá ${comVirgula(soma)}, mas a linha Resultado mostra ${comVirgula(resultado)}.`, [`${coluna}${numeroLinhaResultado}`]));
        }
    });

    return { bimestre, colunas, linhas, bloqueios, avisos };
};

/**
 * Lê a aba de um aluno. Não acessa o banco: o que depende do cadastro (simulado, disciplina,
 * quantidade de questões, peso) é conferido por quem chama.
 * @param arquivo O conteúdo do .xlsx (Buffer).
 * @param nomeAluno O nome do aluno aberto na tela, usado para achar a aba.
 * @param aba O nome da aba escolhida pelo admin, quando nenhuma tem o nome do aluno.
 * @returns A aba lida, o bimestre, as colunas, uma linha por SIM e os bloqueios e avisos encontrados.
 */
export const lerPlanilhaNotas = async (arquivo, { nomeAluno, aba } = {}) => {
    const vazio = { aba: null, abas: [], bimestre: null, colunas: [], linhas: [], bloqueios: [], avisos: [] };

    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.load(arquivo);
    } catch {
        return { ...vazio, bloqueios: [problema('ARQUIVO_INVALIDO', 'Não foi possível ler o arquivo. Envie uma planilha .xlsx.')] };
    }

    const planilhas = workbook.worksheets.filter(({ state }) => state !== 'hidden' && state !== 'veryHidden');
    const abas = planilhas.map(({ name }) => name.trim());
    const comNome = (nome) => planilhas.find(({ name }) => normalizarTexto(name) === normalizarTexto(nome));

    const planilha = aba
        ? comNome(aba)
        : comNome(nomeAluno) ?? (planilhas.length === 1 ? planilhas[0] : undefined);

    if (!planilha) {
        const mensagem = aba ? `A aba "${aba}" não existe na planilha.` : 'Nenhuma aba tem o nome do aluno. Escolha a aba correta.';
        return { ...vazio, abas, bloqueios: [problema('ABA_NAO_ENCONTRADA', mensagem)] };
    }

    const leitura = lerAba(planilha);
    if (nomeAluno && normalizarTexto(planilha.name) !== normalizarTexto(nomeAluno)) {
        leitura.avisos.unshift(problema('ABA_NOME_DIFERENTE', `A aba "${planilha.name.trim()}" não tem o nome do aluno (${nomeAluno}). Confira se é a aba certa.`));
    }

    return { aba: planilha.name.trim(), abas, ...leitura };
};
