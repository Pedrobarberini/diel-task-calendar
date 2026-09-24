> **Documento da entrega REST/SQLite original.** Esse perfil continua disponível localmente com VITE_DATA_MODE=rest. A versão online atual usa Firebase, login e GitHub Pages; veja [Firebase e publicação](FIREBASE_E_PUBLICACAO.md) e o [README](../README.md). As menções abaixo à ausência de autenticação e aos dados SQLite se referem ao perfil original.

# Arquitetura e decisões técnicas

Este documento explica como o projeto funciona, o que foi implementado para os níveis júnior e pleno do desafio e quais limites continuam existindo. O roteiro de demonstração está em [APRESENTACAO.md](./APRESENTACAO.md).

## 1. Escopo da entrega

O produto é um calendário de tarefas com persistência em banco de dados. Cada tarefa tem título, descrição, data e horário de início, duração e zero ou mais etiquetas. O usuário pode consultar o calendário por dia, semana ou mês, pesquisar por título e filtrar por etiquetas. Feriados nacionais brasileiros são obtidos de uma API REST pública.

| Requisito                           | Comportamento esperado na entrega                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Criar tarefa                        | Cadastrar título, descrição, início, duração e etiquetas.                              |
| Consultar tarefas                   | Carregar do backend as tarefas que se sobrepõem ao período visível.                    |
| Editar tarefa                       | Abrir uma tarefa, alterar os campos e persistir a atualização.                         |
| Excluir tarefa                      | Remover a tarefa após confirmação na interface.                                        |
| Calendário diário, semanal e mensal | Alternar o período sem perder os filtros ativos.                                       |
| Pesquisa por título                 | Combinar a pesquisa com período e etiquetas.                                           |
| Etiquetas                           | Criar, editar e excluir etiquetas com nome e cor.                                      |
| Várias etiquetas por tarefa         | Relacionamento muitos para muitos no banco.                                            |
| Seleção múltipla no filtro          | Semântica OU: uma tarefa aparece se possuir pelo menos uma das etiquetas selecionadas. |
| Feriados nacionais                  | Consultar feriados brasileiros por ano e mostrá-los no calendário.                     |
| Persistência                        | Salvar tarefas, etiquetas e vínculos em SQLite.                                        |

O escopo sênior foi deixado de fora por escolha explícita da entrega. Autenticação, autorização, contas de usuário e dashboard gerencial não foram implementados. Os testes e a documentação apoiam a entrega júnior/pleno; não transformam o projeto em uma solução completa de produção.

## 2. Estrutura geral

O repositório é um monorepo com dois pacotes independentes gerenciados por pnpm:

```text
Navegador
   │ React + TypeScript
   │ HTTP /api
   ▼
Fastify + TypeScript
   ├── validação dos dados
   ├── operações SQL → SQLite em disco
   └── consulta de feriados → Nager.Date
```

| Diretório ou arquivo       | Responsabilidade                                                  |
| -------------------------- | ----------------------------------------------------------------- |
| `apps/web`                 | Interface React, calendário, formulários, filtros e cliente HTTP. |
| `apps/api`                 | API REST, validação, persistência e integração com feriados.      |
| `docs`                     | Explicação técnica e preparação da apresentação.                  |
| `.github/workflows/ci.yml` | Instalação e verificação automatizada em pushes e pull requests.  |
| `package.json`             | Comandos que coordenam os dois pacotes.                           |
| `pnpm-workspace.yaml`      | Declaração dos pacotes do monorepo.                               |
| `pnpm-lock.yaml`           | Versões resolvidas das dependências para instalação reproduzível. |
| `.nvmrc`                   | Versão principal de Node exigida pelo projeto: 24.                |

### Por que estas tecnologias

- **React + TypeScript:** separação da interface em componentes e verificação estática dos dados usados pela aplicação.
- **Vite:** servidor de desenvolvimento e geração do pacote de frontend. O proxy de desenvolvimento encaminha chamadas da interface para a API.
- **Fastify:** rotas HTTP, hooks e tratamento central de erros com uma estrutura enxuta.
- **Zod:** validação em tempo de execução. TypeScript sozinho não valida o JSON que chega pela rede.
- **SQLite com `node:sqlite`:** banco relacional persistente sem exigir instalação de um servidor de banco separado. Node 24 fornece o módulo usado pela aplicação.
- **pnpm workspaces:** instalação coordenada, comandos comuns e divisão clara entre frontend e backend.

