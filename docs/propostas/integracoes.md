# Proposta: painel de integrações ("quick install")

> Proposta de design, ainda não implementada. Irmã da de consentimento
> (`docs/propostas/consentimento.md`, por escrever — §2.4). Liga ao roadmap §Visão.

## 1. Problema e princípio

Hoje a reflexão parte só do que a pessoa diz. A agenda dá-lhe factos: "tiveste 14 reuniões,
11 sem agenda" muda a conversa e alimenta padrões reais — e meio caminho já existe: o agente
lê `memoria/agenda/<semana>.md` (item 8 do contexto, `docs/ARQUITETURA.md`).

**Princípio "nada de fake":** o ecrã de agenda Teams simulada custou-nos credibilidade.
Regra: cada integração está num de três estados — **a sério** (OAuth real, dados reais),
**não ligada** ou **"em breve"** (cartão visível, desativado). Nada no meio; nada simulado.

## 2. Primeiro provider a sério: Google Calendar, só leitura

Porquê este: OAuth simples, scope mínimo (`calendar.readonly`) e é a agenda da pessoa, não a
da empresa (sem consentimento do empregador). Microsoft 365 é o dobro da burocracia (app no
Entra ID, admin de tenant); fica para depois.

### 2.1 Fluxo OAuth 2.0 (authorization code + PKCE)

1. "Ligar" chama `GET /api/integracoes/google/comecar` → backend gera `state` (anti-CSRF) e
   `code_verifier`/`code_challenge` (S256) e devolve a URL do Google
   (`…/o/oauth2/v2/auth`, `response_type=code`, scope `calendar.readonly`,
   `access_type=offline`, `prompt=consent`, redirect localhost — §4).
2. A pessoa consente (o ecrã do Google mostra "ver eventos do calendário").
3. `GET .../callback?code&state` troca o code em `oauth2.googleapis.com/token` (com
   `code_verifier` + client secret) → `access_token` (~1 h) + `refresh_token`; os syncs
   seguintes usam o refresh token.

### 2.2 Onde vivem os tokens

`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no `.env` (repo público: segredos nunca no git).
Tokens da pessoa em `memoria/local/tokens/google.json` — a pasta `memoria/local/`, nova e
inteira no `.gitignore`, recebe também as agendas reais (a agenda verdadeira da pessoa não
vai para um repo público, ao contrário da fictícia `memoria/agenda/`).

### 2.3 Sync semanal: a integração ALIMENTA o formato existente

O sync pede `calendar/v3/calendars/primary/events` da semana (`timeMin`/`timeMax`,
`singleEvents=true`) — 1 pedido por semana — e escreve o ficheiro **exato** que já existe:

```markdown
# Agenda: semana de 26 de outubro a 1 de novembro (2026-W44)
> Importada do Google Calendar em 30-10-2026 17:02, com a tua autorização.
> (Frontmatter: origem, sync_em. Guarda só dia, hora, duração e título.)

11 reuniões · 8,5 horas em reuniões · 1 bloco de foco
| Dia | Hora | Duração | Evento |   ← a mesma tabela de memoria/agenda/2026-W44.md
```

Mudança no código: `memoria.carregar_agenda()` olha primeiro `memoria/local/agenda/<id>.md`,
depois `memoria/agenda/<id>.md` — nada mais muda (`conversa.py` e o item 8 do contexto ficam
na mesma): substitui-se **o conteúdo** do ficheiro, nunca o formato. Minimização (decisão 7):
sem descrições, convidados ou locais. Reunião = evento com convidados ou sala; bloco de
foco = sem convidados e "foco" no título.

### 2.4 Ligação ao consentimento

A proposta `consentimento.md` (por escrever) define o registo em
`memoria/local/consentimentos.json`: `{integracao, scope, texto_mostrado, data}`. O botão
"Ligar" só aparece com esse texto por baixo; o cartão ligado cita-o ("autorizado em 30-10,
scope X"); apagar o consentimento = desligar.

## 3. UX do painel

Nova vista "Integrações" na sidebar. Um cartão por integração, três estados honestos:

```
┌ Integrações ──────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Google Calendar                        ● Ligada        │ │
│ │ Lê só os eventos da semana, com a tua autorização.     │ │
│ │ Último sync: hoje, 17:02 · 12 eventos (26 out–1 nov)   │ │
│ │ [ Sincronizar agora ] [ Desligar e apagar o importado ]│ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Importar .ics                                ⬆ Subir   │ │
│ │ Sem contas: exporta do Outlook ou Google e sobe aqui.  │ │
│ └────────────────────────────────────────────────────────┘ │
│ Microsoft 365 · Slack · Jira · Linear  EM BREVE — não    │
│ clicável. Nada simulado em nenhum destes cartões.        │
└──────────────────────────────────────────────────────────┘
```

Texto pt-PT direto: "Em breve — ainda não está feito. Vai ler a agenda com a tua autorização
e só o que autorizares." Estados: **não ligada** ("Ligar" + scope + texto de consentimento),
**ligada** (último sync + o que foi lido: "12 eventos, 26 out – 1 nov"), **expirada**
("sessão expirada, liga outra vez" — tokens de teste do Google duram 7 dias) e **em breve**.
"Desligar e apagar o que foi importado" pede confirmação com a lista do que apaga.

## 4. API (contrato)

```
GET /api/integracoes
  → {"integracoes":[{"id":"google-calendar","estado":"desligada|ligada|expirada|em-breve",
      "ultimo_sync":"2026-10-30T17:02","lido":"12 eventos · 26 out a 1 nov","erro":null}, …]}
