# Agente de Reflexão Semanal

Um agente de IA que, em 5 minutos à sexta-feira, conduz a reflexão da semana (o que correu bem,
o que aprendi, o que me bloqueou, como está a energia), lembra-se das semanas anteriores e
devolve um resumo, 3 prioridades, os padrões que se repetem e um pequeno ajuste de hábito.

Nasceu no desafio 05 de um hackathon de AI agents (3 horas, em equipa) e continuou depois do
hackathon: ecrã ligado à API real, notas do dia, resumo mensal, painel de consentimento e
75 testes. **Todos os dados são fictícios** (persona: Inês, consultora júnior inventada).

## O que mostra

- **Corre sem chave de API.** Sem `OPENAI_API_KEY`, o backend responde em modo mock: qualquer
  pessoa corre o projeto e os testes sem custos.
- **Independente do fornecedor.** Usa o SDK `openai` contra qualquer endpoint compatível
  (Gemini por omissão, z.ai ou OpenAI mudando só o `.env`). Se o modelo principal der 429, 5xx
  ou demorar, tenta automaticamente os modelos alternativos.
- **Prompts fora do código.** O "cérebro" do agente vive em [`agente/*.md`](agente/) e é lido
  em cada pedido. Mudar o tom ou as perguntas é editar texto, não código.
- **Padrões auditáveis.** O LLM só etiqueta cada bloqueio, aprendizagem e prioridade com um
  tema de uma lista fechada ([`agente/temas.yaml`](agente/temas.yaml)). É o código que conta as
  repetições entre semanas e decide o que é um padrão, não o modelo.
- **Segurança em duas camadas.** Um filtro em código corre *antes* do LLM: se alguém descrever
  mal-estar sério, a reflexão pára e o agente sugere apoio humano (SNS 24: 808 24 24 24 · 112).
  As regras no prompt são a segunda camada. O agente não é terapeuta e não diagnostica.
- **Consentimento aplicado no servidor.** O painel «O que o agente sabe sobre ti» liga e desliga
  o que entra no contexto do LLM (agenda, conversa livre, diário completo). Os toggles são
  respeitados pela API, não só escondidos no ecrã. «Apagar tudo» vai para uma lixeira com
  desfazer.
- **Minimização de dados.** Guarda-se o resumo estruturado da semana, não a transcrição.

## Como funciona

```
conversa no browser ──▶ servidor Python (FastAPI) ──▶ LLM (Gemini, z.ai ou OpenAI)
                           │   ▲
             lê e escreve  ▼   │  agente/  (instruções, perguntas, segurança: markdown)
                         memoria/ (perfil + índice + diário: markdown)
```

1. A pessoa conversa com o agente; a conversa usa o diário das semanas anteriores como contexto.
2. No fecho, o LLM gera o resumo, as prioridades e os temas; a pessoa revê e edita antes de guardar.
3. A semana é guardada no diário em markdown, legível por pessoas e pelo LLM.
4. O código compara com as semanas anteriores e assinala o que se repete (um bloqueio que volta,
   uma aprendizagem que se consolida).

Há também um widget de conversa livre, notas do dia, um resumo mensal e um `.ics` para pôr a
reflexão no calendário (sexta, 17:00). Contrato de API e regras de padrões:
[`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Correr localmente

```bash
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env
python -m uvicorn backend.app:app --reload
```

Abre http://localhost:8000. Sem chave no `.env`, corre em modo mock. Para usar um modelo real,
preenche `OPENAI_API_KEY` (as opções estão comentadas no [`.env.example`](.env.example)).

## Testes

```bash
python -m pytest
```

75 testes, todos sem chave de API: deteção de padrões, filtro de segurança, respostas vagas,
consentimento, notas, resumo mensal, `.ics` e o fluxo do chat. O guião da demo, com os casos do
enunciado (um bloqueio repetido na 4.ª semana, uma resposta vaga), está em
[`pitch/ROTEIRO-DEMO.md`](pitch/ROTEIRO-DEMO.md).

## Onde ficam os dados

Em ficheiros markdown em `memoria/`, no computador onde corre o servidor. Com um modelo real, o
texto da conversa é enviado à API do fornecedor escolhido para gerar as respostas. Detalhes em
[`memoria/README.md`](memoria/README.md).

## Limites

Fora de âmbito, de propósito: login, vários utilizadores, base de dados, integrações reais
(Outlook, Teams) e deploy. Está tudo descrito como próximo passo em [`roadmap.md`](roadmap.md) e
em [`docs/propostas/`](docs/propostas/).

## Como foi construído

Num hackathon de 3 horas, com o trabalho dividido por funções e o contexto em ficheiros
(`DECISOES.md`, `NOW.md`, `TAREFAS.md`, `AGENTS.md`) para que pessoas e assistentes de código
trabalhassem a partir da mesma fonte. O kit original da equipa está em
[`docs/HACKATHON.md`](docs/HACKATHON.md).

## Estrutura

```
agente/       instruções do agente (markdown) + temas.yaml
backend/      Python (FastAPI): conversa, LLM, memória, padrões, segurança, consentimento
frontend/     HTML/CSS/JS, sem build, servido pelo mesmo servidor
memoria/      perfil, índice e diário fictícios (4 semanas)
tests/        pytest
docs/         arquitetura, scope, propostas, notas do hackathon
pitch/        slides e guião da demo
AGENTS.md     router para assistentes de código · DECISOES.md · NOW.md · TAREFAS.md
```