O calendário foi implementado com componentes React próprios, sem uma biblioteca pronta de agenda. Os ícones vêm de `lucide-react`; os cálculos de datas ficam em funções auxiliares testáveis. Essa escolha mantém o comportamento do desafio visível no código, mas exige manutenção própria das regras e da interface.

Não existe importação de código de execução do backend pelo frontend. Os dois lados se comunicam por JSON sobre HTTP e mantêm suas próprias definições de tipos. Isso evita incluir dependências de servidor no navegador. O custo é precisar manter o contrato coerente nos dois pacotes. Se o contrato crescer, uma evolução possível é gerar tipos a partir de OpenAPI ou criar um pacote de contratos que não carregue código específico do servidor; isso não faz parte desta implementação.

### Mapa do código para leitura

| Arquivo                                       | Funções ou elementos a observar                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `apps/web/src/main.tsx`                       | Inicialização da aplicação React.                                                                     |
| `apps/web/src/App.tsx`                        | Data de referência, visualização, filtros, diálogos, navegação e mensagens de resultado.              |
| `apps/web/src/types.ts`                       | Formato das tarefas, etiquetas, feriados e dados de formulário.                                       |
| `apps/web/src/lib/calendar.ts`                | `visibleRange`, `visibleDays`, `monthDays`, `tasksForDay`, `addMonthsClamped` e `localDateTimeToIso`. |
| `apps/web/src/lib/api.ts`                     | `request`, tratamento das respostas e métodos do objeto `api`.                                        |
| `apps/web/src/hooks/useCalendarData.ts`       | Carregamento dos recursos, busca com atraso, cancelamento e atualização.                              |
| `apps/web/src/components/TaskDialog.tsx`      | Formulário de criação/edição e exclusão de tarefas.                                                   |
| `apps/web/src/components/TagsDialog.tsx`      | Gerenciamento de etiquetas.                                                                           |
| `apps/web/src/components/Dialog.tsx`          | Estrutura compartilhada dos diálogos.                                                                 |
| `apps/web/src/components/Sidebar.tsx`         | Calendário compacto, seleção de etiquetas e menu em telas pequenas.                                   |
| `apps/web/src/components/CalendarToolbar.tsx` | Busca, troca de visualização, período anterior/próximo e botão Hoje.                                  |
| `apps/web/src/components/CalendarGrid.tsx`    | Grades mensal/semanal, agenda diária, cartões e feriados.                                             |
| `apps/web/vite.config.ts`                     | Proxy local de `/api` para `http://127.0.0.1:3001`.                                                   |
| `apps/api/src/server.ts`                      | Inicialização da escuta HTTP e encerramento por sinal.                                                |
| `apps/api/src/app.ts`                         | `buildApp`, configuração, rotas e tratamento central de erros.                                        |
| `apps/api/src/validation.ts`                  | Schemas Zod para tarefas, etiquetas, IDs, consultas e anos.                                           |
| `apps/api/src/repository.ts`                  | `Repository`, CRUD, pesquisa e consultas parametrizadas.                                              |
| `apps/api/src/database.ts`                    | `openDatabase`, criação do schema e `transaction`.                                                    |
| `apps/api/src/holidays.ts`                    | `HolidayService.list`, consulta externa, cache e tratamento de falhas.                                |
| `apps/api/src/errors.ts`                      | `ApiError`, com código HTTP e código de erro da aplicação.                                            |
| `apps/api/src/seed.ts`                        | Dados demonstrativos com IDs estáveis.                                                                |

A fábrica `buildApp` permite criar uma aplicação com banco em memória e provedor de feriados substituído nos testes, sem abrir uma porta HTTP nem depender da disponibilidade da internet. `server.ts` acrescenta apenas a inicialização usada na execução normal.

## 3. Fluxo de uma operação

### Criar ou editar uma tarefa

1. A interface apresenta o formulário com título, descrição, início, duração e etiquetas.
2. O navegador converte a data e o horário locais em um instante ISO com fuso explícito antes de enviar o JSON.
3. O backend valida o corpo recebido. Campo obrigatório ausente, data sem fuso, duração fora do limite ou etiqueta inválida resultam em erro, sem gravar dados parciais.
4. A camada de persistência grava a tarefa e seus vínculos com etiquetas de forma transacional.
5. A API devolve a representação salva. A interface atualiza os dados exibidos.

