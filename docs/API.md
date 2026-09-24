> **Documento da entrega REST/SQLite original.** Esse perfil continua disponível localmente com VITE_DATA_MODE=rest. A versão online atual usa Firebase, login e GitHub Pages; veja [Firebase e publicação](FIREBASE_E_PUBLICACAO.md) e o [README](../README.md). As menções abaixo à ausência de autenticação e aos dados SQLite se referem ao perfil original.

# Referência da API REST

Base local: `http://127.0.0.1:3001/api`. Requisições com corpo JSON (`POST` e `PUT`) usam `Content-Type: application/json`. `GET` e `DELETE` não enviam esse cabeçalho nem corpo. A API não exige autenticação, conforme o recorte até pleno.

## Endpoints

| Método | Rota              | Resultado                   |
| ------ | ----------------- | --------------------------- |
| GET    | `/health`         | `200 { "status": "ok" }`    |
| GET    | `/tasks`          | `200 { "data": Task[] }`    |
| POST   | `/tasks`          | `201 { "data": Task }`      |
| PUT    | `/tasks/:id`      | `200 { "data": Task }`      |
| DELETE | `/tasks/:id`      | `204`, sem corpo            |
| GET    | `/tags`           | `200 { "data": Tag[] }`     |
| POST   | `/tags`           | `201 { "data": Tag }`       |
| PUT    | `/tags/:id`       | `200 { "data": Tag }`       |
| DELETE | `/tags/:id`       | `204`, sem corpo            |
| GET    | `/holidays/:year` | `200 { "data": Holiday[] }` |

## Tarefas

Exemplo de criação, sem tags:

```json
{
  "title": "Apresentar o desafio Diel",
  "description": "Demonstrar o calendário e explicar as decisões técnicas.",
  "startsAt": "2026-09-22T14:00:00-03:00",
  "durationMinutes": 60,
  "tagIds": []
}
```

Use `POST /tasks` para criar e `PUT /tasks/ID` para editar. O `PUT` recebe os campos do formulário completo; `description` e `tagIds`, quando omitidos, tornam-se `""` e `[]`. Não é um PATCH parcial.

| Campo             | Validação                                                |
| ----------------- | -------------------------------------------------------- |
| `title`           | Texto, 1–160 caracteres após trim                        |
| `description`     | Texto, até 5.000 caracteres; padrão vazio                |
| `startsAt`        | Data/hora ISO 8601 com offset ou Z; normalizada para UTC |
| `durationMinutes` | Inteiro de 1 a 10.080 (7 dias)                           |
| `tagIds`          | Até 20 UUIDs distintos de tags existentes; padrão vazio  |

Campos não previstos são rejeitados. `id`, `createdAt` e `updatedAt` são gerados no backend.

Exemplo de resposta (IDs meramente ilustrativos):

```json
{
  "data": {
    "id": "7daff600-b651-4d7d-bd4b-5d0c91285643",
    "title": "Apresentar o desafio Diel",
    "description": "Demonstrar o calendário e explicar as decisões técnicas.",
    "startsAt": "2026-09-22T17:00:00.000Z",
    "durationMinutes": 60,
    "tags": [],
    "createdAt": "2026-09-22T12:00:00.000Z",
    "updatedAt": "2026-09-22T12:00:00.000Z"
  }
}
```

## Filtros

`GET /tasks` aceita parâmetros opcionais:

- `from`: início do intervalo em ISO com fuso.
- `to`: fim exclusivo do intervalo em ISO com fuso; deve ser posterior a `from`.
- `q`: até 160 caracteres; pesquisa textual no título, sem distinguir maiúsculas/minúsculas.
- `tagIds`: UUIDs separados por vírgula, até 20; semântica OU.

Os grupos de filtros são combinados com **E**: período **E** título **E** uma das tags selecionadas. O frontend sempre envia o período visível. Sem `from`/`to`, a API lista todas as tarefas correspondentes; não há paginação neste escopo.

O filtro de período verifica **sobreposição**, usando `inícioDaTarefa < to && fimDaTarefa > from`. Uma tarefa que termina exatamente no começo do período não aparece nele. Tarefas que atravessam a meia-noite aparecem em todos os dias atravessados.

Exemplo sem problemas de codificação do sinal `+`, usando UTC:

```text
GET /api/tasks?from=2026-09-22T03%3A00%3A00Z&to=2026-09-23T03%3A00%3A00Z&q=Apresentar
```

Ao montar parâmetros, use `URLSearchParams`, como faz o cliente da SPA.

## Tags

Criação e edição:

```json
{
  "name": "Trabalho",
  "color": "#2563eb"
}
```

`name` aceita 1–40 caracteres após trim; `color` exige seis dígitos hexadecimais. O nome é único após normalização Unicode e conversão para minúsculas em português. `Trabalho` e `TRABALHO` representam o mesmo nome. A resposta inclui `id`, `name` e `color`.

Crie a tag primeiro e use o UUID retornado em `tagIds` nas tarefas. Ao excluir uma tag, apenas seus vínculos são removidos; as tarefas continuam existindo.

## Feriados

`GET /holidays/2026` consulta a Nager.Date para o Brasil. São aceitos anos entre 1900 e 2100, sujeitos à disponibilidade do provedor.

```json
{
  "data": [
    {
      "date": "2026-01-01",
      "localName": "Confraternização Universal",
      "name": "New Year's Day",
      "countryCode": "BR",
      "global": true
    }
  ]
}
```

A lista inclui apenas registros nacionais (`global: true`) do tipo `Public`. Datas opcionais, bancárias e regionais não são incluídas apenas por aparecerem na resposta do provedor. `date` representa uma data civil, sem fuso.

O serviço usa timeout de 5 segundos, cache em memória por ano por 24 horas e reaproveitamento de requisições simultâneas. Falhas e respostas inválidas retornam `503`; a SPA mostra um aviso separado sem bloquear o CRUD de tarefas. O cache não é persistente nem compartilhado entre processos.

## Erros

Formato padronizado:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Confira os dados informados.",
    "details": [{ "field": "title", "message": "Mensagem de validação do campo" }]
  }
}
```

| HTTP | Exemplo                                                             |
| ---- | ------------------------------------------------------------------- |
| 400  | Corpo inválido, UUID inválido, período invertido ou tag inexistente |
| 404  | Tarefa, tag ou rota inexistente                                     |
| 409  | Nome de tag duplicado                                               |
| 413  | Corpo acima do limite de 64 KiB                                     |
| 500  | Erro inesperado; resposta não expõe stack trace                     |
| 503  | Falha no serviço externo de feriados                                |

As mensagens principais são em português; detalhes técnicos de validação podem vir do Zod em inglês.

## Teste rápido pelo PowerShell

Com `pnpm dev` em execução:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/health

$taskBody = @{
  title = 'Revisar arquitetura'
  description = 'Explicar o fluxo do formulario ate o SQLite'
  startsAt = (Get-Date).ToUniversalTime().ToString('o')
  durationMinutes = 30
  tagIds = @()
} | ConvertTo-Json

$created = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3001/api/tasks -ContentType 'application/json' -Body $taskBody
$created.data
Invoke-RestMethod http://127.0.0.1:3001/api/tasks
```

Isso cria uma tarefa real no seu banco local. Para excluí-la, use o botão de exclusão da SPA ou `DELETE /tasks/ID`.
