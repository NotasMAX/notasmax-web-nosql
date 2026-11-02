# Importação de notas por Excel: relatório da implementação

Atualizado em 02/11/2026.

## Resumo

A importação está pronta para teste: o admin envia a planilha .xlsx de um aluno, revisa os dados na tela e confirma, e só então os acertos são gravados nos simulados. O código está na branch `Amauri`.

- **Regra central:** o sistema grava só valores brutos (acertos, peso e tipo). As notas são sempre calculadas.
- **Nota dissertativa:** sai apenas dos SIMs do tipo dissertativo. A "Nota Dissertativo" da planilha aparece na revisão só como referência e não é gravada.
- **Ajustes:** quem revisa altera acertos, peso e tipo de cada SIM do bimestre, inclusive dos que não estão na planilha.
- **Sem coleção nova para notas:** os resultados continuam em `Simulado.conteudos[].resultados[]`. A única coleção nova guarda a escolha de disciplina de cada coluna.

Faltam duas decisões, descritas em Limitações e decisões em aberto: digitar a nota calculada direto e arredondar a nota final.

## Como usar

A importação é feita um aluno por vez, só por administrador, e nada é gravado antes do Confirmar da revisão. O botão **Importar Excel** está em duas telas:

| Tela | Caminho | Quando usar |
| --- | --- | --- |
| Lista de alunos do simulado | Turmas → turma → olho do simulado → **Importar Excel** → nome do aluno | Sempre, inclusive quando o simulado ainda não tem nenhuma nota |
| Notas Aluno(a) | Turmas → turma → olho do simulado → olho do aluno → **Importar Excel** | Quando a turma já tem notas nesse simulado, porque só então a lista mostra os alunos |

Depois de abrir a importação:

1. Escolha o arquivo .xlsx e clique em **Confirmar**. O sistema lê a planilha e abre a revisão, sem gravar nada.
2. Se nenhuma aba tiver o nome do aluno e houver mais de uma aba, escolha a aba e clique de novo.
3. Na revisão, confira a disciplina ligada a cada coluna e abra as colunas para ver os SIMs.
4. Ajuste tipo, peso e acertos no que for preciso. As notas são recalculadas a cada alteração.
5. Com todos os bloqueios resolvidos, clique em **Confirmar**. Se tipo ou peso mudaram, o sistema pergunta antes, porque a mudança vale para a turma inteira.
6. A tela mostra quantas notas foram criadas, atualizadas, removidas e mantidas, e leva às notas do aluno.

```mermaid
flowchart LR
    A["Envio: arquivo .xlsx de um aluno"] --> B["Prévia: lê a aba e valida, sem gravar"]
    B --> C["Revisão: admin ajusta e a tela recalcula"]
    C -->|sem bloqueio| D["Confirmar: servidor valida tudo de novo"]
    D --> E["Gravação: só o que mudou"]
    E --> F["Notas do aluno: sempre calculadas ao abrir"]
    F -->|nova importação| A
```

Problema de estrutura ou de bimestre para no envio; os demais bloqueios ficam na revisão até serem corrigidos.

## O que a planilha precisa ter

O sistema lê uma aba por envio e se guia pela coluna A: os rótulos dela dizem o que é cada linha. Maiúsculas, acentos e espaços extras não fazem diferença.

| Item | Onde fica | O que aceita | Para que serve |
| --- | --- | --- | --- |
| Bimestre | Coluna A, acima do primeiro SIM | Texto com "bimestre" e um dígito de 1 a 4, como "1º bimestre" | Conferir com o bimestre aberto na tela |
| Linhas de simulado | Coluna A | "SIM" seguido do número, como "SIM 3" | Achar o simulado pelo número |
| Cabeçalho das disciplinas | Linha logo acima do primeiro SIM, a partir da coluna B | "MATÉRIA" ou "MATÉRIA - PROFESSOR" | Ligar cada coluna a uma disciplina da turma |
| TOTAL | Mesma linha do cabeçalho | Coluna com o nome "TOTAL"; o que vem depois dela é ignorado | Conferir a soma de cada SIM |
| Acertos | Cruzamento de SIM e disciplina | Número inteiro de 0 para cima, "não fez", "faltou" ou vazio | É o único dado gravado da planilha |
| Resultado | Linha com esse rótulo | Número ou fórmula | Conferir a soma de cada coluna |
| Nota Objetivo ou Objetiva | Linha com esse rótulo | Número ou fórmula, como `B10*0.3`, `0.3*B10` ou `B10*30%` | O fator da fórmula é comparado com o peso cadastrado |
| Nota Dissertativo ou Dissertativa | Linha com esse rótulo | Número | Referência na revisão, não é gravada |
| Nota final | Linha com esse rótulo | Número ou fórmula | É lida, mas não entra em nenhuma regra |