O backend continua sendo a fronteira de confiança: contornar o formulário e chamar a API diretamente não elimina a validação.

### Carregar um período do calendário

1. A visualização e a data de referência definem os limites do período visível.
2. A interface envia o início, o fim e os filtros para a API.
3. A consulta seleciona as tarefas que se sobrepõem ao intervalo e aplica a pesquisa por título e as etiquetas.
4. O frontend organiza as tarefas retornadas nas células ou listas do calendário.
5. Os feriados dos anos envolvidos são carregados e apresentados como informação de calendário.

O hook `useCalendarData` aguarda 300 ms após a mudança do texto de busca antes de fazer a consulta. `AbortController` cancela requisições anteriores quando os filtros ou o período mudam; o estado não é atualizado por uma resposta cujo sinal já foi cancelado. Isso evita que uma resposta atrasada sobrescreva o resultado de uma seleção mais recente.

Tarefas e etiquetas são carregadas em conjunto. Feriados ficam em outro efeito e usam `Promise.allSettled`: se o período incluir dois anos e um deles falhar, os dados do ano que respondeu ainda podem ser mostrados. Salvar ou excluir um recurso aciona `refresh`, que solicita os dados atuais ao backend.

## 4. Modelo relacional

O modelo tem três entidades persistidas:

```text
tasks                         task_tags                      tags
────────────────              ──────────────────             ────────────────
id (PK) ────────────────────► task_id (FK → tasks.id)        id (PK)
title                         tag_id  (FK → tags.id) ──────► name
description                   PK (task_id, tag_id)           name_key (UNIQUE)
starts_at                                                   color
starts_at_ms
duration_minutes
created_at
updated_at
```

Uma tarefa pode ter várias etiquetas; uma etiqueta pode ser usada em várias tarefas. A tabela de associação evita armazenar uma lista separada por vírgulas na tarefa. A chave composta impede repetir o mesmo vínculo. Chaves estrangeiras mantêm a integridade referencial.

`starts_at` guarda o instante ISO para o contrato; `starts_at_ms` guarda sua representação numérica para comparações e aritmética de duração no SQL. Os dois valores são derivados da mesma entrada e gravados juntos. `created_at` e `updated_at` registram criação e última alteração. Os IDs de novos registros são UUIDs gerados no backend.

`name_key` normaliza o nome da etiqueta com Unicode NFKC e conversão para minúsculas em português. Seu índice único impede nomes duplicados que diferem apenas em caixa ou representação Unicode compatível. Isso não significa remover acentos: `reuniao` e `reunião` continuam sendo nomes diferentes.

Há índices para o início das tarefas e para a busca de vínculos por etiqueta. `schema_migrations` registra a aplicação da versão inicial do schema. O banco ativa chaves estrangeiras, modo WAL e espera de até cinco segundos por bloqueio. A função `transaction` usa `BEGIN IMMEDIATE`, seguido de `COMMIT` ou `ROLLBACK`.

Excluir uma etiqueta remove seus vínculos, mas preserva as tarefas. Excluir uma tarefa remove os vínculos dela. A alteração de título e etiquetas acontece em uma transação para que uma falha não deixe metade da operação aplicada.

### Por que não gravar o horário final como dado independente

O fim é calculado a partir de início e duração:

```text
fim = início + duração em minutos
```

Isso evita a inconsistência de alterar a duração e esquecer de alterar uma coluna de fim. A duração é um número inteiro positivo, limitado a 10.080 minutos, equivalente a sete dias. A aplicação aceita tarefas que atravessam a meia-noite.

### Por que SQLite

SQLite facilita clonar, instalar e executar o desafio: os dados vivem em um arquivo local. Ele oferece transações e integridade relacional suficientes para esta aplicação de demonstração.

A API utilizada é síncrona. Consultas longas podem bloquear o event loop, e SQLite permite concorrência de escrita mais limitada que um banco servidor. Portanto, a escolha atende ao tamanho do desafio; não é uma afirmação de que a mesma arquitetura suporta qualquer carga.

Para vários usuários, múltiplas instâncias ou carga maior, uma evolução seria PostgreSQL, acesso assíncrono, uma estratégia de migrações adequada ao novo banco e testes de concorrência. Essa migração não foi implementada. Manter o SQL concentrado na camada de persistência reduz a área afetada por essa mudança futura.

## 5. Datas, fusos e intervalos

