# Arquitetura e contrato

> Este ficheiro é o contrato entre frontend e backend. Quem o mudar avisa a equipa e
> atualiza-o no mesmo commit.

## Visão geral

```
 Browser (frontend/)               Servidor Python (backend/, FastAPI)             Ficheiros
 ┌──────────────┐ POST /api/chat   ┌────────────────────────────────┐  lê   ┌─────────────────────────┐
 │ chat         │ ───────────────▶ │ 1. seguranca.verificar()       │ ◀──── │ agente/*.md, temas.yaml │
 │ cartão fecho │ ◀─────────────── │ 2. contexto = prompts + diário │ ◀──── │ memoria/CONTEXTO.md     │
 │ painel       │ POST /api/fechar │    + padrões + agenda          │ ◀──── │ memoria/INDEX.md        │
 └──────────────┘ POST /api/guardar│ 3. llm (Gemini ou mock)        │       │ memoria/diario/*.md     │
                  GET /api/memoria │ 4. padroes.detetar()           │ ────▶ │ (escreve 2026-W44.md)   │
                                   └────────────────────────────────┘       └─────────────────────────┘
                                                  │ texto da conversa
                                                  ▼
                                           API Gemini (Google)
```

## Fluxo

1. **Abertura:** o frontend chama `POST /api/chat` com `mensagens: []`. O agente cumprimenta e
   retoma as prioridades da semana passada.
2. **Conversa:** o frontend guarda o histórico e envia-o inteiro a cada mensagem (o servidor não guarda estado).
3. **Antes do LLM:** `seguranca.verificar(última mensagem do utilizador)`. Se houver alerta,
   devolve a resposta fixa de `agente/SEGURANCA.md` com `alerta_seguranca: true`, sem chamar o LLM.
4. **Resposta vaga:** se `seguranca.e_vaga()`, acrescenta ao contexto a nota "A última
   resposta foi vaga: faz UMA pergunta de seguimento concreta; não assumas nada."
5. **Fecho:** quando o agente tem as 4 respostas, acaba a mensagem com `<<FECHAR>>`. O servidor
   remove o marcador e devolve `pronto_para_fechar: true`.
6. **`POST /api/fechar`:** LLM com `agente/FECHO.md` → JSON da semana → `padroes.detetar()` sobre
   as semanas anteriores + esta → devolve a semana **ainda por guardar**.
7. A pessoa revê e edita as prioridades → **`POST /api/guardar`** → escreve
   `memoria/diario/AAAA-Www.md` (mesmo formato das semanas anteriores) e acrescenta a linha ao `INDEX.md`.

## API

### `POST /api/chat`

```json
// pedido
{"mensagens": [
  {"role": "assistant", "content": "Olá, Inês. Na semana passada escolheste…"},
  {"role": "user", "content": "Normal."}
]}
// resposta
{"resposta": "Qual das três avançou mais?", "pronto_para_fechar": false, "alerta_seguranca": false}
```

### `POST /api/fechar`

```json
// pedido: igual ao /api/chat
// resposta
{"semana": {
  "semana": "2026-W44",
  "periodo": "2026-10-26 a 2026-11-01",
  "registado_em": "2026-10-30",
  "energia": 3,
  "energia_nota": "Melhor do que a semana passada, dormi melhor.",
  "prioridades_anteriores": [{"texto": "…", "estado": "feito", "nota": ""}],
  "correu_bem": ["…"],
  "aprendizagens": [{"texto": "…", "tema": "preparar-reunioes"}],
  "bloqueios": [{"texto": "…", "tema": "reunioes-excessivas"}],
  "resumo": "…",
  "prioridades": [{"texto": "…", "tema": "entregas"}, {"texto": "…", "tema": "dizer-nao"}, {"texto": "…", "tema": "foco-manha"}],
  "ajuste_habito": "Experimenta …",
  "padroes": [{"tipo": "bloqueio_recorrente", "tema": "reunioes-excessivas",
               "semanas": ["2026-W41", "2026-W43", "2026-W44"],
               "mensagem": "«Reuniões a mais ou sem agenda» aparece como bloqueio em 3 das últimas 4 semanas."}]
}}
```

`estado` ∈ `feito` · `em-parte` · `nao-avancou` · `sem-info`.
`tipo` de padrão ∈ `bloqueio_recorrente` · `aprendizagem_a_consolidar` · `prioridade_que_transita` · `energia_em_queda`.

### `POST /api/guardar`

```json
// pedido
{"semana": { "...": "o objeto devolvido por /api/fechar, com as prioridades editadas" }}
// resposta
{"ficheiro": "memoria/diario/2026-W44.md"}
```

### `GET /api/memoria`

```json
{
  "contexto": "conteúdo de memoria/CONTEXTO.md",
  "semanas": [
    {"semana": "2026-W41", "periodo": "2026-10-05 a 2026-10-11", "energia": 4,
     "resumo": "…", "prioridades": ["…", "…", "…"], "padroes": [], "markdown": "entrada completa"}
  ],
  "padroes": ["…padrões atuais, mesmo formato de cima…"],
  "metricas": {
    "energia": [{"semana": "2026-W41", "valor": 4}, {"semana": "2026-W42", "valor": 3}],
    "prioridades_cumpridas": {"feitas": 3, "parciais": 2, "total": 6}
  }
}
```

`semanas` vem por ordem cronológica (mais antiga primeiro).

### `GET /api/llm` e `POST /api/llm`: ponte do frontend novo

O frontend novo (`frontend/app.js`, feito como artifact do Claude) monta os próprios prompts e
pede `window.claude.use("sample")`. `frontend/ponte.js` liga isso a estes endpoints.

