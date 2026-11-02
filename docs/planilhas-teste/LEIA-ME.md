# Planilhas de teste da importação de notas

Dados fictícios, compatíveis com a seed `Backend/DB/seedImportacao.js`: mesmos alunos, disciplinas, pesos e quantidade de questões.

As células com erro proposital estão em amarelo e têm um comentário explicando o erro. O comentário da célula `A2` resume o cenário.

Os números são gravados como na planilha real: o arquivo guarda ponto (`0.75`, `=B10*0.3`), e o Excel em português mostra vírgula (`0,75`, `=B10*0,3`).

## Como testar pela tela

1. Rode `npm install` nas pastas `Backend` e `Frontend`.
2. Suba um Mongo local na porta 27017. Com Docker: `docker run -d --name notasmax-mongo -p 127.0.0.1:27017:27017 -v notasmax-mongo-data:/data/db mongo:8`.
3. Na pasta `Backend`, rode `node DB/seedImportacao.js`. **A seed apaga usuários, turmas, matérias, disciplinas, simulados e colunas guardadas do banco `NotasMax` local.**
4. Rode `npm start` no `Backend` e `npm run dev` no `Frontend`.
5. Abra `http://localhost:5173` e entre com `admin@notasmax.test`, senha `admin123`.
6. Vá em Turmas, abra a turma, clique no olho de um simulado do bimestre indicado na tabela abaixo, clique em **Importar Excel** e escolha o aluno.
7. Envie a planilha, confira a revisão e clique em **Confirmar**.

Outros logins, com a mesma senha: `lourdes.prado@notasmax.test` (professor) e `lucas.santos@notasmax.test` (aluno). Só o admin chega à importação.

## O que cada arquivo faz

| Arquivo | Abrir em | Resultado |
|---|---|---|
| `01-turma-1EM-2bimestre-sem-avisos` | Qualquer aluno do 1º EM, 2º bimestre | Importa sem bloqueio nem aviso. Tem uma aba por aluno, com os nomes escritos de formas diferentes |
| `02-aluna-3bimestre-formato-real` | Sofia Oliveira, 3º bimestre | Importa, com aviso de nota dissertativa diferente nas 13 colunas |
| `03-aluno-1bimestre-reimportacao` | Gustavo Almeida, 1º bimestre | Importa, com 65 avisos de valor antigo e novo. Resultado: 13 criadas, 64 atualizadas e 1 removida |
| `04-aluno-4bimestre-data-futura` | Lucas Santos, 4º bimestre | Importa, com aviso de data futura nos 6 SIMs |
| `05-avisos-sem-bloqueio` | Mateus Costa, 2º bimestre | Importa, com 7 avisos: nome da aba, 2 células vazias, `TOTAL`, Resultado, fator do peso e nota dissertativa |
| `06-bloqueios-acertos` | Isabela Pereira, 2º bimestre | Bloqueia na conferência |
| `07-bloqueios-colunas` | Lucas Santos, 2º bimestre | Bloqueia na conferência. Libera depois de ligar à mão: `FÍSICA` em Física - Lourdes Prado, `ARTES` em Filosofia - Igor Nunes, `FÍSICA - ZECA` em Física - Toni Almeida e `MATEMÁTICA - TEIXEIRA` em Matemática - Duda Campos. Na importação seguinte da turma, as colunas já vêm ligadas |
| `08-bloqueios-estrutura` | Qualquer aluno | Bloqueia e pede a aba. Cada uma das 5 abas tem um erro de estrutura |
| `09-nao-e-planilha` | Qualquer aluno | Bloqueia no envio. O Excel também não abre esse arquivo |
| `10-nota-maxima-acima-de-10` | Rafael Lima, 2º bimestre | Importa, com todos os acertos no máximo. Subindo o peso de `FÍSICA - LÔ` para 100 nos 6 SIMs, a nota vai a 18 e bloqueia; voltando o peso, libera |
| `11-celulas-nulas` | Qualquer aluno do 1º EM, 2º bimestre | Importa, com aviso de célula vazia. No SIM 1, as colunas B (`faltou`), C (vazia) e D (`não fez`) aparecem como `nulo` |

## Mensagens exatas de bloqueio

Conferidas pelo navegador, com a seed.

### `06-bloqueios-acertos`