Célula vazia, "não fez" e "faltou" ficam sem nota, e o sistema mostra "nulo"; a vazia também gera aviso. A planilha não é alterada. Qualquer outro texto bloqueia até ser corrigido, e decimais também, porque o app mobile lê os acertos como inteiro.

"Nulo" aparece na revisão e na tela de notas por simulado, e não é zero: o SIM fica fora da conta. Na tela de notas por matéria, SIM sem nota não tem linha. SIM em que o aluno não tem nenhuma nota não aparece nas telas de notas, como já era antes.

Ponto ou vírgula não fazem diferença: o Excel guarda os números com ponto, mesmo mostrando vírgula na tela. As mensagens do sistema usam vírgula. Abas ocultas são ignoradas.

## Como o sistema encontra cada dado

O simulado é encontrado pela chave `turma_id + bimestre + numero`. A numeração recomeça a cada bimestre, e um índice único novo no banco impede dois simulados com a mesma chave.

| O que busca | Como busca | Se não achar |
| --- | --- | --- |
| Aluno e turma | Pelos ids do endereço da tela; o aluno precisa estar em `Turma.alunos` | Mensagem no envio, sem abrir a revisão |
| Aba | A escolhida pelo admin, quando ele escolhe; senão, a aba com o nome do aluno; senão, a única aba visível | Pede para escolher a aba. Aba única com outro nome é usada, com aviso |
| Bimestre | Lê da planilha e compara com o da tela | Bloqueia no envio |
| Simulado | "SIM 3" vira `numero: 3`, dentro da turma e do bimestre | Bloqueia a linha até o simulado ser cadastrado |
| Simulado fora da planilha | Todo simulado da turma no bimestre que não tem linha na planilha | Aparece na revisão marcado como "fora da planilha", com a nota já lançada |
| Nota já lançada | O resultado do aluno em cada disciplina do simulado | Vale como sem nota |

A disciplina de cada coluna é buscada nesta ordem:

1. **Escolha guardada:** uma ligação feita à mão antes, na mesma turma e com o mesmo cabeçalho, tem prioridade, desde que a disciplina ainda exista na turma.
2. **Matéria única:** se só uma disciplina da turma tem essa matéria, a coluna é ligada a ela, seja qual for o professor no cabeçalho.
3. **Matéria repetida:** com duas Físicas, por exemplo, o nome do cabeçalho precisa ser o começo do nome ou de um sobrenome do professor. "FÍSICA - TONI" liga a Toni Almeida.
4. **Sem certeza:** a coluna fica sem dono e bloqueia até o admin escolher. A escolha fica guardada para os próximos alunos da turma.

**Como os textos são comparados.** Abas, rótulos, matérias e professores passam pela mesma limpeza: sem acentos, em minúsculas, sem espaços sobrando e com qualquer tipo de traço virando hífen. Depois disso, a comparação é exata, exceto a do professor.

- **Matéria:** "MATEMATICA" encontra "Matemática", mas "MAT" não encontra.
- **Cabeçalho:** o texto antes do primeiro hífen é a matéria, e o resto é o professor.
- **Linha de simulado:** só vale "SIM" seguido do número. Uma linha com "Simulado 3" não é reconhecida.
- **Bimestre:** vale um dígito de 1 a 4 logo antes de "bimestre", como "1º bimestre" ou "1 bimestre". "Primeiro bimestre" bloqueia.

**Filtros usados na importação.** Prévia e confirmação fazem as mesmas buscas no banco, e a confirmação refaz todas elas.

