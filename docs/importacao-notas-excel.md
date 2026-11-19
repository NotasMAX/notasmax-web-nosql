# Importação de notas por Excel: relatório da implementação

Atualizado em 18/11/2026.

## Resumo

A importação está pronta para teste: o admin envia a planilha .xlsx de um aluno, revisa os dados na tela e confirma, e só então os acertos são gravados nos simulados. O código está na branch `Amauri`.

- **Regra central:** o sistema grava só valores brutos (acertos, peso e tipo). As notas são sempre calculadas.
- **Nota dissertativa:** sai apenas dos SIMs do tipo dissertativo. A "Nota Dissertativo" da planilha aparece na revisão só como referência e não é gravada.
- **Ajustes:** quem revisa altera acertos, peso, tipo e número de questões de cada SIM do bimestre, inclusive dos que não estão na planilha.
- **Cadastro pela revisão:** SIM da planilha sem simulado cadastrado vira um simulado novo, criado ao confirmar. Disciplina que falta num simulado entra nele como "novo responsável". Coluna sem dono ganha um seletor de professor: a matéria vem do cabeçalho, e um professor que ainda não dá essa matéria na turma passa a dar quando a importação for confirmada. Antes do Confirmar, nada é salvo.
- **Sem coleção nova para notas:** os resultados continuam em `Simulado.conteudos[].resultados[]`. As duas coleções novas guardam a escolha de disciplina de cada coluna e o registro de cada importação confirmada.
- **Planilha guardada:** na confirmação, o arquivo enviado vai para o Azure Blob Storage, uma vez só por conteúdo. Só o ambiente de produção guarda; localmente, a importação funciona sem guardar.

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
3. Na revisão, confira a disciplina ligada a cada coluna, que aparece embaixo do nome da coluna, e abra as colunas para ver os SIMs. Coluna sem dono ou repetida mostra o seletor de professor; as outras ficam como o sistema ligou.
4. Ajuste tipo, peso, questões e acertos no que for preciso. Nos SIMs novos, preencha as questões de cada disciplina e confira a data. As notas são recalculadas a cada alteração.
5. Com todos os bloqueios resolvidos, clique em **Confirmar**. Se algo vale para a turma inteira (tipo, peso, questões, simulado novo ou disciplina adicionada a um simulado), o sistema pergunta antes. O arquivo vai junto e é guardado antes das notas.
6. A tela mostra quantas notas foram criadas, atualizadas, removidas e mantidas, e leva às notas do aluno.

```mermaid
flowchart LR
    A["Envio: arquivo .xlsx de um aluno"] --> B["Prévia: lê a aba e valida, sem gravar"]
    B --> C["Revisão: admin ajusta e a tela recalcula"]
    C -->|sem bloqueio| D["Confirmar: servidor valida de novo e guarda a planilha"]
    D --> E["Gravação: só o que mudou"]
    E --> F["Notas do aluno: sempre calculadas ao abrir"]
    F -->|nova importação| A
```

Problema de estrutura ou de bimestre para no envio; os demais bloqueios ficam na revisão até serem corrigidos.

## Como testar

Dá para testar tudo com a seed e as planilhas de `docs/planilhas-teste`, que usam dados fictícios. A seed apaga os dados do banco `NotasMax` local, então não a rode em um banco que você queira manter.

1. Rode `npm install` nas pastas `Backend` e `Frontend`.
2. Na pasta `Backend`, copie o `.env.example` para `.env`. Sem esse arquivo, a API não sobe.
3. Suba um Mongo local na porta 27017. Com Docker: `docker run -d --name notasmax-mongo -p 127.0.0.1:27017:27017 -v notasmax-mongo-data:/data/db mongo:8`.
4. Na pasta `Backend`, rode `node DB/seedImportacao.js`.
5. Rode `npm start` no `Backend` e `npm run dev` no `Frontend`.
6. Abra `http://localhost:5173` e entre com o login de admin da tabela abaixo.
7. Vá em Turmas, abra a turma, clique no olho de um simulado do bimestre da planilha, clique em **Importar Excel** e escolha o aluno.
8. Envie a planilha, confira a revisão e clique em **Confirmar**.

Localmente, a planilha não é guardada no Blob Storage, e o registro da importação fica com `planilha.blob` nulo. Para conferir o Blob, veja "Planilha no Blob Storage", em O que é gravado.

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Admin, o único que importa | `admin@notasmax.test` | `admin123` |
| Professor | `lourdes.prado@notasmax.test` | `admin123` |
| Aluno | `lucas.santos@notasmax.test` | `admin123` |

Para começar, use estas planilhas. O [`LEIA-ME.md`](planilhas-teste/LEIA-ME.md) da pasta lista as 11, com as mensagens exatas de cada bloqueio.

