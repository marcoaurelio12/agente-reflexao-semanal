# backend/: servidor Python (FastAPI)

Duas pessoas: **Backend A** (conversa e LLM) e **Backend B** (memória, padrões e segurança).
Os stubs já existem, com as assinaturas de `docs/ARQUITETURA.md`. Cada função faz
`raise NotImplementedError("<tarefa>")` até alguém a implementar.

## Como correr

Sempre a partir da raiz do repo.

**Windows (PowerShell)**

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn backend.app:app --reload
```

**macOS / Linux**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn backend.app:app --reload
```

Abrir http://localhost:8000. Sem `OPENAI_API_KEY` no `.env`, o servidor corre em modo mock.
Testes: `python -m pytest`. Reset da demo: `python -m backend.reset_demo`.

## Quem é dono de quê

| Ficheiro | Dono |
|---|---|
| `app.py`, `conversa.py`, `llm.py`, `../requirements.txt` | Backend A |
| `memoria.py`, `padroes.py`, `seguranca.py`, `reset_demo.py`, `../tests/` | Backend B |

Não mexas nos ficheiros da outra pessoa. Se precisares de mudar uma assinatura, combina com
ela e atualiza `docs/ARQUITETURA.md` no mesmo commit.

## Backend A: conversa e LLM

| Tarefa | O quê | Prazo |
|---|---|---|
| A1 | Servidor a correr + `llm.py` com modo mock (sem chave) | T+0:40 |
| A2 | `montar_contexto()`: prompts + diário + padrões + agenda + semana atual | |
| A3 | `POST /api/chat`: abertura, perguntas, seguimento se vago, marcador de fecho | |
| A4 | `POST /api/fechar` (JSON do FECHO.md + padrões) e `POST /api/guardar` | |
| A5 | `GET /api/memoria` | checkpoint T+1:30 |
| A6 | (P2) `POST /api/resumo-mensal` | só se sobrar tempo |

**Feito =** os testes de aceitação 1 a 3 de `docs/SCOPE.md` passam com a chave real.

## Backend B: memória, padrões e segurança

| Tarefa | O quê | Prazo |
|---|---|---|
| B1 | `memoria.py`: ler contexto, índice, diário e agenda; guardar semana | T+0:40 |
| B2 | `padroes.py`: as 4 regras + métricas | |
| B3 | `seguranca.py`: filtro de mal-estar sério + respostas vagas | |
| B4 | `tests/`: os 3 cenários (padrão na 4.ª semana, resposta vaga, mal-estar) | |
| B5 | `reset_demo.py` | |
| B6 | Apoiar o Backend A na integração | checkpoint T+1:30 |

**Feito =** `detetar()` sobre W41 a W43 devolve exatamente os 4 padrões do frontmatter de
`memoria/diario/2026-W43.md`, e `python -m pytest` está verde.

## Prompt para o Backend A (colar no teu assistente de código)

```text
Estás no repo agente-reflexao-semanal. Antes de escrever código, lê AGENTS.md, DECISOES.md,
docs/ARQUITETURA.md e docs/SCOPE.md.

A tua parte: backend/app.py, backend/conversa.py e backend/llm.py (Python 3.11, FastAPI, SDK
oficial openai, pyyaml, python-dotenv). As funções já existem como stubs; implementa-as sem
mudar as assinaturas. NÃO mexas em backend/memoria.py, padroes.py, seguranca.py, reset_demo.py
nem em tests/ — são do Backend B. Enquanto essas funções derem NotImplementedError, usa
valores temporários dentro do teu código, nunca nos ficheiros dele.

1. llm.py
   - Lê OPENAI_API_KEY e OPENAI_MODEL do .env (python-dotenv). Usa o SDK oficial openai.
   - responder(system, mensagens) -> str.
   - extrair_json(system, mensagens) -> dict: usa response_format JSON; se o JSON vier
     inválido, tenta 1 vez mais; se voltar a falhar, levanta um erro claro.
   - Modo mock quando não há chave: respostas pré-escritas que seguem o fluxo
     abertura -> 4 perguntas (correu bem, aprendi, bloqueou, energia 1 a 5) -> mensagem final
     que acaba com <<FECHAR>> na última linha. Escolhe a resposta pelo número de mensagens do
     utilizador. extrair_json em mock devolve um JSON de fecho fixo e válido no formato de
     agente/FECHO.md. Serve para o frontend trabalhar sem chave.
2. conversa.py
   - montar_contexto(nota_extra) junta as partes pela ordem de docs/ARQUITETURA.md §Contexto.
   - montar_contexto_fecho() segue a mesma secção.
   - Os prompts são lidos dos ficheiros de agente/ e memoria/ em cada pedido. Nunca escrevas
     texto de prompt dentro do código Python.
3. app.py — endpoints exatamente como em docs/ARQUITETURA.md §API:
   - POST /api/chat: corre seguranca.verificar() na última mensagem do utilizador ANTES de
     chamar o LLM; se houver alerta, devolve a resposta fixa e alerta_seguranca=true, sem LLM.
     Se seguranca.e_vaga() der True, passa a nota "A última resposta foi vaga: faz UMA pergunta
     de seguimento concreta; não assumas nada." a montar_contexto(). Remove <<FECHAR>> da
     resposta e devolve pronto_para_fechar=true quando ele aparecer.
   - POST /api/fechar: extrair_json com montar_contexto_fecho() -> acrescenta semana, periodo
     e registado_em (memoria.semana_atual()) -> padroes.detetar(metas das semanas anteriores +
     memoria.meta_de(esta semana)) -> campo padroes. Não guarda.
   - POST /api/guardar: memoria.guardar_semana(); devolve {"ficheiro": caminho}.
   - GET /api/memoria: contexto, semanas, padrões e métricas, no formato de §API.
   - Mantém o app.mount do frontend no fim do ficheiro.

Testa com: python -m uvicorn backend.app:app --reload (a partir da raiz) e pedidos curl.
Feito = os testes de aceitação 1 a 3 de docs/SCOPE.md passam com a chave real.
Ao terminar uma tarefa: marca-a em TAREFAS.md e escreve 1 linha no topo de NOW.md.
```