| Onde | Filtra por | Para quê |
| --- | --- | --- |
| `Turma` | `_id` | Achar a turma e conferir se o aluno está em `alunos` |
| `Usuario` | `_id`; na confirmação, também os ids de `Turma.alunos` | Achar o aluno e os nomes dos colegas nas mensagens |
| `TurmaDisciplina` | `turma_id` | Listar as disciplinas da turma, com matéria e professor |
| `Simulado` | `turma_id` e `bimestre` | Listar os simulados do bimestre na turma |
| `MapeamentoColuna` | `turma_id` | Trazer as escolhas guardadas da turma |
| Abas, em memória | Abas visíveis | Ignorar as ocultas |
| Simulado da linha, em memória | `numero` | Ligar "SIM 3" ao simulado 3 |
| Conteúdo, em memória | `turma_disciplina_id` | Ligar a coluna ao conteúdo do simulado |
| Nota já lançada, em memória | `aluno_id` | Comparar com a planilha |
| Gravação | `_id` do simulado, `turma_disciplina_id` e `aluno_id` | Mudar só o resultado certo |

**O que não é usado na busca.**

- **Ano:** não é filtrado, porque a turma já define o ano. Um aluno em duas turmas usa a turma aberta na tela.
- **Data de criação:** serve só para o prazo de 16 dias.
- **Data de realização:** serve só para o aviso de data futura.
- **Tipo:** não filtra; decide em qual nota os acertos entram.
- **Nome do aluno:** serve só para achar a aba. O aluno vem sempre pelo id.
- **Busca por texto e paginação:** a importação não tem nenhuma das duas.

**Filtros nas telas.**

| Tela | Filtro | Efeito |
| --- | --- | --- |
| Simulados da turma | "Selecionar Bimestre", na própria tela | Mostra só os simulados daquele bimestre |
| Lista de alunos do simulado | 10 alunos por página; a lista do **Importar Excel** traz a turma inteira, sem busca por nome | Sem nota no simulado, a tabela mostra só o aviso |
| Notas por simulado e por matéria | No banco: turma, bimestre e simulados em que o aluno tem resultado. Na tela: simulado ou disciplina escolhidos no seletor | Simulado sem nenhuma nota do aluno não aparece |

**Índices novos.** São dois, ambos únicos: `turma_id + bimestre + numero` em `Simulado` e `turma_id + cabecalho` em `MapeamentoColuna`.

## Como as notas são calculadas

A importação não mudou o cálculo: a conta é a mesma que a tela de notas por matéria já fazia. A nota de cada tipo soma os SIMs daquele tipo:

```math
nota_{tipo} = \sum_{SIMs\ do\ tipo} \frac{acertos \times peso}{100}
```

| Valor | Conta | Onde aparece |
| --- | --- | --- |
| Nota objetiva | Soma dos SIMs do tipo objetivo | "Nota Objetivo" na revisão e "Média Objetiva" na tela de notas |
| Nota dissertativa | Soma dos SIMs do tipo dissertativo | "Nota Dissertativo" na revisão e "Média Dissertativa" na tela de notas |
| Nota final | Objetiva + dissertativa, com máximo de 10 | "Nota Final" nas duas telas |
| `resultado.nota` | Acertos ÷ questões × 10, com 2 casas, sem usar o peso | Gravada em cada resultado; é a nota de 0 a 10 que o app mobile mostra por simulado |

Exemplo: com 2 acertos em 3 questões e peso 30, o SIM soma 0,60 na nota objetiva, e o `resultado.nota` dele é 6,67.

Apesar do nome, a Média Dissertativa e a Média Objetiva são somas, não médias. SIM com "nulo" não tem resultado gravado e não entra na conta nem no total de questões.

A nota final não é gravada nem arredondada: a tela mostra 2 casas. A revisão usa a mesma conta da tela de notas. A conta existe no backend e no front, e um teste compara as duas cópias.

## O que o admin altera à mão

A revisão existe para o admin decidir tipo, peso e acertos de cada SIM, e cada mudança tem um alcance diferente. As notas objetiva, dissertativa e final não são digitadas: mudam quando esses valores mudam.