| Planilha | Abrir em | O que mostra |
| --- | --- | --- |
| `01-turma-1EM-2bimestre-sem-avisos` | Qualquer aluno do 1º EM, 2º bimestre | Importa sem bloqueio nem aviso |
| `11-celulas-nulas` | Qualquer aluno do 1º EM, 2º bimestre | Célula vazia e células com texto aparecem como "nulo" |
| `06-bloqueios-acertos` | Isabela Pereira, 2º bimestre | Bloqueios de acertos, até corrigir na revisão |
| `03-aluno-1bimestre-reimportacao` | Gustavo Almeida, 1º bimestre | Valor antigo e novo em cima de notas já lançadas |

Testes automáticos: rode `npm run test:coverage` nas pastas `Backend` e `Frontend`. O CI usa a versão do Node que está no `.nvmrc` de cada pasta.

**Com uma planilha real.** A seed é fictícia, então uma planilha real normalmente não passa nela. Para entrar sem bloqueio, o cadastro precisa ter:

- o aluno na turma, com a tela aberta no bimestre da planilha;
- em cada simulado e disciplina, um número de questões maior ou igual aos acertos. Na revisão, dá para alterar;
- uma disciplina para cada coluna. Se a matéria se repete na turma e o professor não bate com o cabeçalho, a disciplina é escolhida na revisão; se a turma não tem a disciplina, ela é cadastrada na revisão.

Linha `SIM n` sem simulado cadastrado não bloqueia: vira um simulado novo, que precisa só das questões de cada disciplina.

## O que a planilha precisa ter

O sistema lê uma aba por envio e se guia pela coluna A: os rótulos dela dizem o que é cada linha. Maiúsculas, acentos e espaços extras não fazem diferença.

| Item | Onde fica | O que aceita | Para que serve |
| --- | --- | --- | --- |
| Bimestre | Coluna A, acima do primeiro SIM | Texto com "bimestre" e um dígito de 1 a 4, como "1º bimestre" | Conferir com o bimestre aberto na tela |
| Linhas de simulado | Coluna A | "SIM" seguido do número, como "SIM 3" | Achar o simulado pelo número |
| Cabeçalho das disciplinas | Linha logo acima do primeiro SIM, a partir da coluna B | "MATÉRIA" ou "MATÉRIA - PROFESSOR" | Ligar cada coluna a uma disciplina da turma |
| TOTAL | Mesma linha do cabeçalho | Coluna com o nome "TOTAL"; o que vem depois dela é ignorado | Conferir a soma de cada SIM |
| Acertos | Cruzamento de SIM e disciplina | Número inteiro de 0 para cima, qualquer texto (que vale como "nulo") ou vazio | É o único dado gravado da planilha |
| Resultado | Linha com esse rótulo | Número ou fórmula | Conferir a soma de cada coluna |
| Nota Objetivo ou Objetiva | Linha com esse rótulo | Número ou fórmula, como `B10*0.3`, `0.3*B10` ou `B10*30%` | O fator da fórmula é comparado com o peso cadastrado |
| Nota Dissertativo ou Dissertativa | Linha com esse rótulo | Número | Referência na revisão, não é gravada |
| Nota final | Linha com esse rótulo | Número ou fórmula | É lida, mas não entra em nenhuma regra |

Célula vazia e qualquer texto ("não fez", "faltou", "ausente", "-", erro de fórmula, data) ficam sem nota, e o sistema mostra "nulo"; só a vazia gera aviso. A planilha não é alterada. Na revisão vale o mesmo: o texto digitado no campo de acertos continua lá, sem destaque, e conta como "nulo". Só número negativo ou decimal bloqueia, porque parece um acerto digitado errado e o app mobile lê os acertos como inteiro.

"Nulo" aparece na revisão e na tela de notas por simulado, e não é zero: o SIM fica fora da conta. Na tela de notas por matéria, SIM sem nota não tem linha. SIM em que o aluno não tem nenhuma nota não aparece nas telas de notas, como já era antes.

Ponto ou vírgula não fazem diferença: o Excel guarda os números com ponto, mesmo mostrando vírgula na tela. As mensagens do sistema usam vírgula. Abas ocultas são ignoradas.

## Como o sistema encontra cada dado

O simulado é encontrado pela chave `turma_id + bimestre + numero`. A numeração recomeça a cada bimestre, e um índice único novo no banco impede dois simulados com a mesma chave.

| O que busca | Como busca | Se não achar |
| --- | --- | --- |
| Aluno e turma | Pelos ids do endereço da tela; o aluno precisa estar em `Turma.alunos` | Mensagem no envio, sem abrir a revisão |
| Aba | A escolhida pelo admin, quando ele escolhe; senão, a aba com o nome do aluno; senão, a única aba visível | Pede para escolher a aba. Aba única com outro nome é usada, com aviso |
| Bimestre | Lê da planilha e compara com o da tela | Bloqueia no envio |
| Simulado | "SIM 3" vira `numero: 3`, dentro da turma e do bimestre | Vira um simulado novo na revisão, criado ao confirmar |
| Simulado fora da planilha | Todo simulado da turma no bimestre que não tem linha na planilha | Aparece na revisão marcado como "fora da planilha", com a nota já lançada |
| Nota já lançada | O resultado do aluno em cada disciplina do simulado | Vale como sem nota |

