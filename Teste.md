# Roteiro de testes: presença por QR Code (NotasMax API)

Documento para execução manual no Thunder Client e como contexto para o GitHub Copilot. Leia antes o [AGENTS.md](../AGENTS.md) (convenções do projeto e descrição da feature).

## 1. Visão geral da feature

O administrador gera um QR Code específico para um simulado (válido por 24 h). O aluno, logado, envia o conteúdo lido do QR e a API registra a presença se o aluno pertencer à turma do simulado.

| Rota | Método | Quem acessa | Método do controller |
|---|---|---|---|
| `/Presenca/Qr/Gerar` | POST | administrador | `PresencasController.gerarQr` |
| `/Presenca/Qr/Simulado/:simulado_id` | GET | administrador | `PresencasController.obterQrAtivo` |
| `/Presenca/Qr/:qr_id/Revogar` | PATCH | administrador | `PresencasController.revogarQr` |
| `/Presenca/Simulado/:simulado_id` | GET | administrador | `PresencasController.listarPorSimulado` |
| `/Presenca/Registrar` | POST | aluno | `PresencasController.registrar` |

Models envolvidos: `QrPresenca` e `Presenca` (índice único em `simulado_id` + `aluno_id`).

## 2. URLs

- Base: `http://localhost:5000/NotasMax`
- Login: `http://localhost:5000/NotasMax/Auth/login`
- Todas as rotas de presença ficam sob a base. Exemplo: `http://localhost:5000/NotasMax/Presenca/Qr/Gerar`.

## 3. Pré-requisitos

1. API rodando (`cd Backend && npm start`) e conectada ao MongoDB.
2. Dados de teste no banco:
   - um usuário **administrador**;
   - uma **turma** que contenha o **aluno A** em `alunos`;
   - um **simulado** dessa turma (`turma_id` = a turma acima);
   - um **aluno B** que **não** esteja nessa turma.
3. Senhas: alunos criados por `POST /Usuarios/Aluno` ficam com a senha `123` (o controller usa `SENHA_PADRAO` e ignora a senha enviada). A senha do administrador é a que você já usa.
4. Para descobrir os ids: com o administrador logado, `GET {{url}}/Simulados` (campos `_id` e `turma_id`) e `GET {{url}}/Usuarios/Alunos` (campo `_id`).

## 4. Variáveis do Thunder Client (aba Env)

| Variável | Valor |
|---|---|
| `url` | `http://localhost:5000/NotasMax` |
| `tokenAdmin` | token do login do administrador |
| `tokenAlunoA` | token do login do aluno A (da turma) |
| `tokenAlunoB` | token do login do aluno B (de outra turma) |
| `simuladoId` | `_id` do simulado |
| `qrToken` | campo `token` devolvido por `Gerar` |
| `qrId` | campo `qr_id` devolvido por `Gerar` |

Dica: na aba **Vars** de cada requisição de login, é possível gravar `json.token` na variável de ambiente correspondente. Se a opção não estiver disponível na sua versão, copie o valor manualmente.

## 5. Como autenticar nas requisições

A API lê o JWT **somente do cookie `jwt`**. Em cada requisição autenticada, envie o header explícito (assim você alterna entre usuários sem logar de novo):

```
Cookie: jwt={{tokenAdmin}}
```

Troque por `{{tokenAlunoA}}` ou `{{tokenAlunoB}}` conforme o teste. O Thunder Client também pode guardar cookies automaticamente; se os resultados ficarem estranhos, limpe os cookies salvos para `localhost` e use sempre o header explícito.

## 5.1. Body das requisições POST

Nas requisições com corpo (`Gerar` e `Registrar`), abra a aba **Body**, escolha **JSON** e preencha o objeto. O Thunder Client então envia `Content-Type: application/json`. Sem isso, o Express não interpreta o corpo e `req.body` chega como `undefined` (comportamento do Express 5). O controller trata esse caso e responde **422**, mas o teste não avança até que o corpo seja enviado corretamente.

