# Proposta: notas rápidas do dia + "rever o dia"

> Proposta de design, 2026-10-28. Nada implementado; decide o Marco (§6) antes de abrir tarefa.
> Memória curta para a semana sem voltar aos check-ins diários (removidos, decisão 12): UMA nota
> curta (1–3 linhas) em qualquer dia; as notas alimentam a sexta.

## 1. Problema

Entre duas sextas passam-se 5 dias e o agente só retoma 3 prioridades e a agenda fictícia; o que
se passou a meio chega à conversa só se a pessoa se lembrar ao vivo (o widget serve para perguntar, não para anotar).

**Porque não é o check-in diário que saiu (decisão 12):** o check-in era o agente a perguntar
todos os dias, com formulário, ecrã próprio e relatório diário — tornava o produto diário e
desorganizava o ecrã. A nota é o oposto: um gesto de 10 segundos **iniciado pela pessoa**, sem
resposta do agente, sem pergunta, sem ecrã novo, sem pontuação. O produto continua a ser UMA
conversa de 5 minutos à sexta. O agente nunca pergunta "queres deixar a nota de hoje?" nem
comenta quantas notas existem.

## 2. UX

Duas entradas e um sítio para rever:

- **Botão "Nota do dia"** no cabeçalho da secção "O teu diário" (sidebar). Abre ali um campo de
  2–3 linhas; Enter guarda; toast "Nota guardada para a reflexão de sexta". Sem resposta do agente.
- **Widget de conversa livre**: cada mensagem da pessoa ganha, no hover, um "✚ guardar como nota"
  — guarda o texto DELA tal como o escreveu, nunca a resposta do agente nem resumo.
- **Rever o dia**: as notas da semana ficam na sidebar, agrupadas por dia ("hoje", "ontem",
  data), cada uma com um × (2 cliques, como apagar conversas). Apagar remove do servidor e a
  sexta deixa de a ver. No widget, "que notas deixei esta semana?" também as devolve.

```
 Sidebar · O teu diário               Widget (hover na mensagem da pessoa)
┌──────────────────────────┐  ┌────────────────────────────────────┐
│ O TEU DIÁRIO [+ Nota do dia]│  │ Tu: outra manhã sem foco, reuniões │
│ ⚡ gráfico de energia     │  │ de última hora.            ✚ nota  │
│ Notas desta semana       │  └────────────────────────────────────┘
│ hoje 09:12  sem foco,    │  Sexta (abertura): "Olá, Inês. Anotaste na
│   reuniões de última h. ×│  terça que ficaste sem manhãs de foco. Como
│ «Reuniões a mais» saiu   │  correram as prioridades da semana passada —
│  em 2 notas desta semana │  e o resto da semana?"
└──────────────────────────┘
```

**Na conversa de sexta:** a nota entra como a agenda entra hoje — no máximo UM elemento concreto,
com o dia ("anotaste na terça que…"); a meio da conversa, se um assunto tocar uma nota, o agente
pode citá-la com a data, como já faz com os padrões. O cartão de fecho **não** ganha secção nova:
as notas alimentam resumo, itens e padrões com as palavras da pessoa, sem distinguir a origem.

## 3. Dados e API

**Ficheiro: `memoria/notas/AAAA-MM-DD.md`, um por dia com notas.** Só existem os dias anotados
(minimização); apagar o dia = apagar o ficheiro; a data no nome é a que o agente cita. Sem linha
no `INDEX.md` (o índice é do diário semanal; notas são efémeras). A nota é da pessoa: guarda-se
literal, NÃO é transcrição nem resumo.

```markdown
---
data: 2026-10-28
temas: [reunioes-excessivas]        # sugestão automática (§4); o fecho confirma
---

# Notas de 28 de outubro

- 09:12 — Terceira manhã seguida sem bloco de foco; reuniões de última hora outra vez.
```

**Endpoints novos** (`/api/chat` e `/api/fechar` não mudam de contrato: o servidor junta as notas
ao system prompt; o histórico no browser continua a ser a única coisa que o cliente envia).

- `POST /api/notas {texto}` → 201 `{id: "2026-10-28-1", data, hora, tema_sugerido, insight}`.
  Corre `seguranca.verificar`: se disparar, **não guarda** e devolve a resposta de apoio.
- `GET /api/notas[?semana=AAAA-Www]` → `{notas: [{id, data, hora, texto, tema_sugerido}], insight}`.
- `DELETE /api/notas/{id}` → 204 (reescreve o ficheiro do dia; última nota → ficheiro apagado).

**Contexto (`backend/conversa.py`):** secção nova `## Notas desta semana`, com a agenda e antes
da semana atual, em `montar_contexto` e `montar_contexto_geral`; em `montar_contexto_fecho`
entra com a regra nova do `FECHO.md`. Formato `- terça, 28 de outubro: "…"` (palavras da pessoa,
entre aspas). Limite: as últimas 10 notas da semana, para o contexto não inchar.
**Fecho (`/api/fechar`):** o JSON ganha `notas_temas: [ids de temas.yaml, máx. 3]` — etiquetados
pelo LLM na única chamada que já existe (0 pedidos extra; quotas, decisão 2). `memoria.meta_de`
passa a escrever `temas.notas` no frontmatter. As notas são material legítimo para resumo, itens
e prioridades (a pessoa escreveu-as — regra 1 do `FECHO.md`), sempre com as palavras dela; campo
sem informação → lista vazia.

## 4. Padrões e insights diários