### Tarefas representam instantes

O usuário informa um horário local no navegador. A API exige um ISO 8601 com offset, normaliza o valor para UTC e persiste esse instante. A interface usa o fuso local do navegador para apresentá-lo novamente.

Por exemplo, `2026-09-22T09:00:00-03:00` e `2026-09-22T12:00:00.000Z` representam o mesmo instante. O backend não presume que o fuso do servidor é o mesmo do usuário.

Isso permite execução em máquinas com fusos diferentes sem reinterpretar silenciosamente os dados. O produto não possui uma configuração própria de fuso por usuário; a exibição depende do navegador.

`localDateTimeToIso` também compara os componentes após construir a data. Assim, datas inválidas que JavaScript normalizaria para outro dia ou horário são recusadas. A passagem de um mês para outro usa `addMonthsClamped`: 31 de janeiro vai para o último dia válido de fevereiro, em vez de avançar inadvertidamente para março.

O calendário mensal usa 42 células, começando no domingo da primeira semana exibida. Dias dos meses vizinhos fazem parte da consulta. Se essa grade atravessar a virada do ano, `visibleRange` inclui ambos os anos no carregamento de feriados. O modo semanal também começa no domingo.

Na visualização mensal, cada dia mostra até três cartões e um botão para abrir o dia com as demais tarefas. A visualização diária apresenta uma agenda ordenada por horário, e a semanal mostra colunas por dia. Os cartões exibem duração, etiquetas e a indicação “Em andamento” quando a tarefa começou em um dia anterior. O produto não implementa arrastar e soltar, redimensionamento de tarefas ou uma grade proporcional de conflitos.

### Feriados representam datas civis

Um feriado vem da API externa como `YYYY-MM-DD`. Ele marca um dia do calendário, e não um horário UTC. Não se deve converter esse valor diretamente em um instante e exibi-lo no fuso local: em alguns fusos isso deslocaria a exibição para o dia anterior.

Por isso, datas de feriados são comparadas como dias locais do calendário. Tarefas e feriados usam modelos temporais diferentes porque representam conceitos diferentes.

### Intervalos semiabertos

O período consultado é `[from, to)`: inclui o início e exclui o fim. Uma tarefa aparece quando:

```text
taskStart < to AND taskEnd > from
```

Exemplos para o intervalo das 10h às 11h:

| Tarefa      | Aparece? | Motivo                                    |
| ----------- | -------- | ----------------------------------------- |
| 09h30–10h30 | Sim      | Continua dentro do intervalo.             |
| 10h00–10h30 | Sim      | Começa no limite inicial, que é incluído. |
| 09h00–10h00 | Não      | Termina exatamente no limite inicial.     |
| 11h00–11h30 | Não      | Começa no limite final, que é excluído.   |
| 09h00–12h00 | Sim      | Engloba todo o intervalo.                 |

Essa regra evita perder tarefas iniciadas no dia anterior e evita contar duas vezes uma tarefa que apenas encosta na fronteira de períodos vizinhos. A sobreposição serve para selecionar e exibir tarefas; não é um bloqueio de conflitos de agenda. O produto permite que tarefas coincidam no horário.

## 6. Pesquisa e etiquetas

A consulta combina os filtros com E entre categorias:

```text
no período E título corresponde E tem alguma etiqueta selecionada
```

Dentro da seleção de etiquetas, a regra é OU:

```text
seleção [Trabalho, Pessoal]
→ tarefa com Trabalho OU Pessoal OU ambas aparece
```

Sem etiquetas selecionadas, não há restrição por etiqueta. Uma tarefa sem etiqueta pode ser encontrada normalmente. O filtro por título consulta o backend; ele não limita a pesquisa aos itens já carregados na interface.

A busca é uma correspondência literal de parte do título, sem distinguir maiúsculas e minúsculas em português. Não pesquisa a descrição e não remove acentos. No backend, SQL aplica os filtros de intervalo e etiquetas, e JavaScript aplica a comparação textual com `toLocaleLowerCase('pt-BR')`. Isso torna o comportamento de caixa previsível para texto em português, mas deixa trabalho em memória proporcional ao resultado do período; uma base maior exigiria rever essa estratégia.

O filtro de etiquetas usa `EXISTS`, o que evita duplicar uma tarefa que tenha duas etiquetas selecionadas. Quando uma etiqueta é criada, editada ou excluída no gerenciador, a interface limpa a seleção de etiquetas e recarrega os dados, evitando manter IDs removidos no filtro.