## Prompt para o Backend B (colar no teu assistente de código)

```text
Estás no repo agente-reflexao-semanal. Antes de escrever código, lê AGENTS.md, DECISOES.md,
docs/ARQUITETURA.md, docs/SCOPE.md, agente/SEGURANCA.md, agente/PERGUNTAS.md e
memoria/diario/2026-W43.md (é a entrada de referência).

A tua parte: backend/memoria.py, backend/padroes.py, backend/seguranca.py,
backend/reset_demo.py e tests/ (Python 3.11, pyyaml, pytest). As funções já existem como
stubs; implementa-as sem mudar as assinaturas. NÃO mexas em backend/app.py, conversa.py nem
llm.py — são do Backend A.

1. memoria.py
   - Lê UTF-8. O frontmatter é o bloco YAML entre as duas primeiras linhas '---'; faz o parse
     com pyyaml. O resto é o markdown; resumo = texto da secção "## Resumo".
   - listar_semanas() devolve por ordem cronológica (mais antiga primeiro).
   - meta_de(semana) converte o JSON do /api/fechar para o formato do frontmatter:
     temas = {bloqueios, aprendizagens, prioridades} com os ids; prioridades_anteriores =
     {feitas, parciais, total} contando estado "feito" e "em-parte".
   - guardar_semana(semana) escreve memoria/diario/<semana>.md no formato exato de
     2026-W43.md (mesmo frontmatter, mesmas secções e pela mesma ordem; título "Semana de X a
     Y de <mês>") e acrescenta a linha nova no topo da lista do INDEX.md, no formato que lá
     está. Devolve o caminho relativo, ex.: "memoria/diario/2026-W44.md".
   - semana_atual() calcula a semana ISO de hoje, mas respeita DEMO_SEMANA do .env.
2. padroes.py — detetar(metas) com as 4 regras de docs/ARQUITETURA.md §Regras de padrões
   (janela de 4 semanas; TEMAS_NEUTROS não contam). As mensagens usam os nomes legíveis de
   agente/temas.yaml e o formato das mensagens que estão em 2026-W43.md.
   metricas(metas): energia por semana + soma de prioridades_anteriores.
3. seguranca.py — verificar(texto): compara em minúsculas e sem acentos
   (unicodedata.normalize("NFKD") e retirar os acentos) com as expressões de
   agente/SEGURANCA.md; devolve {"nivel", "resposta"} com a resposta fixa de lá, ou None.
   Podes copiar as listas para um dicionário no código. "não aguento mais reuniões sem
   agenda" NÃO pode disparar. e_vaga(texto): menos de 4 palavras, ou só as expressões vagas
   de agente/PERGUNTAS.md.
4. reset_demo.py — apaga memoria/diario/2026-W44.md e a linha dela no INDEX.md, se existirem.
5. tests/ (pytest):
   - test_padroes.py: detetar() sobre W41 a W43 devolve exatamente os 4 padrões do
     frontmatter de 2026-W43.md; com uma W44 de teste (em memória, sem escrever no disco)
     com bloqueio reunioes-excessivas -> bloqueio_recorrente com 3 semanas
     (2026-W41, 2026-W43, 2026-W44).
   - test_seguranca.py: "estou em baixo há semanas e não vejo saída" -> apoio;
     "quero morrer" -> urgente; "não aguento mais reuniões sem agenda" -> None.
   - test_vaga.py: "normal" e "sei lá" -> True; uma resposta com uma frase completa -> False.
   - Os testes não podem deixar ficheiros novos em memoria/.

Feito = detetar() sobre W41 a W43 devolve os 4 padrões de 2026-W43.md e python -m pytest
está verde. Ao terminar uma tarefa: marca-a em TAREFAS.md e escreve 1 linha no topo de NOW.md.
```
