# DECISÕES: o que já está decidido

> Não se volta a discutir durante o hackathon. Uma decisão nova entra aqui com a hora.

1. **Stack:** Python 3.11 + FastAPI no backend; HTML/CSS/JS sem build no frontend, servido pelo
   mesmo servidor (sem CORS, um só comando para correr).
2. **LLM:** OpenAI, com o SDK oficial. O modelo vem de `OPENAI_MODEL` no `.env`. Sem chave, o
   backend corre em modo mock, para o frontend trabalhar desde o minuto 1.
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
8. **Dados fictícios:** persona Inês; semanas W41 a W43 já no diário; a demo ao vivo é a W44
   (`DEMO_SEMANA=2026-W44`).
9. **Tom:** português de Portugal, "tu", frases curtas, sem avaliação nem cobrança.
10. **Fora de âmbito no código:** login, vários utilizadores, integrações reais (Outlook, Teams),
    base de dados, deploy. Tudo isto aparece como visão no pitch.
11. **Repo público:** nunca fazer commit do `.env` nem de chaves.
