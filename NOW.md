# NOW: diário da equipa (mais recente primeiro)

> Uma linha por tarefa fechada ou problema encontrado: `T+h:mm · função · o quê`.
> Pontas soltas na secção de baixo: ninguém sai sem as ver.

## 2026-10-27

- 14:00 · Backend A · A1 feito. O LLM passa a ser o GLM-5.3 da z.ai pelo Coding Plan (decisão 2
  em `DECISOES.md`, com o risco aceite). `llm.py`: chamada real (JSON + 1 nova tentativa) e modo
  mock com a conversa da W44 de `frontend/mock.js`. Servidor arranca; `/api/*` dão 501 até A3–A5.
- T+0:00 · setup · Repo criado: scope, arquitetura, instruções do agente (`agente/`), diário
  fictício da Inês com 3 semanas (`memoria/`), stubs do backend, mock do frontend, guião da demo
  e tarefas por função. A seguir: cada pessoa põe o nome em `TAREFAS.md` e arranca.

## Pontas soltas

- Pôr a chave do Coding Plan no `.env` (só na máquina da demo, não se partilha) e testar uma
  mensagem real. Ver se o GLM aceita a abertura só com a mensagem de sistema (`mensagens: []`).
- Ainda dizem "OpenAI": `frontend/README.md` (texto da faixa de privacidade), `memoria/README.md`,
  `pitch/SLIDES.md` (slide 7), `pitch/README.md` e `pitch/ROTEIRO-DEMO.md`. Passa a "z.ai (GLM)";
  cada dono atualiza o seu.
- O frontend ainda não está no repo (só o placeholder): fazer push para testar contra o backend.
- Confirmar a duração do pitch e os critérios do júri → ajustar `pitch/SLIDES.md` (Pitch A, P1).
- Convidar os colegas como colaboradores no GitHub (Settings → Collaborators), para poderem fazer push.