GET /api/integracoes/google/comecar
  → 200 {"url":"https://accounts.google.com/o/oauth2/v2/auth?…"} | 409 já ligada (?forcar=1 religa)
GET /api/integracoes/google/callback?code&state
  → 302 /#integracao=ligada | /#integracao=erro (access_denied | state inválido)
POST /api/integracoes/google/sync
  → 200 {"semana":"2026-W44","eventos":12,"ficheiro":"memoria/local/agenda/2026-W44.md"}
    401 sessão expirada · 502 "O Google não respondeu; a agenda anterior fica como está"
DELETE /api/integracoes/google
  → 200 {"apagados":["memoria/local/agenda/2026-W44.md"],"tokens":true}
```

UX de falha: cada erro vira texto no cartão com "Tentar de novo"; falha de sync nunca deixa
a conversa sem resposta — o agente segue sem agenda e diz isso, não inventa.

## 5. Pré-requisitos e riscos

- **Conta de developer:** projeto no Google Cloud (gratuito) + OAuth consent screen
  (External, Testing) + credenciais OAuth web com redirect `http://localhost:8000/…`
  (o Google aceita `http://localhost` em Testing; fora de localhost é preciso HTTPS).
- **Quotas:** Calendar API é generosa; 1 pedido/semana é irrelevante.
- **Review de apps:** publicar (Production) exige verificação do Google (scope sensível,
  painel de privacidade, semanas). Para uso pessoal, Testing chega — mas o refresh token
  expira a cada 7 dias → cartão "expirada", religar.
- **O que parte com o deploy:** redirect URI muda, tokens por máquina (ficheiro local não
  migra), `.env` por ambiente. O formato `.md` e o resto aguentam.
- **Plano B (zero OAuth):** importação manual de `.ics` — Outlook ("Partilhar calendário →
  .ics") ou Google ("Importar e exportar") → upload no painel → `POST /api/agenda/importar`
  (multipart, parser `icalendar`) → o MESMO escritor de ficheiro do sync. Serve quem é
  Microsoft, sem contas de developer nem review.

## 6. Ordem, decisões e critérios

**Ordem:** 1) painel honesto com cartões "em breve" (meio dia) → 2) importação `.ics`
(1 dia; valida o formato e o escritor) → 3) Google OAuth + sync (2–3 dias) → 4) Microsoft
365, Slack, Jira/Linear, só depois.

**Decisões a pedir ao Marco:**
1. Dados reais fora do git: `memoria/local/` ignorada pelo git (**recomendo**) — o repo é
   público; alternativa: mover a demo para outra pasta.
2. Sync automático ao abrir a conversa ou só manual? Recomendo **manual** ("Sincronizar
   agora") + aviso "último sync há X dias"; automático às escondidas parece vigilância.
3. Guardar por evento: dia/hora/duração/título, sem descrição nem convidados (**recomendo**; decisão 7).
4. Google em modo Testing (religar a cada 7 dias, **recomendo**) ou publicar com verificação?
5. `DELETE` apaga também agendas de semanas passadas? (**Recomendo** sim, com lista dos ficheiros.)

**Critérios de aceitação:**
1. Sem nada configurado, o painel abre com todos os cartões e "em breve" não é clicável.
2. OAuth em localhost: consentir → cartão "ligada"; `git status` não mostra tokens nem segredos.
3. Sync escreve `memoria/local/agenda/2026-W44.md` no formato da fictícia (tabela + sumário)
   e a abertura da conversa refere um evento real dessa agenda.
4. Sem agenda para a semana, o agente não menciona agenda nenhuma (nada inventado).
5. Token expirado: o cartão diz "sessão expirada" e o sync falha sem apagar a agenda anterior.
6. "Desligar e apagar" remove tokens + ficheiros importados; a fictícia
   `memoria/agenda/2026-W44.md` (no git) fica intacta.
