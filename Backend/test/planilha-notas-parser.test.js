import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { lerPlanilhaNotas, normalizarTexto } from '../services/planilhaNotasParser.js';

const DISCIPLINAS = [
  'FÍSICA - LÔ', 'INGLÊS', 'FILOSOFIA', 'SOCIOLOGIA', 'MATEMÁTICA - ANA', 'GRAMÁTICA', 'QUÍMICA - BETO',
  'LITERATURA', 'FÍSICA - TONI', 'HISTÓRIA', 'BIOLOGIA - CIDA', 'GEOGRAFIA', 'MATEMÁTICA - DUDA',
];
const FATORES = [0.3, 0.6, 0.6, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.3, 0.3, 0.4, 0.3];
const COLUNAS = 'BCDEFGHIJKLMN'.split('');
const NUMEROS_SIM = [1, 2, 3, 4, 5, 6];
const LINHA_NAO_FEZ = 8;

const acertosDe = (linha, indice) => (linha + indice) % 3;

function preencherAba(planilha) {
  planilha.getCell('A2').value = '1ºbimestre';

  planilha.getCell('A3').value = 'NOME ALUNO';
  COLUNAS.forEach((coluna, indice) => { planilha.getCell(`${coluna}3`).value = DISCIPLINAS[indice]; });
  planilha.getCell('O3').value = 'TOTAL';

  NUMEROS_SIM.forEach((numero, posicao) => {
    const linha = 4 + posicao;
    planilha.getCell(`A${linha}`).value = `SIM ${numero}`;
    COLUNAS.forEach((coluna, indice) => {
      planilha.getCell(`${coluna}${linha}`).value = linha === LINHA_NAO_FEZ ? 'não fez' : acertosDe(linha, indice);
    });
    if (linha !== LINHA_NAO_FEZ) {
      const total = COLUNAS.reduce((soma, _, indice) => soma + acertosDe(linha, indice), 0);
      planilha.getCell(`O${linha}`).value = { formula: `SUM(B${linha}:N${linha})`, result: total };
    }
  });

  const resultados = COLUNAS.map((_, indice) => [4, 5, 6, 7, 9].reduce((soma, linha) => soma + acertosDe(linha, indice), 0));

  planilha.getCell('A10').value = 'Resultado';
  COLUNAS.forEach((coluna, indice) => {
    const result = resultados[indice];
    if (indice === 0) planilha.getCell('B10').value = { formula: 'SUM(B4:B9)', result };
    else if (indice === 1) planilha.getCell('C10').value = { formula: 'SUM(C4:C9)', shareType: 'shared', ref: 'C10:N10', result };
    else planilha.getCell(`${coluna}10`).value = { sharedFormula: 'C10', result };
  });
  planilha.getCell('O10').value = 'MÉDIA OBJETIVOS';

  planilha.getCell('A11').value = 'Nota Objetivo';
  COLUNAS.forEach((coluna, indice) => {
    planilha.getCell(`${coluna}11`).value = { formula: `${coluna}10*${FATORES[indice]}`, result: resultados[indice] * FATORES[indice] };
  });

  planilha.getCell('A12').value = 'Nota Dissertativo';
  COLUNAS.forEach((coluna) => { planilha.getCell(`${coluna}12`).value = 0.75; });
  planilha.getCell('O12').value = '15/22';

  planilha.getCell('A13').value = 'Nota final';
  COLUNAS.forEach((coluna, indice) => {
    planilha.getCell(`${coluna}13`).value = { formula: `${coluna}11+${coluna}12`, result: resultados[indice] * FATORES[indice] + 0.75 };
  });
  planilha.getCell('C13').value = 7;
}

