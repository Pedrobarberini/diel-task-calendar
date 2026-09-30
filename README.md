# Diel · Calendário de tarefas

[Acessar o site](https://pedrobarberini.github.io/diel-task-calendar/)

Calendário desenvolvido para os requisitos júnior e pleno do desafio Diel. Permite criar, editar e excluir tarefas e tags, alternar entre dia, semana e mês, buscar pelo título e visualizar feriados nacionais brasileiros. Login com Google ou e-mail/senha e publicação online são os recursos adicionais. Não há dashboard nem gráficos do escopo sênior.

## Organização

```text
apps/
  api/                  API REST local com Fastify e SQLite
    src/
      server.ts         Inicia o servidor
      app.ts            Rotas HTTP e respostas de erro
      database.ts       Cria as tabelas e executa as consultas SQL
      validation.ts     Valida os dados recebidos com Zod
      holidays.ts       Consulta os feriados na API Nager.Date
      seed.ts           Insere dados de exemplo no banco local
    test/               Testes da API
  web/                  Interface com React, TypeScript e Vite
    src/
      main.tsx          Inicia o React
      App.tsx           Sessão, carregamento dos dados e montagem da tela
      components/
        Login.tsx       Login, cadastro e recuperação de senha
        Calendar.tsx    Calendário, navegação, busca e filtros
        TaskForm.tsx    Cadastro, edição e exclusão de tarefas
        TagsForm.tsx    Cadastro, edição e exclusão de tags
      lib/
        api.ts          Operações de dados no Firebase ou na API REST
        firebase.ts     Configuração pública do Firebase
        calendar.ts     Cálculos e formatação de datas
        errors.ts       Mensagens de erro para o usuário
      types.ts          Tipos de tarefa, tag e feriado
      styles.css        Estilos e ajustes para telas menores
    tests/              Testes de autenticação e regras do Firebase
firestore.rules         Controle de acesso aos dados online
.github/workflows/      Validação e publicação automática
```

Os arquivos de configuração na raiz definem dependências, formatação, versão do Node e integração com Firebase. `node_modules` contém bibliotecas instaladas; não faz parte do código nem é enviado ao GitHub.

## Como os dados são armazenados

**Site online:** React → Firebase Authentication + Firestore. Cada usuário acessa somente seus próprios documentos em `users/{uid}/tasks` e `users/{uid}/tags`, conforme as regras do Firestore. A sessão permanece ativa até o logout. A configuração Web do Firebase é pública e não concede acesso administrativo.

**Modo REST local:** React → Fastify → SQLite. As tabelas `tasks`, `tags` e `task_tags` representam as tarefas, as tags e a relação entre elas. As consultas usam parâmetros, e a gravação de tarefas e vínculos ocorre em uma transação. Esse modo não possui autenticação e foi mantido para demonstrar o backend REST do desafio.

O GitHub Pages hospeda apenas o frontend. O site publicado usa Firebase; o servidor Fastify é executado localmente. Os dois bancos são independentes.

## Executar com Firebase

Requisitos: **Node.js 24.x** e **pnpm 11.19.0**.

```bash
git clone https://github.com/Pedrobarberini/diel-task-calendar.git
cd diel-task-calendar
pnpm install --frozen-lockfile
pnpm dev
```

Abra **http://localhost:5173**. Por padrão, o desenvolvimento usa o mesmo Firebase do site, com os dados da conta autenticada.

Para usar outro Firebase, registre um aplicativo Web, habilite os provedores Google e e-mail/senha, crie o Firestore e publique `firestore.rules`. Autorize os domínios do site e de desenvolvimento no Authentication. Depois copie `apps/web/.env.example` para `apps/web/.env.local` e preencha as quatro variáveis `VITE_FIREBASE_*`.

## Executar com API REST e SQLite

Após instalar as dependências, abra dois terminais na raiz do projeto:

```bash
# Terminal 1: backend
pnpm dev:api

# Terminal 2: frontend no modo REST
pnpm dev:rest
```

Abra **http://127.0.0.1:5173**. A API responde em **http://127.0.0.1:3001/api/health** e o banco fica em `apps/api/data/diel.sqlite`, ignorado pelo Git. O comando opcional `pnpm seed` adiciona exemplos somente ao SQLite.

| Método       | Rota                  | Operação                                            |
| ------------ | --------------------- | --------------------------------------------------- |
| GET          | `/api/tasks`          | Listar tarefas; aceita `q`, `from`, `to` e `tagIds` |
| POST         | `/api/tasks`          | Criar tarefa                                        |
| PUT / DELETE | `/api/tasks/:id`      | Editar / excluir tarefa                             |
| GET / POST   | `/api/tags`           | Listar / criar tags                                 |
| PUT / DELETE | `/api/tags/:id`       | Editar / excluir tag                                |
| GET          | `/api/holidays/:year` | Consultar feriados nacionais                        |

## Regras e escolhas

- Uma tarefa tem título, descrição, data/hora inicial, duração em minutos e até 20 tags. A duração aceita valores inteiros de 1 minuto a 7 dias.
- O calendário mostra tarefas que atravessam a meia-noite em todos os dias correspondentes. Os horários seguem o fuso do dispositivo.
- Busca e filtros são aplicados na interface. Selecionar várias tags encontra tarefas com **qualquer uma** delas. Excluir uma tag preserva as tarefas.
- O SQLite impede nomes de tags repetidos. No Firestore, as tags são identificadas pelo ID; referências a tags excluídas são ignoradas na leitura. O campo `nameKey` é mantido para compatibilidade com as regras já publicadas.
- Feriados vêm da API Nager.Date, com cache de 24 horas e timeout de 5 segundos. Uma falha nessa consulta não impede o uso das tarefas.
- Para manter o código simples, todas as tarefas da conta são carregadas de uma vez, sem paginação ou sincronização em tempo real. O botão **Atualizar** busca alterações feitas em outro dispositivo.

## Verificação e publicação

```bash
pnpm check
```

Esse comando verifica formatação, TypeScript, testes e build. Os testes cobrem CRUD, validação, filtros, cálculos de datas e comunicação HTTP. O GitHub Actions também testa autenticação e regras de acesso com os emuladores Firebase e publica o frontend no GitHub Pages quando há alterações na branch `main`.