| O que muda | Onde | Vale para | Regras |
| --- | --- | --- | --- |
| Acertos de um SIM da planilha | Revisão, no lápis da linha | Só este aluno | Inteiro de 0 até o número de questões |
| Acertos de um SIM fora da planilha | Revisão, no lápis da linha | Só este aluno, só nessa disciplina | Mesma regra; as outras disciplinas do SIM ficam como estão |
| "Nulo" | Revisão, apagando os acertos | Só este aluno | Remove a nota já lançada, com aviso |
| Peso | Revisão, sempre editável | A turma inteira, nessa disciplina e nesse SIM | Inteiro de 1 a 100; não pode levar a nota de nenhum aluno acima de 10 |
| Tipo | Revisão, no lápis da linha | O simulado inteiro: todas as disciplinas e todos os alunos | Objetivo ou dissertativo; os acertos passam de uma nota para a outra |
| Disciplina da coluna | Revisão, no seletor da coluna | Próximas importações da turma com o mesmo cabeçalho | Duas colunas não podem ficar na mesma disciplina |
| Acertos, depois da importação | **Lançar Notas Simulado** | Só este aluno | Até o número de questões; não tem como marcar "nulo", porque vazio vira 0 |
| Número de questões | **Editar Simulado** | O simulado inteiro | Só até 16 dias depois do cadastro; não aparece na revisão |

Tipo e peso podem ser alterados na revisão mesmo depois dos 16 dias da tela de edição, com aviso. Antes de gravar essas duas mudanças, o sistema pede confirmação.

## Bloqueios e avisos

Bloqueio impede a gravação, e aviso só informa: o Confirmar da revisão fica liberado com qualquer quantidade de avisos. O servidor repete as regras ao confirmar, sem confiar no que veio da tela.

**Bloqueios**

| Código | Quando acontece | Onde aparece | Como resolver |
| --- | --- | --- | --- |
| `ARQUIVO_INVALIDO` | O arquivo não abre como .xlsx | Envio | Enviar um .xlsx válido |
| `ABA_NAO_ENCONTRADA` | Várias abas e nenhuma com o nome do aluno, ou aba escolhida inexistente | Envio | Escolher a aba |
| `BIMESTRE_ILEGIVEL` | Não achou "bimestre" e um dígito de 1 a 4 acima do primeiro SIM | Envio | Corrigir a planilha |
| `BIMESTRE_DIFERENTE` | A planilha é de outro bimestre | Envio | Abrir o bimestre certo |
| `SEM_LINHAS_SIM` | Nenhuma linha "SIM n" na aba | Envio | Corrigir a planilha |
| `SEM_DISCIPLINAS` | Nenhuma coluna na linha acima do primeiro SIM | Envio | Corrigir a planilha |
| `CABECALHO_REPETIDO` | Duas colunas com o mesmo cabeçalho | Revisão | Renomear na planilha |
| `SIM_REPETIDO` | O mesmo SIM em duas linhas | Revisão | Corrigir a planilha |
| `SIM_SEM_SIMULADO` | A linha SIM não tem simulado cadastrado | Revisão | Cadastrar o simulado |
| `SIMULADO_DUPLICADO` | Dois simulados com o mesmo número no bimestre | Revisão | Corrigir o cadastro |
| `COLUNA_SEM_DISCIPLINA` | Coluna sem disciplina ligada | Revisão | Escolher a disciplina |
| `COLUNAS_MESMA_DISCIPLINA` | Duas colunas na mesma disciplina | Revisão | Trocar uma delas |
| `ACERTOS_INVALIDO` | Texto que não seja "não fez" ou "faltou", número negativo ou decimal nos acertos | Revisão | Corrigir na tela |
| `ACERTOS_ACIMA_DO_LIMITE` | Mais acertos que questões | Revisão | Corrigir os acertos, ou as questões em Editar Simulado |
| `DISCIPLINA_FORA_DO_SIMULADO` | Acertos numa disciplina que o simulado não tem | Revisão | Corrigir o cadastro ou limpar a célula |
| `PESO_INVALIDO` | Peso alterado para vazio, decimal, 0 ou acima de 100 | Revisão | Corrigir o peso |
| `NOTA_ACIMA_DE_10` | A nota final do aluno passaria de 10 | Revisão | Corrigir peso ou acertos |
| `NOTA_DE_OUTRO_ALUNO_ACIMA_DE_10` | O peso novo levaria outro aluno acima de 10 | Ao confirmar | Corrigir o peso |
| `SIMULADO_INVALIDO`, `TIPO_INVALIDO` | O cadastro mudou enquanto a tela estava aberta, ou o tipo enviado não existe | Ao confirmar | Importar de novo |

