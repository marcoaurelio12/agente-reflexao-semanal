# DECISÕES: o que já está decidido

> Não se volta a discutir durante o hackathon. Uma decisão nova entra aqui com a hora.

1. **Stack:** Python 3.11 + FastAPI no backend; HTML/CSS/JS sem build no frontend, servido pelo
   mesmo servidor (sem CORS, um só comando para correr).
2. **LLM (demo sem modelo, 2026-10-27 15:20, Marco):** a conta do Gemini ficou sem créditos
   (402) e o Marco não vai pôr crédito, por isso a demo corre com as respostas de reserva da app
   (pré-escritas, sem rótulo de modelo). O código continua pronto para o Gemini: com créditos e
   a chave no `.env`, as mensagens passam a ser do modelo sem mexer em mais nada.
   **LLM:** Gemini (Google), pelo endpoint compatível com OpenAI
   (`https://generativelanguage.googleapis.com/v1beta/openai/`), com o SDK oficial `openai`.
   Modelo principal: `gemini-3.6-flash` (~3 s por mensagem), com alternativas automáticas
   (`OPENAI_FALLBACK_MODELS=gemini-3.5-flash,gemini-3.5-flash-lite`) quando há 429, 503 ou lentidão.
   Chave, URL, modelo e esforço de raciocínio vêm do `.env` (`OPENAI_API_KEY`, `OPENAI_BASE_URL`,
   `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`). Sem chave, o backend corre em modo mock, para o
   frontend trabalhar desde o minuto 1.
   _2026-10-27 13:51, Marco: era OpenAI; passou a GLM-5.3 da z.ai (Coding Plan), com o risco
   aceite de a z.ai só autorizar o Coding Plan em ferramentas de código suportadas._
   _2026-10-27 15:02, Marco: passou a Gemini. A z.ai devolveu 429 "Insufficient balance or no
   resource package" com 3 chaves; a única que funciona é a do `glm`, que é do Coding Plan e não
   deve ser usada numa app. Plano B: mudar `OPENAI_BASE_URL`, a chave e `OPENAI_MODEL` no `.env`
   (z.ai ou OpenAI), sem mexer no código. A chave é do plano gratuito do Gemini, com quotas
   pequenas e por modelo: o `gemini-3-flash-preview` (o mais rápido, 1 a 3 s) só deixa 20 pedidos
   por dia e já foi esgotado nos testes. Um percurso completo da app gasta 10 a 15 pedidos, por
   isso poupar nos ensaios. A solução definitiva é ativar a faturação do projeto no Google AI
   Studio (decisão do Marco)._
   _2026-10-27 15:12: a API passou a devolver `402 Your prepayment credits are depleted` em todos
   os modelos. O Marco decidiu não pôr crédito: a demo corre com as respostas de reserva da app
   (o código continua pronto para o Gemini; basta haver créditos e reiniciar o servidor)._
   _2026-10-27 15:52: o Marco pôs créditos no AI Studio. A mesma chave do `.env` volta a responder
   (testado ao vivo); a demo volta a correr com o Gemini. Perguntas fechadas (sim/não ou menu de
   respostas) ficam proibidas nos prompts e no check-in do frontend; única exceção: a escala de
   energia 1-5, sempre seguida de um "porquê" aberto._
3. **Sem base de dados.** A memória é um diário em markdown em `memoria/` (perfil, índice e uma
   entrada por semana), o mesmo método com que gerimos a Alinhadamente. Uma base de dados a sério
   fica para o slide de escalabilidade.
4. **O cérebro do agente vive em `agente/*.md`.** Os prompts são lidos dos ficheiros em cada
   pedido e nunca são escritos dentro do código.
5. **Padrões auditáveis:** o LLM etiqueta cada bloqueio, aprendizagem e prioridade com um tema de
   `agente/temas.yaml`; o código conta as repetições (regras em `docs/ARQUITETURA.md`).
6. **Segurança em duas camadas:** um filtro no código antes do LLM + regras no prompt. O agente
   não é terapeuta e não diagnostica.
7. **Minimização de dados:** guarda-se a entrada estruturada da semana, não a transcrição.
8. **Dados fictícios:** persona Inês; semanas W40 a W43 já no diário; a demo ao vivo é a W44
   (`DEMO_SEMANA=2026-W44`).
   _2026-10-27 14:05, Marco: acrescentada a W40 (primeira semana, energia 5) para o diário entrar
   na demo com 4 semanas completas; os 4 padrões da W43 mantêm-se._
9. **Tom:** português de Portugal, "tu", frases curtas, sem avaliação nem cobrança.
10. **Fora de âmbito no código:** login, vários utilizadores, integrações reais (Outlook, Teams),
    base de dados, deploy. Tudo isto aparece como visão no pitch.
11. **Repo público:** nunca fazer commit do `.env` nem de chaves.