async function gerarArquivo(ajustar = () => {}, nomeAba = ' Aluna Exemplo ') {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet(nomeAba);
  preencherAba(planilha);
  ajustar(planilha, workbook);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const codigos = (problemas) => problemas.map(({ codigo }) => codigo);

test('reads the sheet of a student with 6 simulados and 13 disciplinas', async () => {
  const leitura = await lerPlanilhaNotas(await gerarArquivo(), { nomeAluno: 'Aluna Exemplo' });

  assert.deepEqual(leitura.bloqueios, []);
  assert.deepEqual(leitura.avisos, []);
  assert.equal(leitura.aba, 'Aluna Exemplo');
  assert.equal(leitura.bimestre, 1);
  assert.equal(leitura.colunas.length, 13);
  assert.deepEqual(leitura.linhas.map(({ numero }) => numero), NUMEROS_SIM);

  const [primeiraLinha] = leitura.linhas;
  assert.equal(primeiraLinha.linhaPlanilha, 4);
  assert.deepEqual(primeiraLinha.celulas[0], { coluna: 'B', celula: 'B4', status: 'acertos', acertos: acertosDe(4, 0) });
});

test('keeps the row of a simulado nobody took as absent, not as zero', async () => {
  const { linhas, avisos } = await lerPlanilhaNotas(await gerarArquivo());
  const simCinco = linhas.find(({ numero }) => numero === 5);

  assert.equal(simCinco.total, null);
  assert.ok(simCinco.celulas.every(({ status, acertos }) => status === 'nao_fez' && acertos === undefined));
  assert.deepEqual(avisos, []);
});

test('never reads the TOTAL column or the labels below it as a disciplina', async () => {
  const { colunas } = await lerPlanilhaNotas(await gerarArquivo());

  assert.deepEqual(colunas.map(({ coluna }) => coluna), COLUNAS);
  assert.ok(colunas.every(({ cabecalho }) => cabecalho !== 'total'));
});

test('splits the header into matéria and professor, ready to be matched', async () => {
  const { colunas } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('D3').value = 'FÍSICA–MARCO';
    planilha.getCell('E3').value = '  CIÊNCIAS -  ';
  }));

  assert.deepEqual(
    (({ cabecalhoOriginal, cabecalho, materia, professor }) => ({ cabecalhoOriginal, cabecalho, materia, professor }))(colunas[0]),
    { cabecalhoOriginal: 'FÍSICA - LÔ', cabecalho: 'fisica - lo', materia: 'fisica', professor: 'lo' },
  );
  assert.equal(colunas[1].professor, null);
  assert.equal(colunas[1].cabecalho, 'ingles');
  assert.equal(colunas[2].cabecalho, 'fisica - marco');
  assert.equal(colunas[3].cabecalho, 'ciencias');
  assert.equal(colunas[3].professor, null);
});

test('reads the reference rows, including results stored as shared formulas', async () => {
  const { colunas } = await lerPlanilhaNotas(await gerarArquivo());
  const somaEsperada = [4, 5, 6, 7, 9].reduce((soma, linha) => soma + acertosDe(linha, 5), 0);

  assert.equal(colunas[5].resultado, somaEsperada);
  assert.equal(colunas[5].notaDissertativa, 0.75);
  assert.equal(colunas[1].notaFinal, 7);
  assert.deepEqual(colunas.map(({ fator }) => fator), FATORES);
});

for (const [formula, fator] of [
  ['B10*0.3', 0.3],
  ['0.3*B10', 0.3],
  ['$B$10*0.3', 0.3],
  ['B10*30%', 0.3],
  ['B10 * 0.45', 0.45],
  ['B10*0.3+1', null],
  ['SUM(B4:B9)', null],
]) {
  test(`reads the weight factor of =${formula} as ${fator}`, async () => {
    const { colunas } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
      planilha.getCell('B11').value = { formula, result: 1 };
    }));
    assert.equal(colunas[0].fator, fator);
  });
}

for (const texto of ['0.75', '0,75']) {
  test(`reads Nota Dissertativo typed as text "${texto}", whatever the decimal separator`, async () => {
    const { colunas } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
      planilha.getCell('B12').value = texto;
    }));
    assert.equal(colunas[0].notaDissertativa, 0.75);
  });
}

test('leaves the factor empty when Nota Objetivo was typed instead of calculated', async () => {
  const { colunas } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('B11').value = 2.1;
  }));
  assert.equal(colunas[0].fator, null);
  assert.equal(colunas[0].notaObjetivo, 2.1);
});

