# DECISÕES: o que já está decidido

> Não se volta a discutir durante o hackathon. Uma decisão nova entra aqui com a hora.

1. **Stack:** Python 3.11 + FastAPI no backend; HTML/CSS/JS sem build no frontend, servido pelo
   mesmo servidor (sem CORS, um só comando para correr).
2. **LLM:** GLM-5.3 da z.ai, pelo endpoint do GLM Coding Plan
   (`https://api.z.ai/api/coding/paas/v4`, compatível com OpenAI), com o SDK oficial `openai`.
   Chave, URL, modelo e esforço de raciocínio vêm do `.env` (`OPENAI_API_KEY`, `OPENAI_BASE_URL`,
   `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`). Sem chave, o backend corre em modo mock, para o
   frontend trabalhar desde o minuto 1.
   _2026-10-27 13:51, Marco: era OpenAI. Risco aceite: a z.ai só autoriza o Coding Plan dentro de
   ferramentas de código suportadas, e o uso a partir de uma app pode dar limites ou congelar a
   conta; partilhar a chave com a equipa também conta como infração. Plano B: mudar
   `OPENAI_BASE_URL` e a chave para a API geral da z.ai ou para a OpenAI, sem mexer no código._
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
