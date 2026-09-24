> **Documento da entrega REST/SQLite original.** Esse perfil continua disponível localmente com VITE_DATA_MODE=rest. A versão online atual usa Firebase, login e GitHub Pages; veja [Firebase e publicação](FIREBASE_E_PUBLICACAO.md) e o [README](../README.md). As menções abaixo à ausência de autenticação e aos dados SQLite se referem ao perfil original.

# Guia para apresentar o projeto à Diel

Este roteiro prepara uma apresentação de 8 a 10 minutos e uma conversa técnica sobre o código. Leia junto com [ARQUITETURA.md](./ARQUITETURA.md) e com o código-fonte. O objetivo é conseguir demonstrar e explicar cada decisão com suas próprias palavras.

## 1. O que foi entregue

Foi construído um calendário de tarefas correspondente ao escopo júnior e pleno do desafio: CRUD de tarefas, visualizações diária/semanal/mensal, pesquisa por título, CRUD de etiquetas, várias etiquetas por tarefa, filtro por uma ou mais etiquetas e feriados nacionais brasileiros obtidos por API REST.

O repositório contém frontend React, backend Fastify, persistência SQLite, validação dos dados, testes automatizados, dados de demonstração, comandos de desenvolvimento/build e um workflow de CI. Os detalhes da arquitetura estão no documento complementar.

Autenticação, dashboard e demais funcionalidades exclusivas do nível sênior não fazem parte da entrega. Também não existem recorrência, notificações ou integração com agendas de terceiros. Não apresente uma proposta de evolução como algo que já está funcionando.

## 2. Prepare a demonstração antes da reunião

1. Leia o README e use Node 24 com o pnpm indicado no projeto.
2. Na raiz do repositório, execute `pnpm install`.
3. Execute `pnpm seed` para preparar exemplos e `pnpm dev` para iniciar os dois serviços.
4. Abra no navegador o endereço informado pelo Vite.
5. Execute `pnpm check` em outro terminal e confira a saída completa.
6. Experimente o roteiro abaixo uma vez, incluindo criação, edição, exclusão e filtros.
7. Confira se os feriados carregam com a sua conexão. Uma falha externa deve ser relatada como tal.
8. Deixe o editor aberto nas partes principais e a aba Actions do GitHub disponível, se houver uma execução concluída.

Evite iniciar a apresentação com a instalação das dependências. Tenha a aplicação aberta, mas saiba reproduzir a instalação se perguntarem. Não use dados pessoais reais na demonstração.

## 3. Roteiro de 8 a 10 minutos

### 0:00–0:45 — Contexto e escopo

Sugestão de fala:

> “Eu implementei um calendário de tarefas cobrindo os requisitos júnior e pleno. A aplicação permite cadastrar e organizar tarefas em três visualizações, pesquisar pelo título, classificar com etiquetas e consultar feriados nacionais. O foco da entrega foi deixar esses fluxos funcionando com persistência e validação no backend.”

Apresente rapidamente os três blocos: frontend React, API Fastify e banco SQLite. Explique que a aplicação roda localmente e que o código está no repositório público.

### 0:45–2:30 — CRUD e persistência

1. Abra a ação de nova tarefa.
2. Use um título identificável, como **Preparar apresentação Diel**.
3. Adicione uma descrição, o início e uma duração de 60 minutos.
4. Selecione duas etiquetas e salve.
5. Mostre a tarefa no calendário e abra-a novamente.
6. Altere o título ou a duração e salve.
7. Recarregue a página e confirme que a alteração continua lá.

Fale sobre o caminho dos dados:

> “O formulário envia JSON à API. A API valida os dados, grava a tarefa e os vínculos de etiquetas em uma transação e retorna o resultado. Quando recarrego a página, os dados vêm novamente do banco, então a informação não depende somente do estado do React.”

Mostre a exclusão com uma tarefa de teste descartável. O botão de confirmar torna explícita a intenção do usuário.

### 2:30–3:30 — Visualizações e navegação

Alterne entre dia, semana e mês. Use a navegação entre períodos e o retorno à data atual. Explique que a visualização determina o período consultado na API.

Se houver tempo, crie uma tarefa de 23h30 com 120 minutos de duração e mostre que ela atravessa a meia-noite. Isso permite demonstrar uma regra técnica concreta: as tarefas são selecionadas pela sobreposição com o período, não apenas pela data em que começam.

### 3:30–4:30 — Etiquetas e filtros combinados

1. Crie uma etiqueta com nome e cor.
2. Altere o nome ou a cor e mostre a atualização.
3. Digite parte do título de uma tarefa na pesquisa.
4. Selecione duas etiquetas no filtro.
5. Explique que a tarefa aparece se tiver pelo menos uma das etiquetas selecionadas.
6. Limpe os filtros e mostre todas as tarefas do período novamente.

Uma explicação curta e precisa:

> “A busca por título e o filtro de etiquetas são combinados. Dentro da lista de etiquetas, usei OU: selecionar Trabalho e Pessoal mostra tarefas com qualquer uma delas. As relações são muitos para muitos, por meio de uma tabela de associação.”

