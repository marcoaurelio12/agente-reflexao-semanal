# TAREFAS: quem faz o quê

> Põe o teu nome. Marca `[x]` quando acabares e escreve uma linha no topo do `NOW.md`.
> Cada função só mexe nos seus ficheiros (tabela em `docs/ARQUITETURA.md`).
> Detalhe e prompts prontos a colar: no README da pasta de cada função.

## Relógio (T = hora de arranque)

| Quando | Marco | Feito quando |
|---|---|---|
| T+0:20 | Arranque | Todos leram `docs/SCOPE.md`, puseram o nome e têm o ambiente a correr |
| **T+1:30** | **Checkpoint 1: integração** | Frontend ligado ao backend real; testes 1 e 2 do SCOPE passam |
| **T+2:15** | **Feature freeze** | Os 5 testes passam; vídeo de backup gravado |
| T+2:45 | Ensaio final | Pitch ensaiado 2× com a demo ao vivo |

## Frontend: _(nome)_

Ficheiros: `frontend/` · Detalhe: [`frontend/README.md`](frontend/README.md)

- [x] F1 Chat a funcionar contra o mock (`frontend/mock.js`), até T+0:50
- [x] F2 Cartão de fecho: resumo, 3 prioridades editáveis, padrões, ajuste de hábito, botão Guardar
- [x] F3 Painel "O teu diário": semanas anteriores, padrões, gráfico da energia
- [x] F4 Faixa de privacidade sempre visível
- [x] F5 Ligar à API real (T+1:30)
- [x] F6 (P1) Métricas no painel · (P2) botão "Resumo do mês" (2026-10-28: botão na sidebar abre um
  diálogo com o texto do `POST /api/resumo-mensal`) · exportar a semana em markdown (copiar +
  descarregar `.md`) · faixa de privacidade sempre visível em ecrãs <960px
- [x] F7 Tirar do ecrã os nomes das ferramentas, os caminhos de ficheiros e o debug (ficam em `reflexaoDiag()` na consola)
- [x] F8 (pós-hackathon, 2026-10-28) Ecrã reescrito contra a API real: resumo gerado pelo
  `/api/fechar`, conversas anteriores retomáveis, widget de conversa livre, `.ics`, badge do modo

**Feito =** o roteiro de `pitch/ROTEIRO-DEMO.md` corre do princípio ao fim no browser.

## Backend A, conversa e LLM: _(nome)_

Ficheiros: `backend/app.py`, `conversa.py`, `llm.py`, `requirements.txt` · Detalhe: [`backend/README.md`](backend/README.md)

- [x] A1 Servidor a correr + `llm.py` com modo mock (sem chave), até T+0:40
- [x] A2 Montar o contexto: `agente/` + `memoria/` + padrões + agenda
- [x] A3 `POST /api/chat`: abertura, perguntas, seguimento se vago, marcador de fecho
- [x] A4 `POST /api/fechar` (JSON de `agente/FECHO.md`) + `POST /api/guardar`
- [x] A5 `GET /api/memoria`
- [x] A6 (P2, 2026-10-28) `POST /api/resumo-mensal`: `agente/MENSAL.md` +
  `conversa.montar_contexto_mensal()` com o LLM; sem chave, texto determinístico com os factos
  do diário (`conversa.resumo_mensal_mock()`)

**Feito =** os testes de aceitação 1 a 3 do `docs/SCOPE.md` passam com a chave real.

## Backend B, memória, padrões e segurança: _(nome)_

Ficheiros: `backend/memoria.py`, `padroes.py`, `seguranca.py`, `reset_demo.py`, `tests/` · Detalhe: [`backend/README.md`](backend/README.md)

- [x] B1 `memoria.py`: ler e escrever o diário markdown (frontmatter + corpo) e o `INDEX.md`, até T+0:40
- [x] B2 `padroes.py`: as 4 regras de padrões + métricas
- [x] B3 `seguranca.py`: filtro de mal-estar sério + deteção de respostas vagas
- [x] B4 `tests/`: os 3 cenários do desafio, com `python -m pytest`
- [x] B5 `reset_demo.py`: apagar a W44 antes de cada ensaio
- [ ] B6 A partir de T+1:15, ajudar o Backend A na integração

**Feito =** `detetar()` sobre W41 a W43 devolve os 4 padrões do frontmatter de `memoria/diario/2026-W43.md`; testes verdes.

## Pitch A, história e slides: _(nome)_

Ficheiros: `pitch/SLIDES.md` + os slides · Detalhe: [`pitch/README.md`](pitch/README.md)

- [ ] P1 Confirmar com a organização: duração, critérios do júri, formato de submissão (até T+0:20)
- [ ] P2 Storyline e slides
- [ ] P3 Diagrama da arquitetura
- [ ] P4 Slide de visão: da pessoa para a equipa (`docs/ideias-equipa.md`)
- [ ] P5 Ensaios cronometrados

**Feito =** slides prontos em T+2:15 e pitch ensaiado 2× dentro do tempo.

## Pitch B, demo, dados e testes: _(nome)_

Ficheiros: `pitch/ROTEIRO-DEMO.md`, `agente/*.md` (texto e tom), `memoria/` · Detalhe: [`pitch/README.md`](pitch/README.md)

- [ ] D1 Ler a história da Inês e afiná-la se quiseres (avisar o Backend B se mudares etiquetas), até T+0:40
- [ ] D2 Testar os prompts de `agente/` no ChatGPT antes de o backend estar pronto e afinar o tom
- [ ] D3 Ensaiar o roteiro com o backend real a partir de T+1:30; falhas para o `NOW.md`
- [ ] D4 Gravar o vídeo de backup da demo (T+2:15)
- [ ] D5 Cronometrar a reflexão (prova dos "menos de 5 minutos")
- [ ] D6 Preparar respostas às perguntas do júri

**Feito =** vídeo de backup gravado e roteiro corrido 2× sem falhas.

## Features pós-demo (2026-10-28, propostas em `docs/propostas/`)

Implementadas pelo assistente com a autonomia do Marco; cada uma segue a proposta respetiva
(e as recomendações lá marcadas) e fecha com a bateria de testes verde.

- [x] FS1 Botões de sugestão no chat (`sugestoes-no-chat.md`): catálogo `agente/ACOES.md`,
  marcador `<<ACOES:…>>` no modo geral, chips no widget, `tests/test_acoes.py`
- [ ] FN2 Notas do dia (`notas-do-dia.md`): `memoria/notas/`, `/api/notas`, secção no contexto,
  `notas_temas` no fecho, regra `nota_recorrente`, sidebar e widget, `tests/test_notas.py`
- [ ] FC3 Painel de consentimento (`consentimento.md`): `memoria/CONSENTIMENTO.md`,
  `/api/consentimento*`, toggles que filtram o contexto, lixeira + desfazer, diálogo
  "O que o agente sabe sobre ti", `tests/test_consentimento.py`
