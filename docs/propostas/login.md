# Proposta: login e multiutilizador

> Estado: proposta, nada implementado. Aprovar = nova entrada em `DECISOES.md` (revoga a n.º 10
> para produção) + atualização de `docs/ARQUITETURA.md` (§API e §Interfaces internas) no mesmo
> commit. O diário continua em markdown por pessoa; não há base de dados para o diário.

## 1. Problema e opções

O problema: hoje `memoria/` é de uma só pessoa (a Inês), `semana_atual()` respeita um `DEMO_SEMANA`
global e qualquer navegador que chegue ao servidor lê e escreve o mesmo diário. Para produção
com pessoas a sério, isto precisa de identidade e isolamento. Três níveis:

| Opção | O que é | Prós | Contras |
|---|---|---|---|
| **a) Multiperfil local, sem autenticação** | Escolher nome no arranque; pasta `memoria/pessoas/<id>/`; isolamento por convenção | Zero dependências, S de esforço, serve demo/família | Qualquer um pode ler/escrever o diário de outro; nomes colidem; não é "produção" em nenhum cenário com dados sensíveis (o diário tem energia e bloqueios) |
| **b) Login leve a sério** | Utilizadores + palavras-passe com hash (argon2id), cookie de sessão assinado; sem OAuth | Isolamento real com ~2 ficheiros novos; sem serviços externos; cabe no atual "um comando para correr" | Gestão de palavras-passe é nossa (reset, força, rate limit); sem SSO |
| **c) OAuth/SSO (Google/Microsoft)** | "Continuar com a Microsoft" (o mundo do roadmap) | Zero palavras-passe nossas; entra pelas portas das empresas | Client ID/secret, redirecionamentos, HTTPS obrigatório já; a app deixa de correr "num comando"; a Microsoft/Google vê quem usa |

**Recomendação: (b) para produção já.** É o menor passo que dá isolamento verdadeiro, mantém o
deploy simples e não fecha a porta: (c) acrescenta-se depois como mais um modo de entrar que
cria a mesma `Pessoa`. A opção (a) só como subproduto transitório dos testes, nunca como entrega.

## 2. Impacto no código

**`memoria.py`** — as funções passam a receber a pessoa (novo tipo simples `Pessoa` com `id`,
`nome`, `pasta: Path`); as constantes de módulo (`PASTA_DIARIO`, `FICHEIRO_CONTEXTO`,
`FICHEIRO_INDEX`) deixam de ser globais e resolvem-se a partir de `pessoa.pasta`:

```python
carregar_contexto(pessoa) -> str                     # memoria/pessoas/<id>/CONTEXTO.md
carregar_index(pessoa) -> str                        #  …/INDEX.md
listar_semanas(pessoa, ultimas: int = 4) -> list[dict]
carregar_agenda(pessoa, semana_id: str) -> str | None
guardar_semana(pessoa, semana: dict) -> str          # devolve "memoria/pessoas/<id>/diario/…"
semana_atual(pessoa) -> tuple[str, str]              # DEMO_SEMANA só se pessoa.demo
carregar_temas() / nomes_temas()                     # global: agente/ é partilhado
```

**Novo `backend/pessoas.py`** (dono: Backend B): `listar()`, `criar(id, nome, palavra_passe)`
(hash argon2id; cria a pasta + `CONTEXTO.md` de template + `INDEX.md` vazio), `autenticar()`,
`assinar_sessao()/ler_sessao()` (HMAC-SHA256 com `SECRET_KEY` do `.env`).

**`app.py`** — dependência `pessoa_atual = Depends(...)` que lê o cookie, valida a assinatura e
devolve a `Pessoa` (401 se ausente/expirada). `/api/chat`, `/api/fechar`, `/api/guardar`,
`/api/memoria` e `/api/ics` recebem `pessoa: Pessoa = Depends(pessoa_atual)` e passam-no abaixo.
`/api/estado` fica público (o badge aparece antes do login). Rotas novas:

```
POST /api/login    {"utilizador": "…", "palavra_passe": "…"} → 204 + Set-Cookie reflexao_sessao
                   (HttpOnly, SameSite=Lax, Secure em produção, 30 dias) | 401 genérico | 429
POST /api/logout   → 204, apaga o cookie
GET  /api/quem-sou → {"id": "…", "nome": "…"} | 401
POST /api/registar → só disponível enquanto não existirem contas (ecrã de setup inicial)
```

**`conversa.py`** — `montar_contexto(pessoa, nota_extra)`, `montar_contexto_fecho(pessoa)`,
`montar_contexto_geral(pessoa)`, `semanas_anteriores(pessoa)`: tudo o que toca `memoria/` recebe
a pessoa; `_agente()` fica como está. **`/api/ics`** por pessoa: UID passa a
`reflexao-<pessoa>-<semana>@…` (dois utilizadores no mesmo calendário não colidem).

**`frontend/app.js`** — no arranque, `GET /api/quem-sou`; 401 → ecrã de login (overlay) antes de
qualquer chamada. Chaves de localStorage por pessoa: `reflexao.<id>.conversas.v1` e
`reflexao.<id>.geral.v1` (as atuais passam a pertencer à conta de demonstração). Logout volta ao
login; as conversas ficam guardadas por pessoa no mesmo navegador.