- Célula B4: "ausente" não é válido. Use um número inteiro de acertos, "não fez" ou "faltou".
- Célula C4: "-1" não é válido. Use um número inteiro de acertos, "não fez" ou "faltou".
- Célula D4: "1,5" não é válido. Use um número inteiro de acertos, "não fez" ou "faltou".
- Célula B5: 9 acertos é mais do que as 3 questões de Física - Lourdes Prado no simulado 2.
- A linha SIM 7 não tem simulado cadastrado para esta turma no 2º bimestre.

### `07-bloqueios-colunas`

- Coluna B ("FÍSICA"): escolha a disciplina da turma.
- Coluna D ("ARTES"): escolha a disciplina da turma.
- Coluna J ("FÍSICA - ZECA"): escolha a disciplina da turma.
- As colunas F ("MATEMÁTICA - ANA") e N ("MATEMÁTICA - TEIXEIRA") estão ligadas à mesma disciplina: Matemática - Ana Teixeira.

### `08-bloqueios-estrutura`

- Sem escolher a aba: Nenhuma aba tem o nome do aluno. Escolha a aba correta.
- Aba `Bimestre ilegivel`: Não foi possível ler o bimestre na célula A2. O esperado é algo como "1º bimestre".
- Aba `Sem linhas SIM`: A aba não tem nenhuma linha "SIM n".
- Aba `Sem disciplinas`: Nenhuma coluna de disciplina encontrada na linha acima do primeiro SIM.
- Aba `Cabecalho repetido`: A coluna D repete o cabeçalho "INGLÊS". Renomeie uma das colunas na planilha. / As colunas C ("INGLÊS") e D ("INGLÊS") estão ligadas à mesma disciplina: Inglês - Helena Vaz.
- Aba `SIM repetido`: A linha SIM 1 aparece mais de uma vez.

### `09-nao-e-planilha`

- Não foi possível ler o arquivo. Envie uma planilha .xlsx.

### Só em certas situações

- `04` aberta em outro bimestre: A planilha é do 4º bimestre, mas a tela está no 2º bimestre.
- `10` com peso 100 nos 6 SIMs: Física - Lourdes Prado: a nota final daria 18,00, e o máximo é 10. Corrija o peso ou os acertos.
- Peso que passaria a nota de outro aluno de 10, ao confirmar: Com esse peso, a nota de Sofia Oliveira em Física - Lourdes Prado daria 11,00, e o máximo é 10.

## Como comparar com as notas da planilha

Na planilha, a Nota Objetivo soma todas as linhas SIM, e a Nota Dissertativo é digitada. No sistema, a nota dissertativa sai só dos SIMs do tipo dissertativo, e na seed o SIM 6 é desse tipo. Por isso, a nota objetiva e a final do sistema só coincidem com as da planilha quando o SIM 6 vem como `não fez`. Nas planilhas 02, 03 e 10, ele vem com acertos, e a diferença é esperada.

## Testar com uma planilha real

A seed é fictícia, então uma planilha real normalmente não passa nela: os professores não batem com os cabeçalhos, e a seed tem só 2 ou 3 questões por disciplina. Para a planilha entrar sem bloqueio, o cadastro precisa ter:

- o aluno na turma, com a tela aberta no bimestre da planilha;
- um simulado para cada linha `SIM n`, com o mesmo número;
- em cada simulado e disciplina, um número de questões maior ou igual aos acertos;
- uma disciplina para cada coluna. Se a matéria se repete na turma e o professor não bate com o cabeçalho, escolha a disciplina na revisão.

## Testar só a leitura, sem subir o sistema

Este comando mostra o que o leitor da planilha entende de um arquivo. O que depende do cadastro (simulado, disciplina, peso e notas lançadas) só aparece na tela.

Rode a partir da raiz do repositório, depois do `npm install` no `Backend`:

```powershell
cd docs\planilhas-teste
node ler-planilha.mjs 05-avisos-sem-bloqueio.xlsx "Mateus Costa"
node ler-planilha.mjs 08-bloqueios-estrutura.xlsx "Lucas Santos" "SIM repetido"
```

O terceiro argumento escolhe a aba.

## Testes automáticos

Rode `npm run test:coverage` nas pastas `Backend` e `Frontend`. O CI usa a versão do Node que está no `.nvmrc` de cada pasta.