## 7. Validação e erros

Os limites de entrada estão centralizados em `apps/api/src/validation.ts`:

| Campo                   | Regra                                                         |
| ----------------------- | ------------------------------------------------------------- |
| Identificador           | UUID válido.                                                  |
| Título de tarefa        | Texto aparado, de 1 a 160 caracteres.                         |
| Descrição               | Texto aparado de até 5.000 caracteres; pode ser vazio.        |
| Início                  | ISO 8601 com fuso explícito, normalizado para UTC.            |
| Duração                 | Inteiro entre 1 e 10.080 minutos.                             |
| Etiquetas de uma tarefa | Até 20 UUIDs, sem repetição.                                  |
| Nome da etiqueta        | Texto aparado, de 1 a 40 caracteres.                          |
| Cor                     | Hexadecimal com seis dígitos, como `#2563eb`.                 |
| Pesquisa                | Texto de até 160 caracteres.                                  |
| Período                 | Quando ambos são informados, `from` deve ser anterior a `to`. |
| Ano dos feriados        | Inteiro entre 1900 e 2100.                                    |

Os objetos de entrada são estritos: campos desconhecidos são recusados. Essa decisão torna erros de contrato explícitos. O formulário melhora a experiência, mas a mesma regra de negócio precisa ser aplicada no servidor.

O tratamento centralizado distingue validação, recurso não encontrado, conflitos e falhas internas. Uma falha inesperada não deve expor stack traces ou detalhes do banco ao usuário.

### Contrato HTTP

As rotas estão em `apps/api/src/app.ts`. Respostas de dados usam `{ "data": ... }`. Exclusões bem-sucedidas respondem `204` sem corpo; o cliente HTTP trata esse caso sem tentar ler JSON. O healthcheck responde diretamente `{ "status": "ok" }`.

| Método   | Rota                  | Entrada                                         | Sucesso                             |
| -------- | --------------------- | ----------------------------------------------- | ----------------------------------- |
| `GET`    | `/api/health`         | Nenhuma.                                        | `200`, estado da API.               |
| `GET`    | `/api/tasks`          | `from`, `to`, `q`, `tagIds` opcionais na query. | `200`, lista de tarefas.            |
| `POST`   | `/api/tasks`          | Corpo completo da tarefa.                       | `201`, tarefa criada.               |
| `PUT`    | `/api/tasks/:id`      | UUID e corpo da tarefa.                         | `200`, tarefa atualizada.           |
| `DELETE` | `/api/tasks/:id`      | UUID.                                           | `204`.                              |
| `GET`    | `/api/tags`           | Nenhuma.                                        | `200`, lista de etiquetas.          |
| `POST`   | `/api/tags`           | Nome e cor.                                     | `201`, etiqueta criada.             |
| `PUT`    | `/api/tags/:id`       | UUID, nome e cor.                               | `200`, etiqueta atualizada.         |
| `DELETE` | `/api/tags/:id`       | UUID.                                           | `204`.                              |
| `GET`    | `/api/holidays/:year` | Ano.                                            | `200`, lista de feriados nacionais. |

Exemplo de corpo para criar ou atualizar uma tarefa:

```json
{
  "title": "Preparar apresentação Diel",
  "description": "Revisar o fluxo completo de uma tarefa.",
  "startsAt": "2026-09-22T09:00:00-03:00",
  "durationMinutes": 60,
  "tagIds": []
}
```

O `PUT` representa a atualização do recurso, não um patch parcial. A interface envia todos os campos; omitir descrição ou etiquetas usa os padrões vazio e lista vazia do schema. Para associar etiquetas, use IDs realmente existentes, obtidos em `/api/tags`.

Exemplo de etiqueta:

```json
{ "name": "Estudos", "color": "#10b981" }
```

`tagIds` na consulta é uma lista de UUIDs separados por vírgula. No corpo JSON da tarefa, é um array. A resposta de tarefa contém `id`, `title`, `description`, `startsAt`, `durationMinutes`, `tags`, `createdAt` e `updatedAt`; `tags` inclui os objetos completos de etiqueta com `id`, `name` e `color`.