A disciplina de cada coluna é buscada nesta ordem:

1. **Escolha guardada:** uma ligação feita à mão antes, na mesma turma e com o mesmo cabeçalho, tem prioridade, desde que a disciplina ainda exista na turma.
2. **Matéria única:** se só uma disciplina da turma tem essa matéria, a coluna é ligada a ela, seja qual for o professor no cabeçalho.
3. **Matéria repetida:** com duas Físicas, por exemplo, o nome do cabeçalho precisa ser o começo do nome ou de um sobrenome do professor. "FÍSICA - TONI" liga a Toni Almeida.
4. **Sem certeza:** a coluna fica sem dono e bloqueia até o admin escolher. A escolha fica guardada para os próximos alunos da turma.

**Por que uma coluna fica "sem dono".** Ou a turma não tem nenhuma disciplina dessa matéria, ou tem mais de uma e o professor do cabeçalho não decide.

**Seletor de professor.** A revisão não tem mais a coluna "Disciplina da turma": a disciplina ligada aparece embaixo do nome da coluna. O seletor só aparece quando há decisão a tomar: coluna sem dono, como uma matéria que a turma não tem, ou duas colunas na mesma disciplina. Depois da escolha, ele continua na coluna, para corrigir um engano. Coluna que o sistema ligou sozinho não tem seletor: o professor dela não muda na revisão, e assim a revisão não cria por engano uma segunda disciplina para uma matéria que a turma já tem. A matéria vem sempre do cabeçalho; o admin escolhe só o professor:

- **Já dão a matéria nesta turma:** liga a coluna a essa disciplina.
- **Adicionar a matéria à turma com:** qualquer outro professor do sistema. Escolher um deles cria uma disciplina nova (matéria do cabeçalho + professor), que aparece embaixo do nome da coluna com a etiqueta "nova" e só é cadastrada na turma ao confirmar. Trocada por outra escolha antes de confirmar, ela sai da lista. Assim, um professor pode dar várias matérias na mesma turma sem cair em "disciplina repetida".
- **Matéria que não existe no sistema:** escolher um professor abre o formulário, já com ele, para dar nome à matéria.

O seletor e o formulário só listam professores já cadastrados. Professor que ainda não existe é cadastrado antes, na tela de professores.

**O campo Matéria do formulário.** É um campo de texto só, já preenchido com a matéria do cabeçalho. Cabeçalho todo em maiúsculas vira nome como os do sistema: "ARTES" fica "Artes", e "HISTÓRIA DA ARTE" fica "História da Arte". Enquanto o admin digita, o navegador sugere as matérias cadastradas, e uma linha embaixo do campo diz o que vai acontecer:

- **"Usa a matéria já cadastrada":** o nome bate com uma matéria que já existe, ignorando acentos e maiúsculas. Serve quando a planilha abrevia ou escreve diferente, como "PORT" para "Português", e evita criar uma matéria repetida.
- **"Cria a matéria nova":** nenhum nome bate, e a matéria será cadastrada com o nome do campo.

**Nada é salvo antes do Confirmar.** A disciplina escolhida na revisão, e a matéria nova dela, ficam só na tela, com um id provisório e o aviso `DISCIPLINA_NOVA` na coluna. Cancelar, sair da revisão ou fechar a aba não deixa nada para trás. Na confirmação, o servidor:

1. Confere os pedidos: a matéria escolhida e o professor ainda existem; uma matéria com o mesmo nome, ignorando acentos e maiúsculas, é usada em vez de criar outra; uma disciplina que a turma já tem é usada em vez de cadastrar outra igual.
2. Valida a importação inteira com as disciplinas novas, como se já existissem. Qualquer bloqueio para tudo, e nada é cadastrado.
3. Guarda a planilha, cadastra a matéria nova e depois a disciplina, e só então grava as notas, com o id real.
4. Se as notas não puderem ser gravadas, apaga a disciplina e a matéria cadastradas nessa confirmação.

A mesma matéria com o mesmo professor, escolhida em duas colunas, é uma disciplina só, e a revisão acusa "disciplina repetida".

