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
 │ widget geral │ POST /api/guardar│ 3. llm (Gemini ou mock)        │       │ memoria/diario/*.md     │
 └──────────────┘ GET /api/memoria │ 4. padroes.detetar()           │ ────▶ │ (escreve 2026-W44.md)   │
                  GET /api/estado  └────────────────────────────────┘       └─────────────────────────┘
                  GET /api/ics                │ texto da conversa
                                              ▼
                                       API Gemini (Google)
```

## Fluxo

1. **Abertura:** o frontend chama `POST /api/chat` com `mensagens: []`. O agente cumprimenta e
   retoma as prioridades da semana passada.
2. **Conversa:** o frontend guarda o histórico (neste navegador; conversas antigas podem ser
   reabertas e continuadas) e envia-o inteiro a cada mensagem (o servidor não guarda estado).
3. **Antes do LLM:** `seguranca.verificar(última mensagem do utilizador)`. Se houver alerta,
   devolve a resposta fixa de `agente/SEGURANCA.md` com `alerta_seguranca: true`, sem chamar o LLM.
4. **Resposta vaga:** se `seguranca.e_vaga()`, acrescenta ao contexto a nota "A última
   resposta foi vaga: faz UMA pergunta de seguimento concreta; não assumas nada." (só no modo semanal)
5. **Fecho:** quando o agente tem as 4 respostas, acaba a mensagem com `<<FECHAR>>`. O servidor
   remove o marcador e devolve `pronto_para_fechar: true`.
6. **`POST /api/fechar`:** LLM com `agente/FECHO.md` → JSON da semana → `padroes.detetar()` sobre
   as semanas anteriores + esta → devolve a semana **ainda por guardar**. O resumo nunca é
   pré-escrito: vem sempre daqui.
7. A pessoa revê e edita as prioridades → **`POST /api/guardar`** → escreve
   `memoria/diario/AAAA-Www.md` (mesmo formato das semanas anteriores) e acrescenta a linha ao `INDEX.md`.
8. **Conversa livre (widget):** `POST /api/chat` com `modo: "geral"` usa `agente/GERAL.md`
   (perguntas sobre o diário, sem conduzir a reflexão) e nunca devolve `pronto_para_fechar`.
   Se a pessoa pediu ajuda e 1-2 ações servirem, o LLM acaba a mensagem com `<<ACOES:id1,id2>>`;
   o servidor valida os ids contra `agente/ACOES.md`, remove o marcador do texto e devolve
   as ações em `acoes` (só no modo geral; em mock e no semanal é sempre `[]`).
9. **Calendário:** `GET /api/ics` devolve um evento recorrente (sexta, 17:00, Lisboa) com as
   prioridades da última semana guardada na descrição.

## API

### `POST /api/chat`

```json
// pedido
{"mensagens": [
  {"role": "assistant", "content": "Olá, Inês. Na semana passada escolheste…"},
  {"role": "user", "content": "Normal."}
], "modo": "semanal"}        // "semanal" (omissão) | "geral" (conversa livre do widget)
// resposta
{"resposta": "Qual das três avançou mais?", "pronto_para_fechar": false, "alerta_seguranca": false,
 "acoes": [{"id": "novo-habito", "texto": "Sugerir um novo hábito", "tipo": "mensagem",
            "mensagem": "Sugere-me um novo hábito para a semana, a partir do que já resultou no meu diário."}]}
```

`modo: "geral"` usa o system prompt de `agente/GERAL.md` (diário completo, sem as 4 perguntas),
ignora a nota de resposta vaga e devolve sempre `pronto_para_fechar: false`.

`acoes` são os botões de sugestão do widget (chips): `[]` por omissão, sempre no modo semanal e
sempre em modo mock. Só o LLM (com a conversa livre) pode acabar a mensagem com
`<<ACOES:id1,id2>>`; o servidor valida os ids contra o catálogo `agente/ACOES.md` (bloco yaml),
descarta inválidos, deduplica, trunca a 2 e remove o marcador do texto. O clique num chip
`tipo: "mensagem"` envia a `mensagem` do catálogo como uma mensagem normal da pessoa (o pedido
não ganha campo novo); `tipo: "navegacao"` (`abrir-reflexao`) não envia nada — abre "Nova reflexão".

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
  "notas_temas": ["reunioes-excessivas"],
  "padroes": [{"tipo": "bloqueio_recorrente", "tema": "reunioes-excessivas",
               "semanas": ["2026-W41", "2026-W43", "2026-W44"],
               "mensagem": "«Reuniões a mais ou sem agenda» aparece como bloqueio em 3 das últimas 4 semanas."}]
}}
```

`estado` ∈ `feito` · `em-parte` · `nao-avancou` · `sem-info`.
`tipo` de padrão ∈ `bloqueio_recorrente` · `aprendizagem_a_consolidar` · `nota_recorrente` ·
`prioridade_que_transita` · `energia_em_queda`.
`notas_temas`: ids de `agente/temas.yaml` (máx. 3) etiquetados pelo LLM na mesma chamada do
fecho a partir das notas desta semana; vai para `temas.notas` do frontmatter ao guardar.

### `POST /api/guardar`

```json
// pedido
{"semana": { "...": "o objeto devolvido por /api/fechar, com as prioridades editadas" }}
// resposta
{"ficheiro": "memoria/diario/2026-W44.md"}
```

Ao guardar, as notas dessa semana são apagadas (fica o essencial, `temas.notas`, no frontmatter).

### `POST /api/notas` · `GET /api/notas` · `DELETE /api/notas/{id}`

```json
// POST /api/notas — {"texto": "outra vez reuniões de última hora", "data": "2026-10-28"}
//   (data é opcional; omissão = hoje) → 201
{"id": "2026-10-28-1", "data": "2026-10-28", "hora": "09:12", "texto": "…",
 "tema_sugerido": "reunioes-excessivas", "insight": null}
// com mal-estar sério no texto: NÃO guarda e devolve 200
{"alerta_seguranca": true, "nivel": "apoio", "resposta": "…resposta fixa de agente/SEGURANCA.md…"}

// GET /api/notas?semana=2026-W44   (omissão: semana atual)
{"notas": [{"id": "…", "data": "…", "hora": "…", "texto": "…", "tema_sugerido": "…"}],
 "insight": "«Reuniões a mais ou sem agenda» saiu em 2 notas desta semana."}

// DELETE /api/notas/2026-10-28-1 → 204 (reescreve o ficheiro do dia; a última nota apaga-o)
```

A nota é da pessoa: guarda-se **literal** (uma linha por nota, com a hora) em
`memoria/notas/AAAA-MM-DD.md`, um ficheiro por dia anotado; sem linha no `INDEX.md`.
`tema_sugerido` vem de matching léxico (tokens >3 letras, minúsculas, sem acentos) sobre os
nomes de `agente/temas.yaml`; o fecho da semana é que o confirma (`notas_temas`).
`insight` é uma única linha calculada (≥2 notas da mesma semana no mesmo tema) ou `null`;
nunca há scores, streaks ou energia diários.

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

### `GET /api/estado`

```json
{"disponivel": false, "modo": "mock" | "llm", "modelo": "gemini-3.6-flash" | null,
 "semana": "2026-W44", "periodo": "2026-10-26 a 2026-11-01"}
```

Badge do cabeçalho do frontend ("respostas de exemplo" vs. "Gemini") e subtítulo da semana atual.

### `GET /api/ics[?semana=AAAA-Www]`

`text/calendar` (RFC 5545, CRLF, UTF-8): evento "Reflexão semanal" recorrente
(`RRULE:FREQ=WEEKLY`), a começar na próxima sexta-feira às 17:00 de `Europe/Lisbon` (em UTC),
com as prioridades e o ajuste de hábito da semana indicada (ou da última guardada) na descrição.
Semana desconhecida → 404. `Content-Disposition: attachment; filename="reflexao-semanal.ics"`.

### `POST /api/resumo-mensal`

Pedido vazio → `{"texto": "…"}` com a evolução das prioridades e aprendizagens nas últimas
4 semanas guardadas. Com LLM: system prompt de `agente/MENSAL.md` + diário + padrões + métricas
(e uma só mensagem de utilizador com a instrução de escrever o texto). Sem chave: texto
determinístico montado no servidor com os mesmos factos (energia semana a semana, prioridades
cumpridas, temas repetidos). Falha do LLM → 502, como nos outros endpoints.

## Interfaces internas do backend

```python
# backend/memoria.py — Backend B
carregar_contexto() -> str                      # memoria/CONTEXTO.md
carregar_index() -> str                         # memoria/INDEX.md
listar_semanas(ultimas: int = 4) -> list[dict]  # [{"meta": frontmatter, "markdown": str, "resumo": str, "prioridades": [str], "ajuste": str}], cronológica
carregar_agenda(semana_id: str) -> str | None   # memoria/agenda/<id>.md
meta_de(semana: dict) -> dict                   # JSON do /api/fecho → formato do frontmatter (temas incluem notas)
guardar_semana(semana: dict) -> str             # escreve o .md + linha no INDEX.md; apaga as notas da semana
semana_atual() -> tuple[str, str]               # ("2026-W44", "2026-10-26 a 2026-11-01"); respeita DEMO_SEMANA
carregar_temas() -> dict                        # agente/temas.yaml
guardar_nota(texto: str, data_iso: str | None = None) -> dict   # acrescenta ao ficheiro do dia em memoria/notas/
notas_da_semana(semana_id: str | None = None) -> list[dict]     # [{"id", "data", "hora", "texto", "tema"}], cronológicas
apagar_nota(nid: str) -> bool                   # reescreve o ficheiro do dia (a última nota apaga-o)
dia_legivel(data_iso: str) -> str               # "2026-10-27" → "terça, 27 de outubro"
semana_de(data_iso: str) -> str                 # "2026-10-27" → "2026-W44"
tema_sugerido(texto: str) -> str | None         # matching léxico sobre os nomes de temas.yaml
insight_de_notas(notas: list[dict]) -> str | None  # 1 linha se ≥2 notas da semana no mesmo tema

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
montar_contexto_geral() -> str                  # widget: agente/GERAL.md + ACOES.md + segurança + diário completo
montar_contexto_mensal() -> str                 # resumo-mensal: agente/MENSAL.md + diário + padrões + métricas
resumo_mensal_mock() -> str                     # resumo-mensal sem chave: factos calculados, texto determinístico
carregar_acoes() -> list[dict]                  # catálogo do bloco yaml de agente/ACOES.md (lido em cada pedido)
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
9. `## Notas desta semana` + as últimas 10 notas de `memoria/notas/` desta semana, se houver
   (`- terça, 28 de outubro: "…"`, com as palavras da pessoa)
10. `## Semana atual` + id e datas (ex.: 2026-W44, 26 de outubro a 1 de novembro)
11. Nota de resposta vaga, se for o caso

Contexto do fecho: `agente/FECHO.md` + `agente/temas.yaml` + itens 4, 6, 7, 9 e 10 + a conversa.
Contexto da conversa livre: `agente/GERAL.md` + `agente/ACOES.md` + `agente/SEGURANCA.md` +
itens 4, 5, 6, 7, 8, 9 e 10 (diário completo, não só as últimas 4 semanas).
Contexto do resumo mensal: `agente/MENSAL.md` + itens 4, 6 e 7 (últimas 4 semanas guardadas) +
secção de métricas (energia por semana, prioridades cumpridas).
Os ficheiros são lidos em cada pedido, para a equipa afinar os prompts sem reiniciar o servidor.

## Formato do diário

Ver `memoria/diario/2026-W43.md`, que é a referência. Frontmatter: `semana`, `periodo`,
`registado_em`, `energia`, `temas: {bloqueios, aprendizagens, prioridades, notas}` (listas de
ids; `notas` vem do `notas_temas` do fecho), `prioridades_anteriores: {feitas, parciais, total}`,
`padroes`. O corpo tem as secções Resumo · Prioridades da semana passada · Correu bem · Aprendi ·
Bloqueou · Energia · Prioridades para a semana seguinte · Ajuste de hábito · Padrões assinalados.
As notas do dia vivem à parte, em `memoria/notas/AAAA-MM-DD.md` (ver `memoria/README.md`).

## Regras de padrões (`backend/padroes.py`)

Janela: as últimas 4 semanas, incluindo a atual. Temas neutros (`entregas`, `outro`) não contam.

| Tipo | Regra | Mensagem |
|---|---|---|
| `bloqueio_recorrente` | Mesmo tema em `temas.bloqueios` em ≥2 semanas da janela | «{nome}» aparece como bloqueio em {n} das últimas {janela} semanas. |
| `aprendizagem_a_consolidar` | Mesmo tema em `temas.aprendizagens` em ≥2 semanas | «{nome}» aparece como aprendizagem em {n} semanas. (2.ª seguida: "pela 2.ª semana seguida") |
| `nota_recorrente` | Mesmo tema em `temas.notas` em ≥2 semanas da janela (menção, não facto classificado) | «{nome}» aparece em notas de {n} das últimas {janela} semanas. |
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
