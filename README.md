# Diel · Calendário de tarefas

SPA de calendário implementada para o desafio técnico da Diel, cobrindo os níveis **júnior e pleno**. Interface em português, código e commits em inglês, API REST e frontend em aplicações independentes.

## Executar localmente

Requisitos: **Node.js 24.x**, **pnpm 11.x** e Git. Para instalar o pnpm com o Node já instalado: `npm install --global pnpm@11.19.0`.

```bash
git clone https://github.com/Pedrobarberini/diel-task-calendar.git
cd diel-task-calendar
pnpm install --frozen-lockfile
pnpm seed
pnpm dev
```

Abra **http://127.0.0.1:5173**. A API responde em **http://127.0.0.1:3001/api/health**.

`pnpm seed` é opcional: cria exemplos para a apresentação. Sem ele, a aplicação começa vazia. Os dados ficam em um arquivo SQLite local, ignorado pelo Git. Não é necessário instalar um servidor de banco de dados nem obter uma chave da API de feriados.

## O que foi implementado

| Requisito                          | Entrega                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Cadastro de tarefa                 | Título, descrição, data, horário, duração e múltiplas tags                   |
| Edição e remoção                   | Formulário de edição e confirmação antes da exclusão                         |
| Dia, semana e mês                  | Navegação entre períodos, botão Hoje e calendário lateral                    |
| Busca por título                   | Busca combinada com período e tags                                           |
| Cadastro, edição e remoção de tags | Nome e cor; remover uma tag preserva suas tarefas                            |
| Filtro por múltiplas tags          | Semântica **OU**: basta possuir uma das tags selecionadas                    |
| Feriados nacionais                 | API Nager.Date, Brasil, nome e destaque nos dias correspondentes             |
| Frontend e backend isolados        | Pacotes separados, comunicação exclusivamente via HTTP/JSON                  |
| Persistência                       | SQLite, migração versionada e relação muitos-para-muitos                     |
| Qualidade                          | TypeScript estrito, testes automatizados, build e pipeline no GitHub Actions |

**Escopo sênior não implementado:** cadastro/login de usuários, autenticação, gráficos de resolução e dashboard de tags. A aplicação é uma agenda única para demonstração local; não há separação de dados por usuário.

## Entender e apresentar o código

- [Roteiro de apresentação e perguntas técnicas](docs/APRESENTACAO.md): demonstração passo a passo e explicações para a entrevista.
- [Arquitetura e decisões técnicas](docs/ARQUITETURA.md): fluxo das requisições, banco, datas, segurança e limites.
- [Referência da API](docs/API.md): endpoints, exemplos de payloads e respostas de erro.
- [Registro de implementação e validação](docs/IMPLEMENTACAO.md): resumo completo do trabalho, comandos executados e evidências.

## Comandos

| Comando                           | Finalidade                                              |
| --------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                        | Inicia frontend e API em paralelo                       |
| `pnpm seed`                       | Insere dados de demonstração no banco                   |
| `pnpm test`                       | Executa testes da API e do frontend                     |
| `pnpm format:check`               | Verifica a formatação do código e da documentação       |
| `pnpm format`                     | Aplica a formatação com Prettier                        |
| `pnpm typecheck`                  | Verifica os tipos das duas aplicações                   |
| `pnpm build`                      | Compila a API e gera os arquivos estáticos da SPA       |
| `pnpm check`                      | Executa formatação, tipos, testes e build em sequência  |
| `pnpm --filter @diel/api start`   | Executa a API compilada, após o build                   |
| `pnpm --filter @diel/web preview` | Visualiza localmente o build da SPA, com a API iniciada |

O pipeline em `.github/workflows/ci.yml` executa `pnpm check` em pushes e pull requests. As versões exatas das dependências estão em `pnpm-lock.yaml`.

## Organização

```text
apps/
  api/                 API REST, SQLite, validação, feriados e testes
  web/                 SPA React, componentes, hooks e testes de calendário
docs/                  Documentação para execução, revisão e apresentação
.github/workflows/     Verificação automática no GitHub Actions
```

Cada aplicação tem seu `package.json`, `tsconfig.json`, dependências e build. O workspace apenas simplifica os comandos locais; a API não importa o React e a SPA não importa código do servidor.

## Regras importantes

- O calendário usa o fuso horário local do navegador; a API armazena instantes em UTC.
- Feriados são datas civis (`AAAA-MM-DD`), sem conversão de fuso.
- Uma tarefa que começa antes da meia-noite e termina no dia seguinte aparece nos dois dias.
- Filtros por título e tags são combinados; as tags entre si usam **OU**.
- A semana começa no domingo. O mês também mostra dias adjacentes para completar as semanas.
- Excluir uma tarefa remove seus vínculos; excluir uma tag remove apenas os vínculos dessa tag.
- Feriados usam `global: true` e tipo `Public` do provedor, excluindo registros apenas opcionais ou bancários. O aplicativo reflete a classificação da API, sem calendário legal próprio.
- Indisponibilidade do serviço de feriados gera um aviso, mantendo o gerenciamento de tarefas disponível.

## Limitações e uso

A API inicia em loopback para apresentação local. A ausência de autenticação faz parte do recorte solicitado: CORS e cabeçalhos HTTP não substituem controle de acesso. Não publique esta API na internet com dados reais sem adicionar autenticação, autorização, HTTPS e operação adequada.

SQLite simplifica a avaliação e funciona bem neste volume de dados. O acesso síncrono e o arquivo único têm limites de concorrência; a documentação explica a evolução possível, sem afirmar que foi implementada. `node:sqlite` pode emitir um aviso experimental no Node 24.

## Referências

- [Nager.Date](https://date.nager.at/) — integração REST de feriados.
- [Node.js — SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html) — persistência nativa.
- [Fastify](https://fastify.dev/docs/latest/) — API HTTP.
- [React](https://react.dev/) e [Vite](https://vite.dev/guide/) — SPA e build.

A solução foi construída com assistência de IA. A documentação foi preparada para apoiar o estudo, a revisão e uma apresentação transparente das decisões e dos resultados.

## Configuração opcional

A execução padrão dispensa arquivos `.env`.

| Aplicação | Variável        | Padrão                  | Uso                                                                                      |
| --------- | --------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| API       | `HOST`          | `127.0.0.1`             | Interface de rede do servidor                                                            |
| API       | `PORT`          | `3001`                  | Porta HTTP                                                                               |
| API       | `DATABASE_PATH` | `./data/diel.sqlite`    | Arquivo relativo ao diretório de execução da API (`apps/api` pelos scripts do workspace) |
| API       | `WEB_ORIGIN`    | `http://127.0.0.1:5173` | Origem liberada pelo CORS                                                                |
| SPA       | `VITE_API_URL`  | `/api`                  | Base da API; configurada no build/Vite                                                   |

A API lê variáveis do processo, **não carrega `.env` automaticamente**. No PowerShell, por exemplo, use `$env:PORT = '3001'` antes de iniciar. O Vite lê arquivos `.env` em `apps/web`; variáveis com prefixo `VITE_` são públicas e não devem conter segredos. Alterar a porta da API também exige ajustar o proxy do Vite em `apps/web/vite.config.ts` ou definir uma URL absoluta na SPA com o CORS correspondente.