**"Novo responsável".** Quando o simulado existe mas não tem a disciplina da coluna, e a célula tem acertos, a disciplina entra no simulado ao confirmar, para a turma toda. Antes de confirmar, ela precisa de questões e peso; o peso vem preenchido com o fator da fórmula da Nota Objetivo, quando há.

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
| Número de questões | Revisão, no lápis da linha | A turma inteira, nessa disciplina e nesse SIM; recalcula o `resultado.nota` de todos os alunos | Inteiro de 1 a 100; não pode ficar abaixo dos acertos de nenhum aluno |
| SIM novo | Revisão: tipo, data e questões no lápis da linha, peso sempre editável | Cria o simulado para a turma inteira, com o resultado só deste aluno | Número de 1 a 10, data obrigatória, hoje por padrão; questões e peso em cada disciplina |
| Disciplina nova num simulado | Revisão, como "novo responsável" | A turma inteira, nesse SIM | Questões e peso obrigatórios |
| Disciplina nova na turma | Revisão, no seletor de professor da coluna | A turma, só ao confirmar a importação | Matéria do cabeçalho com um professor do sistema; matéria que não existe ganha nome no formulário |
| Acertos de um SIM fora da planilha | Revisão, no lápis da linha | Só este aluno, só nessa disciplina | Mesma regra; as outras disciplinas do SIM ficam como estão |
| "Nulo" | Revisão, apagando os acertos | Só este aluno | Remove a nota já lançada, com aviso |
| Peso | Revisão, sempre editável | A turma inteira, nessa disciplina e nesse SIM | Inteiro de 1 a 100; não pode levar a nota de nenhum aluno acima de 10 |
| Tipo | Revisão, no lápis da linha | O simulado inteiro: todas as disciplinas e todos os alunos | Objetivo ou dissertativo; os acertos passam de uma nota para a outra |
| Professor da coluna | Revisão: seletor na lista, só em coluna sem dono ou repetida; depois da escolha, o seletor continua para corrigir | Próximas importações da turma com o mesmo cabeçalho | Duas colunas não podem ficar na mesma disciplina (mesma matéria e mesmo professor) |
| Acertos, depois da importação | **Lançar Notas Simulado** | Só este aluno | Até o número de questões; não tem como marcar "nulo", porque vazio vira 0 |
| Número de questões, fora da importação | **Editar Simulado** | O simulado inteiro | Só até 16 dias depois do cadastro |

Tipo, peso, questões e disciplinas podem ser alterados na revisão mesmo depois dos 16 dias da tela de edição, com aviso. Antes de gravar mudanças que valem para a turma, o sistema pede confirmação.

## Bloqueios e avisos

Bloqueio impede a gravação, e aviso só informa: o Confirmar da revisão fica liberado com qualquer quantidade de avisos. O servidor repete as regras ao confirmar, sem confiar no que veio da tela.

Na revisão, **Bloqueios** e **Avisos** começam recolhidos: o título mostra quantos são e abre ou fecha a lista. Cada coluna também mostra o primeiro problema dela no status. Se o servidor recusar a confirmação, os bloqueios abrem sozinhos, para mostrar o motivo.

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
| `SIMULADO_DUPLICADO` | Dois simulados com o mesmo número no bimestre | Revisão | Corrigir o cadastro |
| `COLUNA_SEM_DISCIPLINA` | Coluna sem disciplina ligada | Revisão | Escolher a disciplina |
| `COLUNAS_MESMA_DISCIPLINA` | Duas colunas na mesma disciplina | Revisão | Trocar uma delas |
| `ACERTOS_INVALIDO` | Número negativo ou decimal nos acertos | Revisão | Corrigir na tela |
| `ACERTOS_ACIMA_DO_LIMITE` | Mais acertos que questões | Revisão | Corrigir os acertos ou as questões |
| `QUESTOES_INVALIDAS` | Questões vazias, decimais, 0 ou acima de 100, num valor alterado, num SIM novo ou numa disciplina nova | Revisão | Preencher as questões |
| `DATA_INVALIDA` | SIM novo sem data de realização | Revisão | Preencher a data |
| `SIM_NUMERO_FORA_DO_LIMITE` | SIM novo com número fora de 1 a 10, que as telas de simulado não mostram | Revisão | Corrigir a planilha |
| `PESO_INVALIDO` | Peso alterado para vazio, decimal, 0 ou acima de 100 | Revisão | Corrigir o peso |
| `NOTA_ACIMA_DE_10` | A nota final do aluno passaria de 10 | Revisão | Corrigir peso ou acertos |
| `NOTA_DE_OUTRO_ALUNO_ACIMA_DE_10` | O peso novo levaria outro aluno acima de 10 | Ao confirmar | Corrigir o peso |
| `DISCIPLINA_NOVA_INVALIDA` | A matéria ou o professor de uma disciplina escolhida na revisão não existe mais | Ao confirmar | Importar de novo |
| `QUESTOES_ABAIXO_DOS_ACERTOS` | As questões novas ficariam abaixo dos acertos de outro aluno | Ao confirmar | Corrigir as questões |
| `SIMULADO_INVALIDO`, `TIPO_INVALIDO` | O cadastro mudou enquanto a tela estava aberta (por exemplo, outro admin criou o mesmo SIM), ou o tipo enviado não existe | Ao confirmar | Importar de novo |

