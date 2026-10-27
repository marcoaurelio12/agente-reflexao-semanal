# NOW: diário da equipa (mais recente primeiro)

> Uma linha por tarefa fechada ou problema encontrado: `T+h:mm · função · o quê`.
> Pontas soltas na secção de baixo: ninguém sai sem as ver.

## 2026-10-27

- 15:36 · frontend · Perguntas livres: um texto com "?" já não conta como resposta ao guião. Com
  modelo, responde em 1 ou 2 frases e repete a pergunta pendente; sem modelo (Gemini sem crédito,
  402), mostra uma linha fixa e repete a pergunta. Não grava nada nem avança. O `.env` fica no
  Gemini; o Marco trata do crédito no AI Studio. Por testar com um modelo real.
- 15:17 · frontend · Sem resposta do modelo, a mensagem de reserva aparece só como "Agente" (sem
  nota laranja nem "· Gemini") e a app deixa de tentar o Gemini até recarregar a página. Saiu do
  Perfil o bloco das transcrições (descrição, lista de reuniões, "Nível de acesso"). Roteiro e
  decisão 2 dizem que a demo corre com respostas pré-escritas: avisar o júri.
- 15:12 · LLM · Passou-se de z.ai a Gemini (decisão 2): `.env.example`, `llm.py` (modelo
  principal `gemini-3.6-flash` + alternativas em `OPENAI_FALLBACK_MODELS` com 429/5xx/lentidão, 10 s
  por tentativa e 24 s no total), textos e etiquetas "GLM" → "Gemini". O Gemini respondeu bem
  (1 a 3 s) mas esgotou as quotas gratuitas e agora dá `402 prepayment credits are depleted` em
  todos os modelos: a demo corre com as respostas de reserva (o Marco não põe crédito). Por
  confirmar: tratamento de dados do Gemini (plano gratuito/pago) para o slide de confiança; se
  houver créditos, um ensaio real (10 a 15 pedidos) antes da demo.
