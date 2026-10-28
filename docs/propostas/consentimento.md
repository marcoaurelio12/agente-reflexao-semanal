# Proposta: painel de consentimento — «O que o agente sabe sobre ti»

> Proposta de design, 2026-10-28. Não decidido nem implementado; alvo: tornar a promessa de privacidade visível e verificável num ecrã.

## 1. Problema

A privacidade é a identidade do produto (DECISÕES 7, roadmap: «a agenda só com autorização»,
«nada vai para a chefia»), mas hoje é só um texto fixo no rodapé da sidebar. E a promessa
«agenda só com autorização» não existe no código: `conversa.py` lê `memoria/agenda/<semana>.md`
sempre que o ficheiro existe. Um painel que mostre o que o agente lê, o que sai para o Gemini e
o que fica guardado — com toggles que o código respeita — transforma o discurso em mecanismo.

## 2. Proposta de UX

**Onde entra:** o rodapé da sidebar («Dados fictícios…») passa a botão e abre um **diálogo
sobreposto**, no padrão do widget (sem terceira vista nem subtabs); atalho também junto ao
badge do modo, no topo.

**O que mostra** (três blocos fixos, por ordem «lê → envia → guarda»):

- **O que o agente lê**: o que escreves na conversa (historial inteiro, a cada mensagem); o
  diário (`CONTEXTO.md`, `INDEX.md`, `diario/*.md` — 4 semanas na reflexão, todas no widget);
  a agenda desta semana — **só com autorização**.
- **O que é enviado ao Gemini**: as tuas mensagens + as secções de memória acima, montadas no
  system prompt. Em modo «respostas de exemplo» nada sai do computador.
- **O que fica guardado e onde**: no navegador, as conversas e a conversa livre
  (`reflexao.conversas.v1`, `reflexao.geral.v1`); no servidor, só o resumo estruturado de cada
  semana (`memoria/diario/*.md`). A transcrição nunca é guardada.

**Toggles** (3 primeiros no servidor; o 4.º no navegador):

| Toggle | Omissão | Efeito quando off |
|---|---|---|
| Ler a agenda desta semana | off | a secção «Agenda desta semana» não entra no contexto |
| Conversa livre (widget) | on | `modo:"geral"` → 403; o widget desaparece |
| Widget com diário completo | off | o widget lê só as últimas 4 semanas (minimização) |
| Guardar conversas no navegador | on | ao guardar a semana, a conversa sai do `localStorage` |

**Ações**: «Ver tudo» (texto integral das secções de memória montadas na hora), «Exportar
tudo» (um ficheiro com conversas + diário + consentimento) e «Apagar tudo» (confirmação em dois
passos + «Desfazer» 15 s, como no ecrã antigo; o diário vai para uma lixeira no servidor).

```
┌─ O que o agente sabe sobre ti ──────────────── × ┐
│ O agente só trabalha com o que está aqui.        │
│ O AGENTE LÊ                        [ver tudo]    │
│  · O que escreves na conversa (a cada mensagem)  │
│  · Diário: CONTEXTO, INDEX e últimas 4 semanas   │
│  · Agenda desta semana      off ○──·──○  só com autorização
│  · Conversa livre (widget)  on  ●──·──●          │
│      └ lê o diário: últimas 4 semanas ▾          │
│ É ENVIADO AO GEMINI  (agora: Gemini)             │
│  · As tuas mensagens + as secções de memória.    │
│ FICA GUARDADO                                    │
│  · Navegador: conversas e conversa livre [desligar]
│  · Servidor: só o resumo de cada semana;         │
│    a transcrição nunca é guardada.               │
│         [Exportar tudo]     [Apagar tudo]        │
└──────────────────────────────────────────────────┘
```

## 3. API e dados

**Persistência:** `memoria/CONSENTIMENTO.md` (frontmatter YAML + uma linha de histórico por
mudança), coerente com o diário: sem base de dados, auditável pelo júri. Sem login, os toggles
do servidor valem para «a pessoa» (DECISÕES 10); o 4.º e o «apaguei as conversas» vivem no
`localStorage` (`reflexao.consentimento.v1`). Com vários navegadores, manda o `.md`: é o
servidor quem o lê.

**Endpoints** (a acrescentar a `docs/ARQUITETURA.md` §API):

```json
// GET /api/consentimento
{"consentimento": {"agenda": false, "conversa_livre": true,
                   "diario_completo_no_widget": false},
 "atualizado_em": "2026-10-28T13:05:00", "fonte": "memoria/CONSENTIMENTO.md"}
// PUT /api/consentimento — {"consentimento": {…mesmas chaves, sempre todas…}} → mesmo objeto
// GET /api/consentimento/contexto?modo=semanal|geral
//   → {"contexto": "## Quem é a pessoa\n…"} — só as secções de DADOS (itens 4-9); sem LLM
// DELETE /api/memoria → diario/*.md p/ memoria/.lixeira/<ts>/, INDEX limpo, token_desfazer
// POST /api/memoria/restaurar {"token_desfazer": "…"} → recoloca tudo (o «Desfazer»)
```