No envio também há mensagens sem código: "Envie a planilha.", "Envie uma planilha .xlsx.", "O arquivo passa do limite de 2 MB.", "Turma não encontrada" e "O aluno não faz parte desta turma".

Na confirmação, há mais duas: "Não foi possível guardar a planilha. Nenhuma nota foi gravada.", quando o Blob Storage falha, e "Os dados da conferência não vieram no formato esperado.", quando a tela manda os dados fora do formato.

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
| `SIMULADO_NOVO` | A linha SIM não tem simulado cadastrado; ele será criado ao confirmar |
| `NOVO_RESPONSAVEL` | A disciplina da coluna não fazia parte do simulado e será adicionada a ele |
| `QUESTOES_ALTERADAS` | O número de questões mudou; informa quantos alunos já têm resultado |
| `DATA_FUTURA` | O simulado da planilha tem data que ainda não chegou |
| `TIPO_ALTERADO`, `PESO_ALTERADO` | Tipo ou peso mudou; informa quantos alunos já têm resultado |
| `DISCIPLINA_NOVA` | A coluna usa uma disciplina escolhida na revisão, que só é cadastrada na turma ao confirmar, com a matéria nova se for o caso |
| `FORA_DO_PRAZO` | Tipo, peso, questões ou disciplinas mudaram depois dos 16 dias da tela de edição |

## Limites

Pelas telas, cada turma tem no máximo 10 simulados por bimestre, então uma disciplina entra em até 10. O limite vem da numeração de 1 a 10 nas telas de cadastro e edição, que já existia; o servidor não tem esse limite.

| Item | Limite | Onde vale | Origem |
| --- | --- | --- | --- |
| Tamanho do arquivo | 2 MB | Servidor | Importação |
| Formato do arquivo | Só .xlsx | Tela e servidor | Importação |
| Alunos e abas por envio | 1 aluno e 1 aba | Tela e servidor | Importação |
| Bimestre | 1 a 4 | Tela, planilha e servidor | Importação e cadastro |
| Simulados por bimestre | 10 por turma | Telas de cadastro e edição | Já existia |
| Linhas SIM na planilha | Sem limite; as sem simulado viram simulado novo, de número 1 a 10 | Importação | Importação |
| Questões alteradas ou novas na revisão | Inteiro de 1 a 100 | Revisão e servidor | Importação, com o limite da tela de edição |
| Questões por disciplina no cadastro | 1 a 10 | Tela de cadastro | Já existia |
| Questões por disciplina na edição | 1 a 100 | Tela de edição | Já existia |
| Acertos | Inteiro, de 0 até o número de questões | Revisão e servidor | Importação |
| Peso alterado na revisão | Inteiro de 1 a 100 | Revisão e servidor | Importação |
| Nota final por disciplina | 10 | Revisão e servidor, para este aluno; servidor, para os outros quando o peso muda | Importação |
| Edição do simulado | Até 16 dias depois do cadastro | Tela de edição | Já existia |

O número de questões não vem da planilha: ele vem do cadastro de cada simulado e disciplina, e pode ser alterado na revisão. Os valores 2 e 3 que aparecem nos testes são dados fictícios da seed, e ninguém decidiu que esse é o máximo.

Decimais já cadastrados em um peso não bloqueiam enquanto o peso não for alterado.

## O que é gravado

Da planilha, só os acertos das linhas SIM entram no banco. O arquivo nunca é salvo no disco do servidor: na confirmação, ele vai inteiro para o Azure Blob Storage.

| Dado | Gravado? | Onde |
| --- | --- | --- |
| Acertos e `resultado.nota` | Sim | `Simulado.conteudos[].resultados[]` |
| Peso alterado | Sim | `Simulado.conteudos[].peso` |
| Tipo alterado | Sim | `Simulado.tipo` |
| Número de questões alterado | Sim, com o `resultado.nota` de todos os alunos recalculado | `Simulado.conteudos[].quantidade_questoes` |
| Simulado novo | Sim, com número, tipo, data, bimestre, questões e peso de cada disciplina e o resultado deste aluno | Novo documento em `Simulado` |
| Disciplina nova num simulado | Sim, com questões, peso e o resultado deste aluno | Novo item em `Simulado.conteudos[]` |
| Disciplina nova na turma, com a matéria nova se for o caso | Sim, na confirmação, antes das notas; desfeita se as notas falharem | `TurmaDisciplina` e `Materia` |
| Disciplina escolhida à mão para uma coluna | Sim | Coleção nova `MapeamentoColuna`, por turma e cabeçalho |
| Registro da importação: turma, aluno, bimestre, quem importou, quando, aba, nome e tamanho do arquivo, contagens (inclusive simulados criados e disciplinas adicionadas) e nome do blob | Sim | Coleção nova `ImportacaoNotas` (`importacoesnotas` no banco) |
| Arquivo da planilha, com todas as abas | Sim, em produção | Blob Storage, em `importacoes-notas/<turma>/<bimestre>/<sha256 do arquivo>.xlsx` |
| Nota objetiva, dissertativa e final | Não | Calculadas ao abrir as telas |
| Nota Dissertativo, Nota Objetivo, Nota final, Resultado, TOTAL e fator da planilha | Não | Servem só para comparar na revisão |