```json
// GET → {"disponivel": true}   (false sem chave: o app.js fica no modo guião)
// POST pedido
{"mensagens": [{"role": "user", "content": "…"}], "json": false}
// POST resposta: {"texto": "…"}  ou, com "json": true, {"json": {…}}
```

### `POST /api/resumo-mensal` (P2)

Pedido vazio → `{"texto": "…"}` com a evolução das prioridades e aprendizagens nas últimas 4 semanas.

## Interfaces internas do backend

```python
# backend/memoria.py — Backend B
carregar_contexto() -> str                      # memoria/CONTEXTO.md
carregar_index() -> str                         # memoria/INDEX.md
listar_semanas(ultimas: int = 4) -> list[dict]  # [{"meta": frontmatter, "markdown": str, "resumo": str}], cronológica
carregar_agenda(semana_id: str) -> str | None   # memoria/agenda/<id>.md
meta_de(semana: dict) -> dict                   # JSON do /api/fechar → formato do frontmatter
guardar_semana(semana: dict) -> str             # escreve o .md + linha no INDEX.md; devolve caminho relativo
semana_atual() -> tuple[str, str]               # ("2026-W44", "2026-10-26 a 2026-11-01"); respeita DEMO_SEMANA
carregar_temas() -> dict                        # agente/temas.yaml

# backend/padroes.py — Backend B
detetar(metas: list[dict]) -> list[dict]        # recebe frontmatters por ordem cronológica
metricas(metas: list[dict]) -> dict

# backend/seguranca.py — Backend B
verificar(texto: str) -> dict | None            # {"nivel": "urgente" | "apoio", "resposta": str}
e_vaga(texto: str) -> bool

# backend/llm.py — Backend A
responder(system: str, mensagens: list[dict]) -> str
extrair_json(system: str, mensagens: list[dict]) -> dict

# backend/conversa.py — Backend A
montar_contexto(nota_extra: str | None = None) -> str
montar_contexto_fecho() -> str
```

## Contexto (system prompt), por esta ordem

1. `agente/AGENTE.md`
2. `agente/PERGUNTAS.md`
3. `agente/SEGURANCA.md`
4. `## Quem é a pessoa` + `memoria/CONTEXTO.md`
5. `## Índice do diário` + `memoria/INDEX.md`
6. `## Diário das últimas semanas` + até 4 entradas completas (mais antiga primeiro)
7. `## Padrões já detetados` + `padroes.detetar()` sobre as semanas anteriores
8. `## Agenda desta semana` + `memoria/agenda/<semana atual>.md`, se existir (P1)
9. `## Semana atual` + id e datas (ex.: 2026-W44, 26 de outubro a 1 de novembro)
10. Nota de resposta vaga, se for o caso

Contexto do fecho: `agente/FECHO.md` + `agente/temas.yaml` + itens 4, 6, 7 e 9 + a conversa.
Os ficheiros são lidos em cada pedido, para a equipa afinar os prompts sem reiniciar o servidor.

## Formato do diário

Ver `memoria/diario/2026-W43.md`, que é a referência. Frontmatter: `semana`, `periodo`,
`registado_em`, `energia`, `temas: {bloqueios, aprendizagens, prioridades}` (listas de ids),
`prioridades_anteriores: {feitas, parciais, total}`, `padroes`. O corpo tem as secções Resumo ·
Prioridades da semana passada · Correu bem · Aprendi · Bloqueou · Energia · Prioridades para a
semana seguinte · Ajuste de hábito · Padrões assinalados.

## Regras de padrões (`backend/padroes.py`)

Janela: as últimas 4 semanas, incluindo a atual. Temas neutros (`entregas`, `outro`) não contam.

| Tipo | Regra | Mensagem |
|---|---|---|
| `bloqueio_recorrente` | Mesmo tema em `temas.bloqueios` em ≥2 semanas da janela | «{nome}» aparece como bloqueio em {n} das últimas {janela} semanas. |
| `aprendizagem_a_consolidar` | Mesmo tema em `temas.aprendizagens` em ≥2 semanas | «{nome}» aparece como aprendizagem em {n} semanas. (2.ª seguida: "pela 2.ª semana seguida") |
| `prioridade_que_transita` | Mesmo tema em `temas.prioridades` em ≥3 semanas seguidas, até à mais recente | «{nome}» é prioridade há {n} semanas seguidas. |
| `energia_em_queda` | Energia sempre a descer nas últimas 3 semanas, ou ≤2 nas últimas 2 | A energia desceu de {a} para {b} nas últimas 3 semanas. (nunca diagnóstico) |

`{nome}` vem de `agente/temas.yaml`. Verificação: com W41 a W43, `detetar()` tem de devolver
os 4 padrões que estão no frontmatter de `2026-W43.md`.

## Quem é dono de quê (evita conflitos no git)

| Ficheiros | Dono |
|---|---|
| `frontend/*` | Frontend |
| `backend/app.py`, `conversa.py`, `llm.py`, `requirements.txt` | Backend A |
| `backend/memoria.py`, `padroes.py`, `seguranca.py`, `reset_demo.py`, `tests/` | Backend B |
| `agente/*.md` | Pitch B (texto e tom) + Backend A (formato e marcadores); avisar antes de mudar |
| `agente/temas.yaml`, `memoria/` | Backend B + Pitch B |
| `pitch/*`, `docs/ideias-equipa.md` | Pitch A + Pitch B |
| `README.md`, `TAREFAS.md`, `NOW.md`, `DECISOES.md`, `docs/SCOPE.md`, este ficheiro | Todos, em commits pequenos |