for (const [texto, bimestre] of [
  ['1ºbimestre', 1],
  ['2º bimestre', 2],
  ['3° BIMESTRE', 3],
  ['4 bimestre', 4],
  ['2o Bimestre', 2],
  ['Análise do 3º bimestre de 2026', 3],
]) {
  test(`reads the bimestre from "${texto}"`, async () => {
    const leitura = await lerPlanilhaNotas(await gerarArquivo((planilha) => { planilha.getCell('A2').value = texto; }));
    assert.equal(leitura.bimestre, bimestre);
    assert.deepEqual(leitura.bloqueios, []);
  });
}

for (const texto of ['5º bimestre', '15º bimestre', 'bimestre', 'primeiro bimestre', 'turma A', null]) {
  test(`blocks when the bimestre cell holds ${JSON.stringify(texto)}`, async () => {
    const leitura = await lerPlanilhaNotas(await gerarArquivo((planilha) => { planilha.getCell('A2').value = texto; }));
    assert.equal(leitura.bimestre, null);
    assert.deepEqual(codigos(leitura.bloqueios), ['BIMESTRE_ILEGIVEL']);
    assert.deepEqual(leitura.bloqueios[0].celulas, ['A2']);
  });
}

for (const [descricao, valor] of [
  ['"NÃO FEZ"', 'NÃO FEZ'],
  ['"nao fez"', 'nao fez'],
  ['"faltou"', 'faltou'],
  ['"FALTOU" com espaços', '  FALTOU '],
  ['"  Não  Fez "', '  Não  Fez '],
  ['rich text', { richText: [{ text: 'não ' }, { text: 'fez' }] }],
]) {
  test(`treats ${descricao} as absent`, async () => {
    const { linhas, bloqueios } = await lerPlanilhaNotas(await gerarArquivo((planilha) => { planilha.getCell('B4').value = valor; }));
    assert.equal(linhas[0].celulas[0].status, 'nao_fez');
    assert.deepEqual(bloqueios, []);
  });
}

for (const [descricao, valor, acertos] of [
  ['a number stored as text', '2', 2],
  ['a formula', { formula: '1+1', result: 2 }, 2],
  ['zero', 0, 0],
]) {
  test(`accepts ${descricao} as acertos`, async () => {
    const { linhas, bloqueios } = await lerPlanilhaNotas(await gerarArquivo((planilha) => { planilha.getCell('B4').value = valor; }));
    assert.equal(linhas[0].celulas[0].status, 'acertos');
    assert.equal(linhas[0].celulas[0].acertos, acertos);
    assert.deepEqual(bloqueios, []);
  });
}

for (const [descricao, valor, bruto] of [
  ['text', 'ausente', 'ausente'],
  ['the word nulo', 'nulo', 'nulo'],
  ['a negative number', -1, '-1'],
  ['a decimal number', 2.5, '2,5'],
  ['a decimal stored as text', '2,5', '2,5'],
  ['a formula with an error', { formula: '1/0', result: { error: '#DIV/0!' } }, '#DIV/0!'],
  ['an error value', { error: '#N/A' }, '#N/A'],
  ['a date', new Date(Date.UTC(2026, 2, 1)), null],
]) {
  test(`blocks when a cell of acertos holds ${descricao}`, async () => {
    const { linhas, bloqueios } = await lerPlanilhaNotas(await gerarArquivo((planilha) => { planilha.getCell('B4').value = valor; }));
    assert.equal(linhas[0].celulas[0].status, 'invalida');
    assert.deepEqual(codigos(bloqueios), ['ACERTOS_INVALIDO']);
    assert.deepEqual(bloqueios[0].celulas, ['B4']);
    if (bruto !== null) assert.equal(linhas[0].celulas[0].bruto, bruto);
  });
}

test('warns about empty cells once per row and treats them as absent', async () => {
  const { linhas, bloqueios, avisos } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('B4').value = null;
    planilha.getCell('D4').value = '   ';
    planilha.getCell('O4').value = null;
    planilha.getCell('B10').value = null;
    planilha.getCell('D10').value = null;
  }));

  assert.equal(linhas[0].celulas[0].status, 'vazia');
  assert.equal(linhas[0].celulas[2].status, 'vazia');
  assert.deepEqual(bloqueios, []);
  assert.deepEqual(codigos(avisos), ['CELULAS_VAZIAS']);
  assert.deepEqual(avisos[0].celulas, ['B4', 'D4']);
});