## 6. Preparação (login)

### S1. Login do administrador
- `POST {{url}}/Auth/login`
- Body (JSON): `{ "email": "<email do admin>", "senha": "<senha>" }`
- Esperado: **200**, com `message: "Login realizado com sucesso."`, `token` e `usuario.tipo_usuario: "administrador"`.
- Guarde `token` em `tokenAdmin`.

### S2. Login do aluno A
- Mesma rota, com o e-mail do aluno A. Guarde em `tokenAlunoA`. Esperado: **200**, `tipo_usuario: "aluno"`.

### S3. Login do aluno B
- Mesma rota, com o e-mail do aluno B. Guarde em `tokenAlunoB`. Esperado: **200**.

## 7. Testes

Execute na ordem. Cada teste indica requisição, resultado esperado e, quando útil, a mensagem retornada.

### Bloco A: gerar e consultar o QR

**T01. Gerar QR**
- `POST {{url}}/Presenca/Qr/Gerar`
- Header: `Cookie: jwt={{tokenAdmin}}`
- Body: `{ "simulado_id": "{{simuladoId}}" }`
- Esperado: **201**, `message: "QR Code de presença gerado."`, com `qr_id`, `token`, `valido_de`, `expira_em` (24 h depois de `valido_de`) e `simulado` (`numero`, `tipo`, `bimestre`, `data_realizacao`, `turma`).
- Guarde `token` em `qrToken` e `qr_id` em `qrId`.

**T02. Gerar de novo (idempotência)**
- Mesma requisição de T01.
- Esperado: **200**, `message: "Já existe um QR Code ativo para este simulado."`, com o **mesmo** `qr_id` de T01.

**T03. Consultar QR ativo**
- `GET {{url}}/Presenca/Qr/Simulado/{{simuladoId}}`
- Header: `Cookie: jwt={{tokenAdmin}}`
- Esperado: **200**, com o mesmo `qr_id` e um `token` válido para o mesmo QR.

### Bloco B: registrar presença

**T04. Registrar presença (caminho feliz)**
- `POST {{url}}/Presenca/Registrar`
- Header: `Cookie: jwt={{tokenAlunoA}}`
- Body: `{ "token": "{{qrToken}}" }`
- Esperado: **201**, `message: "Presença registrada com sucesso."` e `simulado` (`id`, `numero`, `tipo`, `data_realizacao`).

**T05. Presença duplicada**
- Mesma requisição de T04.
- Esperado: **409**, `message: "Sua presença já foi registrada neste simulado."`.

**T06. Conferir a lista de presenças**
- `GET {{url}}/Presenca/Simulado/{{simuladoId}}`
- Header: `Cookie: jwt={{tokenAdmin}}`
- Esperado: **200**, com `total_presentes: 1` e o aluno A com `presente: true`, `metodo: "QR"` e `registrada_em` preenchido. Os demais alunos da turma aparecem com `presente: false`.

### Bloco C: erros de autorização e validação

**T07. Aluno de outra turma**
- `POST {{url}}/Presenca/Registrar`, header `Cookie: jwt={{tokenAlunoB}}`, body `{ "token": "{{qrToken}}" }`
- Esperado: **403**, `message: "Você não faz parte da turma deste simulado."`.

**T08. Administrador tentando registrar**
- Mesma requisição, com `Cookie: jwt={{tokenAdmin}}`.
- Esperado: **403**, `message: "Acesso negado."`.

**T09. Sem login**
- Mesma requisição, sem o header `Cookie`.
- Esperado: **401**, `message: "Acesso negado. Necessário estar logado."`.

**T10. Aluno tentando gerar QR**
- `POST {{url}}/Presenca/Qr/Gerar`, header `Cookie: jwt={{tokenAlunoA}}`, body `{ "simulado_id": "{{simuladoId}}" }`
- Esperado: **403**, `message: "Acesso negado."`.

