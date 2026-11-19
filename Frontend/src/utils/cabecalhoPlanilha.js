// Mesma limpeza da leitura da planilha: sem acentos, minúsculas, espaços únicos e qualquer traço como hífen.
export const normalizar = (texto) => String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―−]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// "INGLÊS - HELENA" vira matéria "INGLÊS" e professor "HELENA", como na leitura da planilha.
export const separarCabecalho = (cabecalho) => {
    const texto = String(cabecalho ?? '').replace(/[‐-―−]/g, '-');
    const indice = texto.indexOf('-');
    return indice === -1
        ? { materia: texto.trim(), professor: '' }
        : { materia: texto.slice(0, indice).trim(), professor: texto.slice(indice + 1).trim() };
};

const PALAVRAS_MINUSCULAS = ['a', 'as', 'o', 'os', 'e', 'de', 'da', 'das', 'do', 'dos', 'em', 'na', 'nas', 'no', 'nos'];

// Texto todo em maiúsculas vira nome como os do sistema: "LÍNGUA PORTUGUESA" fica "Língua Portuguesa", e
// "HISTÓRIA DA ARTE" fica "História da Arte". Texto com minúsculas fica como está.
export const capitalizarNome = (texto) => {
    const limpo = String(texto ?? '').trim().replace(/\s+/g, ' ');
    if (limpo !== limpo.toUpperCase()) return limpo;
    return limpo.toLowerCase().split(' ')
        .map((palavra, indice) => (indice > 0 && PALAVRAS_MINUSCULAS.includes(palavra)
            ? palavra
            : palavra.charAt(0).toUpperCase() + palavra.slice(1)))
        .join(' ');
};

// O nome do cabeçalho precisa ser o começo de uma palavra do nome, e só vale com um professor só.
export const professorDoCabecalho = (professores, nome) => {
    const procurado = normalizar(nome);
    if (!procurado) return null;
    const candidatos = professores.filter((p) => normalizar(p.nome).split(' ').some((palavra) => palavra.startsWith(procurado)));
    return candidatos.length === 1 ? candidatos[0] : null;
};