- **Regra nova em `padroes.py` (`nota_recorrente`):** mesmo tema em `temas.notas` em ≥2 semanas da
  janela de 4 → "«{nome}» aparece em notas de {n} das últimas {janela} semanas." Mesmo mecanismo
  dos bloqueios/aprendizagens (DECISÕES 5): o LLM etiqueta, o código conta, temas neutros fora.
  As notas NÃO criam bloqueios/aprendizagens por si; contam como menção, não como facto classificado.
- **Insight diário (máx. UMA linha, já calculada):** se ≥2 notas da semana baterem no mesmo tema
  por matching léxico sobre os nomes de `temas.yaml` (tokens >3 letras, minúsculas, sem acentos)
  → "«Reuniões a mais ou sem agenda» saiu em 2 notas desta semana." Sem LLM, sem verbo de
  conselho; aparece no `GET /api/notas` e por baixo das notas na sidebar. Caso contrário, `null`.
- **Proibido:** scores diários ("dia 6/10"), humor ou energia diários (a escala 1–5 é da sexta,
  decisão 2), streaks ou "dias sem nota", contar notas como métrica de esforço, insights
  compostos, sugestões de ação fora da sexta, apresentar o matching como facto.

## 5. Encaixe nas regras do repo

- `AGENTE.md`/`PERGUNTAS.md`: as 4 perguntas não mudam. A nota entra na abertura como a agenda
  ("podes referir UM evento concreto" passa a "…ou UMA nota, com o dia"). Nunca "porque não
  deixaste notas?" — silêncio é silêncio, não falha.
- Minimização (DECISÕES 7): só o que a pessoa escreveu, literal e curto; apagável a qualquer
  momento; proposta (decisão 1, §6): ao `POST /api/guardar`, os ficheiros de notas dessa semana
  são apagados — fica o essencial (`temas.notas`) no frontmatter, como fica da conversa.
- "Não inventes factos" / semanalidade intacta: notas citadas com as palavras e datas; etiquetas
  só ids válidos de `temas.yaml`; o insight é contagem de factos que estão no ficheiro. Sem
  pergunta diária nem push (o `.ics` de sexta continua o único convite); em modo mock, guardar
  nota funciona na mesma (não gasta LLM).
- `docs/ARQUITETURA.md` atualizado no mesmo commit (§API, §Contexto, §Regras de padrões,
  §Interfaces). Donos: `memoria.py`/`padroes.py`/tests → Backend B; `app.py`/`conversa.py` →
  Backend A; sidebar/widget → Frontend; `AGENTE.md`/`FECHO.md`/`GERAL.md` → Pitch B + Backend A.

## 6. Esforço, ordem e decisões

| # | Passo | Dono | Est. |
|---|---|---|---|
| 1 | `memoria.notas`: guardar/listar/apagar + matching léxico + `notas_da_semana()` | B | 1 h |
| 2 | Endpoints `/api/notas` + secção "## Notas desta semana" nos 3 contextos | A | 1 h |
| 3 | Sidebar (botão, lista, ×, insight) + "✚ guardar como nota" no widget | Frontend | 1,5 h |
| 4 | `AGENTE.md` (passo 0), `FECHO.md` (`notas_temas`), `GERAL.md` (citar com o dia) | Pitch B + A | 0,5 h |
| 5 | `padroes.py`: `nota_recorrente` + testes novos | B | 0,5 h |

Depois do passo 2 a sexta já "vê" notas semeadas à mão em `memoria/notas/` — dá para ensaiar e para a demo antes de qualquer UI. Ordem 1→2→4 é um corte limpo; 3 e 5 fecham.

**Decisões para o Marco** (recomendação primeiro):

1. **Vida das notas:** apagar ao guardar a semana (recomendo: minimização, os temas ficam no
   frontmatter) ou conservar como micro-diário permanente?
2. **Temas:** matching léxico ao guardar + confirmação no fecho (recomendo: 0 pedidos LLM extra)
   ou LLM por nota (gasta quota) ou sem temas (perde `nota_recorrente`)?
3. **Entradas:** botão na sidebar + botão no widget (recomendo) ou só o widget? ("/nota" na
   conversa semanal fica de fora: mistura os fluxos da reflexão.)
4. **Ficheiro:** um por dia `memoria/notas/AAAA-MM-DD.md` (recomendo) ou um por semana?
5. **Volume:** sem limite rígido, contexto limitado às últimas 10 da semana (recomendo) ou
   máximo 3 notas por dia no endpoint?

**Critérios de aceitação:**

1. `POST /api/notas` com "outra vez reuniões de última hora, zero foco" cria
   `memoria/notas/2026-10-28.md` com hora e texto literal, `temas: [reunioes-excessivas]`; o
   `INDEX.md` não muda.
2. Com essa nota na semana, `/api/chat` com `mensagens: []` abre referindo a nota pelo dia
   ("anotaste na terça…"); sem notas, a abertura é a de hoje (testes atuais verdes).
3. `/api/fechar` devolve `notas_temas` válidos; após `/api/guardar`, o frontmatter tem
   `temas.notas`; `detetar()` com o tema em notas de 2 semanas devolve `nota_recorrente`.
4. `GET /api/notas`: 2 notas com o mesmo tema → exatamente UMA linha de insight; temas todos
   diferentes → `insight: null`.
5. `DELETE /api/notas/{id}` remove a nota (a última apaga o ficheiro); a abertura deixa de a citar.
6. Nota com "estou em baixo há semanas e não vejo saída" não é guardada e devolve a resposta de
   apoio (SNS 24/112); nenhum ecrã ou prompt mostra scores, streaks ou energia diários.