**Planilha no Blob Storage.** A planilha vai para o container de `AZURE_STORAGE_CONTAINER_NAME`, que é o `files`.

- **Quando:** na confirmação, depois das validações e antes das notas. Importação com bloqueio não guarda nada.
- **Uma vez só por conteúdo:** o nome do arquivo é o sha256 do conteúdo. O mesmo arquivo importado para a Kate e para o Joshua vira um blob só, e os dois registros apontam para ele, cada um com a sua aba. Um arquivo editado entre as importações é outro conteúdo e é guardado de novo.
- **Se o Blob falhar:** nenhuma nota é gravada, e a tela mostra "Não foi possível guardar a planilha. Nenhuma nota foi gravada."
- **Se as notas falharem depois do upload:** o arquivo é apagado, mas só se foi criado naquela tentativa. Um arquivo que já existia é de outra importação e fica.
- **Se só o registro falhar:** as notas e o arquivo ficam gravados, e o erro vai para o log do servidor.
- **Onde vale:** só em produção (`NODE_ENV=production`, definido no `Dockerfile`), porque fora da Azure não existe identidade gerenciada.
- **Acesso:** a API usa a identidade gerenciada da Container App, sem chave no código. O papel dela precisa permitir gravar e apagar, como o `Storage Blob Data Contributor`.
- **Sem download:** o app não mostra nem baixa as planilhas. Cada arquivo tem as notas da turma inteira, e só quem tem acesso ao container consegue abrir.

O nome original do arquivo fica só no registro, porque vem do usuário e pode ter acento ou barra. Nomes com acento chegam certos ao servidor.

**Como a confirmação grava.** O servidor busca o cadastro atual, refaz as validações e compara cada célula com a nota já lançada. Depois grava com operações individuais, sem substituir a lista inteira de conteúdos. Os simulados novos são gravados primeiro: se outro admin criou o mesmo SIM no meio do caminho, nada mais é gravado e a tela pede para importar de novo.

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
| `POST /Importacoes/Notas/Confirmar` | Formulário com `arquivo` e `dados`, um JSON com `aluno_id`, `turma_id`, `bimestre`, `aba`, `colunas`, `linhas`, `tipos`, `pesos`, `questoes`, `conteudosNovos`, `novos` e `disciplinasNovas` | As contagens de criadas, atualizadas, removidas e sem alteração, de simulados criados, de disciplinas adicionadas a simulados, de disciplinas e matérias cadastradas, e o `simulado_id` para abrir as notas; 422 com os bloqueios; ou 502 se a planilha não puder ser guardada |

**Rotas novas do front.** `/Simulados/Importar/:turma/:bimestre/:aluno` e `/Simulados/Importar/:turma/:bimestre/:aluno/Confirmar`.

**Backend**

| Arquivo | Situação | O que faz |
| --- | --- | --- |
| `services/planilhaNotasParser.js` | Novo | Lê a aba e aplica as regras que dependem só da planilha |
| `services/conferenciaNotas.js` | Novo | Calcula as notas, valida a revisão, liga colunas, monta a prévia e as operações de banco |
| `Controllers/ImportacaoController.js` | Novo | Implementa as rotas de prévia e confirmação |
| `services/armazenamentoPlanilhas.js` | Novo | Guarda e apaga a planilha no Blob Storage, só em produção |
| `services/disciplinasNovas.js` | Novo | Confere as disciplinas escolhidas na revisão e as cadastra, com a matéria nova, só na confirmação; desfaz se as notas falharem |
| `middlewares/uploadPlanilha.js` | Novo | Recebe o arquivo na memória, com limite de 2 MB, só .xlsx e nome com acento |
| `Models/MapeamentoColuna.js` | Novo | Guarda a disciplina escolhida para um cabeçalho na turma |
| `Models/ImportacaoNotas.js` | Novo | Registra cada importação confirmada, com a aba e o nome do blob |
| `DB/seedImportacao.js` | Novo | Cria dados fictícios de teste. Apaga o banco local antes |
| `Models/Simulado.js` | Alterado | Índice único em `turma_id + bimestre + numero` |
| `Routes/routes.js` | Alterado | Registra as duas rotas; a confirmação também recebe o arquivo |
| `package.json` | Alterado | Adiciona `exceljs`, `multer`, `@azure/storage-blob` e `@azure/identity` |