No envio também há mensagens sem código: "Envie a planilha.", "Envie uma planilha .xlsx.", "O arquivo passa do limite de 2 MB.", "Turma não encontrada" e "O aluno não faz parte desta turma".

**Avisos**

| Código | Quando acontece |
| --- | --- |
| `ABA_NOME_DIFERENTE` | A aba usada não tem o nome do aluno |
| `CELULAS_VAZIAS` | Células sem valor; valem como "nulo" |
| `TOTAL_DIFERENTE` | A soma do SIM não bate com a coluna TOTAL |
| `RESULTADO_DIFERENTE` | A soma da coluna não bate com a linha Resultado |
| `FATOR_DIFERENTE` | O fator da fórmula da Nota Objetivo difere do peso cadastrado |
| `NOTA_DISSERTATIVA_DIFERENTE` | A nota dissertativa calculada difere da planilha |
| `JA_TEM_RESULTADO` | A importação vai trocar ou remover uma nota já lançada; mostra o valor antigo e o novo |
| `SIMULADO_FORA_DA_PLANILHA` | O simulado tem notas lançadas e não está na planilha; elas continuam valendo |
| `DATA_FUTURA` | O simulado da planilha tem data que ainda não chegou |
| `TIPO_ALTERADO`, `PESO_ALTERADO` | Tipo ou peso mudou; informa quantos alunos já têm resultado |
| `FORA_DO_PRAZO` | Tipo ou peso mudou depois dos 16 dias da tela de edição |

## Limites

Pelas telas, cada turma tem no máximo 10 simulados por bimestre, então uma disciplina entra em até 10. O limite vem da numeração de 1 a 10 nas telas de cadastro e edição, que já existia; o servidor não tem esse limite.

| Item | Limite | Onde vale | Origem |
| --- | --- | --- | --- |
| Tamanho do arquivo | 2 MB | Servidor | Importação |
| Formato do arquivo | Só .xlsx | Tela e servidor | Importação |
| Alunos e abas por envio | 1 aluno e 1 aba | Tela e servidor | Importação |
| Bimestre | 1 a 4 | Tela, planilha e servidor | Importação e cadastro |
| Simulados por bimestre | 10 por turma | Telas de cadastro e edição | Já existia |
| Linhas SIM na planilha | Sem limite, mas cada uma precisa de simulado cadastrado | Importação | Importação |
| Questões por disciplina no cadastro | 1 a 10 | Tela de cadastro | Já existia |
| Questões por disciplina na edição | 1 a 100 | Tela de edição | Já existia |
| Acertos | Inteiro, de 0 até o número de questões | Revisão e servidor | Importação |
| Peso alterado na revisão | Inteiro de 1 a 100 | Revisão e servidor | Importação |
| Nota final por disciplina | 10 | Revisão e servidor, para este aluno; servidor, para os outros quando o peso muda | Importação |
| Edição do simulado | Até 16 dias depois do cadastro | Tela de edição | Já existia |

O número de questões não vem da planilha: ele é decidido no cadastro de cada simulado e disciplina, e a revisão não o altera. Os valores 2 e 3 que aparecem nos testes são dados fictícios da seed, e ninguém decidiu que esse é o máximo.

Decimais já cadastrados em um peso não bloqueiam enquanto o peso não for alterado.

## O que é gravado

Da planilha, só os acertos das linhas SIM entram no banco. O arquivo fica na memória durante a requisição e não é salvo em disco.

| Dado | Gravado? | Onde |
| --- | --- | --- |
| Acertos e `resultado.nota` | Sim | `Simulado.conteudos[].resultados[]` |
| Peso alterado | Sim | `Simulado.conteudos[].peso` |
| Tipo alterado | Sim | `Simulado.tipo` |
| Disciplina escolhida à mão para uma coluna | Sim | Coleção nova `MapeamentoColuna`, por turma e cabeçalho |
| Nota objetiva, dissertativa e final | Não | Calculadas ao abrir as telas |
| Nota Dissertativo, Nota Objetivo, Nota final, Resultado, TOTAL e fator da planilha | Não | Servem só para comparar na revisão |
| Arquivo da planilha | Não | Nenhum |

