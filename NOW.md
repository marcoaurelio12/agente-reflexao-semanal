# NOW: diário da equipa (mais recente primeiro)

> Uma linha por tarefa fechada ou problema encontrado: `T+h:mm · função · o quê`.
> Pontas soltas na secção de baixo: ninguém sai sem as ver.

## 2026-10-27

- 14:07 · Backend · Backend mínimo feito (A2–A5, B1–B3, B5): memória, padrões, segurança,
  contexto e os 4 endpoints. `detetar()` sobre W41–W43 = padrões da W43; o roteiro corre em mock
  até ao `memoria/diario/2026-W44.md`, com os mesmos padrões do `mock.js`. Falta: testar com a
  chave real; B4 (pytest) e A6 ficam de fora.
- 14:05 · dados · Diário da Inês passa a 4 semanas: criada a W40 (28 set a 4 out, primeira
  semana, energia 5). Atualizados: `INDEX.md`, `CONTEXTO.md` (começa 2026-10-02), a W41 (deixa de
  ser a primeira e revê as prioridades da W40), README da `memoria/`, DECISÕES 8, `README.md` e
  `SCOPE.md`. Os 4 padrões guardados na W43 não mudam; a W40 não entra na janela da demo (últimas
  4 semanas = W41–W44).
- 14:00 · Backend A · A1 feito. O LLM passa a ser o GLM-5.3 da z.ai pelo Coding Plan (decisão 2
  em `DECISOES.md`, com o risco aceite). `llm.py`: chamada real (JSON + 1 nova tentativa) e modo
  mock com a conversa da W44 de `frontend/mock.js`. Servidor arranca; `/api/*` dão 501 até A3–A5.
- T+0:00 · setup · Repo criado: scope, arquitetura, instruções do agente (`agente/`), diário
  fictício da Inês com 3 semanas (`memoria/`), stubs do backend, mock do frontend, guião da demo
  e tarefas por função. A seguir: cada pessoa põe o nome em `TAREFAS.md` e arranca.

## Pontas soltas

- Pôr a chave do Coding Plan no `.env` (só na máquina da demo, não se partilha) e correr o
  roteiro uma vez com o GLM; depois `python -m backend.reset_demo`.
- Ainda dizem "OpenAI": `frontend/README.md` (texto da faixa de privacidade), `memoria/README.md`,
  `pitch/SLIDES.md` (slide 7), `pitch/README.md` e `pitch/ROTEIRO-DEMO.md`. Passa a "z.ai (GLM)";
  cada dono atualiza o seu.
- O frontend ainda não está no repo (só o placeholder): fazer push para testar contra o backend.
- Confirmar a duração do pitch e os critérios do júri → ajustar `pitch/SLIDES.md` (Pitch A, P1).
- `pitch/ROTEIRO-DEMO.md` ainda diz "3 semanas, energia 4 → 3 → 2": atualizar para 4 semanas,
  energia 5 → 4 → 3 → 2 (Pitch B).
- `frontend/mock.js` ainda não tem a W40 no painel do mock: acrescentar (Frontend).
- Convidar os colegas como colaboradores no GitHub (Settings → Collaborators), para poderem fazer push.
