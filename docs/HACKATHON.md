# Como o projeto foi construído no hackathon

> Este era o README do dia do hackathon (2026-10-27): o kit para a equipa arrancar em 3 horas.
> Fica aqui como registo do método. O README da raiz descreve o projeto como está hoje.

## Ler primeiro: o que há a fazer e quem faz o quê

Temos 3 horas. Python + Gemini (API compatível com OpenAI). **Não há base de dados:** a memória
é um diário em ficheiros markdown (`memoria/`), que já tem 4 semanas fictícias. A demo ao vivo é
a semana seguinte, em que o agente tem de reparar que um bloqueio se repete.

| Função | O que faz | Começa por |
|---|---|---|
| **Frontend** | Ecrã do chat, cartão de resumo, painel do diário | [`frontend/README.md`](../frontend/README.md) |
| **Backend A** | Servidor, chamadas ao LLM (Gemini), fluxo da conversa | [`backend/README.md`](../backend/README.md) |
| **Backend B** | Ler/escrever o diário, deteção de padrões, filtro de segurança, testes | [`backend/README.md`](../backend/README.md) |
| **Pitch A** | História, slides, ensaios | [`pitch/README.md`](../pitch/README.md) |
| **Pitch B** | Guião da demo, afinar os prompts do agente, vídeo de backup | [`pitch/README.md`](../pitch/README.md) |

1. Lê [`docs/SCOPE.md`](SCOPE.md) (5 min): o que entra, o que fica de fora, o relógio.
2. Põe o teu nome em [`TAREFAS.md`](../TAREFAS.md).
3. Abre o README da tua pasta. Tem as tarefas e um prompt pronto a colar no teu assistente de código.
4. Mexe só nos teus ficheiros (tabela em [`docs/ARQUITETURA.md`](ARQUITETURA.md)).

**Relógio:** T+0:20 toda a gente a construir · **T+1:30** juntar frontend e backend ·
**T+2:15** parar features e gravar o vídeo de backup · T+2:45 ensaio final.

## Como trabalhámos

Contexto em ficheiros, para que pessoas e assistentes de código trabalhem a partir da mesma fonte:

- Quem fecha uma tarefa marca-a em [`TAREFAS.md`](../TAREFAS.md) e escreve uma linha no topo de
  [`NOW.md`](../NOW.md).
- Uma decisão nova vai para [`DECISOES.md`](../DECISOES.md), com data e hora.
- [`AGENTS.md`](../AGENTS.md) é o router para os assistentes de código (Claude Code, Cursor, Codex…).
- Commits pequenos e frequentes para `main`; `git pull --rebase` antes de `git push`.
- Repo público: **nunca** fazer commit do `.env` nem de chaves.