**Frontend**

| Arquivo | Situação | O que faz |
| --- | --- | --- |
| `pages/ImportarNotas.jsx` | Novo | Tela de envio do arquivo e escolha da aba; passa o arquivo para a revisão |
| `pages/ConfirmarImportacaoNotas.jsx` | Novo | Tela de revisão: guarda as alterações, lista problemas e confirma, enviando o arquivo junto |
| `components/ConferenciaColuna.jsx` | Novo | Uma coluna da revisão, com os SIMs e as notas calculadas |
| `components/NovaDisciplinaImportacao.jsx` | Novo | Dá nome à matéria nova de uma coluna sem dono e escolhe o professor; nada é salvo antes do Confirmar |
| `components/SeletorProfessorColuna.jsx` | Novo | Seletor de professor da coluna: liga a quem já dá a matéria ou adiciona a matéria do cabeçalho a outro professor |
| `components/SetaExpandir.jsx` | Novo | Seta de abrir e fechar das colunas e dos painéis de bloqueios e avisos |
| `utils/cabecalhoPlanilha.js` | Novo | Separa matéria e professor do cabeçalho e compara nomes como a leitura da planilha |
| `utils/conferenciaNotas.js` | Novo | Cópia das regras, para recalcular a tela a cada alteração |
| `styles/ImportacaoNotas.module.css` | Novo | Estilos das duas telas |
| `imgs/importar-arquivo.svg`, `arquivo-selecionado.svg`, `editar-linha.svg` | Novos | Ícones do Figma |
| `App.jsx` | Alterado | Registra as duas telas, só para admin |
| `api/simuladoApi.js` | Alterado | Funções que chamam as rotas novas |
| `pages/SimuladosAlunosList.jsx` | Alterado | Botão **Importar Excel**, que pergunta de qual aluno é a planilha |
| `pages/SimuladoNotasPorSimulado.jsx` | Alterado | Botão **Importar Excel**, mesmo para aluno sem nota no bimestre |
| `pages/SimuladoNotasPorMateria.jsx` | Alterado | Agrupa por disciplina, e não por matéria, para não somar duas Físicas de professores diferentes |
| `components/NotasCard.jsx` | Alterado | Mostra "nulo" em vez de quebrar quando falta resultado |

**Testes novos.** `conferencia-notas.test.js`, `importacao-controller.test.js`, `planilha-notas-parser.test.js`, `armazenamento-planilhas.test.js` e `disciplinas-novas.test.js` no backend; testes ao lado de cada tela e componente no front.

**Planilhas de teste.** As 11 planilhas e o `LEIA-ME.md` ficam em `docs/planilhas-teste`. A seed `Backend/DB/seedImportacao.js` cria 26 usuários, 4 turmas e 72 simulados, e apaga o banco local antes.

## Testes

As suítes automáticas passam por completo, e o fluxo principal foi testado no navegador com banco descartável e com a planilha original. O app mobile não foi aberto. O CI passou na branch em 03/11, antes da parte do Blob Storage. Resultados de 02/11/2026; os de 15/11 estão no fim da seção.

| Verificação | Resultado | Como rodou |
| --- | --- | --- |
| Testes do backend | 185 de 185 | Node 26.5.1, a versão do CI do backend |
| Testes do front | 199 de 199 | Node 24.21.0, a versão do CI do front |
| Cobertura de linhas do backend | 84,42% (mínimo 80%) | Node 26.5.1 |
| Cobertura de linhas do front | 84,30% (mínimo 80%) | Node 24.21.0 |
| Fluxo geral no navegador: telas, mensagens, avisos, permissões | 52 de 52 | Antes de a revisão listar SIMs fora da planilha; não foi repetido depois |
| Alteração à mão: revisão, tela de lançamento e nova importação | 25 de 25 | Com a planilha original e um SIM fora dela |
| Caminho do botão pela lista de alunos | Passou no 1º e no 2º bimestre | Banco da seed, sem gravar nada |
| Bloqueios com as mensagens exatas, depois da mudança para "nulo" | 20 de 20 | Pela API de prévia, sem gravar nada; os bloqueios que só aparecem ao confirmar ficam nos testes automáticos |

**Planilha original no sistema.** Com os 6 SIMs cadastrados como objetivos e os pesos da própria planilha, a importação entra sem bloqueio, liga as 13 colunas e grava as 78 células como na planilha: 65 notas e 13 "nulo" no SIM 5. A nota objetiva bate nas 13 disciplinas. Enviar de novo deixa os 78 valores sem alteração.

A nota dissertativa fica 0,00 e a final fica igual à objetiva, até o admin marcar SIMs como dissertativos e definir os pesos. Na planilha, a Nota Dissertativo é digitada e não vem de nenhuma linha SIM, então a diferença é esperada. A revisão avisa em cada coluna. Na seed, a mesma planilha não passa: 4 colunas ficam sem disciplina, porque os professores são fictícios, e 6 células têm mais acertos que questões, porque a seed tem 2 ou 3 questões por disciplina.