«Exportar tudo» não precisa de endpoint: o frontend junta o `localStorage` + `GET /api/memoria` num ficheiro único.

**O que muda em `backend/conversa.py`** (o consentimento é lido em cada pedido, como os prompts):

```python
def montar_contexto(nota_extra=None):
    c = consentimento.carregar()   # memoria/CONSENTIMENTO.md → dict (com omissões)
    partes = […]                   # igual; a agenda só entra se c["agenda"] for True

def montar_contexto_geral():
    c = consentimento.carregar()
    semanas = listar_diario_completo() if c["diario_completo_no_widget"] else semanas_anteriores()
```

Em `backend/app.py` (`/api/chat`): `modo=="geral"` com `conversa_livre` off → 403 em pt-PT; o
frontend esconde o botão do widget nesse caso.

## 4. Encaixe nas regras

- **Minimização (DECISÕES 7):** «só o resumo, nunca a transcrição», em linguagem de pessoa; e
  o `memoria/README.md` já pedia que o envio ao Gemini constasse do consentimento — é isto.
- **«A agenda só com autorização» (roadmap, slide 7):** hoje é promessa; o toggle `agenda`
  (off por omissão) é o código a cumprir a promessa.
- **«Nunca inventes factos» (`AGENTE.md`, AGENTS.md):** «Ver tudo» mostra o texto exato que o
  agente recebe — confirma-se que não há mais nenhuma fonte de factos.
- **Nada para a chefia (roadmap, footer da sidebar) e sem base de dados (DECISÕES 3):** o painel
  diz onde cada coisa fica (navegador vs. `memoria/`) e o consentimento mora num `.md` auditável.

## 5. Esforço e ordem

**Médio no total (~6-8 h); o núcleo é pequeno (~2-3 h).**

1. **Núcleo (primeiro):** `CONSENTIMENTO.md` + `GET/PUT /api/consentimento` + `conversa.py` e
   `app.py` a respeitarem os toggles. Testável com `curl`, sem UI.
2. Painel de leitura + toggles + «Ver tudo» (usa o endpoint de contexto).
3. «Exportar tudo» (só frontend, sem dependências).
4. «Apagar tudo»: dois passos, lixeira `memoria/.lixeira/`, «Desfazer» 15 s (o `reset_demo`
   já mostra o padrão de apagar ficheiro + linha do INDEX). Depende de 1.

**Dependência a dizer claro:** sem login, os toggles do servidor são globais (valem para quem
falar com este servidor) e o resto vive por navegador; para uma pessoa, chega.

## 6. Decisões a pedir ao Marco

1. **Agenda off por omissão?** Recomendo **off** (cumpre «só com autorização»; ligá-la ao vivo
   na demo até rende momento de pitch). Alternativa: manter on, como hoje.
2. **«Apagar tudo» inclui o diário do servidor?** Recomendo **sim, com lixeira + desfazer**;
   alternativa: só o navegador (não precisa de endpoints novos).
3. **Formato:** `CONSENTIMENTO.md` com frontmatter (recomendo, coerente com o diário) vs.
   `consentimento.yaml` nu.
4. **«Ver tudo» mostra também os prompts (`agente/*.md`)?** Recomendo **só os dados** + nota
   «os prompts são públicos no repo»; alternativa: contexto integral.
5. **Diálogo sobreposto (recomendo, padrão do widget) vs. vista própria na main?**

## 7. Critérios de aceitação

1. `PUT /api/consentimento` com o JSON completo escreve `memoria/CONSENTIMENTO.md`; reiniciado
   o servidor, `GET` devolve os mesmos valores.
2. Com `agenda: false` e `memoria/agenda/2026-W44.md` existente, `GET /api/consentimento/
   contexto?modo=semanal` não contém «## Agenda desta semana»; com `true`, contém.
3. Com `conversa_livre: false`, `POST /api/chat` com `modo:"geral"` devolve 403 em pt-PT e o
   frontend esconde o botão do widget.
4. «Ver tudo» mostra o texto integral das secções de memória montadas na hora — pessoa, índice,
   diário, padrões, agenda (se autorizada), semana atual — e mais nada.
5. «Exportar tudo» descarrega um ficheiro único: conversas do navegador, diário e consentimento.
6. «Apagar tudo» exige dois cliques, move o diário para `memoria/.lixeira/`, limpa o `INDEX.md`
   e o `localStorage`; durante 15 s há um «Desfazer» que restaura tudo.
