// Mostra o que o parser da importação lê de uma planilha.
// Uso: node ler-planilha.mjs <arquivo.xlsx> "<nome do aluno>" ["<nome da aba>"]
import { readFileSync } from 'node:fs';
import { lerPlanilhaNotas } from '../../Backend/services/planilhaNotasParser.js';

const [arquivo, nomeAluno, aba] = process.argv.slice(2);
if (!arquivo) {
    console.log('Uso: node ler-planilha.mjs <arquivo.xlsx> "<nome do aluno>" ["<nome da aba>"]');
    process.exit(1);
}

const leitura = await lerPlanilhaNotas(readFileSync(arquivo), { nomeAluno, aba });

console.log(`Aba lida: ${leitura.aba ?? '(nenhuma)'}`);
if (leitura.abas.length > 1) console.log(`Abas do arquivo: ${leitura.abas.join(' | ')}`);
console.log(`Bimestre: ${leitura.bimestre ?? '(não lido)'}`);
console.log(`Colunas de disciplina: ${leitura.colunas.length}`);
console.log(`Linhas SIM: ${leitura.linhas.map(({ numero }) => numero).join(', ') || '(nenhuma)'}`);

const listar = (titulo, problemas) => {
    console.log(`\n${titulo}: ${problemas.length}`);
    problemas.forEach(({ codigo, mensagem }) => console.log(`  [${codigo}] ${mensagem}`));
};
listar('Bloqueios', leitura.bloqueios);
listar('Avisos', leitura.avisos);