**Como a confirmação grava.** O servidor busca o cadastro atual, refaz as validações e compara cada célula com a nota já lançada. Depois grava com operações individuais, sem substituir a lista inteira de conteúdos:

- **Criada:** o aluno não tinha nota e agora tem.
- **Atualizada:** o valor mudou.
- **Removida:** tinha nota e agora está como "nulo".
- **Sem alteração:** o valor é igual, e nada é escrito.

**Importar de novo.** Enviar a mesma planilha não duplica nada: no teste, todos os 78 valores ficaram sem alteração. Um valor alterado à mão em um SIM da planilha volta ao valor dela, com aviso antes de confirmar. Simulados fora da planilha não mudam, exceto o que o admin digitar na revisão.

**Permissões.** As duas rotas exigem login de administrador, e as duas telas de importação usam a proteção de rota de admin. No teste, o professor viu "Acesso negado." na tela e recebeu 403 da API.

## Mudanças por arquivo

A implementação fica toda no `notasmax-web-nosql`, com duas rotas novas na API e duas telas novas. O app mobile não foi alterado.

**Rotas novas da API.** As duas exigem administrador.

| Rota | Recebe | Devolve |
| --- | --- | --- |
| `POST /Importacoes/Notas/Previa` | Formulário com `arquivo`, `aluno_id`, `turma_id`, `bimestre` e `aba` (opcional) | A aba lida, as colunas ligadas, os simulados, as linhas, os bloqueios e os avisos. Não grava nada |
| `POST /Importacoes/Notas/Confirmar` | JSON com `aluno_id`, `turma_id`, `bimestre`, `colunas`, `linhas`, `tipos` e `pesos` | As contagens de criadas, atualizadas, removidas e sem alteração, ou 422 com os bloqueios |

**Rotas novas do front.** `/Simulados/Importar/:turma/:bimestre/:aluno` e `/Simulados/Importar/:turma/:bimestre/:aluno/Confirmar`.

**Backend**

| Arquivo | Situação | O que faz |
| --- | --- | --- |
| `services/planilhaNotasParser.js` | Novo | Lê a aba e aplica as regras que dependem só da planilha |
| `services/conferenciaNotas.js` | Novo | Calcula as notas, valida a revisão, liga colunas, monta a prévia e as operações de banco |
| `Controllers/ImportacaoController.js` | Novo | Implementa as rotas de prévia e confirmação |
| `middlewares/uploadPlanilha.js` | Novo | Recebe o arquivo na memória, com limite de 2 MB e só .xlsx |
| `Models/MapeamentoColuna.js` | Novo | Guarda a disciplina escolhida para um cabeçalho na turma |
| `DB/seedImportacao.js` | Novo | Cria dados fictícios de teste. Apaga o banco local antes |
| `Models/Simulado.js` | Alterado | Índice único em `turma_id + bimestre + numero` |
| `Routes/routes.js` | Alterado | Registra as duas rotas |
| `package.json` | Alterado | Adiciona `exceljs` e `multer` |

**Frontend**

| Arquivo | Situação | O que faz |
| --- | --- | --- |
| `pages/ImportarNotas.jsx` | Novo | Tela de envio do arquivo e escolha da aba |
| `pages/ConfirmarImportacaoNotas.jsx` | Novo | Tela de revisão: guarda as alterações, lista problemas e confirma |
| `components/ConferenciaColuna.jsx` | Novo | Uma coluna da revisão, com os SIMs e as notas calculadas |
| `utils/conferenciaNotas.js` | Novo | Cópia das regras, para recalcular a tela a cada alteração |
| `styles/ImportacaoNotas.module.css` | Novo | Estilos das duas telas |
| `imgs/importar-arquivo.svg`, `arquivo-selecionado.svg`, `editar-linha.svg` | Novos | Ícones do Figma |
| `App.jsx` | Alterado | Registra as duas telas, só para admin |
| `api/simuladoApi.js` | Alterado | Funções que chamam as rotas novas |
| `pages/SimuladosAlunosList.jsx` | Alterado | Botão **Importar Excel**, que pergunta de qual aluno é a planilha |
| `pages/SimuladoNotasPorSimulado.jsx` | Alterado | Botão **Importar Excel**, mesmo para aluno sem nota no bimestre |
| `pages/SimuladoNotasPorMateria.jsx` | Alterado | Agrupa por disciplina, e não por matéria, para não somar duas Físicas de professores diferentes |
| `components/NotasCard.jsx` | Alterado | Mostra "nulo" em vez de quebrar quando falta resultado |

