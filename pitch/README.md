# pitch/: tarefas de quem apresenta

Duas pessoas. A **Pitch A** constrói a história e os slides. A **Pitch B** é dona da demo:
dados, prompts e testes. Marca `[x]` em `TAREFAS.md` quando cumprires o "Feito =".

| Ficheiro | Para quê |
|---|---|
| [`SLIDES.md`](SLIDES.md) | Storyline dos slides: o que cada um diz, o que mostra, quem fala |
| [`ROTEIRO-DEMO.md`](ROTEIRO-DEMO.md) | Guião da demo ao vivo (semana W44), com as respostas da Inês prontas a colar |
| [`../docs/ideias-equipa.md`](../docs/ideias-equipa.md) | O que fizemos com as ideias do brainstorm (MVP, P1, visão) |

## Pitch A: história e slides

- [ ] **P1** Confirmar com a organização a duração do pitch, os critérios do júri e o formato
  de submissão. Se forem diferentes do que está em `SLIDES.md`, ajustar e avisar a equipa. **Até T+0:20.**
- [ ] **P2** Escrever a storyline e fazer os slides (Canva, Google Slides ou outro) a partir de `SLIDES.md`. **Até T+1:30**, primeira versão.
- [ ] **P3** Diagrama da arquitetura, a partir de `docs/ARQUITETURA.md` (o desenho da secção
  "Visão geral" já serve de base). Perguntar ao Backend A se alguma coisa mudou. **Até T+1:45.**
- [ ] **P4** Slide de visão, a partir das linhas "visão no pitch" de `docs/ideias-equipa.md`. **Até T+2:00.**
- [ ] **P5** Ensaios cronometrados com a demo ao vivo, pelo menos 2. **T+2:15 a T+2:45.**

**Feito =** slides prontos em T+2:15 e pitch ensaiado 2× dentro do tempo.

## Pitch B: demo, dados e testes

- [ ] **D1** Ler a história da Inês (`memoria/README.md` + as 3 entradas em `memoria/diario/`)
  e afiná-la, se quiseres. Se mudares etiquetas de tema no frontmatter, avisa o Backend B: os
  testes dele dependem delas. **Até T+0:40.**
- [ ] **D2** Testar os prompts **antes** de o backend estar pronto. Assim o tom fica afinado
  quando a integração chegar. **T+0:40 a T+1:30.** Passos:
  1. Abre o chat do Gemini (gemini.google.com ou o AI Studio, com o modelo que está no `.env`).
  2. Cola, por esta ordem e numa só mensagem:
     `agente/AGENTE.md`, `agente/PERGUNTAS.md`, `agente/SEGURANCA.md`, `memoria/CONTEXTO.md`,
     `memoria/INDEX.md` e as 3 entradas de `memoria/diario/`. Acaba com
     "Semana atual: 2026-W44, de 26 de outubro a 1 de novembro. Começa a conversa."
  3. Faz a conversa de `ROTEIRO-DEMO.md`, colando as respostas da Inês uma a uma.
  4. Verifica: retoma as 3 prioridades da W43? Faz uma pergunta concreta depois de "Normal."?
     Repara que as reuniões já apareceram nas semanas de 5 e de 19 de outubro? Mensagens com
     2 ou 3 frases, sem listas, sem "devias"?
  5. Quando falhar, muda a regra em `agente/*.md` (texto e tom são teus; formato e marcadores
     como `<<FECHAR>>` são do Backend A, por isso avisa antes de lhes mexer). Repete a partir do passo 2.
  6. Testa também o cenário de segurança (último passo do roteiro) e uma frase que **não** pode
     disparar alerta: "Não aguento mais reuniões sem agenda."
  7. Faz commit das mudanças aos prompts com uma mensagem clara (ex.: `agente: abertura mais curta`).
- [ ] **D3** Ensaiar o roteiro com o backend real a partir de T+1:30. Cada falha vai para o topo
  de `NOW.md` numa linha: `HH:MM · pitch B · o que falhou`.
- [ ] **D4** Gravar o vídeo de backup da demo completa em **T+2:15** (gravador do sistema ou
  OBS). Guardar fora do repo e deixá-lo aberto num separador no dia.
- [ ] **D5** Cronometrar a reflexão do roteiro, da abertura ao cartão de fecho. É a prova dos
  "menos de 5 minutos". Pôr o tempo no slide 9.
- [ ] **D6** Preparar respostas curtas (2 ou 3 frases) às perguntas prováveis do júri:
  - Onde ficam os dados? (`memoria/`, em ficheiros markdown, no computador que corre o servidor)
  - O que vai para o Gemini? (no modo live, o texto da conversa, para gerar as respostas; não se guarda a transcrição)
  - E se alguém escrever algo grave? (filtro no código antes do LLM; pára a reflexão; SNS 24 e 112)
  - Porque não uma base de dados? (3 horas; os ficheiros são legíveis, auditáveis e versionados no git; a base de dados entra quando houver vários utilizadores)
  - Como escala para uma empresa? (slide 8)
  - Porque é que o chefe não vê nada? (a reflexão é da pessoa; a equipa só vê métricas agregadas e anónimas)

**Feito =** vídeo de backup gravado e roteiro corrido 2× sem falhas.
