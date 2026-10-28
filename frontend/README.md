# frontend/: o ecrã do agente

> HTML + CSS + JS puros, sem frameworks e sem build. Servidos pelo FastAPI em `/`
> (mesma origem que a API: sem CORS). Contrato: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) §API.

## O ecrã (2026-10-28, decisão 12)

Um ecrã principal e uma sidebar — nada de subtabs nem de dados simulados no cliente:

- **Conversa** (área principal): `POST /api/chat` com o histórico inteiro. Quando vem
  `pronto_para_fechar`, aparece **"Ver o resumo da semana"** → `POST /api/fechar` → cartão com
  resumo, estados das prioridades anteriores, padrões, ajuste e **3 prioridades editáveis**.
  "Guardar semana" → `POST /api/guardar` → a semana entra no diário do servidor e aparece o botão
  **.ics**. O resumo nunca é pré-escrito: vem sempre do `/api/fechar` (LLM ou mock).
- **Sidebar · Conversas**: ficam no `localStorage` (`reflexao.conversas.v1`); qualquer conversa
  antiga pode ser reaberta e **continuada** (o servidor é stateless, recebe o histórico inteiro).
- **Sidebar · O teu diário**: `GET /api/memoria` — gráfico de energia, "prioridades cumpridas
  X de Y" e as semanas guardadas (clique abre a entrada, com o botão de calendário).
- **Notas do dia**: botão "+ Nota do dia" na sidebar (diálogo de 1-3 linhas) e "✚ nota" no
  hover das mensagens da pessoa no widget (`POST /api/notas`); lista "Notas desta semana" com
  apagar em 2 cliques e a linha de insight (`GET /api/notas`).
- **Widget de conversa livre** (canto inferior direito): `POST /api/chat` com `modo: "geral"`
  (prompt `agente/GERAL.md`); thread própria no `localStorage` (`reflexao.geral.v1`). As
  respostas podem trazer `acoes` → chips de sugestão por baixo da última bolha (clique numa
  ação `mensagem` envia o texto do catálogo; `abrir-reflexao` abre "Nova reflexão").
- **Privacidade / consentimento**: o rodapé da sidebar abre "O que o agente sabe sobre ti"
  (três blocos lê → envia → guarda, toggles em `GET/PUT /api/consentimento`, "Ver tudo" em
  `GET /api/consentimento/contexto`, "Exportar tudo" gerado no cliente, "Apagar tudo" com
  confirmação em dois passos + "Desfazer" 15 s — `DELETE /api/memoria` /
  `POST /api/memoria/restaurar`). O toggle "guardar conversas" é só do navegador
  (`reflexao.consentimento.v1`); com ele desligado, a conversa guardada sai do `localStorage`.
- **Alerta de bem-estar**: o filtro `BEM_ESTAR` corre no browser antes de ir à rede (o backend
  volta a verificar); cartão calmo com SNS 24 e 112. **A lista tem de continuar igual à de
  `backend/seguranca.py`** — `tests/test_seguranca.py` falha se divergirem.
- **Badge no topo**: `GET /api/estado` → "respostas de exemplo" (sem chave) ou "Gemini".

## Ficheiros

| Ficheiro | O que é |
|---|---|
| `index.html` | Estrutura: topo, sidebar, conversa, vista de semana, widget |
| `app.js` | Toda a lógica (estado, API, render). A constant `BEM_ESTAR` é contrato com os testes |
| `styles.css` | Tema claro/escuro (tokens no topo), responsivo até 960px (sidebar em gaveta) |

## Correr

Com o backend de pé (`python -m uvicorn backend.app:app`), abre http://localhost:8000.
Sem `OPENAI_API_KEY`, o servidor responde em modo mock e o badge diz "respostas de exemplo" —
o fluxo inteiro (conversa → resumo → guardar → diário) funciona na mesma.

Notas para a demo: antes de cada ensaio, `python -m backend.reset_demo` (apaga a W44 do diário);
as conversas de reflexão ficam no navegador — limpar o localStorage recomeça do zero.