**T11. Body sem token**
- `POST {{url}}/Presenca/Registrar`, header `Cookie: jwt={{tokenAlunoA}}`, body `{}`
- Esperado: **422**, `message: "Informe o token do QR Code."`.

**T12. Token adulterado**
- Copie `qrToken`, altere **um caractere do último trecho** (depois do segundo ponto) e envie em `Registrar` com `tokenAlunoB`.
- Esperado: **400**, `message: "QR Code inválido."`.

**T13. Id de simulado inválido ao gerar**
- `POST {{url}}/Presenca/Qr/Gerar`, header do administrador, body `{ "simulado_id": "abc" }`
- Esperado: **422**, `message: "Id de simulado inválido"`.

**T14. Simulado inexistente**
- Mesmo corpo de T13, com um ObjectId válido que não exista (ex.: `"64b000000000000000000000"`).
- Esperado: **404**, `message: "Simulado não encontrado"`.

**T15. Data de início inválida**
- Body: `{ "simulado_id": "{{simuladoId}}", "valido_de": "isso-nao-e-data" }`
- Esperado: **422**, `message: "Data de início da validade inválida"`.

### Bloco D: ciclo de vida do QR

Nos testes T16 a T19, use o **aluno B**. A API checa assinatura, revogação e janela de validade **antes** de checar a turma, então o resultado não depende de o aluno B pertencer à turma e não é preciso apagar a presença do aluno A.

**T16. Renovar o QR (revoga o anterior)**
- `POST {{url}}/Presenca/Qr/Gerar`, header do administrador, body `{ "simulado_id": "{{simuladoId}}", "renovar": true }`
- Esperado: **201**, com um `qr_id` **diferente** do anterior. Guarde o novo `token` em `qrTokenNovo` e o `qr_id` em `qrId`.

**T17. Token do QR revogado**
- `POST {{url}}/Presenca/Registrar`, header `Cookie: jwt={{tokenAlunoB}}`, body `{ "token": "{{qrToken}}" }` (o token **antigo**, de T01)
- Esperado: **400**, `message: "Este QR Code foi revogado."`.

**T18. Revogar manualmente**
- `PATCH {{url}}/Presenca/Qr/{{qrId}}/Revogar`, header do administrador.
- Esperado: **200**, `message: "QR Code revogado."`.
- Em seguida, `Registrar` com `tokenAlunoB` e `qrTokenNovo`. Esperado: **400**, `message: "Este QR Code foi revogado."`.
- Revogar um id inexistente (ObjectId válido qualquer): **404**, `message: "QR Code não encontrado"`. Id inválido (`abc`): **422**.

**T19. QR expirado**
- Gere com `renovar: true` e `valido_de` de mais de 24 h atrás (ex.: `"2026-10-01T10:00:00.000Z"`):
  `{ "simulado_id": "{{simuladoId}}", "renovar": true, "valido_de": "2026-10-01T10:00:00.000Z" }`
- Esperado: **201**.
- `Registrar` com `tokenAlunoB` e o `token` dessa resposta. Esperado: **400**, `message: "Este QR Code expirou."`.

**T20. QR ainda não disponível**
- Gere com `renovar: true` e `valido_de` no futuro (ex.: amanhã), por exemplo `"2026-12-31T10:00:00.000Z"`.
- `Registrar` com `tokenAlunoB` e o `token` dessa resposta. Esperado: **400**, `message: "Este QR Code ainda não está disponível."`.

Use sempre `renovar: true` nos testes T19 e T20; sem ele a API devolve o QR ativo anterior em vez de criar um novo.

## 8. Restaurar o estado depois dos testes

1. Gere um QR normal para o simulado: `Gerar` com `renovar: true`, sem `valido_de`.
2. Para repetir o fluxo com o mesmo aluno, apague a presença dele no MongoDB (os nomes das coleções são pluralizados pelo Mongoose; confira no Compass):

