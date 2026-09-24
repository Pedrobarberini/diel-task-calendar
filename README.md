# Diel · Calendário de tarefas

[Acessar calendário online](https://pedrobarberini.github.io/diel-task-calendar/) · [Repositório](https://github.com/Pedrobarberini/diel-task-calendar)

Calendário React + TypeScript do desafio Diel, com requisitos júnior/pleno e uma evolução solicitada posteriormente: publicação no GitHub Pages, login pelo Google e e-mail/senha com Firebase, e dados privados por usuário no Firestore. Interface em português e commits em inglês. Dashboard e gráficos do escopo sênior continuam fora da entrega.

## Versão online

Abra o link, escolha **Continuar com o Google** ou **Criar conta**. A aplicação oferece recuperação de senha, mantém a sessão após recarregar e permite sair. Cada conta começa com o calendário vazio. As tarefas ficam na nuvem e podem ser acessadas em outro dispositivo com a mesma conta.

Funcionalidades: criar/editar/excluir tarefas, título/descrição/data/hora/duração, várias tags coloridas, cadastro/edição/exclusão de tags, filtros por título e tags (OU), visões dia/semana/mês, navegação e feriados nacionais brasileiros via Nager.Date. Layout responsivo, confirmações de exclusão e tratamento de erros.

## Executar localmente

Requisitos: Node.js 24.x e pnpm 11.19.0 (`npm install --global pnpm@11.19.0`).

```bash
git clone https://github.com/Pedrobarberini/diel-task-calendar.git
cd diel-task-calendar
pnpm install --frozen-lockfile
pnpm --filter @diel/web dev
```

Abra **http://localhost:5173** para testar o login (localhost é um domínio autorizado). Por padrão, o frontend usa o mesmo Firebase da versão online, portanto grava dados reais da conta autenticada. Não é preciso executar a API local. A configuração pública Web está em `apps/web/src/lib/firebase.ts`; não contém credenciais administrativas. Para usar outro projeto, copie `apps/web/.env.example` para `.env.local` no mesmo diretório e preencha **todas** as quatro variáveis Firebase.

## Versão REST original do desafio

A implementação Fastify + SQLite foi preservada para demonstrar os requisitos originais de frontend/backend independentes e API REST. Ela é um perfil **local, sem autenticação**, separado do Firebase.

1. Crie `apps/web/.env.local` com `VITE_DATA_MODE=rest`.
2. Execute `pnpm seed` (opcional, exemplos SQLite) e `pnpm dev`.
3. Abra http://127.0.0.1:5173. A API responde em http://127.0.0.1:3001/api/health.

O seed não grava no Firebase. Não há migração automática entre SQLite e Firestore. Remova `VITE_DATA_MODE=rest` para voltar ao perfil online. O GitHub Pages sempre utiliza Firebase; ele hospeda arquivos estáticos e não executa o servidor Fastify.

## Entender e apresentar o código

- [Firebase, publicação e roteiro da versão online](docs/FIREBASE_E_PUBLICACAO.md): tudo que mudou nesta evolução, operação, modelo de dados e limites.
- [Apresentação do desafio original](docs/APRESENTACAO.md): demonstração dos fluxos e perguntas técnicas sobre REST/SQLite.
- [Arquitetura original](docs/ARQUITETURA.md): API, banco relacional, datas e decisões.
- [Referência da API REST](docs/API.md): endpoints, payloads e erros do perfil local.
- [Registro da implementação original](docs/IMPLEMENTACAO.md): decisões e evidências da primeira entrega.

## Qualidade e publicação

| Comando                       | Finalidade                                               |
| ----------------------------- | -------------------------------------------------------- |
| `pnpm check`                  | Formatação, tipos, 40 testes e build das duas aplicações |
| `pnpm test`                   | Testes de API, datas, filtros, validação e cliente HTTP  |
| `pnpm format`                 | Formatar código e documentação                           |
| `pnpm --filter @diel/web dev` | Frontend conectado ao Firebase                           |
| `pnpm dev`                    | Frontend e API local em paralelo                         |
| `pnpm seed`                   | Exemplos no SQLite local                                 |
| `pnpm build`                  | Build do frontend e backend                              |

O workflow `CI` verifica pushes e pull requests. `Deploy GitHub Pages` verifica o código e executa mais **5 testes de regras Firestore no emulador** antes de publicar pushes na `main`. O deploy usa o caminho `/diel-task-calendar/`. Regras do banco são publicadas separadamente; alterar um arquivo de regras no GitHub não modifica o Firebase automaticamente.

```text
apps/api/                    API REST original, SQLite e testes
apps/web/src/components/     Login e componentes do calendário
apps/web/src/lib/api.ts       Adaptador Firestore e seleção do perfil REST
apps/web/src/lib/firebase.ts  Inicialização dos SDKs
apps/web/src/lib/rest-api.ts  Cliente HTTP original
apps/web/tests/               Testes de regras Firestore
firestore.rules              Autorização por UID e validação dos documentos
firebase.json                Regras, índices e configuração do emulador
.github/workflows/           CI e publicação no Pages
docs/                        Guias de implementação e apresentação
```