**Testes novos.** `conferencia-notas.test.js`, `importacao-controller.test.js` e `planilha-notas-parser.test.js` no backend; testes ao lado de cada tela e componente no front.

**Fora do repositório.** As 11 planilhas de teste e o `LEIA-ME.md` ficam na pasta `planilhas-teste`, ao lado do repositório. Para testar localmente, a seed `Backend/DB/seedImportacao.js` cria 26 usuários, 4 turmas e 72 simulados, e apaga o banco local antes.

## Testes

As suítes automáticas passam por completo, e o fluxo principal foi testado no navegador com banco descartável e com a planilha original. O app mobile não foi aberto, e o CI ainda não rodou nesta branch. Resultados de 02/11/2026.

| Verificação | Resultado | Como rodou |
| --- | --- | --- |
| Testes do backend | 185 de 185 | Node 26.5.1, a versão do CI |
| Testes do front | 199 de 199 | Node 26.5.1 |
| Cobertura de linhas do backend | 84,42% (mínimo 80%) | Node 26.5.1 |
| Cobertura de linhas do front | 84,30% (mínimo 80%) | Node 26.5.1 |
| Fluxo geral no navegador: telas, mensagens, avisos, permissões | 52 de 52 | Antes de a revisão listar SIMs fora da planilha; não foi repetido depois |
| Alteração à mão: revisão, tela de lançamento e nova importação | 25 de 25 | Com a planilha original e um SIM fora dela |
| Caminho do botão pela lista de alunos | Passou no 1º e no 2º bimestre | Banco da seed, sem gravar nada |
| Bloqueios com as mensagens exatas, depois da mudança para "nulo" | 20 de 20 | Pela API de prévia, sem gravar nada; os bloqueios que só aparecem ao confirmar ficam nos testes automáticos |

**Planilha original no sistema.** Com os 6 SIMs cadastrados como objetivos e os pesos da própria planilha, a importação entra sem bloqueio e liga as 13 colunas. A nota objetiva bate nas 13 disciplinas.

A nota dissertativa fica 0,00 e a final fica igual à objetiva, até o admin marcar SIMs como dissertativos e definir os pesos. Na planilha, a Nota Dissertativo é digitada e não vem de nenhuma linha SIM, então a diferença é esperada. A revisão avisa em cada coluna.

## Limitações e decisões em aberto

Duas decisões ainda dependem da escola ou do dono do produto. Até lá, o sistema fica como descrito na coluna do meio.

| Decisão | Como está hoje | O que muda se aprovar |
| --- | --- | --- |
| Digitar direto a nota objetiva, dissertativa ou final? | Não dá: as notas são calculadas | Seria preciso guardar um valor novo por aluno e disciplina, o que hoje não existe. Recomendação: só fazer se alterar cada SIM não atender a escola |
| Arredondar a nota final? | Sem arredondar. Em Inglês e História, a planilha original tem 7 digitado, e o sistema mostra 7,40 e 7,10 | A proposta do plano é arredondar para o inteiro mais próximo; a escola precisa confirmar |

Limitações conhecidas:

- **Notas da planilha:** a nota final do sistema só coincide com a da planilha quando os SIMs dissertativos e os pesos representam o que foi digitado nela.
- **Gravação em etapas:** a confirmação não usa transação. Se o banco falhar no meio, parte pode ficar gravada; importar de novo corrige, porque compara cada valor.
- **App mobile:** foi conferido pelo código e pela rota que ele usa, sem abrir o app. Ele mostra o `resultado.nota` de cada simulado, e não a nota final nem a dissertativa.
- **Telas antigas:** o cadastro aceita até 10 questões e a edição até 100; o aviso fala em 15 dias, mas a regra usa 16. As duas diferenças já existiam e não foram alteradas.
- **Lista de alunos:** sem nenhuma nota no simulado, a lista continua mostrando só o aviso "ainda não foram lançadas". O botão **Importar Excel** é o caminho nesse caso.
