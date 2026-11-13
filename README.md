# 🎓 NotasMAX - Sistema de Notas Escolares

## Projeto referente ao 4° e 5º semestres

Este projeto tem como objetivo desenvolver uma aplicação para gerenciamento de simulados escolares, permitindo que administradores criem e acompanhem simulados e que alunos visualizem seus resultados e desempenho por matéria. O sistema é projetado para lidar com simulados multidisciplinares, em que cada matéria possui peso e resultado específicos, possibilitando o cálculo automático da nota bimestral de cada aluno.

## Contexto
O projeto foi desenvolvido no âmbito do curso Desenvolvimento de Software Multiplataforma (DSM) da FATEC Jahu, como parte das atividades do Projeto Interdisciplinar. 

## Tecnologias Utilizadas
- MongoDB — Banco de dados não relacional (NoSQL);
- Node.js;
- JavaScript;
- HTML / CSS / React / Tailwind ;
- Mongoose / Express / Cors

## Desenvolvimento local

O frontend usa `VITE_API_URL` como URL base da API, incluindo o prefixo de rota `/NotasMax`. Se a variável não estiver definida, o cliente usa `http://localhost:5000/NotasMax` para desenvolvimento local. O cliente continua enviando cookies (`withCredentials: true`).

Para apontar o frontend a outra instância durante o desenvolvimento, defina `VITE_API_URL` no ambiente do Vite antes de iniciar ou compilar o frontend. Não coloque segredos nessa variável: ela é incorporada aos arquivos públicos gerados pelo Vite.

## Configuração para hospedagem

O frontend React compilado e a API Express são servidos pela mesma Container App e compartilham uma origem HTTPS. A imagem é criada em etapas: compila o frontend e o inclui junto com a API. Não armazene valores reais de segredos neste repositório.

Configuração inicial para desenvolvimento e demonstração: **0,25 vCPU, 0,5 GiB e de 0 a 1 réplica**. A imagem de exemplo ainda não validou o consumo da aplicação real; confirme CPU, memória e latência depois de publicar.

| Variável da API | Uso |
| --- | --- |
| `MONGODB_URI` | URI privada do MongoDB Atlas. |
| `JWT_SECRET` | Segredo forte para assinatura dos tokens. |
| `PORT` | Porta HTTP definida para o container. |
| `CORS_ORIGINS` | Origem HTTPS exata da Container App; não use `*`. |
| `COOKIE_SECURE` | `true` no host HTTPS. |
| `COOKIE_SAME_SITE` | `lax` para frontend e API na mesma origem; `none` somente se forem usados hosts separados, junto com `COOKIE_SECURE=true`. |
| `FRONTEND_URL` | URL pública da Container App, usada nos links enviados por e-mail. |
| `EMAIL_USER`, `EMAIL_PASS` | Credenciais de e-mail, quando o envio estiver habilitado. |
| `EMAIL_HOST`, `EMAIL_PORT` | Host e porta SMTP, se diferentes dos padrões do serviço. |
| `ADMIN_CONTACT_EMAIL` | E-mail de contato administrativo, se diferente do padrão. |

O build Vite dentro do Docker define `VITE_API_URL=/NotasMax`, uma rota relativa que aponta para a API na mesma origem. Esse valor não é segredo e não precisa ser cadastrado no GitHub. O fallback do frontend continua apontando para `http://localhost:5000/NotasMax` quando executado localmente sem a variável.

### GitHub Actions: secrets e variables

Cadastre os itens abaixo nas configurações do repositório GitHub antes do primeiro push de publicação. O workflow publica somente em `push` para `main`, depois de aprovados os jobs de testes e cobertura do frontend e da API. Pull requests não executam os jobs de publicação.

**Secrets necessários:**

- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_SUBSCRIPTION_ID`: identificadores usados no login Azure por OIDC; não são uma senha de service principal.

**Variables necessárias:**

- `AZURE_RESOURCE_GROUP`: grupo de recursos que contém a Container App.
- `AZURE_CONTAINER_APP_NAME`: nome da Container App existente.

Não é necessária variável de repositório para `VITE_API_URL`; a imagem usa a rota relativa `/NotasMax`.

### Pré-requisitos manuais na Azure e no GitHub

Antes de publicar, crie/configure os recursos e a federação fora deste workflow:

Para construir a imagem combinada localmente, execute a partir da raiz do repositório:

```sh
docker build --file Backend/Dockerfile --tag notasmax-web-nosql:local .
```

1. Configure uma identidade de aplicação no Entra ID com credencial federada OIDC para este repositório e `refs/heads/main`. Conceda a ela somente o RBAC necessário para atualizar a Container App existente, no escopo mais restrito disponível. O job precisa de `id-token: write`; não use segredo Azure de longa duração.
2. A primeira execução do workflow criará o pacote da imagem no GHCR; mantenha-o privado. Para o pull pela Container App, crie um Personal Access Token (classic) separado, com `read:packages` e acesso ao pacote privado, e armazene-o como segredo no Azure Key Vault. Habilite a identidade gerenciada atribuída pelo sistema da Container App e conceda a ela a função `Key Vault Secrets User` no escopo do vault. Cadastre o segredo do Key Vault como referência de segredo na Container App e use essa referência na configuração do registro `ghcr.io` (`passwordSecretRef`), junto com o usuário GitHub associado ao token. O workflow usa `GITHUB_TOKEN` somente para publicar a imagem com a tag imutável do SHA do commit; esse token não é a credencial de pull e não é configurado na Azure.
3. Configure `CORS_ORIGINS` e `FRONTEND_URL` com a origem HTTPS da Container App. Para o mesmo host, configure `COOKIE_SECURE=true` e `COOKIE_SAME_SITE=lax`. O build usa `/NotasMax` como caminho relativo da API; não é necessário criar um Static Web App nem token de publicação.
4. Habilite a identidade gerenciada atribuída pelo sistema da Container App e conceda a ela `Key Vault Secrets User` no Key Vault. Armazene no Key Vault os valores secretos de runtime, como `MONGODB_URI`, `JWT_SECRET` e `EMAIL_PASS`, e configure referências a esses segredos na Container App para que sejam disponibilizados às variáveis correspondentes. Configure os valores não secretos, incluindo `CORS_ORIGINS`, `COOKIE_SECURE=true` e `COOKIE_SAME_SITE=lax`, no ambiente da Container App. Configure também o acesso de rede do Atlas para aceitar a origem de saída da aplicação conforme a topologia escolhida. Para referências de segredo com identidade gerenciada, consulte a [documentação de segredos do Azure Container Apps](https://learn.microsoft.com/azure/container-apps/manage-secrets).
5. Para uso futuro do Blob Storage, habilite identidade gerenciada na API, conceda somente os papéis RBAC de dados Blob necessários ao fluxo que vier a ser aprovado e configure a conectividade de rede. Esta entrega não adiciona SDK, endpoint, upload ou download de arquivos.

O workflow publica a imagem combinada no GHCR e atualiza a Container App existente apenas em `push` para `main`, após os testes e a cobertura. Ele não cria recursos Azure nem configura secrets/variables, credenciais GHCR de pull, variáveis de runtime ou RBAC. A sessão hospedada ainda precisa de validação em navegador real após configuração e publicação; execução de testes e build locais não comprova login hospedado.
