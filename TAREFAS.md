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

- [ ] F1 Chat a funcionar contra o mock (`frontend/mock.js`), até T+0:50
- [ ] F2 Cartão de fecho: resumo, 3 prioridades editáveis, padrões, ajuste de hábito, botão Guardar
- [ ] F3 Painel "O teu diário": semanas anteriores, padrões, gráfico da energia
- [ ] F4 Faixa de privacidade sempre visível
- [ ] F5 Ligar à API real (T+1:30)
- [ ] F6 (P1) Métricas no painel · (P2) botão "Resumo do mês"

**Feito =** o roteiro de `pitch/ROTEIRO-DEMO.md` corre do princípio ao fim no browser.

## Backend A, conversa e LLM: _(nome)_

Ficheiros: `backend/app.py`, `conversa.py`, `llm.py`, `requirements.txt` · Detalhe: [`backend/README.md`](backend/README.md)

- [x] A1 Servidor a correr + `llm.py` com modo mock (sem chave), até T+0:40
- [x] A2 Montar o contexto: `agente/` + `memoria/` + padrões + agenda
- [x] A3 `POST /api/chat`: abertura, perguntas, seguimento se vago, marcador de fecho
- [x] A4 `POST /api/fechar` (JSON de `agente/FECHO.md`) + `POST /api/guardar`
- [x] A5 `GET /api/memoria`
- [ ] A6 (P2) `POST /api/resumo-mensal`

**Feito =** os testes de aceitação 1 a 3 do `docs/SCOPE.md` passam com a chave real.

## Backend B, memória, padrões e segurança: _(nome)_

Ficheiros: `backend/memoria.py`, `padroes.py`, `seguranca.py`, `reset_demo.py`, `tests/` · Detalhe: [`backend/README.md`](backend/README.md)

- [x] B1 `memoria.py`: ler e escrever o diário markdown (frontmatter + corpo) e o `INDEX.md`, até T+0:40
- [x] B2 `padroes.py`: as 4 regras de padrões + métricas
- [x] B3 `seguranca.py`: filtro de mal-estar sério + deteção de respostas vagas
- [ ] B4 `tests/`: os 3 cenários do desafio, com `python -m pytest`
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