test('warns when the sum of a row differs from the TOTAL column', async () => {
  const { avisos, bloqueios } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('O4').value = { formula: 'SUM(B4:N4)', result: 99 };
  }));

  assert.deepEqual(bloqueios, []);
  assert.deepEqual(codigos(avisos), ['TOTAL_DIFERENTE']);
  assert.deepEqual(avisos[0].celulas, ['O4']);
});

test('warns when the sum of a column differs from the Resultado row', async () => {
  const { avisos, bloqueios } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('B10').value = { formula: 'SUM(B4:B9)', result: 99 };
  }));

  assert.deepEqual(bloqueios, []);
  assert.deepEqual(codigos(avisos), ['RESULTADO_DIFERENTE']);
  assert.deepEqual(avisos[0].celulas, ['B10']);
  assert.match(avisos[0].mensagem, /FÍSICA - LÔ/);
});

test('shows numbers with a comma in the messages, as the admin sees them in the sheet', async () => {
  const { avisos } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('O4').value = 11.5;
  }));

  assert.match(avisos[0].mensagem, /mostra 11,5\.$/);
});

test('blocks a repeated header, which could not be remembered per turma', async () => {
  const { bloqueios } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('D3').value = 'inglês';
  }));

  assert.deepEqual(codigos(bloqueios), ['CABECALHO_REPETIDO']);
  assert.deepEqual(bloqueios[0].celulas, ['D3']);
});

test('blocks a repeated SIM row', async () => {
  const { bloqueios, linhas } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('A5').value = 'SIM 1';
  }));

  assert.deepEqual(codigos(bloqueios), ['SIM_REPETIDO']);
  assert.deepEqual(bloqueios[0].celulas, ['A5']);
  assert.equal(linhas.length, 6);
});

test('reads SIM rows beyond the sixth instead of dropping them', async () => {
  const { linhas } = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('A9').value = 'SIM7';
  }));

  assert.deepEqual(linhas.map(({ numero }) => numero), [1, 2, 3, 4, 5, 7]);
});

test('finds the header above the first SIM row even when the first cell holds a name', async () => {
  const leitura = await lerPlanilhaNotas(await gerarArquivo((planilha) => {
    planilha.getCell('A3').value = 'Aluna Exemplo';
  }));

  assert.equal(leitura.colunas.length, 13);
  assert.deepEqual(leitura.bloqueios, []);
});

test('blocks a sheet without SIM rows', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Aluna Exemplo').getCell('A2').value = '1º bimestre';
  const leitura = await lerPlanilhaNotas(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.equal(leitura.bimestre, 1);
  assert.deepEqual(codigos(leitura.bloqueios), ['SEM_LINHAS_SIM']);
});

test('blocks an empty tab, reporting both the bimestre and the SIM rows', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Aluna Exemplo');
  const leitura = await lerPlanilhaNotas(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.deepEqual(codigos(leitura.bloqueios), ['BIMESTRE_ILEGIVEL', 'SEM_LINHAS_SIM']);
});

