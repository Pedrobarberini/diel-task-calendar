> **Documento da entrega REST/SQLite original.** Esse perfil continua disponível localmente com VITE_DATA_MODE=rest. A versão online atual usa Firebase, login e GitHub Pages; veja [Firebase e publicação](FIREBASE_E_PUBLICACAO.md) e o [README](../README.md). As menções abaixo à ausência de autenticação e aos dados SQLite se referem ao perfil original.

# Registro da implementação

Este documento reúne o trabalho realizado para o desafio. Para entender as decisões em profundidade, leia [ARQUITETURA.md](ARQUITETURA.md); para ensaiar a demonstração, use [APRESENTACAO.md](APRESENTACAO.md).

## Leitura do desafio e recorte

O PDF original foi lido nas três páginas. Os requisitos foram separados entre funcionalidades gerais, nível pleno e nível sênior. A implementação cobre as funcionalidades gerais e o nível pleno. O PDF original não é necessário para executar o projeto e não foi incluído no repositório público.

A instrução de entrega por e-mail existente no PDF é uma orientação do documento do processo seletivo; não foi interpretada como autorização para enviar mensagens em nome do candidato. A entrega desta tarefa é o código no GitHub e sua documentação.

## Estrutura e ferramentas

1. Criado um workspace pnpm com dois pacotes: `apps/api` e `apps/web`.
2. Configurados Node 24, TypeScript estrito, scripts locais e builds independentes.
3. Adicionados `.editorconfig`, `.gitattributes`, `.nvmrc` e `.gitignore`.
4. Excluídos do versionamento dependências instaladas, builds, banco local, logs, arquivos temporários e segredos de ambiente.
5. Configurada autoria Git somente neste repositório, com o e-mail noreply da conta GitHub.
6. Escritas mensagens de commit em inglês.
7. Adicionado um workflow GitHub Actions para instalar a partir do lockfile e verificar tipos, testes e build.

## Backend

- API REST em Fastify, com inicialização separada da fábrica da aplicação usada nos testes.
- Rotas de criação, listagem, alteração e exclusão de tarefas e etiquetas.
- Validação de campos, UUIDs, datas, duração, cores, tamanho de textos, quantidade de etiquetas e parâmetros de busca com Zod.
- Respostas padronizadas com códigos HTTP e mensagens de erro; exclusões retornam `204` sem JSON.
- SQLite em disco por meio de `node:sqlite`, criação automática do diretório e migração inicial versionada.
- Tabelas `tasks`, `tags` e `task_tags`, com chaves estrangeiras, índices e exclusões em cascata dos vínculos.
- UUIDs para novos registros e timestamps de criação/alteração.
- Transações para gravar a tarefa e seus vínculos de forma atômica.
- Nome de etiqueta único com normalização Unicode e comparação sem diferença de caixa.
- Filtro de tarefas por sobreposição temporal, título e uma ou mais etiquetas.
- Busca literal no título; as categorias de filtro são combinadas com E e as etiquetas entre si com OU.
- Consultas SQL com parâmetros e busca dos vínculos restrita ao período e etiquetas selecionados.
- Limite de 64 KiB para o corpo das requisições, cabeçalhos de segurança, origem CORS configurável e escuta local por padrão.
- Encerramento do servidor e do banco ao receber sinais de interrupção.
- Seed opcional com três etiquetas e quatro tarefas próximas à data da primeira execução, sem substituir registros existentes.

## Frontend

- SPA React em português, com componentes reutilizáveis, cliente HTTP e hook de carregamento.
- Calendário mensal, semanal e diário; navegação anterior/próximo, retorno a Hoje e seleção por calendário compacto.
- Formulários de tarefa com título, descrição, data, horário, duração e seleção de etiquetas.
- Edição por clique no cartão e confirmação para excluir.
- Gerenciador de etiquetas com criação, edição, exclusão, paleta e seletor livre de cor.
- Filtros por título e múltiplas etiquetas, com ações para limpar busca e seleção.
- Requisições com cancelamento de resultados antigos e espera de 300 ms na digitação da busca.
- Estados de carregamento, mensagens de sucesso, tratamento de erros e tentativa novamente.
- Diálogos nativos com rótulos acessíveis, bloqueio de ações enquanto há gravação e navegação por teclado.
- Layout adaptável, menu lateral em telas pequenas e organização por cartões.
- Conversão dos horários locais para UTC ao salvar e exibição no fuso do navegador.
- Tarefas que atravessam dias reaparecem nos dias correspondentes; a virada de mês respeita o último dia válido.

## Feriados

- Integração real do backend com o endpoint REST Nager.Date para o Brasil.
- Consulta por ano, validação do JSON recebido e adaptação para o contrato usado pela interface.
- Filtragem por feriado nacional (`global`) e tipo público (`Public`), sem tratar registros apenas bancários/opcionais como feriados nacionais.
- Timeout de cinco segundos, cache em memória por 24 horas e compartilhamento de chamadas simultâneas para o mesmo ano.
- Consulta de ambos os anos quando o período visível atravessa dezembro/janeiro.
- Datas civis sem conversão UTC para evitar deslocamento do feriado para o dia anterior.
- Nome e destaque de feriados no calendário, inclusive em dias sem tarefas.
- Falha externa exibida separadamente; o gerenciamento de tarefas permanece disponível.