```js
// mongosh ou Compass (aba MongoSH)
db.presencas.deleteMany({ simulado_id: ObjectId("<simuladoId>") })

// opcional: limpar os QR Codes de teste
db.qrpresencas.deleteMany({ simulado_id: ObjectId("<simuladoId>") })
```

## 9. Verificações no banco (opcional)

- A coleção `presencas` deve ter o índice único `simulado_id_1_aluno_id_1`. Sem ele, T05 pode não retornar 409 em situações de concorrência.
- O campo `segredo` existe em `qrpresencas`, mas **nunca** aparece nas respostas da API (`select: false`).

## 10. Checklist de resultados

| Teste | Esperado | Obtido | OK |
|---|---|---|---|
| T01 Gerar QR | 201 | | |
| T02 Gerar de novo | 200 (mesmo `qr_id`) | | |
| T03 Consultar ativo | 200 | | |
| T04 Registrar | 201 | | |
| T05 Duplicada | 409 | | |
| T06 Lista | 200 (`total_presentes: 1`) | | |
| T07 Aluno de outra turma | 403 | | |
| T08 Admin registrando | 403 | | |
| T09 Sem login | 401 | | |
| T10 Aluno gerando QR | 403 | | |
| T11 Sem token | 422 | | |
| T12 Token adulterado | 400 | | |
| T13 Id inválido | 422 | | |
| T14 Simulado inexistente | 404 | | |
| T15 Data inválida | 422 | | |
| T16 Renovar | 201 (novo `qr_id`) | | |
| T17 Token revogado | 400 | | |
| T18 Revogar manualmente | 200 e depois 400 | | |
| T19 Expirado | 400 | | |
| T20 Ainda não disponível | 400 | | |

## 11. Instruções para o Copilot

- **Contexto:** leia o `AGENTS.md` e `Backend/Controllers/PresencasController.js` antes de qualquer coisa. A tabela da seção 1 liga cada rota ao método do controller.
- **Papel:** ajudar a executar e interpretar este roteiro. Se um resultado divergir do esperado, descreva a divergência (teste, status obtido, corpo recebido) e aponte a linha provável no controller, antes de propor qualquer correção.
- **Não alterar código de produção** só para fazer um teste passar sem confirmar com o usuário. O comportamento esperado está descrito neste documento e no `AGENTS.md`.
- **Dependências:** não adicionar nenhuma sem perguntar. Se for pedido um script automatizado, use `fetch` nativo do Node (sem bibliotecas), em arquivo `.mjs` fora das rotas da API (por exemplo `Backend/scripts/testar-presenca.mjs`), lendo e-mails, senhas e ids de variáveis de ambiente. **Nunca gravar senhas ou tokens no repositório.**
- **Padrões:** respostas no formato `{ message }`; ids inválidos retornam 422; sem login, 401; sem permissão, 403.
- **Observação de ordem das validações em `registrar`:** assinatura e expiração do token, depois QR ativo e janela de validade, depois pertencimento à turma, depois duplicidade. Por isso os testes T17 a T20 funcionam com um aluno de outra turma.

Prompts úteis:

1. "Com base em `docs/testes-presenca.md`, gere um script `.mjs` com `fetch` nativo que execute os testes T01 a T11 e imprima o resultado de cada um (esperado x obtido). Use variáveis de ambiente para credenciais."
2. "O teste T05 retornou 500 em vez de 409. Leia `PresencasController.registrar` e `Models/Presenca.js` e explique o motivo provável, sem alterar o código."
3. "Revise `PresencasController.js` contra o padrão dos outros controllers e liste divergências de nomes, imports e formato de resposta."

## 12. Testes adicionais (T21 a T49)

Complementam os testes T01 a T20. Foque em permissões por perfil, tokens forjados, entradas malformadas, vários alunos, tempo e integridade dos dados.

### 12.1. Dados extras necessários