**Planilha no Blob Storage, em 15/11/2026.** O fluxo não foi testado no navegador nem na Azure. Só dá para conferir a gravação de verdade depois do deploy, que sai da main.

| Verificação | Resultado | Como rodou |
| --- | --- | --- |
| Testes do backend | 220 de 220 | Node 24.19.0 local; o CI do backend usa 26.5.1 |
| Testes do front | 201 de 201 | Node 24.19.0 local; o CI do front usa 24.21.0 |
| Cobertura de linhas do backend | 85,12% (mínimo 80%) | Node 24.19.0 local |
| Cobertura de linhas do front | 82,31% (mínimo 80%) | Node 24.19.0 local |
| Gravação, reaproveitamento do mesmo arquivo e limpeza quando as notas falham | Passou | Testes automáticos, com um container falso |
| Chamada real à biblioteca da Azure | Falhou no login, como esperado fora da Azure, sem enviar arquivo | Modo produção, no computador local |

**Revisão com simulados, disciplinas e matérias novos, em 18/11/2026.** Simulado novo, questões editáveis, "novo responsável", texto como "nulo", seletor de professor só em coluna sem dono ou repetida, disciplina e matéria cadastradas só ao confirmar, e Bloqueios e Avisos recolhíveis. Partes da revisão foram vistas no navegador durante os ajustes, com a seed. Os painéis recolhíveis e a confirmação com disciplina nova não foram conferidos no navegador, só nos testes automáticos. Os números abaixo já incluem o que veio da main no mesmo dia, como a análise de alunos em atenção.

| Verificação | Resultado | Como rodou |
| --- | --- | --- |
| Testes do backend | 293 de 293 | Node 24.19.0 local; o CI do backend usa 26.5.1 |
| Testes do front | 271 de 271 | Node 24.19.0 local; o CI do front usa 24.21.0 |
| Cobertura de linhas do backend | 83,07% (mínimo 80%) | Node 24.19.0 local |
| Cobertura de linhas do front | 82,21% (mínimo 80%) | Node 24.19.0 local |
| Cadastro de matéria e disciplina só depois das validações, com o id real nas notas e desfeito se as notas falham | Passou | Testes automáticos do controller, com o banco simulado |

Para conferir na Azure, importe dois alunos com o mesmo arquivo, que tenha uma aba para cada um. As planilhas de teste usam os alunos da seed, então no app da Azure é preciso um arquivo com alunos, disciplinas e simulados que existam lá. Se as duas importações derem certo, a planilha foi guardada e reaproveitada, porque em produção uma falha no Blob bloqueia a importação. Para ver o arquivo em `files/importacoes-notas/`, é preciso acesso à conta de armazenamento.

## Limitações e decisões em aberto

Duas decisões ainda dependem da escola ou do dono do produto. Até lá, o sistema fica como descrito na coluna do meio.

| Decisão | Como está hoje | O que muda se aprovar |
| --- | --- | --- |
| Digitar direto a nota objetiva, dissertativa ou final? | Não dá: as notas são calculadas | Seria preciso guardar um valor novo por aluno e disciplina, o que hoje não existe. Recomendação: só fazer se alterar cada SIM não atender a escola |
| Arredondar a nota final? | Sem arredondar. Em Inglês e História, a planilha original tem 7 digitado, e o sistema mostra 7,40 e 7,10 | A proposta do plano é arredondar para o inteiro mais próximo; a escola precisa confirmar |

Limitações conhecidas:

- **Notas da planilha:** a nota final do sistema só coincide com a da planilha quando os SIMs dissertativos e os pesos representam o que foi digitado nela.
- **Gravação em etapas:** a confirmação não usa transação. Se o banco falhar no meio, parte pode ficar gravada; importar de novo corrige, porque compara cada valor.
- **Planilha no Blob Storage:** não foi testada na Azure, e o app não tem download das planilhas guardadas. Se duas importações do mesmo arquivo forem confirmadas ao mesmo tempo e a primeira falhar, o arquivo pode ser apagado enquanto a segunda ainda aponta para ele. Como a importação é feita um aluno por vez, isso não deve acontecer na prática.
- **App mobile:** foi conferido pelo código e pela rota que ele usa, sem abrir o app. Ele mostra o `resultado.nota` de cada simulado, e não a nota final nem a dissertativa.
- **Telas antigas:** o cadastro aceita até 10 questões e a edição até 100; o aviso fala em 15 dias, mas a regra usa 16. As duas diferenças já existiam e não foram alteradas.
- **Lista de alunos:** sem nenhuma nota no simulado, a lista continua mostrando só o aviso "ainda não foram lançadas". O botão **Importar Excel** é o caminho nesse caso.
