# frontend/: o ecrã do agente

> Dono: **Frontend** (um colega do grupo). Só mexes nos ficheiros desta pasta.
> Antes de começar: lê `AGENTS.md` e `docs/ARQUITETURA.md` (§API). O contrato JSON está lá.

## Stack

- HTML + CSS + JS, sem frameworks e sem build.
- Em produção é servido pelo FastAPI em http://localhost:8000 (mesma origem que a API: sem CORS).
- **Enquanto o backend não estiver pronto**, trabalha com dados falsos:
  - deixa `const USAR_MOCK = true;` no topo de `mock.js`;
  - abre a pasta com a extensão **Live Server** do VS Code, ou corre dentro de `frontend/`:

    ```bash
    python -m http.server 5500
    ```

    e abre http://localhost:5500.
- No checkpoint T+1:30 mudas para `USAR_MOCK = false` e abres http://localhost:8000 com o backend a correr.

## Ficheiros

| Ficheiro | Estado |
|---|---|
| `index.html` | Placeholder. Substitui pelo ecrã real. |
| `styles.css` | Por criar |
| `app.js` | Por criar |
| `mock.js` | **Já existe.** Respostas falsas no formato exato do contrato + `mockFetch(url, body)` |

Carrega por esta ordem no `index.html`: `mock.js` e depois `app.js`.
Sugestão para não repetir código: uma função `api(url, body)` que usa `mockFetch` quando
`USAR_MOCK` é `true` e, caso contrário, `fetch` + `.json()`. O `mockFetch` devolve diretamente
o objeto JSON (não um `Response`).

## O ecrã (um só)

**(a) Chat (coluna principal)**
- Ao abrir: `POST /api/chat` com `{"mensagens": []}` e mostra a abertura do agente.
- O histórico fica no browser (um array `mensagens` com `{role, content}`) e vai **inteiro** em cada pedido.
- Indicador "a escrever…" enquanto espera. Enter envia.

**(b) Cartão de fecho**
- Quando a resposta traz `pronto_para_fechar: true`, aparece o botão **"Ver resumo da semana"**.
- Clique → `POST /api/fechar` (mesmo corpo do chat) → cartão com:
  resumo · 3 prioridades **editáveis em inputs** · padrões (um ícone por `tipo`) · ajuste de hábito · energia.
- Botão **"Guardar semana"** → `POST /api/guardar` com `{"semana": …}` (com as prioridades editadas)
  → mostra "Guardado em memoria/diario/2026-W44.md" (o valor de `ficheiro`) e o painel atualiza.

**(c) Alerta de segurança**
- Se `alerta_seguranca: true`, a mensagem aparece num estilo calmo e diferente (fundo suave, nada
  de vermelho de erro) e o fecho fica desativado.
- Para testar com o mock: escreve "estou em baixo há semanas e não vejo saída".

**(d) Painel lateral "O teu diário"** (`GET /api/memoria`)
- Semanas anteriores: datas, energia, 1.ª frase do resumo. Clicar abre a entrada completa (`markdown`).
- Padrões atuais.
- Mini-gráfico de energia em SVG simples (sem bibliotecas), a partir de `metricas.energia`.
- Prioridades cumpridas: "X de Y" a partir de `metricas.prioridades_cumpridas`.

**(e) Faixa fixa no topo**
- "Dados fictícios · guardados em memoria/ neste computador · o texto da conversa é processado pela OpenAI"

## Tom visual

Calmo, muito espaço, tipografia legível. Sem vermelho. Nada que pareça uma avaliação: nada de
notas, scores, nem verde/vermelho nas prioridades por cumprir. Uma prioridade que não avançou
é informação, não falha.

## Tarefas

| Id | Tarefa | Prazo |
|---|---|---|
| F1 | Chat a funcionar contra o mock | até T+0:50 |
| F2 | Cartão de fecho (prioridades editáveis + Guardar) | |
| F3 | Painel "O teu diário" | |
| F4 | Faixa de privacidade | |
| F5 | Ligar à API real (`USAR_MOCK = false`) | checkpoint T+1:30 |
| F6 | (P1) Métricas no painel · (P2) botão "Resumo do mês" → `POST /api/resumo-mensal` | depois de T+1:30 |

**Feito =** o roteiro de `pitch/ROTEIRO-DEMO.md` corre do princípio ao fim no browser, sem tocar no terminal.

## Prompt pronto a colar no teu assistente de código

```
Estás no repo agente-reflexao-semanal. Lê AGENTS.md e docs/ARQUITETURA.md (secção API) antes
de escrever código. Só podes mexer em ficheiros dentro de frontend/.

Constrói o ecrã do agente em HTML + CSS + JS, sem frameworks e sem build:
- frontend/index.html (substitui o placeholder), frontend/styles.css, frontend/app.js.
- frontend/mock.js já existe: carrega-o antes do app.js. Cria uma função api(url, body) que usa
  mockFetch(url, body) quando USAR_MOCK é true e fetch(url, {method, headers, body}) + .json()
  quando é false. GET /api/memoria não leva corpo; os outros são POST com JSON.

Um só ecrã, em português de Portugal:
(a) Chat: ao abrir, POST /api/chat com {"mensagens": []} e mostra a abertura. Guarda o histórico
    num array de {role, content} e envia-o inteiro em cada pedido. Indicador "a escrever…".
    Enter envia.
(b) Quando a resposta tiver pronto_para_fechar=true: botão "Ver resumo da semana" → POST
    /api/fechar → cartão com resumo, 3 prioridades editáveis em inputs, padrões (um ícone por
    tipo), ajuste de hábito e energia. Botão "Guardar semana" → POST /api/guardar com
    {"semana": ...} (com as prioridades editadas) → mostra "Guardado em <ficheiro>" e recarrega
    o painel.
(c) Se alerta_seguranca=true: mostra a mensagem num estilo calmo e diferente (sem vermelho de
    erro) e desativa o fecho.
(d) Painel lateral "O teu diário" (GET /api/memoria): semanas anteriores (datas, energia,
    1.ª frase do resumo; clicar abre a entrada completa em markdown), padrões, mini-gráfico de
    energia em SVG simples sem bibliotecas, e "prioridades cumpridas X de Y".
(e) Faixa fixa no topo: "Dados fictícios · guardados em memoria/ neste computador · o texto da
    conversa é processado pela OpenAI".

Tom visual: calmo, muito espaço, sem vermelho, nada que pareça uma avaliação (sem notas, scores
ou verde/vermelho nas prioridades por cumprir).

Respeita EXATAMENTE os nomes de campos e os formatos JSON de docs/ARQUITETURA.md; não inventes
campos. Testa primeiro com USAR_MOCK = true; o roteiro de pitch/ROTEIRO-DEMO.md tem de correr do
princípio ao fim.
```