Se demonstrar a exclusão de uma etiqueta, use uma etiqueta descartável e mostre que a tarefa continua existindo.

### 4:30–5:15 — Feriados

Navegue para uma data de feriado nacional e aponte sua identificação no calendário.

> “Os feriados vêm do Nager.Date por meio do backend. Uma tarefa representa um instante com horário; um feriado representa uma data civil. Por isso, o tratamento de datas é diferente para evitar que um feriado apareça no dia anterior por causa da conversão de fuso.”

Se o serviço estiver indisponível durante a apresentação, mostre o estado de erro e continue demonstrando tarefas. Não diga que o dado é local nem que a API externa está disponível sem verificar.

### 5:15–7:00 — Passeio pelo código

Abra o código seguindo a mesma direção dos dados:

1. O componente que coordena a tela e o estado dos filtros.
2. O formulário de tarefa e a conversão da data local.
3. O cliente HTTP do frontend.
4. A rota de gravação no Fastify.
5. O schema Zod em `apps/api/src/validation.ts`.
6. A operação no banco e a tabela de associação.
7. Um teste de sobreposição de períodos ou de etiquetas.

Evite ler arquivos inteiros em voz alta. Escolha uma operação e explique as entradas, a transformação, a gravação e a resposta. O mapa de arquivos no documento de arquitetura ajuda a encontrar cada parte.

### 7:00–8:30 — Validação, qualidade e limites

Mostre a saída real de `pnpm check` e explique o que é verificado: tipos, testes e build. Se o workflow remoto estiver concluído com sucesso, mostre a execução no GitHub Actions.

Explique três decisões com seus custos:

- SQLite simplifica o ambiente, mas o acesso síncrono e a concorrência de escrita limitam a escala.
- Datas de tarefas são normalizadas para UTC e exibidas no fuso do navegador, sem configuração individual de fuso.
- Frontend e backend são pacotes independentes, mas o contrato deve ser mantido coerente nos dois lados.

Finalize a parte técnica reconhecendo o limite mais importante: a API não possui autenticação. Uma instância exposta na internet precisaria de controle de acesso antes de armazenar dados reais de usuários.

### 8:30–10:00 — Perguntas ou aprofundamento

Deixe tempo para a empresa escolher uma parte do código. Se pedirem algo fora do escopo, separe a regra atual da proposta de evolução. Use exemplos concretos em vez de afirmar apenas que uma arquitetura “escala” ou segue “boas práticas”.

## 4. Perguntas que você deve conseguir responder

### Por que usar um backend se seria possível guardar no localStorage?

O desafio pede uma solução com persistência e operações de dados. O backend centraliza validação e acesso ao banco. O localStorage ficaria restrito ao navegador e não forneceria a mesma fronteira de validação. Aqui os dados persistem em SQLite, independentemente do estado da página.

### Por que Fastify e não outro framework?

Fastify oferece rotas, hooks e tratamento de erros suficientes para esta API com uma estrutura pequena. A escolha reduz o volume de infraestrutura necessário ao desafio. Não significa que outros frameworks seriam inadequados.

### Por que validar com Zod se já existe TypeScript?

TypeScript atua durante o desenvolvimento e compilação. Um cliente externo pode enviar qualquer JSON para uma rota HTTP. Zod verifica os dados que realmente chegam em tempo de execução e recusa os que não atendem ao contrato.

### Por que existe uma tabela `task_tags`?

O relacionamento é muitos para muitos: uma tarefa pode ter várias etiquetas, e uma etiqueta pode aparecer em várias tarefas. A tabela de associação representa esses vínculos, permite filtros relacionais e evita duplicidade com uma chave composta.

### O que acontece se uma etiqueta for removida?

Os vínculos com essa etiqueta são removidos; as tarefas permanecem. Excluir uma classificação não deve excluir o conteúdo que ela classificava.

### Como a aplicação evita salvar metade de uma alteração?

A gravação da tarefa e a atualização de suas etiquetas são uma transação. Ou todas as etapas necessárias terminam e são confirmadas, ou a operação é revertida. Isso é relevante ao editar as etiquetas junto com os demais campos.

### Por que pesquisar pela sobreposição do intervalo?

Filtrar apenas tarefas cujo início está no dia esconderia uma tarefa que começou na noite anterior e continua hoje. A regra `início < fimDoPeríodo && fim > inícioDoPeríodo` inclui as tarefas que ocupam qualquer parte do período.

### O que significa um intervalo semiaberto?

`[início, fim)` inclui o limite inicial e exclui o final. Uma tarefa que termina exatamente às 10h não ocupa o período que começa às 10h. Essa convenção deixa as fronteiras entre períodos consistentes.

### Como a aplicação lida com fusos?

O formulário usa o horário local do navegador. O envio contém um instante ISO com fuso explícito, o backend normaliza para UTC e a interface converte de volta para a apresentação local. O usuário não escolhe um fuso em um perfil, porque não há perfil nem configuração dessa natureza.

### Por que não tratar feriados como as tarefas?

