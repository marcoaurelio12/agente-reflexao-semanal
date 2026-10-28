# Proposta: botões de sugestão no chat (ações)

> Proposta de design, 2026-10-28. Nada implementado; decide o Marco (§6) antes de abrir
> tarefa. Ideia do Marco: a pessoa pede ajuda no chat, o agente responde com factos do diário
> e, se fizer sentido, oferece 1-2 ações clicáveis ("Sugerir um novo hábito").

## 1. Problema e quando faz sentido

**O momento certo é um só: a pessoa pediu ajuda** no widget de conversa livre ("achas que
podia melhorar?", "o que faria diferente?") — hoje quem quer um passo seguinte tem de o
saber pedir. O agente responde com factos do diário (datas, o que se repetiu, o que já
resultou) e, se 1-2 ações servirem, acaba a mensagem com o marcador que gera os chips.
Nunca o contrário: o roadmap ("sugestão opcional que a pessoa pode ignorar, nunca como
avaliação — o desafio pede o contrário de 'podias melhorar'") e o SCOPE nº 11 proíbem-no.
Perguntas neutras ou pensar em voz alta → zero chips; sem matéria no diário → zero chips.

**E no fecho? Não.** O cartão de fecho já responde ao "melhorar?" semanal com 3 prioridades
e UM ajuste (regra 5 do `FECHO.md`: construir sobre o que já resultou); chips na sexta
duplicariam essa resposta. V1: chips só no widget (no semanal o servidor ignora o marcador,
§2c); o §4 impede o empilhar de ajustes.

## 2. Desenho técnico

**(a) Catálogo `agente/ACOES.md`** (novo; dono: Pitch B texto + Backend A formato): regras
de quando oferecer + bloco `yaml` partilhado pelo servidor e pelo LLM (precedentes:
`temas.yaml`; JSON embutido no `FECHO.md`). Quatro ações:

```yaml
acoes:
  - id: novo-habito
    etiqueta: Sugerir um novo hábito        # texto do chip
    tipo: mensagem
    mensagem: Sugere-me um novo hábito para a semana, a partir do que já resultou no meu diário.
  - id: plano-aprendizagem
    etiqueta: Sugerir um plano de aprendizagem
    tipo: mensagem
    mensagem: Sugere-me um plano de aprendizagem simples, a partir do que já aprendi nas últimas semanas.
  - id: rever-padroes
    etiqueta: Rever os meus padrões
    tipo: mensagem
    mensagem: Que padrões aparecem no meu diário nas últimas semanas?
  - id: abrir-reflexao
    etiqueta: Abrir a reflexão da semana
    tipo: navegacao                        # não envia mensagem; abre "Nova reflexão"
```

`plano-aprendizagem` = um próximo passo pequeno sobre uma aprendizagem já no diário, nunca um programa; `abrir-reflexao` torna clicável o que o `GERAL.md` já manda sugerir.

**(b) Marcador.** O LLM acaba a mensagem com `<<ACOES:id1,id2>>` na última linha — o padrão
do `<<FECHAR>>` (`conversa.MARCADOR_FECHO`, limpo em `app.py`). Máx. 2 ids, só do catálogo.

**(c) Servidor.** `conversa.carregar_acoes()` lê o bloco yaml em cada pedido; o ficheiro
inteiro entra no `montar_contexto_geral()` (o semanal nunca o vê). Em `/api/chat` geral:
extrai o marcador, remove-o do texto, valida os ids, descarta inválidos, deduplica,
trunca a 2 e devolve (atualizar `ARQUITETURA.md` §API no mesmo commit):

```json
{"resposta": "…sem marcador…", "pronto_para_fechar": false, "alerta_seguranca": false,
 "acoes": [{"id": "novo-habito", "texto": "Sugerir um novo hábito", "tipo": "mensagem"}]}
```

`acoes` é `[]` por omissão, sempre no semanal e sempre em mock (a resposta fixa
`_MOCK_GERAL` não tem marcador: chips só existem com o Gemini). `/api/fechar` e
`/api/guardar` não mudam.

**(d) O clique.** O clique ENVIA A MENSAGEM DO CATÁLOGO como se fosse da pessoa — a bolha
"Tu" aparece com o texto exato e entra no histórico; o servidor continua stateless e nem
sabe que houve botão. Alternativa: campo `acao` estruturado no pedido. Recusada: duplica
informação (a mensagem entra no histórico na mesma), acrescenta estado implícito e um
caminho só para os chips. `tipo:"navegacao"` não envia nada — abre "Nova reflexão".

## 3. UX

Chips por baixo da ÚLTIMA bolha do agente, só no widget (v1). Desaparecem quando usados ou
quando a conversa avança; ficam na mensagem (`{role, content, acoes:[…]}`) no `localStorage`
e voltam ao reabrir o widget. Botões nativos, `aria-label="Sugestões"`, estilo discreto
(como o `.hint` do "Ver o resumo").

```
 ┌─ Widget · conversa livre ──────────────┐
 │ Tu: achas que podia melhorar alguma   │
 │     coisa na forma como trabalho?     │
 │        Agente: «Reuniões a mais» saiu │
 │ nas semanas de 5 e 19 de outubro; já  │
 │ os blocos de foco correram bem.       │
 │ ( Sugerir um novo hábito )( Rever os  │ ← chips
 │ [ escreve… ]                  [enviar]│
 └───────────────────────────────────────┘
```

## 4. Regras de tom (prompts)

`agente/GERAL.md` ganha uma secção "Ações sugeridas" (o `ACOES.md` entra no contexto):

- **Quando:** só se a ÚLTIMA mensagem da pessoa pedir ajuda/mudança/aprendizagem. Responde
  primeiro com factos (com datas); só depois, se 1-2 ações servirem, `<<ACOES:…>>` no fim.
  Nunca à tua iniciativa; nunca repetir uma ação já oferecida. Sem matéria no diário →
  "isso não está no teu diário", sem marcador.
- **Resposta a uma ação:** 2-3 frases — um facto que JÁ resultou (com a semana) +
  "Experimenta…" com uma experiência pequena, como a regra 5 do `FECHO.md`. Com um ajuste
  ainda em experiência, o `novo-habito` referencia-o ("Esta semana estás a experimentar X —
  queres trocá-lo?") em vez de somar um segundo. O widget NÃO escreve no diário: só entra
  na sexta o que a pessoa lá disser.
- **Proibido:** "devias"/"tens de", etapas numeradas, métricas, prazos de acompanhamento, diagnóstico ou rótulos, mais do que uma experiência de cada vez.

`AGENTE.md` não muda: a conversa semanal não conhece o marcador e o servidor ignora-o aí.

## 5. Encaixe e intersecções

- **Fecho:** o cartão continua a ser o único sítio onde nasce um ajuste guardado; os chips
  são conversa, e o §4 evita a competição entre os dois.
- **`notas-do-dia.md`:** os chips convivem com o "✚ guardar como nota"; a nota só guarda
  palavras da PESSOA, pelo que a resposta a uma ação nunca vira nota.
- **`consentimento.md`:** `conversa_livre` off → sem widget, sem chips (já coberto); com
  `diario_completo_no_widget` off, as sugestões saem das últimas 4 semanas — chega, os
  factos vêm do que estiver no contexto. "Ver tudo" continua exato: `ACOES.md` passa a
  fazer parte do que o agente lê (prompt público no repo).
- **`login.md`/`integracoes.md`:** sem dependência; o catálogo é global em `agente/` (como `temas.yaml`); integrações futuras dão mais factos, não mudam o mecanismo.

## 6. Esforço, decisões e critérios

| Bloco | Dono | Est. |
|---|---|---|
| `agente/ACOES.md` (catálogo + regras) | Pitch B + Backend A | S |
| `carregar_acoes()` + marcador/validação em `app.py` + `ARQUITETURA.md` §API | Backend A | S |
| Secção "Ações sugeridas" em `GERAL.md` | Pitch B | S |
| Chips no widget (render, clique, persistência) | Frontend | M |
| `tests/test_acoes.py` (marcador, ids, limite, modo semanal) | Backend B | S |

Total M (~3 h). Depois do 2.º bloco já se ensaia com `curl` (marcador à mão na resposta).

**Decisões para o Marco** (recomendação primeiro):

1. **Âmbito:** só o widget na v1 (recomendo; o cartão de fecho já responde ao "melhorar?") ou também na conversa semanal?
2. **`abrir-reflexao`:** entra (recomendo — navegação, não conselho) ou v1 só com os 3 de mensagem?
3. **Ajuste em curso:** o `novo-habito` referenciá-lo por regra de prompt (recomendo) ou bloqueio no código?
4. **Clique:** mensagem do catálogo (recomendo, §2d) ou campo `acao` estruturado no pedido?
5. **Persistência:** os chips voltam ao reabrir o widget enquanto não usados (recomendo) ou desaparecem sempre?

**Critérios de aceitação:**

1. `modo:"geral"` com resposta em `<<ACOES:novo-habito,rever-padroes>>` → `resposta` sem o
   marcador e `acoes` com os dois, textos do catálogo; `<<ACOES:spam>>` → `[]`; 3 válidos → 2;
   `modo:"semanal"` → sempre `[]`.
2. Clique num chip de mensagem → bolha "Tu" com o texto EXATO do catálogo; o chip
   desaparece e a resposta chega pelo `/api/chat` normal (o pedido não tem campo novo).
3. `abrir-reflexao` (se aprovado) abre "Nova reflexão" e fecha o widget, sem pedido ao servidor.
4. Com o Gemini ligado (ensaio guiado): 6 perguntas neutras → 0 marcadores; 6 pedidos de
   ajuda → no máx. 2 ações, sempre depois de factos com datas do diário.
5. A resposta a uma ação tem ≤3 frases, contém "Experimenta" (ou referencia o ajuste em curso) e não tem "devias", "tens de", listas nem métricas.
6. Em modo mock, `acoes` é sempre `[]`; `/api/fechar` e `/api/guardar` intocados; conversas reabertas mostram chips só na última mensagem, se não usados.