## Documentação produzida

| Arquivo                 | O que explica                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `README.md`             | Instalação, comandos, requisitos atendidos, configurações e limitações                          |
| `docs/API.md`           | Endpoints, validações, filtros, payloads, erros e exemplo em PowerShell                         |
| `docs/ARQUITETURA.md`   | Estrutura dos arquivos, fluxo de dados, banco, transações, datas, segurança e escolhas técnicas |
| `docs/APRESENTACAO.md`  | Roteiro de 8–10 minutos, demonstração, perguntas e exercícios para estudar                      |
| `docs/IMPLEMENTACAO.md` | Este inventário do trabalho e o registro de validação                                           |

## O que ficou fora

Não foram implementados login, cadastro de usuários, autenticação nem os dashboards do nível sênior. Também não há recorrência, notificações, integração com agendas, compartilhamento entre usuários, bloqueio de conflitos de horário, infraestrutura de produção ou testes automatizados completos de navegador.

O repositório público contém o código. Isso não hospeda automaticamente uma aplicação com banco na internet. O uso demonstrado é local, conforme os comandos do README.

## Validação realizada

Validação local em Windows, com Node 24 e pnpm 11:

- Verificação estática TypeScript nas duas aplicações.
- 13 testes de integração da API, incluindo persistência, transações, validação, filtros e tratamento do provedor externo.
- 15 testes das regras de calendário e datas no frontend.
- 4 testes do contrato HTTP do frontend, incluindo a regressão das exclusões sem corpo.
- Build da API e geração do pacote estático da SPA.
- Auditoria de dependências de produção e desenvolvimento: nenhuma vulnerabilidade conhecida na consulta realizada.
- Teste real de acesso à Nager.Date e conferência visual de Independência, Natal e Confraternização Universal, incluindo a grade que cruza dezembro/janeiro.
- Teste manual no navegador de criação, edição, persistência após recarregar, filtro por título, seleção de duas etiquetas e tarefa atravessando a meia-noite.
- Teste manual de criação/edição/exclusão de etiqueta e preservação da tarefa associada.
- Teste manual da exclusão de tarefa, com confirmação.
- Verificação visual em 1440 × 1000 e 390 × 844; no celular, o documento não apresentou transbordamento horizontal, e as grades largas possuem rolagem interna.
- Abertura do menu no celular, foco inicial no título e fechamento do formulário por Escape.
- Consulta ao registro de erros do navegador ao final da verificação: nenhum erro capturado.

Os registros temporários criados para esses testes foram removidos. O banco local contém apenas os exemplos do seed. O banco não é enviado ao GitHub.

### Correção encontrada pela integração real

O primeiro teste de exclusão no navegador encontrou um defeito: o cliente enviava `Content-Type: application/json` mesmo nas requisições `DELETE` sem corpo. O Fastify retornava `400` ao tentar interpretar um corpo JSON vazio. Os testes de API, que enviavam a exclusão sem esse cabeçalho, não detectavam a diferença.

A correção faz o cliente enviar o cabeçalho apenas quando existe corpo. Foram adicionados testes de regressão do cliente HTTP, e as exclusões de tarefa e etiqueta foram repetidas com sucesso pela interface. Isso é um exemplo concreto para explicar por que testes de camadas isoladas precisam ser complementados por validação da integração.

### Limites das evidências

Os testes automatizados não são uma suíte completa de navegador. A verificação de layout foi manual nas dimensões registradas, sem alegar certificação de acessibilidade ou compatibilidade com todos os navegadores. A auditoria reflete os avisos conhecidos no momento da consulta. Disponibilidade e classificação dos feriados dependem do provedor externo.

## Entrega no GitHub e histórico

Repositório público: [Pedrobarberini/diel-task-calendar](https://github.com/Pedrobarberini/diel-task-calendar), com código na branch principal `main`.

O trabalho foi organizado em commits com mensagens em inglês:

1. `chore: initialize isolated TypeScript workspace` — configuração inicial do workspace.
2. `feat(api): add persistent tasks tags and national holidays` — API, persistência e testes de integração.
3. `feat(web): implement responsive calendar and task workflows` — interface, calendário, formulários, filtros, regras de data e testes do cliente HTTP.
4. `chore: add reproducible quality checks and continuous integration` — formatação, dependências fixadas no lockfile e pipeline.
5. `docs: explain implementation architecture and presentation guide` — documentação completa em português para execução e apresentação.

O comando de preview do build também foi verificado: a página respondeu HTTP 200 e a rota `/api/health` respondeu `status: ok` por meio do proxy local. Isso confirma o procedimento de demonstração documentado no README.

O workflow é executado a cada push. Consulte o resultado associado ao commit desejado na [aba Actions](https://github.com/Pedrobarberini/diel-task-calendar/actions); o histórico de execução é a evidência do estado remoto.