Erros seguem este formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Confira os dados informados.",
    "details": [{ "field": "title", "message": "..." }]
  }
}
```

| Status | Situação                                                    |
| ------ | ----------------------------------------------------------- |
| `400`  | Dados inválidos ou associação com etiqueta inexistente.     |
| `404`  | Tarefa, etiqueta ou endereço não encontrado.                |
| `409`  | Nome de etiqueta já existente.                              |
| `413`  | Corpo HTTP acima do limite de 64 KiB.                       |
| `503`  | Provedor de feriados indisponível ou resposta inválida.     |
| `500`  | Falha interna inesperada, com mensagem genérica ao cliente. |

Não há paginação: a API devolve todos os resultados que atendem ao filtro. A interface sempre consulta o período visível; a API também aceita consulta sem período. Para um volume grande, paginação e revisão da estratégia de pesquisa seriam necessárias.

## 8. Integração com feriados

O backend consulta o endpoint de feriados brasileiros do Nager.Date por ano. A interface não necessita conhecer o endereço externo nem o formato completo retornado pelo provedor.

A camada de integração adapta o resultado ao contrato do projeto e considera feriados nacionais. A ausência ou falha da API externa não significa que o banco de tarefas esteja indisponível: a interface deve informar o problema dos feriados sem impedir o CRUD de tarefas.

O endpoint externo é `https://date.nager.at/api/v3/PublicHolidays/{ano}/BR`. `HolidayService` valida a resposta e mantém apenas itens com `global: true`, tipo `Public` e data pertencente ao ano consultado. Os itens são ordenados pela data.

Cada chamada externa tem timeout de cinco segundos. O resultado válido fica em cache em memória por 24 horas, por ano; pedidos simultâneos para o mesmo ano compartilham a mesma promessa. O cache é perdido ao reiniciar o backend. Resposta HTTP com erro, JSON inválido, schema incompatível ou timeout geram `503` com código `HOLIDAYS_UNAVAILABLE`.

Esta integração depende de uma API pública e de acesso à internet. A cobertura do provedor não deve ser apresentada como uma lista de todos os feriados municipais, estaduais, datas comemorativas ou pontos facultativos. O escopo adotado é feriados nacionais brasileiros.

## 9. Segurança e limites de operação

Há medidas básicas compatíveis com o desafio: validação no servidor, consultas SQL parametrizadas, tratamento central de erros, cabeçalhos HTTP de segurança e política de origem configurada para o frontend local.

O servidor e o frontend de desenvolvimento são configurados para escutar em `127.0.0.1`. Isso reduz a exposição acidental durante a demonstração local. CORS e cabeçalhos de segurança não substituem autenticação ou autorização.

Como não há login, qualquer pessoa que consiga alcançar a API pode consultar e modificar os dados. As tarefas não pertencem a usuários separados. Não existem permissões por papel, trilha de auditoria, política de backups, sincronização entre usuários nem proteção completa contra abuso. O repositório público compartilha o código; ele não é, por si só, uma instância hospedada da aplicação.

O arquivo local de banco não deve ser commitado. Dados de exemplo são gerados pelo comando de seed; segredos, arquivos `.env` e artefatos locais permanecem fora do versionamento conforme o `.gitignore`.

### Configuração de execução

| Configuração    | Padrão                  | Uso                                                        |
| --------------- | ----------------------- | ---------------------------------------------------------- |
| `HOST`          | `127.0.0.1`             | Interface em que o backend aceita conexões.                |
| `PORT`          | `3001`                  | Porta do backend, validada entre 1 e 65.535.               |
| `DATABASE_PATH` | `./data/diel.sqlite`    | Caminho do banco relativo ao diretório de execução da API. |
| `WEB_ORIGIN`    | `http://127.0.0.1:5173` | Origem permitida pelo CORS do backend.                     |
| `VITE_API_URL`  | `/api`                  | Prefixo da API usado no build/desenvolvimento do frontend. |

Com os scripts do monorepo, o banco padrão fica em `apps/api/data/diel.sqlite`. O Vite encaminha `/api` para a API local durante o desenvolvimento. Um build estático do frontend precisa de um servidor/proxy equivalente ou de `VITE_API_URL` definido antes do build; o proxy de desenvolvimento não é uma configuração de hospedagem de produção.

Ao receber `SIGINT` ou `SIGTERM`, `server.ts` fecha o Fastify e o hook `onClose` fecha a conexão com o banco.

## 10. Comandos e verificação

Na raiz do repositório, com Node 24 e a versão de pnpm indicada no `package.json`:

```sh
pnpm install
pnpm seed
pnpm dev
```

Em outro terminal, para executar as verificações:

```sh
pnpm check
```

| Comando          | Finalidade                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| `pnpm dev`       | Executar backend e frontend em paralelo.                                |
| `pnpm seed`      | Gerar dados de demonstração no banco local.                             |
| `pnpm typecheck` | Verificar tipos TypeScript nos pacotes.                                 |
| `pnpm test`      | Executar as suítes automatizadas dos pacotes.                           |
| `pnpm build`     | Compilar backend e gerar o pacote estático do frontend.                 |
| `pnpm check`     | Executar verificação de formatação, tipos, testes e build, nesta ordem. |

O seed inclui etiquetas Trabalho, Pessoal e Estudos e quatro tarefas nos dias próximos à primeira execução. IDs fixos e `INSERT OR IGNORE` evitam duplicação. Executá-lo novamente preserva registros existentes e não move tarefas antigas automaticamente para a data atual. Ele não é um comando de limpeza do banco.

### Cenários de teste escritos

O frontend usa Vitest em dois arquivos: `apps/web/src/lib/calendar.test.ts` para cálculos temporais e `apps/web/src/lib/api.test.ts` para o contrato do cliente HTTP. São verificados meses curtos e bissextos, intervalos semiabertos, tarefas que atravessam a meia-noite, virada do ano, conversão de horário local e respostas de erro. As exclusões têm um teste de regressão: uma requisição sem corpo não envia Content-Type JSON, e uma resposta 204 não é interpretada como JSON.

`apps/api/test/api.test.ts` utiliza `node:test` e `Fastify.inject`. Os testes exercitam as rotas, a validação e SQLite em conjunto, cobrindo:

- CRUD de tarefa, normalização para UTC e preservação da data de criação ao editar.
- Alteração de etiquetas e exclusão de vínculos sem apagar tarefas.
- Nome de etiqueta duplicado com variação de caixa ou representação Unicode.
- Sobreposição de períodos, passagem pela meia-noite e fronteiras exatas.
- Filtro por várias etiquetas com OU e pesquisa literal somente no título.
- Rejeição de etiqueta inexistente sem gravar alteração parcial.
- Duração, datas, tamanhos de campos, IDs, campos extras e etiquetas repetidas inválidos.
- Erros estruturados, recurso inexistente, JSON malformado e corpo excessivo.
- Healthcheck, cabeçalhos de segurança e origem CORS configurada.
- Persistência após fechar e reabrir o banco em disco, sem reaplicar a migração.
- Feriados nacionais, descarte de itens estaduais/opcionais e expiração do cache.
- Falha de rede, HTTP inválido e resposta incompatível do provedor de feriados.
- Compartilhamento de uma consulta externa entre requisições simultâneas.

Os testes de feriados usam um provedor injetado e um relógio controlado. Isso torna os cenários previsíveis sem depender de uma consulta real ao Nager.Date. A aplicação normal usa `fetch` e o relógio real. Não confunda os testes automatizados da integração com a comprovação da disponibilidade atual do serviço externo.

O workflow de CI instala dependências com `--frozen-lockfile` e executa `pnpm check` no Node 24. A existência do workflow não comprova que uma execução remota passou; consulte a aba Actions no GitHub para ver o resultado real.

Typecheck identifica inconsistências estáticas; testes verificam comportamentos cobertos por cenários específicos; build verifica a geração dos artefatos. Nenhuma dessas etapas substitui uma demonstração manual no navegador. A cobertura deve ser descrita pelo que os testes exercitam, não por uma promessa de ausência de bugs.

## 11. O que evoluiria depois

Sem implementar o escopo sênior, é possível reconhecer os próximos problemas técnicos:

- Autenticação e autorização antes de disponibilizar dados pessoais em uma instância pública.
- PostgreSQL, acesso assíncrono e migrações para operação compartilhada com maior carga.
- Testes end to end executados contra o navegador e a API completos.
- Observabilidade, backups e estratégia de implantação.
- Geração automática de tipos do contrato caso a API cresça.
- Melhorias no produto que sejam efetivamente pedidas, como recorrência e configuração explícita de fuso.

Esses itens são possibilidades futuras, não funcionalidades entregues. Na apresentação, diferencie uma decisão do projeto, uma limitação conhecida e uma evolução que ainda precisaria ser desenvolvida.