Um feriado tem uma data, sem horário. Converter `YYYY-MM-DD` para meia-noite UTC e exibir no Brasil pode movê-lo para o dia anterior. A aplicação preserva a semântica de data civil para os feriados.

### Como funcionam múltiplas etiquetas no filtro?

A regra é OU entre etiquetas, combinada com E em relação à pesquisa e ao período. Se Trabalho e Pessoal estão selecionadas, a tarefa precisa ter pelo menos uma delas. Não precisa ter ambas.

### É possível ter tarefas simultâneas?

Sim. O projeto não implementa bloqueio de conflitos de agenda. A duração define quanto tempo a tarefa ocupa e em quais períodos aparece. Bloquear sobreposição seria outra regra de produto, que precisaria ser especificada.

### O que acontece se a API de feriados falhar?

A interface deve informar a falha do carregamento de feriados, enquanto as tarefas continuam disponíveis pela API local. O serviço externo é uma dependência separada da persistência de tarefas. Explique também as proteções concretas existentes no serviço de feriados, consultando o código.

### Isso está pronto para produção?

É uma entrega do desafio pronta para execução e avaliação local. Uma operação pública com dados reais exigiria, entre outras decisões, autenticação, autorização, estratégia de implantação, backups e observabilidade. Essas funcionalidades não foram implementadas nem são necessárias para alegar cumprimento do escopo selecionado.

### Como migraria para PostgreSQL?

Manteria o contrato HTTP e substituiria a implementação de persistência, adaptando SQL, conexões e transações. Adicionaria migrações, acesso assíncrono e testes de integração no novo banco. É uma proposta de evolução, não uma migração já preparada e validada.

### O que os testes garantem?

Eles dão evidência sobre os cenários escritos e executados. Não garantem ausência de defeitos, acessibilidade completa ou comportamento em todas as combinações de navegador e fuso. Saiba apontar um teste, a regra que ele verifica e o resultado obtido na sua execução.

## 5. Exercícios para dominar o código antes da apresentação

Faça estes exercícios no seu ambiente de desenvolvimento:

1. Crie uma tarefa, recarregue a página e identifique no código a rota e a operação SQL responsáveis pela persistência.
2. Envie um título vazio ou duração zero por uma ferramenta HTTP e veja a validação do backend recusar o dado.
3. Crie uma tarefa com duas etiquetas e identifique os dois vínculos no modelo relacional.
4. Selecione etiquetas diferentes e explique quais tarefas devem aparecer antes de ver o resultado.
5. Crie uma tarefa que termine à meia-noite e outra que atravesse a meia-noite; explique a diferença no próximo dia.
6. Mude o título de uma etiqueta e observe as tarefas que a utilizam.
7. Exclua uma etiqueta de teste e confirme que as tarefas permanecem.
8. Pare o backend e observe como a interface informa o problema de conexão; depois inicie novamente.
9. Localize um teste de regra temporal e altere temporariamente uma condição para entender por que ele falharia; desfaça sua alteração antes de entregar.
10. Explique, sem abrir o documento, por que um feriado e uma tarefa precisam de tratamentos de data diferentes.

Se não conseguir explicar uma linha, investigue antes da apresentação. Não memorize uma fala que afirma entender algo que ainda não estudou.

## 6. Checklist de revisão

| Item                            | Como conferir                                                     |
| ------------------------------- | ----------------------------------------------------------------- |
| Repositório acessível à empresa | Abrir o link público em uma janela sem login.                     |
| Commits em inglês               | Conferir `git log --oneline`.                                     |
| Instalação documentada          | Seguir o README em um checkout limpo quando possível.             |
| Aplicação local                 | Iniciar com `pnpm dev` e abrir o endereço apresentado.            |
| Tarefas persistidas             | Criar ou alterar e recarregar a página.                           |
| Três visualizações              | Alternar dia, semana e mês.                                       |
| Pesquisa                        | Buscar parte de um título e limpar o campo.                       |
| Etiquetas                       | Criar, editar, vincular, filtrar e excluir uma etiqueta de teste. |
| Feriados                        | Conferir um feriado nacional e o tratamento de erro.              |
| Verificação automatizada        | Ler a saída de `pnpm check`.                                      |
| CI                              | Conferir a execução real no GitHub Actions.                       |
| Conhecimento dos limites        | Explicar ausência de autenticação e escolhas do banco/fuso.       |

## 7. Transparência sobre a construção

O projeto foi desenvolvido com apoio de um assistente de programação. Antes de apresentá-lo como seu trabalho, estude a implementação, execute os fluxos e revise as decisões. Relate apenas o que você efetivamente conferiu.

Uma formulação possível, depois de realmente realizar essa revisão:

> “Usei um assistente de programação na implementação e na documentação. Revisei o código, executei os fluxos principais e consigo explicar as decisões e limitações da solução.”

Não invente uma história de evolução, números de usuários, ganho de desempenho ou incidentes que não ocorreram. Os commits descrevem alterações reais; a documentação explica o estado entregue. Se uma pergunta ultrapassar o que você verificou, diga o que sabe e mostre como investigaria.