| Item | Para quê |
|---|---|
| Usuário **professor** (`tokenProfessor`) | T21 |
| **Aluno C**, também na turma do simulado (`tokenAlunoC`) | T35, T36, T39 a T41 |
| **Simulado 2**, de **outra turma** (`simuladoId2`) | T28 |
| **Simulado 3** da mesma turma, **sem QR gerado** (`simuladoId3`) | T43 |
| (opcional) Simulado de uma turma **sem alunos** (`simuladoVazio`) | T45 |

Comandos úteis (Linux):

```bash
# Datas para o campo valido_de
date -u -d '23 hours ago' +%Y-%m-%dT%H:%M:%S.000Z
date -u -d '2 minutes'    +%Y-%m-%dT%H:%M:%S.000Z

# Ver o conteúdo (payload) de um token JWT
node -e "console.log(JSON.parse(Buffer.from(process.argv[1].split('.')[1],'base64url').toString()))" "<token>"

# Forjar um token SEM assinatura (alg none) com um sid qualquer
node -e "const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');console.log(b({alg:'none',typ:'JWT'})+'.'+b({sid:process.argv[1]})+'.')" "<qr_id>"
```

Antes de cada bloco, deixe o simulado principal com um QR ativo (`Gerar` com `renovar: true`) e sem presenças do aluno que será usado (veja a seção 8).

### 12.2. Bloco E: permissões por perfil

**T21. Professor em todas as rotas de presença**
- Com `Cookie: jwt={{tokenProfessor}}`, chame as 5 rotas (`Gerar`, `Obter QR ativo`, `Revogar`, `Listar`, `Registrar`).
- Esperado: **403**, `message: "Acesso negado."` em todas.

**T22. Aluno nas rotas de administrador**
- Com `tokenAlunoA`: `GET /Presenca/Qr/Simulado/{{simuladoId}}`, `PATCH /Presenca/Qr/{{qrId}}/Revogar` e `GET /Presenca/Simulado/{{simuladoId}}`.
- Esperado: **403**, `message: "Acesso negado."` nas três. (`Gerar` já foi coberto em T10.)

**T23. Cookie com JWT inválido**
- Qualquer rota de presença com o header `Cookie: jwt=abc`.
- Esperado: **403**, `message: "Sessão inválida ou expirada. Faça login novamente."`.

### Bloco F: tokens do QR

**T24. Token que não é JWT**
- `Registrar` (aluno A) com `{ "token": "abc" }`.
- Esperado: **400**, `message: "QR Code inválido."`.

**T25. Usar o token de login como se fosse QR**
- `Registrar` (aluno A) com o `token` do **login** do aluno no campo `token`.
- Esperado: **400**, `message: "QR Code inválido."` (o token de login não tem `sid`).

**T26. `sid` válido, mas de um QR que não existe**
- Forje um token sem assinatura com o `sid` `64b000000000000000000000` (comando da seção 12.1) e envie em `Registrar`.
- Esperado: **400**, `message: "QR Code inválido."`.

**T27. Token sem assinatura (`alg: none`) com `sid` de QR real**
- Forje o token com o `qr_id` do QR ativo e envie em `Registrar` (aluno que ainda não registrou presença).
- Esperado: **400**, `message: "QR Code inválido."`. Isso confirma que a API não aceita tokens não assinados.

**T28. QR de simulado de outra turma**
- Gere um QR para `simuladoId2` (turma diferente da do aluno A) e envie o `token` em `Registrar` com `tokenAlunoA`.
- Esperado: **403**, `message: "Você não faz parte da turma deste simulado."`.

**T29. Conteúdo do token**
- Decodifique o `qrToken` (comando da seção 12.1).
- Esperado: o payload tem apenas `sid`, `iat` e `exp`. `exp` (em segundos) corresponde a `expira_em`. Não há nome, e-mail nem outros dados pessoais.

### Bloco G: entradas malformadas

**T30. Injeção NoSQL em `Gerar`**
- Body: `{ "simulado_id": { "$ne": null } }`
- Esperado: **422**, `message: "Id de simulado inválido"`.

