# ROADMAP: o que ficou por implementar

> Features que não chegaram ao protótipo do hackathon de 3 horas — por falta de tempo ou por
> decisão de âmbito (`docs/SCOPE.md`, `DECISOES.md` 10) — e a ordem por que as apanharíamos.
> O que a demo já faz: conversa de 5 minutos → resumo, 3 prioridades, padrões auditáveis entre
> semanas e um ajuste de hábito, com memória em markdown e segurança em duas camadas.

## A seguir: faltou tempo

Estas estavam no plano (MVP/P1/P2) e ficaram a caminho da linha de meta.

1. ~~**Ligar o ecrã à memória real.**~~ **Feito a 2026-10-28** (decisão 12): o ecrã novo fala com
   `/api/chat`, `/api/fechar` e `/api/guardar`; a semana guarda-se em `memoria/diario/`.
2. ~~**Métricas no painel (P1).**~~ **Feito a 2026-10-28:** energia semana a semana e prioridades
   cumpridas (X de Y) na sidebar, a partir de `GET /api/memoria`.
3. ~~**Resumo mensal (P2).**~~ **Feito a 2026-10-28:** `POST /api/resumo-mensal` devolve a
   evolução das prioridades e das aprendizagens nas últimas 4 semanas (LLM com `agente/MENSAL.md`
   ou, sem chave, texto determinístico com os factos do diário); botão "Resumo do mês" na sidebar
   abre um diálogo com o texto. No mesmo dia: exportar a semana para markdown (copiar +
   descarregar `.md`) e faixa de privacidade sempre visível em ecrãs pequenos.
4. **Lembrete de sexta-feira.** Meio caminho feito a 2026-10-28: `GET /api/ics` põe a reflexão
   recorrente no calendário da pessoa (sexta, 17:00, com as prioridades na descrição). Falta o
   aviso e-mail/push, que continua dependente de deploy.

## Visão: ficou fora por decisão, não por acidente

Decidido no âmbito (slide de visão) e mantido: cada uma merece o seu próprio projeto.

- **Login e vários utilizadores** — a demo é uma só pessoa, sem contas.
- **Integrações com apps de trabalho** — Microsoft 365 (Outlook, calendário e Teams), Google
  Workspace (Calendar, Gmail) e Slack: ler a agenda real em vez da fictícia
  (`memoria/agenda/2026-W44.md`, que o agente já lê no contexto), puxar os blocos de reuniões
  da semana para a reflexão partir de factos e abrir a conversa de sexta pelo sítio onde a
  pessoa já trabalha.
- **Transcrições de reuniões** (Teams, Meet, atas) — "em reuniões desta semana falou-se…" e
  atas automáticas.
- **Ferramentas de gestão** — Jira, Trello ou Linear: cruzar as prioridades escolhidas na
  sexta com o que se moveu nelas durante a semana.
- **Sentiment analysis** — no protótipo a energia é 1–5 dita pela própria pessoa: é mais
  honesto do que inferir emoções; inferir fica para quando houver confiança no modelo.
- **Boas práticas por papel** — só como sugestão opcional que a pessoa pode ignorar, nunca
  como avaliação (o desafio pede o contrário de "podias melhorar").
- **Métricas de equipa** — agregadas, anónimas e só com autorização; nada individual vai
  para a chefia.
- **Base de dados (SQLite/Postgres)** — o diário em markdown aguenta uma pessoa; quando
  houver vários utilizadores, passa a loja a sério.
- **Deploy e app instalada** — hoje corre à mão, um comando, na máquina de quem demonstra.
- **Voz** — falar em vez de escrever no check-in.

## O que não muda em nenhuma destas fases

Só se guarda o que a pessoa escreve; a agenda só com autorização; nada vai para a chefia;
o agente pergunta e propõe experiências, nunca dá notas nem diz "devias"
(`pitch/SLIDES.md`, slide 7; `agente/SEGURANCA.md`).