test('blocks a sheet without disciplina columns', async () => {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet('Aluna Exemplo');
  planilha.getCell('A2').value = '1º bimestre';
  planilha.getCell('A3').value = 'NOME ALUNO';
  planilha.getCell('O3').value = 'TOTAL';
  planilha.getCell('A4').value = 'SIM 1';
  const leitura = await lerPlanilhaNotas(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.deepEqual(codigos(leitura.bloqueios), ['SEM_DISCIPLINAS']);
});

test('blocks a sheet whose first row is already a SIM row', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Aluna Exemplo').getCell('A1').value = 'SIM 1';
  const leitura = await lerPlanilhaNotas(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.deepEqual(codigos(leitura.bloqueios), ['BIMESTRE_ILEGIVEL', 'SEM_DISCIPLINAS']);
});

test('blocks a file that is not an xlsx', async () => {
  const leitura = await lerPlanilhaNotas(Buffer.from('isto não é uma planilha'), { nomeAluno: 'Aluna Exemplo' });

  assert.deepEqual(codigos(leitura.bloqueios), ['ARQUIVO_INVALIDO']);
  assert.equal(leitura.aba, null);
  assert.deepEqual(leitura.linhas, []);
});

test('picks the tab of the student by name, ignoring accents, case and extra spaces', async () => {
  const arquivo = await gerarArquivo((_, workbook) => {
    const outra = workbook.addWorksheet('  JOÃO   Exemplo ');
    preencherAba(outra);
    outra.getCell('A2').value = '2º bimestre';
  });

  const leitura = await lerPlanilhaNotas(arquivo, { nomeAluno: 'Joao Exemplo' });

  assert.equal(leitura.aba, 'JOÃO   Exemplo');
  assert.equal(leitura.bimestre, 2);
  assert.deepEqual(leitura.abas, ['Aluna Exemplo', 'JOÃO   Exemplo']);
  assert.deepEqual(leitura.avisos, []);
});

test('reads the only tab of the file and warns when it has another name', async () => {
  const leitura = await lerPlanilhaNotas(await gerarArquivo(), { nomeAluno: 'Outro Aluno' });

  assert.equal(leitura.aba, 'Aluna Exemplo');
  assert.deepEqual(codigos(leitura.avisos), ['ABA_NOME_DIFERENTE']);
  assert.deepEqual(leitura.bloqueios, []);
  assert.equal(leitura.colunas.length, 13);
});

test('does not guess a tab when several exist and none has the name of the student', async () => {
  const arquivo = await gerarArquivo((_, workbook) => { preencherAba(workbook.addWorksheet('Aluna Exemplo Silva')); });

  const leitura = await lerPlanilhaNotas(arquivo, { nomeAluno: 'Aluna' });

  assert.equal(leitura.aba, null);
  assert.deepEqual(leitura.abas, ['Aluna Exemplo', 'Aluna Exemplo Silva']);
  assert.deepEqual(codigos(leitura.bloqueios), ['ABA_NAO_ENCONTRADA']);
  assert.deepEqual(leitura.linhas, []);
});

test('reads the tab chosen by the admin and warns that it has another name', async () => {
  const arquivo = await gerarArquivo((_, workbook) => { preencherAba(workbook.addWorksheet('Aluna Exemplo Silva')); });

  const leitura = await lerPlanilhaNotas(arquivo, { nomeAluno: 'Aluna', aba: 'Aluna Exemplo Silva' });

  assert.equal(leitura.aba, 'Aluna Exemplo Silva');
  assert.deepEqual(codigos(leitura.avisos), ['ABA_NOME_DIFERENTE']);
});

test('blocks a chosen tab that does not exist', async () => {
  const leitura = await lerPlanilhaNotas(await gerarArquivo(), { nomeAluno: 'Aluna Exemplo', aba: 'Não existe' });

  assert.equal(leitura.aba, null);
  assert.deepEqual(codigos(leitura.bloqueios), ['ABA_NAO_ENCONTRADA']);
  assert.match(leitura.bloqueios[0].mensagem, /Não existe/);
});

test('ignores hidden tabs', async () => {
  const arquivo = await gerarArquivo((_, workbook) => {
    const oculta = workbook.addWorksheet('Modelo');
    oculta.state = 'hidden';
    const muitoOculta = workbook.addWorksheet('Modelo 2');
    muitoOculta.state = 'veryHidden';
  });

  const leitura = await lerPlanilhaNotas(arquivo, { nomeAluno: 'Modelo' });

  assert.deepEqual(leitura.abas, ['Aluna Exemplo']);
  assert.equal(leitura.aba, 'Aluna Exemplo');
  assert.deepEqual(codigos(leitura.avisos), ['ABA_NOME_DIFERENTE']);
});

test('reads the file without a student name, as a plain sheet', async () => {
  const leitura = await lerPlanilhaNotas(await gerarArquivo());

  assert.equal(leitura.aba, 'Aluna Exemplo');
  assert.deepEqual(leitura.avisos, []);
});

test('normalizes text for comparisons', () => {
  assert.equal(normalizarTexto('  FÍSICA  –  LÔ '), 'fisica - lo');
  assert.equal(normalizarTexto(null), '');
  assert.equal(normalizarTexto(undefined), '');
});