**T31. `token` como objeto em `Registrar`**
- Body: `{ "token": { "$ne": null } }`
- Esperado: **422**, `message: "Informe o token do QR Code."`.

**T32. `token` numérico em `Registrar`**
- Body: `{ "token": 123 }`
- Esperado: **422**, `message: "Informe o token do QR Code."`.

**T33. `renovar` como texto**
- Com um QR ativo, `Gerar` com `{ "simulado_id": "{{simuladoId}}", "renovar": "false" }`.
- Esperado: **200**, `message: "Já existe um QR Code ativo para este simulado."`, com o **mesmo** `qr_id` (só `renovar: true`, booleano, renova). Requer a versão atual do controller, com `renovar !== true`.

**T34. `Gerar` sem dados**
- (a) Body `{}`; (b) sem Body.
- Esperado: **422**, `message: "Id de simulado inválido"` nos dois casos.

### Bloco H: vários alunos e concorrência

**T35. Dois alunos no mesmo QR**
- `Registrar` com `tokenAlunoA` e depois com `tokenAlunoC`, usando o mesmo `qrToken`.
- Esperado: **201** nas duas. Em `GET /Presenca/Simulado/{{simuladoId}}`, `total_presentes: 2`.

**T36. Mesmo aluno em dois QR do mesmo simulado**
- O aluno A registra com o QR atual. Gere outro QR com `renovar: true` e tente registrar o aluno A de novo.
- Esperado: **409**, `message: "Sua presença já foi registrada neste simulado."` (a unicidade é por simulado e aluno, não por QR).

**T37. Requisições simultâneas**
- Apague a presença do aluno A (seção 8) e rode no terminal:

```bash
TOKEN_ALUNO="<valor de tokenAlunoA>"
QR="<valor de qrToken>"
URL="http://localhost:5000/NotasMax/Presenca/Registrar"
for i in 1 2; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "Cookie: jwt=$TOKEN_ALUNO" \
    -d "{\"token\":\"$QR\"}" &
done
wait
```

- Esperado: uma resposta **201** e uma **409**, nunca duas 201 e nunca 500. Confira em `presencas` que existe **um** documento do aluno para o simulado.

**T38. Aluno removido da turma depois da geração do QR**
- Com o QR gerado, remova o aluno C de `Turma.alunos` (painel, rota existente ou Compass) e envie `Registrar` com `tokenAlunoC`.
- Esperado: **403**, `message: "Você não faz parte da turma deste simulado."`. Depois, devolva o aluno à turma.

### Bloco I: janelas de tempo

**T39. QR perto de expirar, mas ainda válido**
- `Gerar` com `renovar: true` e `valido_de` de 23 h atrás. `Registrar` com um aluno que ainda não registrou.
- Esperado: **201** em `Gerar` e **201** em `Registrar`.

**T40. QR que passa a valer depois**
- `Gerar` com `renovar: true` e `valido_de` daqui a 2 minutos. `Registrar` agora, e de novo após 2 minutos.
- Esperado: primeiro **400**, `message: "Este QR Code ainda não está disponível."`, depois **201**.

**T41. QR expirado: gerar sem `renovar` e consultar**
- Deixe como único QR do simulado um já expirado (use o procedimento de T19 e revogue qualquer outro).
- `GET /Presenca/Qr/Simulado/{{simuladoId}}`: esperado **404**, `message: "Nenhum QR Code ativo para este simulado."`.
- `Gerar` **sem** `renovar`: esperado **201** (um QR expirado não conta como ativo e é criado um novo).

### Bloco J: listagem e consulta

**T42. Listar com id inválido e inexistente**
- `GET /Presenca/Simulado/abc`: esperado **422**, `message: "Id de simulado inválido"`.
- `GET /Presenca/Simulado/64b000000000000000000000`: esperado **404**, `message: "Simulado não encontrado"`.

**T43. Consultar QR de simulado sem QR**
- `GET /Presenca/Qr/Simulado/{{simuladoId3}}`
- Esperado: **404**, `message: "Nenhum QR Code ativo para este simulado."`.

