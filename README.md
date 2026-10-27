# Agente de Reflexão Semanal

> Hackathon de AI agents · Desafio 05 · Reflexão

Um agente que, em 5 minutos à sexta, conduz a reflexão da semana (o que correu bem, o que
aprendi, o que me bloqueou, como está a energia), lembra-se das semanas anteriores e devolve
um resumo, 3 prioridades, os padrões que se repetem e um pequeno ajuste de hábito.

**Todos os dados deste repositório são fictícios** (persona: Inês, consultora júnior inventada).

## Ler primeiro: o que há a fazer e quem faz o quê

Temos 3 horas. Python + GLM-5.3 da z.ai (API compatível com OpenAI). **Não há base de dados:** a memória é um diário em
ficheiros markdown (`memoria/`), que já tem 3 semanas fictícias. A demo é a 4.ª semana, em que o
agente tem de reparar que um bloqueio se repete.

| Função | O que faz | Começa por | Quem |
|---|---|---|---|
| **Frontend** | Ecrã do chat, cartão de resumo, painel do diário | [`frontend/README.md`](frontend/README.md) | _(nome)_ |
| **Backend A** | Servidor, chamadas ao LLM (z.ai), fluxo da conversa | [`backend/README.md`](backend/README.md) | _(nome)_ |
| **Backend B** | Ler/escrever o diário, deteção de padrões, filtro de segurança, testes | [`backend/README.md`](backend/README.md) | _(nome)_ |
| **Pitch A** | História, slides, ensaios | [`pitch/README.md`](pitch/README.md) | _(nome)_ |
| **Pitch B** | Guião da demo, afinar os prompts do agente, vídeo de backup | [`pitch/README.md`](pitch/README.md) | _(nome)_ |

1. Lê [`docs/SCOPE.md`](docs/SCOPE.md) (5 min): o que entra, o que fica de fora, o relógio.
2. Põe o teu nome em [`TAREFAS.md`](TAREFAS.md).
3. Abre o README da tua pasta. Tem as tarefas e um prompt pronto a colar no teu assistente de código.
4. Mexe só nos teus ficheiros (tabela em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)).

**Relógio:** T+0:20 toda a gente a construir · **T+1:30** juntar frontend e backend ·
**T+2:15** parar features e gravar o vídeo de backup · T+2:45 ensaio final.

## Como funciona

```
conversa no browser ──▶ servidor Python ──▶ z.ai (GLM-5.3)
                           │   ▲
             lê e escreve  ▼   │  agente/  (instruções, perguntas, segurança: markdown)
                         memoria/ (perfil + índice + diário: markdown)
```

- `agente/`: o "cérebro" do agente em markdown. Mudar o tom ou as perguntas é editar texto, não código.
- `memoria/`: o diário. Uma entrada por semana, legível por pessoas e pelo LLM. O cabeçalho de
  cada entrada tem etiquetas de tema, e o código conta as repetições para detetar padrões.
- Detalhe completo e contrato de API: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Correr localmente

```bash
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env
python -m uvicorn backend.app:app --reload
```

Abre http://localhost:8000. Sem `OPENAI_API_KEY` no `.env`, o backend corre em modo mock.

## Onde ficam os dados

Em ficheiros markdown em `memoria/`, no computador onde corre o servidor. Guarda-se o resumo
estruturado da semana, não a transcrição. O texto da conversa é enviado à API da z.ai (GLM) para
gerar as respostas. Detalhes em [`memoria/README.md`](memoria/README.md).

## Cuidados

O agente não é terapeuta nem faz diagnósticos. Se alguém descrever mal-estar sério, o código
pára a reflexão antes de chamar o LLM e sugere apoio humano (SNS 24: 808 24 24 24 · 112).
Regras em [`agente/SEGURANCA.md`](agente/SEGURANCA.md).

## Estrutura

```
AGENTS.md / CLAUDE.md   router para assistentes de código (Claude Code, Cursor, Codex…)
NOW.md                  diário da equipa: o que foi feito, pontas soltas (mais recente primeiro)
DECISOES.md             o que já está decidido; não se volta a discutir
TAREFAS.md              quem faz o quê e o que conta como feito
docs/                   SCOPE (plano), ARQUITETURA (contrato), ideias da equipa
agente/                 instruções do agente (markdown) + temas.yaml
memoria/                CONTEXTO.md · INDEX.md · diario/ · agenda/
backend/                Python (FastAPI)
frontend/               HTML/CSS/JS
pitch/                  slides, guião da demo
```

## Como trabalhamos

O mesmo método de contexto em ficheiros que usamos na Alinhadamente:
- Quem fecha uma tarefa marca-a em `TAREFAS.md` e escreve uma linha no topo de `NOW.md`.
- Uma decisão nova vai para `DECISOES.md`.
- Commits pequenos e frequentes para `main`; `git pull --rebase` antes de `git push`.
- Repo público: **nunca** fazer commit do `.env` nem de chaves.
