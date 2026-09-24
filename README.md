# Diel · Calendário de tarefas

[Acessar aplicação](https://pedrobarberini.github.io/diel-task-calendar/) · [Repositório](https://github.com/Pedrobarberini/diel-task-calendar)

Aplicação para organizar tarefas em um calendário diário, semanal e mensal. Desenvolvida com React e TypeScript, oferece autenticação pelo Firebase, armazenamento individual no Firestore e publicação no GitHub Pages. O repositório também contém um perfil local com API REST em Fastify e banco SQLite.

O projeto contempla os requisitos júnior e pleno do desafio Diel, com autenticação e publicação online adicionais. Dashboard e gráficos do escopo sênior não estão implementados.

## Funcionalidades

- Cadastro, edição e exclusão de tarefas com título, descrição, início, duração e múltiplas tags.
- Visualizações diária, semanal e mensal, navegação entre períodos e retorno à data atual.
- Cadastro, edição e exclusão de tags com nome e cor, preservando as tarefas ao excluir uma tag.
- Busca por título e filtros por período e tags. Entre tags, o filtro usa **OU**: basta a tarefa possuir uma das selecionadas.
- Feriados nacionais brasileiros obtidos pela API Nager.Date.
- Login com Google ou e-mail/senha, cadastro, recuperação de senha e logout.
- Dados separados por usuário, persistência da sessão, layout responsivo e tratamento de erros.

## Tecnologias e arquitetura

| Camada              | Tecnologias                                         | Responsabilidade                                       |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Interface           | React, TypeScript, Vite e Lucide                    | Componentes, formulários, calendário e estados da tela |
| Autenticação online | Firebase Authentication                             | Login, cadastro, recuperação e sessão                  |
| Persistência online | Cloud Firestore                                     | Documentos individuais e regras de acesso por UID      |
| API local           | Fastify, TypeScript e Zod                           | Endpoints REST e validação de entrada                  |
| Persistência local  | SQLite com `node:sqlite`                            | Tarefas, tags e relacionamentos em banco relacional    |
| Qualidade           | Vitest, `node:test`, emuladores Firebase e Prettier | Testes, verificações e formatação                      |
| Publicação          | GitHub Actions e GitHub Pages                       | Build, validação e hospedagem do frontend              |

Existem dois perfis de execução:

```text
Online: React → Firebase Authentication + Firestore
Local REST: React → HTTP/JSON → Fastify → SQLite
```

Os componentes utilizam um adaptador de dados em `apps/web/src/lib/api.ts`. O perfil padrão usa Firebase; `VITE_DATA_MODE=rest` seleciona o cliente HTTP. A versão online não utiliza a API Fastify, e o login Firebase não protege a API REST local.

O GitHub Pages hospeda apenas os arquivos estáticos do frontend. A autenticação e a persistência online são executadas pelos serviços Firebase, sem depender de um servidor no computador do usuário.

## Modelo de dados e regras

Uma tarefa contém título, descrição, instante de início, duração em minutos, tags e timestamps de criação/atualização. O horário final é calculado a partir do início e da duração. Cada tag possui ID, nome e cor.

No SQLite, `tasks` e `tags` se relacionam por `task_tags`. Transações mantêm a gravação da tarefa e de seus vínculos consistente. A remoção de uma tag elimina os vínculos, sem excluir as tarefas.

No Firestore, os dados ficam em `/users/{uid}/tasks`, `/users/{uid}/tags` e `/users/{uid}/tagNames`. As regras exigem que o UID autenticado corresponda ao dono do caminho. Validam também campos, limites e timestamps. A configuração Web do Firebase é pública; o repositório não contém credenciais administrativas.

Os nomes de tags são reservados em transação pelo adaptador Firestore. Ao excluir uma tag, referências antigas nas tarefas são ignoradas na leitura, preservando as tarefas. Essa abordagem difere da exclusão de vínculos do modelo relacional.

Regras principais:

- Título de até 160 caracteres, descrição de até 5.000 e até 20 tags por tarefa.
- Duração inteira entre 1 minuto e 7 dias.
- Nome de tag de até 40 caracteres e cor hexadecimal.
- Tarefas selecionadas por sobreposição de intervalos, incluindo as que atravessam a meia-noite.
- Horários apresentados no fuso do dispositivo; feriados tratados como datas civis.
- Busca com debounce de 300 ms e descarte de respostas que não correspondem mais ao período atual.
- Feriados carregados independentemente das tarefas, com timeout de 5 segundos e cache em memória por 24 horas.

## Acessar online

Abra **[o calendário](https://pedrobarberini.github.io/diel-task-calendar/)** e escolha **Continuar com o Google** ou **Criar conta**. Cada conta começa com o calendário vazio. As tarefas ficam na nuvem e podem ser acessadas em outro dispositivo com a mesma conta.

## Executar localmente com Firebase

Requisitos: **Node.js 24.x** e **pnpm 11.19.0**. Para instalar o pnpm: `npm install --global pnpm@11.19.0`.

```bash
git clone https://github.com/Pedrobarberini/diel-task-calendar.git
cd diel-task-calendar
pnpm install --frozen-lockfile
pnpm --filter @diel/web dev
```

Abra **http://localhost:5173**, domínio autorizado para login no projeto Firebase. Por padrão, o frontend local utiliza o mesmo Firebase da aplicação publicada e grava os dados da conta autenticada. Não é necessário iniciar a API local.

Para utilizar outro projeto Firebase:

1. Registre um aplicativo Web e habilite Google e e-mail/senha no Authentication.
2. Crie o banco Firestore e publique as regras de `firestore.rules`.
3. Autorize os domínios de desenvolvimento e publicação no Authentication.
4. Copie `apps/web/.env.example` para `apps/web/.env.local` e preencha todas as quatro variáveis `VITE_FIREBASE_*` com a configuração Web desse projeto.

## Executar o perfil REST com SQLite

Esse perfil é local e **não possui autenticação**.

1. Crie `apps/web/.env.local` com `VITE_DATA_MODE=rest`.
2. Execute os comandos abaixo na raiz:

```bash
pnpm seed
pnpm dev
```

Abra **http://127.0.0.1:5173**. A API responde em **http://127.0.0.1:3001/api/health**. O seed é opcional e insere exemplos somente no SQLite, cujos arquivos são ignorados pelo Git.

Não há sincronização nem migração automática entre SQLite e Firestore. Remova `VITE_DATA_MODE=rest` e reinicie o servidor de desenvolvimento para retornar ao perfil Firebase.

### Endpoints da API local

| Método       | Endpoint              | Operação                                             |
| ------------ | --------------------- | ---------------------------------------------------- |
| GET          | `/api/health`         | Estado da API                                        |
| GET          | `/api/tasks`          | Listar tarefas; filtros `from`, `to`, `q` e `tagIds` |
| POST         | `/api/tasks`          | Criar tarefa                                         |
| PUT          | `/api/tasks/:id`      | Atualizar tarefa                                     |
| DELETE       | `/api/tasks/:id`      | Excluir tarefa                                       |
| GET / POST   | `/api/tags`           | Listar ou criar tags                                 |
| PUT / DELETE | `/api/tags/:id`       | Atualizar ou excluir tag                             |
| GET          | `/api/holidays/:year` | Consultar feriados nacionais brasileiros             |

Exemplo de corpo para criar uma tarefa:

```json
{
  "title": "Reunião de planejamento",
  "description": "Organizar as atividades da semana",
  "startsAt": "2026-09-25T09:00:00-03:00",
  "durationMinutes": 60,
  "tagIds": []
}
```

O schema Zod valida os dados recebidos em tempo de execução. Respostas de dados usam `{ "data": ... }`; erros usam `{ "error": { "code": "...", "message": "..." } }`. Criações retornam HTTP 201, exclusões HTTP 204 e falhas de validação HTTP 400.

## Testes e comandos

| Comando                       | Finalidade                                               |
| ----------------------------- | -------------------------------------------------------- |
| `pnpm check`                  | Formatação, tipos, 40 testes e build das duas aplicações |
| `pnpm test`                   | Testes da API e das funções do frontend                  |
| `pnpm typecheck`              | Verificação estática dos tipos                           |
| `pnpm format`                 | Formatação do código e README                            |
| `pnpm --filter @diel/web dev` | Frontend conectado ao Firebase                           |
| `pnpm dev`                    | Frontend e API local em paralelo                         |
| `pnpm seed`                   | Exemplos no SQLite local                                 |
| `pnpm build`                  | Build do frontend e backend                              |

Os 40 testes cobrem API, persistência SQLite, calendário, sobreposição de períodos, validação, filtros e cliente HTTP. Outros **8 testes** utilizam emuladores: 5 cenários de regras Firestore e 3 de autenticação. Incluem bloqueio de acesso entre contas, cadastro, login/logout, recuperação de senha e identidade Google simulada.

Para executar os emuladores, instale **Java 21** e execute na raiz:

```bash
pnpm dlx firebase-tools@15.30.2 emulators:exec --only auth,firestore --project demo-diel-calendar "node --test apps/web/tests/auth.flows.mjs apps/web/tests/firestore.rules.mjs"
```

Esses testes não criam contas reais nem substituem a verificação do consentimento Google em um navegador real.

## Publicação

O workflow `CI` verifica pushes e pull requests. `Deploy GitHub Pages` executa as verificações, os testes dos emuladores e publica pushes na `main`. O build utiliza o caminho `/diel-task-calendar/`.

As regras do banco são publicadas separadamente; alterar `firestore.rules` no GitHub não modifica o Firebase automaticamente. Para implantar regras no projeto configurado, usando a conta proprietária:

```bash
pnpm dlx firebase-tools@15.30.2 login
pnpm dlx firebase-tools@15.30.2 deploy --only firestore:rules,firestore:indexes --project diel-task-calendar-e704c
```

Ao utilizar outro projeto, substitua o ID no comando. A publicação estática do Pages não precisa de credenciais administrativas Firebase.

## Organização do repositório

```text
apps/api/                     API REST, SQLite, validação e testes
apps/web/src/components/      Login e componentes do calendário
apps/web/src/hooks/           Carregamento e estado dos dados
apps/web/src/lib/api.ts       Adaptador Firestore e seleção do perfil REST
apps/web/src/lib/rest-api.ts  Cliente HTTP
apps/web/src/lib/calendar.ts  Regras de datas e períodos
apps/web/src/lib/firebase.ts  Inicialização dos SDKs
apps/web/tests/                Testes com emuladores Firebase
firestore.rules               Autorização e validação de documentos
firebase.json                 Regras, índices e configuração dos emuladores
.github/workflows/            CI e publicação no Pages
```

## Limitações

Não há dashboard, gráficos, recorrência, notificações, integração com Google Calendar, migração entre os bancos ou sincronização em tempo real entre abas. Atualizações externas aparecem ao refazer consultas ou recarregar. Não há paginação nem busca textual indexada; o custo de leitura cresce com os dados consultados. O perfil REST local não implementa controle de acesso. O Firebase utiliza o plano Spark, sujeito às cotas do serviço.
