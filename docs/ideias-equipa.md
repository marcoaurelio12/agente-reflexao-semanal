# Ideias da equipa: o que entra e onde

> Vem do brainstorm da equipa, feito antes de usarmos IA. Cada ideia tem uma decisão: **MVP**
> (entra na demo), **P1** / **P2** (se houver tempo; ver `SCOPE.md`), **visão** (só no pitch)
> ou **fora**.

| Ideia do brainstorm | Decisão | Onde está |
|---|---|---|
| Ler a agenda | **P1**: agenda fictícia da semana da demo | `memoria/agenda/2026-W44.md` |
| Personalizar as perguntas com o contexto | **MVP**: a abertura retoma as prioridades da semana passada · **P1**: refere um evento da agenda | `agente/AGENTE.md` (Fluxo, passo 0) |
| Perguntas preparadas com base científica | **MVP**: ciclo reflexivo de Gibbs + modelo de Rolfe | `agente/PERGUNTAS.md` |
| Contexto inicial e perfil da pessoa, cargo | **MVP** | `memoria/CONTEXTO.md` |
| Armazenar a informação | **MVP**: diário em markdown, uma entrada por semana | `memoria/diario/` + `memoria/INDEX.md` |
| Perguntas rápidas de base diária | **Fora**: o desafio é semanal e em 5 minutos | |
| Métricas gerais e pessoais, produtividade | **P1**: energia por semana, prioridades cumpridas, padrões | Painel do frontend · `backend/padroes.py` |
| Fatores de burnout → encaminhar para ajuda profissional | **MVP**, como regra de segurança e sem diagnóstico | `agente/SEGURANCA.md` · `backend/seguranca.py` |
| Grau de liberdade para sugerir algo em que não tínhamos pensado | **MVP**: o ajuste de hábito | `agente/FECHO.md` (regra 5) |
| Relatório final de reflexão semanal | **MVP**: o cartão de fecho | `agente/FECHO.md` · frontend |
| Que decisões foram tomadas, gestão de tempo | **MVP**, só quando a pessoa o diz: entra em "correu bem", "bloqueou" e nas prioridades | `agente/FECHO.md` |
| Recomendar soluções | **MVP**, reformulado: um ajuste pequeno, como experiência ("Experimenta…") | `agente/FECHO.md` |
| Resumo mensal | **P2** | `POST /api/resumo-mensal` em `docs/ARQUITETURA.md` |
| Transcrições de reuniões, Teams, atas | **Visão** | `pitch/SLIDES.md`, slide 8 |
| "Em reuniões desta semana falou-se…" | **Visão** (precisa das transcrições) | `pitch/SLIDES.md`, slide 8 |
| Sentiment analysis | **Visão**. No MVP só a energia de 1 a 5, dita pela própria pessoa: é mais honesto do que inferir emoções | `agente/PERGUNTAS.md` (pergunta 4) |
| Analisar temas de comunicação | **MVP** em pequeno: tema `comunicacao` na lista de bloqueios | `agente/temas.yaml` |
| Boas práticas por papel (ex.: consultor numa reunião de avaliação de projeto) | **Visão**, com cuidado: o desafio pede para evitar o tom de avaliação. Entra como "sugestão de prática" opcional, nunca como nota | `pitch/SLIDES.md`, slide 8 |
| Especializar numa equipa ou framework primeiro | **Pitch**: go-to-market. Começar por uma equipa (ex.: consultoria) | `pitch/SLIDES.md`, slide 8 |
| Perceber responsabilidades da pessoa | **MVP** em pequeno: papel e objetivos no perfil | `memoria/CONTEXTO.md` |
| Plataforma empresarial com base de dados para os inputs | **Visão**: base de dados a sério quando houver vários utilizadores | `docs/SCOPE.md` · slide 8 |
| Script automático (lembrete à sexta) | **Fora** do protótipo; cabe na visão | |
| Gostos e rotinas como input | **Fora** por agora; o perfil tem só as preferências da reflexão | `memoria/CONTEXTO.md` |
| Perceber o nível de invasão de dados que é aceitável | **Pitch**, como princípios: só o que a pessoa escreve; a agenda só com autorização; nada vai para a chefia; métricas de equipa só agregadas e anónimas | `pitch/SLIDES.md`, slide 7 |
| Estabelecer balizas, limites e objetivos | **MVP**: limites em `SEGURANCA.md`; objetivos no perfil; 3 prioridades por semana | `agente/` · `memoria/CONTEXTO.md` |
| "Podias melhorar aqui e ali" | **Reformulado**: o agente pergunta e propõe experiências, não avalia | `agente/AGENTE.md` (Tom) |

## Tensão a resolver na equipa

Parte do brainstorm puxa para **avaliar** a pessoa: comparar com boas práticas do papel,
dizer onde podia melhorar, medir a produtividade. O desafio pede o contrário: **ajudar a
pensar**, sem tom de avaliação nem cobrança.

A nossa proposta: o agente nunca dá notas nem diz "devias". Pergunta, mostra padrões com
factos e sugere uma experiência pequena. As boas práticas por papel ficam para a visão, e
só entram como sugestão que a pessoa pode ignorar. Se a equipa quiser outro equilíbrio,
decide-se antes do pitch e regista-se em `DECISOES.md`.
