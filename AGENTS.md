# AGENTS.md: router para assistentes de código

Lido por Claude Code, Cursor, Codex e afins. Lê isto antes de mexer em código.

## O projeto

Agente de reflexão semanal para um hackathon de 3 horas. Uma conversa de 5 minutos → resumo,
3 prioridades, padrões entre semanas e um ajuste de hábito. Memória num diário em markdown.
Python (FastAPI) + Gemini (SDK openai) + HTML/JS. Dados 100% fictícios.

## Leitura obrigatória, por esta ordem

1. `DECISOES.md`: não voltes a decidir o que já está decidido.
2. `docs/ARQUITETURA.md`: contrato de API, formato do diário, regras de padrões, quem é dono de cada ficheiro.
3. `TAREFAS.md`: a tarefa em curso e o que conta como feito.
4. `NOW.md`: só o topo.

## Para onde ir

| Tarefa | Ficheiros | Lê primeiro |
|---|---|---|
| Mudar o que o agente diz, o tom ou as perguntas | `agente/AGENTE.md`, `PERGUNTAS.md` | `agente/AGENTE.md` |
| Mudar o resumo, as prioridades ou o ajuste de hábito | `agente/FECHO.md` | `docs/ARQUITETURA.md` §API |
| Limites e mal-estar sério | `agente/SEGURANCA.md`, `backend/seguranca.py` | `agente/SEGURANCA.md` |
| Novo tema para os padrões | `agente/temas.yaml` | `docs/ARQUITETURA.md` §Regras de padrões |
| Endpoints, chamadas ao LLM, contexto | `backend/app.py`, `conversa.py`, `llm.py` | `backend/README.md` |
| Ler/escrever o diário, padrões | `backend/memoria.py`, `padroes.py` | `memoria/README.md` |
| Ecrã, chat, painel | `frontend/` | `frontend/README.md` |
| Dados fictícios | `memoria/` | `memoria/README.md` |
| Slides, guião da demo | `pitch/` | `pitch/README.md` |

## Regras

- Os prompts vivem em `agente/*.md` e são carregados em runtime. Nunca os escrevas dentro do código.
- Mexe só nos ficheiros da tua função. Se precisares de mudar o contrato de API, atualiza
  `docs/ARQUITETURA.md` no mesmo commit e avisa a equipa.
- Nunca inventes factos sobre o utilizador: o que não está no diário não existe.
- O texto para o utilizador final é em português de Portugal ("tu", frases curtas, sem tom de avaliação).
- Repo público: nunca faças commit do `.env` nem de chaves.
- Ao acabar uma tarefa: marca-a em `TAREFAS.md` e escreve uma linha no topo do `NOW.md`.
