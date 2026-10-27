# Scope plan: Agente de Reflexão Semanal

> Desafio 05 · Reflexão. Temos ~3 horas. Este documento diz o que construímos, o que fica
> de fora e por que ordem. Se uma ideia nova não está aqui, vai para o slide de visão.

## Numa frase

Em 5 minutos à sexta, o agente conversa contigo sobre a semana, lembra-se das anteriores e
devolve um resumo, 3 prioridades, os padrões que se repetem e um pequeno ajuste de hábito.

## Utilizadora da demo

**Inês, 27 anos, consultora júnior** (persona fictícia: `memoria/utilizador.yaml`).
Já tem 4 semanas registadas (W40 a W43). A demo ao vivo é a W44, onde ela volta
a falar de "reuniões a mais", um bloqueio que já apareceu duas vezes.

## Base de dados? Não: um diário em markdown

Em 3 horas, uma base de dados (esquema, código de acesso, migrações) gasta 45 minutos e não se
vê na demo. Usamos o método com que o Marco gere a Alinhadamente: **ficheiros markdown**.

- `memoria/CONTEXTO.md`: quem é a pessoa (perfil, papel, objetivos).
- `memoria/INDEX.md`: uma linha por semana; é o primeiro ficheiro que o agente lê.
- `memoria/diario/2026-W41.md`: uma entrada de diário por semana. O corpo é texto legível; o
  cabeçalho (frontmatter YAML) tem a energia e as etiquetas de tema que o código usa para contar padrões.

O que ganhamos: zero setup, o LLM lê o diário diretamente, o júri pode abrir o ficheiro e ver
"onde ficam os dados" (é um dos pedidos do desafio) e o git guarda o histórico. Uma base de
dados a sério (SQLite ou Postgres) vai para o slide de escalabilidade.

## MVP: sem isto não há demo

| # | Pedido do desafio | Como cumprimos | Dono |
|---|---|---|---|
| 1 | Conversa curta: correu bem, aprendi, bloqueou, energia | Abertura que retoma as prioridades da semana passada + 4 perguntas; menos de 5 min | Backend A + `agente/` |
| 2 | Resumir a semana em poucas linhas | 3 a 4 frases no cartão de fecho | Backend A (`agente/FECHO.md`) |
| 3 | 3 prioridades concretas | Verbo + o quê + quando; a pessoa pode editá-las antes de guardar | Backend A + Frontend |
| 4 | Comparar com semanas anteriores e assinalar padrões | O LLM classifica cada item num tema (`agente/temas.yaml`); o código conta as repetições; o agente refere-as na conversa | Backend B |
| 5 | Sugerir um ajuste de hábito ou método | Uma experiência pequena para a semana seguinte ("Experimenta…") | Backend A (`agente/FECHO.md`) |
| 6 | Memória entre semanas | Uma entrada de diário em markdown por semana em `memoria/diario/` | Backend B |
| 7 | Teste: bloqueio repetido na 4.ª semana | "Reuniões a mais" em W41 e W43 → em W44 é a 3.ª vez | Backend B + Pitch B |
| 8 | Teste: resposta vaga → perguntar, não inventar | Regra no prompt + deteção no código que força uma pergunta de seguimento | Backend A + B |
| 9 | Não é terapeuta; mal-estar sério → apoio humano | Filtro no código **antes** do LLM + SNS 24 / 112 | Backend B |
| 10 | Dados sensíveis: fictícios e dizer onde ficam | Faixa fixa no ecrã + `memoria/README.md` + slide | Frontend + Pitch |
| 11 | Sem tom de avaliação ou cobrança | Regras de tom em `agente/AGENTE.md`; nada de notas, verdes/vermelhos ou "devias" | `agente/` + Frontend |

## P1: só depois do checkpoint de T+1:30, e só se o MVP passar nos testes

- **Agenda da semana** (`memoria/agenda/2026-W44.md`, fictícia) para personalizar a abertura:
  "Vi que tiveste o workshop com o cliente na quarta. Como correu?". É a ideia "ler agenda"
  da equipa e custa só um ficheiro a mais no contexto.
- **Métricas no painel:** energia por semana, prioridades cumpridas (X de Y), número de padrões.
- **Prioridades editáveis** no cartão antes de guardar.

## P2: só se sobrar tempo

- **Resumo mensal:** evolução das prioridades e das aprendizagens nas 4 semanas (o "para ir mais além").
- Exportar a semana para markdown.

## Fora de âmbito (vai para o slide de visão, não para o código)

Login e vários utilizadores · integração real com Outlook/Teams · transcrições de reuniões ·
boas práticas por papel · métricas de equipa · base de dados · deploy · voz.
O mapa completo das ideias da equipa está em [`ideias-equipa.md`](ideias-equipa.md).

## Testes de aceitação (correr antes do feature freeze)

1. **Padrão na semana da demo.** Com W40 a W43 carregadas, dizer "outra vez reuniões a mais": o
   agente refere que já aconteceu antes (com as datas) e o cartão mostra "bloqueio recorrente
   em 3 das últimas 4 semanas".
2. **Resposta vaga.** Responder "normal": o agente faz uma pergunta concreta. O cartão final
   não tem nada que a pessoa não tenha dito.
3. **Mal-estar sério.** Escrever "estou em baixo há semanas e não vejo saída": o agente pára a
   reflexão, não diagnostica e indica apoio humano (SNS 24, 112).
   Ao contrário: "não aguento mais reuniões sem agenda" **não** pode disparar o alerta.
4. **Tempo.** A conversa do roteiro cabe em menos de 5 minutos.
5. **Memória.** Depois de guardar, existe `memoria/diario/2026-W44.md`, o `INDEX.md` tem uma
   linha nova e o painel mostra 5 semanas.

## Plano das 3 horas (T = hora de arranque)

| Quando | O quê | Feito quando |
|---|---|---|
| T+0:00 → 0:20 | Ler este doc + o README da tua pasta; pôr o nome em `TAREFAS.md`; ambiente a correr | Toda a gente sabe o que faz até T+1:30 |
| T+0:20 → 1:30 | Construir em paralelo. O frontend trabalha com dados mock; o Pitch B testa os prompts no ChatGPT | Cada função tem a sua parte a funcionar sozinha |
| **T+1:30** | **Checkpoint 1: integração.** Frontend ligado ao backend real | Testes 1 e 2 passam |
| T+1:30 → 2:15 | Testes 3 a 5, P1, afinar o tom dos prompts | Os 5 testes passam |
| **T+2:15** | **Feature freeze.** Só correções. Gravar o vídeo de backup da demo | Vídeo gravado |
| T+2:15 → 2:45 | Ensaiar o pitch 2× com a demo ao vivo | Dentro do tempo, sem falhas |
| T+2:45 → 3:00 | Margem | |

## Riscos

| Risco | Mitigação |
|---|---|
| A API da z.ai falha, fica lenta ou congela a conta (Coding Plan) na demo | Vídeo de backup (T+2:15) + modo mock + `OPENAI_BASE_URL` para a API geral ou a OpenAI |
| O JSON do fecho vem mal formado | `response_format` JSON + validação + 1 nova tentativa |
| A integração atrasa | Contrato de API fechado desde o início (`ARQUITETURA.md`); o frontend trabalha com mock |
| O LLM não repara no padrão | Os padrões são calculados no código e entram no contexto; o cartão mostra-os sempre |
| O âmbito cresce | Nada fora do MVP antes de T+1:30; ideias novas vão para o slide de visão |
| Conflitos no git | Cada função mexe só nos seus ficheiros (tabela em `ARQUITETURA.md`) |
