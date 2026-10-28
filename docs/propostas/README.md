# Propostas de design (pós-hackathon)

> Uma por feature, escritas a 2026-10-28 por agentes de design a partir do código e das regras
> do repo. **Nada disto está decidido nem implementado** — cada uma termina com as decisões a
> pedir ao Marco e critérios de aceitação. Lê a decisão 12 do `DECISOES.md` para o estado atual.

| Proposta | O que é | Esforço estimado |
|---|---|---|
| [`sugestoes-no-chat.md`](sugestoes-no-chat.md) | Chips de ação ("Sugerir um novo hábito") só quando a pessoa pede; marcador `<<ACOES:…>>` + catálogo `agente/ACOES.md` | M (~3 h) |
| [`notas-do-dia.md`](notas-do-dia.md) | Nota rápida diária que alimenta a sexta; `memoria/notas/` + regra `nota_recorrente` | M (~4,5 h) |
| [`consentimento.md`](consentimento.md) | Painel "O que o agente sabe sobre ti": toggles reais (agenda, widget), ver/exportar/apagar | M (~6-8 h) |
| [`login.md`](login.md) | Multiutilizador: 3 níveis comparados; recomenda login leve; `memoria/pessoas/<id>/` | L |
| [`integracoes.md`](integracoes.md) | Painel "quick install" sem fake: importação .ics manual → Google Calendar OAuth | L |

Ordem sugerida de construção (menor esforço / mais valor visível primeiro):
**sugestões no chat → notas do dia → consentimento → login → integrações** — mas as duas últimas
dependem de decisões de deploy e contas que só o Marco pode tomar (ver §"decisões" de cada uma).
Intersecções notáveis: o consentimento liga às integrações (a agenda só com autorização) e às
notas; o login é pré-requisito para consentimento persistente por pessoa.