**`tests/conftest.py`** — fixture `duas_pessoas` (ex.: `ana` e `bruno`) em pasta temporária
(monkeypatch da raiz de `memoria/pessoas/`), clientes `TestClient` já com o cookie de cada uma, e
`reset_demo` a apontar só à conta de demonstração.

## 3. Decisões difíceis

- **Onde ficam as contas.** Proposta: `memoria/pessoas/<id>/conta.yaml` (`id`, `nome`, `hash`
  argon2id, `demo: bool`, `criada_em`). O diário continua markdown e a "sem base de dados"
  (decisão 3) mantém-se na letra e no espírito; SQLite só para contas dividiria o estado em dois
  sítios sem ganho real abaixo de dezenas de utilizadores (quando lá chegarmos, migra-se o hash e
  o resto fica como está).
- **Sessões.** Cookie assinado (`<id>.<hmac>` com expiração), sem estado no servidor — coerente
  com "o servidor não guarda estado" do fluxo atual. Contra: não é revogável do lado do servidor;
  logout limpa o cookie no browser. Aceitável na v1; `SECRET_KEY` rotação = invalida tudo.
- **Primeiro utilizador/onboarding.** Servidor sem contas → frontend mostra o setup (nome +
  palavra-passe) que chama `/api/registar`; `criar()` gera a pasta com um `CONTEXTO.md` esqueleto
  que a pessoa (ou a primeira conversa) preenche. Depois da primeira conta, o registo fecha.
- **DEMO_SEMANA por pessoa.** Deixa de ser global: `semana_atual(pessoa)` só respeita
  `DEMO_SEMANA` se `conta.yaml` tiver `demo: true`. Contas a sério usam sempre a data real.
- **Fluxo demo da Inês.** A persona vira seed: migração única move `memoria/{CONTEXTO.md,
  INDEX.md, diario/, agenda/}` para `memoria/pessoas/ines/` com `demo: true` e palavra-passe
  conhecida da equipa; `reset_demo.py` passa a limpar só essa pasta. A demo ao vivo faz login
  como Inês e corre exatamente como hoje.

## 4. Segurança e regras

- `.env` ganha `SECRET_KEY` (gerada, nunca commitada — regra do repo público mantém-se);
  `OPENAI_API_KEY` como está. Respostas de erro de login genéricas (não revelar se o nome existe).
- Rate limit no login em memória: 5 tentativas por nome/IP em 15 min → 429 (um processo chega).
- **HTTPS é pré-requisito de produção**: palavras-passe e cookie só via TLS (proxy com Caddy ou
  equivalente; cookies `Secure`). Sem HTTPS, não se coloca isto na internet.
- **Não muda:** prompts vivem em `agente/*.md` lidos em runtime; minimização (guarda-se a entrada
  estruturada, não a transcrição); segurança em duas camadas (`seguranca.verificar` antes do LLM);
  sem métricas de equipa, nada para a chefia, sem tom de avaliação; pt-PT.

## 5. Esforço, ordem e decisões

| Bloco | Esforço |
|---|---|
| `memoria.py` param pessoa + migração do seed da Inês | M |
| `backend/pessoas.py` (contas, hash, sessão, rate limit) | M |
| `app.py`: `Depends(pessoa_atual)` + login/logout/quem-sou/registar | S |
| `conversa.py` recebe pessoa | S |
| Frontend: login no arranque + localStorage por pessoa | M |
| Tests: duas pessoas + isolamento | S |
| Deploy HTTPS (fora do código) | M |

Ordem: 1→2→3 (backend, o frontend trabalha contra mocks entretanto), depois 4–6; deploy no fim.

**Decisões a pedir ao Marco** (com recomendação):
1. Contas em `conta.yaml` com hash (recomendo) vs SQLite só para contas vs `fastapi-users`.
2. Registo: fechado — primeiro utilizador no setup, restantes por convite/comando (recomendo) vs
   registo aberto.
3. Sessão: cookie assinado HttpOnly (recomendo) vs JWT em `Authorization` header.
4. Recuperação de palavra-passe fora da v1, reset manual (recomendo) vs email desde já.

**Critérios de aceitação:**
1. **Isolamento:** `ana` guarda a semana; o ficheiro só existe em `memoria/pessoas/ana/diario/`,
   aparece no `/api/memoria` dela e **não** no de `bruno` (nem no painel nem em disco).
2. Sem cookie, `/api/chat`, `/api/fechar`, `/api/guardar`, `/api/memoria` e `/api/ics` devolvem
   401; `/api/estado`, `/api/quem-sou` e `/api/login` respondem sem sessão.
3. Login certo → cookie HttpOnly+SameSite=Lax e `/api/quem-sou` devolve a pessoa; palavra-passe
   errada → 401 genérico; 6.ª tentativa em 15 min → 429.
4. `/api/ics` com a sessão de `bruno` traz as prioridades dele e um UID com o id dele.
5. Conta de demonstração: após a migração, o fluxo atual da Inês funciona de ponta a ponta
   (abertura retoma W43; padrão "reuniões a mais" em W44; `reset_demo` limpa só a pasta dela).
6. localStorage: conversas de `ana` em `reflexao.ana.conversas.v1`, as de `bruno` nas dele;
   logout leva ao ecrã de login sem apagar conversas.