- 15:10 · frontend + Backend B · Filtro de mal-estar do frontend corrigido: `app.js` usa as mesmas
  expressões de `backend/seguranca.py` (constante `BEM_ESTAR`) e corre em todas as respostas, antes
  da validação (já apanha a frase de mal-estar na pergunta da energia). Antes falhava "quero
  morrer", "não vejo saída" e "em baixo há semanas", e disparava em "não aguento mais reuniões sem
  agenda" e "exausta". Dois níveis: apoio (como antes, com o 112 no texto) e urgente (112 primeiro,
  só "Terminar por hoje"). Chips de teste e roteiro atualizados (a frase de teste passa a ser "Estou
  em baixo há semanas e não vejo saída."). `tests/test_seguranca.py` falha se a lista do `app.js`
  divergir da do backend; `conftest.py` força o modo mock (30 testes verdes mesmo com chave no
  `.env`). Verificado no browser: apoio, urgente na energia e o contraexemplo.
- 14:50 · frontend · F7: o chat deixa de mostrar `get_day_context()`, `get_history()`,
  `find_patterns()`, `wellbeing_check()` e `save_day()`; as chamadas continuam e vão para um
  registo interno (`reflexaoDiag()` na consola, com os códigos de erro do GLM). Saem do ecrã
  `save_week → data/marta/semana-04.yaml`, os nomes `semana-0N.yaml` e a nota yaml/Pydantic. O botão
  passa a "Guardar semana", o histórico mostra "Semanas guardadas" e a semana abre legível (não
  YAML). Erro no "Reescrever com o GLM" passa a ter aviso (antes era engolido). Roteiro atualizado.
  Testado no browser: check-in de quinta, padrão, relatório, editar e guardar, perfil, apagar,
  mal-estar; sem erros de JS; pytest 29 verdes em modo mock.
- 14:35 · integração · Frontend novo (ex-artifact do Claude) ligado ao GLM: `frontend/ponte.js`
  faz de `window.claude.use("sample")` e chama `/api/llm`. Sem chave fica no guião. Rótulos
  "Claude" → "GLM". Roteiro reescrito para o fluxo novo (Marta, check-ins diários); pytest: 29
  verdes. Atenção: o "Aprovar e gravar" do frontend é simulado no browser (não escreve em
  `memoria/`), as frases de alerta são as do `app.js` e o cartão de apoio não tem o 112.
- 14:24 · Backend · B4 feito: `tests/` em pytest, 24 testes verdes em 2 s (`python -m pytest`, sem
  rede nem escritas em `memoria/`; o `/api/guardar` é testado numa pasta temporária; `reset_demo`
  antes e depois). Cobre os 3 cenários do desafio e os "utilizadores difíceis" no `/api/chat`:
  "Normal." → a nota de resposta vaga chega ao system do LLM (stub); mal-estar (apoio/urgente)
  devolve a resposta fixa e o LLM não é chamado; "não aguento mais reuniões sem agenda" passa ao
  LLM; roteiro completo → `pronto_para_fechar` com `<<FECHAR>>` removido; `/api/fechar` devolve os
  4 padrões do passo 10 do roteiro; `/api/guardar` → diário + INDEX + painel com 5 semanas.
  Instalado `httpx` no venv (só para o TestClient). Falta: repetir com a chave real.
- 14:20 · Backend · Bateria de testes do backend em modo mock (sem chave): tudo verde. Lógica pura:
  `detetar()` W41–W43 = os 4 padrões do frontmatter da W43; W44 c/ "reuniões a mais" →
  `bloqueio_recorrente` em 3 das últimas 4; segurança (apoio/urgente/112/SNS 24) e "não aguento
  mais reuniões sem agenda" não dispara; `e_vaga` ok. Endpoints contra o contrato: roteiro da
  demo inteiro no `/api/chat` (abertura retoma as prioridades, pergunta concreta após "Normal.",
  `<<FECHAR>>` removido, `pronto_para_fechar`), `/api/fechar` (campos + temas válidos + padrões
  do passo 10 do roteiro), `/api/guardar` (W44 no formato exato da W43, idempotente, semana
  inválida → 400), `/api/memoria` (5 semanas, métricas), contexto na ordem do contrato.
  `reset_demo` deixa o repo limpo. Falta: repetir com a chave real (o mock não testa o GLM nem
  o "não inventar nada" do fecho).
- 14:07 · Backend · Backend mínimo feito (A2–A5, B1–B3, B5): memória, padrões, segurança,
  contexto e os 4 endpoints. `detetar()` sobre W41–W43 = padrões da W43; o roteiro corre em mock
  até ao `memoria/diario/2026-W44.md`, com os mesmos padrões do `mock.js`. Falta: testar com a
  chave real; B4 (pytest) e A6 ficam de fora.
- 14:05 · dados · Diário da Inês passa a 4 semanas: criada a W40 (28 set a 4 out, primeira
  semana, energia 5). Atualizados: `INDEX.md`, `CONTEXTO.md` (começa 2026-10-02), a W41 (deixa de
  ser a primeira e revê as prioridades da W40), README da `memoria/`, DECISÕES 8, `README.md` e
  `SCOPE.md`. Os 4 padrões guardados na W43 não mudam; a W40 não entra na janela da demo (últimas
  4 semanas = W41–W44).
- 14:00 · Backend A · A1 feito. O LLM passa a ser o GLM-5.3 da z.ai pelo Coding Plan (decisão 2
  em `DECISOES.md`, com o risco aceite). `llm.py`: chamada real (JSON + 1 nova tentativa) e modo
  mock com a conversa da W44 de `frontend/mock.js`. Servidor arranca; `/api/*` dão 501 até A3–A5.
- T+0:00 · setup · Repo criado: scope, arquitetura, instruções do agente (`agente/`), diário
  fictício da Inês com 3 semanas (`memoria/`), stubs do backend, mock do frontend, guião da demo
  e tarefas por função. A seguir: cada pessoa põe o nome em `TAREFAS.md` e arranca.

## Pontas soltas

- **A conta da z.ai da chave no `.env` está sem saldo** (14:45: `429 - Insufficient balance or no
  resource package. Please recharge.`). Enquanto não for carregada, todas as mensagens do agente
  são as de reserva e o "Reescrever com o GLM" falha. Carregar e ensaiar antes da demo.
- Pôr a chave do Coding Plan no `.env` (só na máquina da demo, não se partilha) e correr o
  roteiro uma vez com o GLM; depois `python -m backend.reset_demo`.
- Ainda dizem "OpenAI": `frontend/README.md` (texto da faixa de privacidade), `memoria/README.md`,
  `pitch/SLIDES.md` (slide 7), `pitch/README.md` e `pitch/ROTEIRO-DEMO.md`. Passa a "z.ai (GLM)";
  cada dono atualiza o seu.
- O frontend ainda não está no repo (só o placeholder): fazer push para testar contra o backend.
- Confirmar a duração do pitch e os critérios do júri → ajustar `pitch/SLIDES.md` (Pitch A, P1).
- `pitch/ROTEIRO-DEMO.md` ainda diz "3 semanas, energia 4 → 3 → 2": atualizar para 4 semanas,
  energia 5 → 4 → 3 → 2 (Pitch B).
- `frontend/mock.js` ainda não tem a W40 no painel do mock: acrescentar (Frontend).
- Convidar os colegas como colaboradores no GitHub (Settings → Collaborators), para poderem fazer push.