**T44. Revogar duas vezes**
- `PATCH /Presenca/Qr/{{qrId}}/Revogar` duas vezes seguidas.
- Esperado: **200** nas duas (a operação é idempotente).

**T45. Turma sem alunos**
- `GET /Presenca/Simulado/{{simuladoVazio}}`
- Esperado: **200**, `total_alunos: 0`, `total_presentes: 0`, `alunos: []`.

**T46. Ordem da lista**
- `GET /Presenca/Simulado/{{simuladoId}}` numa turma com vários alunos.
- Esperado: `alunos` em ordem alfabética por `nome`.

### Bloco K: integridade dos dados e vazamento

**T47. O `segredo` nunca aparece**
- Procure o texto `segredo` no corpo de `Gerar` (201 e 200), `Obter QR ativo`, `Registrar` e `Listar`.
- Esperado: não aparece em nenhuma resposta.

**T48. Documento gravado em `presencas`**
- Após um `Registrar` bem-sucedido, abra o documento no Compass.
- Esperado: `simulado_id` (o simulado do QR), `aluno_id` (o aluno logado), `qr_id` (o QR usado), `metodo: "QR"` e `registrada_em` preenchido.

**T49. `aluno_id` enviado no body é ignorado**
- `Registrar` com `tokenAlunoA` e body `{ "token": "{{qrToken}}", "aluno_id": "<id do aluno C>" }` (aluno A sem presença).
- Esperado: **201**, e a presença gravada é do **aluno A** (o id vem do cookie, não do body). Nenhum registro é criado para o aluno C.

### 12.3. Checklist dos testes adicionais

| Teste | Esperado | Obtido | OK |
|---|---|---|---|
| T21 Professor | 403 nas 5 rotas | | |
| T22 Aluno em rotas admin | 403 | | |
| T23 Cookie inválido | 403 | | |
| T24 Token não JWT | 400 | | |
| T25 Token de login como QR | 400 | | |
| T26 `sid` inexistente | 400 | | |
| T27 `alg: none` | 400 | | |
| T28 QR de outra turma | 403 | | |
| T29 Conteúdo do token | só `sid`, `iat`, `exp` | | |
| T30 Injeção NoSQL | 422 | | |
| T31 `token` objeto | 422 | | |
| T32 `token` numérico | 422 | | |
| T33 `renovar: "false"` | 200 (mesmo QR) | | |
| T34 `Gerar` sem dados | 422 | | |
| T35 Dois alunos | 201 e 201 | | |
| T36 Dois QR, mesmo aluno | 409 | | |
| T37 Simultâneas | 201 e 409 | | |
| T38 Aluno removido da turma | 403 | | |
| T39 Quase expirado | 201 | | |
| T40 Passa a valer | 400 e depois 201 | | |
| T41 Expirado: obter e gerar | 404 e 201 | | |
| T42 Listar inválido/inexistente | 422 e 404 | | |
| T43 Simulado sem QR | 404 | | |
| T44 Revogar duas vezes | 200 e 200 | | |
| T45 Turma sem alunos | 200, lista vazia | | |
| T46 Ordem alfabética | ordenada | | |
| T47 Sem `segredo` | ausente | | |
| T48 Documento gravado | campos corretos | | |
| T49 `aluno_id` ignorado | presença do aluno logado | | |

### 12.4. Para o Copilot

- Os testes T21 a T49 seguem as mesmas regras da seção 11. Em T33, a mensagem esperada depende de `renovar !== true` em `gerarQr`; se divergir, aponte a linha em vez de alterar o teste.
- Em caso de falha em T27 ou T25, **não** relaxe a validação do token: o comportamento seguro é recusar com 400.
- Prompt útil: "Com base na seção 12 de `docs/testes-presenca.md`, estenda o script `.mjs` de testes (fetch nativo, sem dependências) para cobrir T21 a T26 e T30 a T34, imprimindo esperado x obtido."