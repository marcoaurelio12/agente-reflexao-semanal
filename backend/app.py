"""Servidor FastAPI. Endpoints em docs/ARQUITETURA.md §API. Dono: Backend A.

Correr a partir da raiz do repo:  python -m uvicorn backend.app:app --reload
Depois abrir http://localhost:8000
"""
import logging
import os
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend import consentimento, conversa, llm, memoria, padroes, seguranca

RAIZ = Path(__file__).resolve().parent.parent
NOTA_VAGA = "A última resposta foi vaga: faz UMA pergunta de seguimento concreta; não assumas nada."
FUSO = ZoneInfo("Europe/Lisbon")
HORA_REFLEXAO = time(17, 0)  # sexta-feira, 17:00
_MOCK_GERAL = ("Sem o modelo de linguagem ligado, só consigo conduzir a reflexão semanal. "
               "Abre uma «Nova reflexão» e eu levo a semana até ao resumo.")

app = FastAPI(title="Agente de Reflexão Semanal")
log = logging.getLogger("uvicorn.error")
log.info("LLM: %s", "modo mock (sem OPENAI_API_KEY)" if llm.modo_mock() else "Gemini")


class Mensagem(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class PedidoChat(BaseModel):
    mensagens: list[Mensagem] = []
    modo: str = "semanal"  # "semanal" (reflexão) | "geral" (conversa livre do widget)


class PedidoGuardar(BaseModel):
    semana: dict


class PedidoNota(BaseModel):
    texto: str
    data: str | None = None  # AAAA-MM-DD; omissão: hoje


class PedidoConsentimento(BaseModel):
    consentimento: dict  # {agenda, conversa_livre, diario_completo_no_widget}, sempre todas


class PedidoToken(BaseModel):
    token_desfazer: str


def _erro_llm(e: Exception) -> HTTPException:
    log.exception("Falha no LLM")
    return HTTPException(502, f"O LLM não respondeu: {e}")


def _extrair_acoes(texto: str) -> tuple[str, list[dict]]:
    """Remove os marcadores <<ACOES:…>> do texto e devolve as ações válidas do catálogo.

    Valida os ids (agente/ACOES.md), descarta os inválidos, deduplica e trunca a 2 — como
    na proposta docs/propostas/sugestoes-no-chat.md §2c.
    """
    catalogo = {a["id"]: a for a in conversa.carregar_acoes()}
    ids, acoes = [], []
    for m in conversa.MARCADOR_ACOES.finditer(texto):
        for aid in m.group(1).split(","):
            aid = aid.strip()
            if aid in catalogo and aid not in ids:
                ids.append(aid)
    for aid in ids[:2]:
        a = catalogo[aid]
        acoes.append({"id": a["id"], "texto": a.get("etiqueta", aid),
                      "tipo": a.get("tipo", "mensagem"), "mensagem": a.get("mensagem", "")})
    return conversa.MARCADOR_ACOES.sub("", texto).strip(), acoes


@app.post("/api/chat")
def chat(pedido: PedidoChat):
    """Abertura (mensagens vazias), perguntas, seguimento se vago, marcador de fecho.

    modo="geral" usa o prompt de conversa livre (agente/GERAL.md) e nunca fecha a semana;
    só ele conhece os botões de sugestão (marcador <<ACOES:…>> de agente/ACOES.md).
    """
    mensagens = [m.model_dump() for m in pedido.mensagens]
    ultima = next((m["content"] for m in reversed(mensagens) if m["role"] == "user"), None)
    if ultima:
        alerta = seguranca.verificar(ultima)
        if alerta:
            return {"resposta": alerta["resposta"], "pronto_para_fechar": False,
                    "alerta_seguranca": True, "acoes": []}
    geral = pedido.modo == "geral"
    if geral and not consentimento.carregar()["conversa_livre"]:
        raise HTTPException(403, "A conversa livre está desligada nas opções de privacidade.")
    nota = None if geral else (NOTA_VAGA if ultima and seguranca.e_vaga(ultima) else None)
    if geral and llm.modo_mock():
        texto = _MOCK_GERAL
    else:
        sistema = conversa.montar_contexto_geral() if geral else conversa.montar_contexto(nota)
        try:
            texto = llm.responder(sistema, mensagens)
        except Exception as e:
            raise _erro_llm(e)
    pronto = conversa.MARCADOR_FECHO in texto
    texto = texto.replace(conversa.MARCADOR_FECHO, "").strip()
    acoes: list[dict] = []
    if geral and not llm.modo_mock():
        texto, acoes = _extrair_acoes(texto)
    else:
        texto = conversa.MARCADOR_ACOES.sub("", texto).strip()
    return {"resposta": texto, "pronto_para_fechar": pronto and not geral,
            "alerta_seguranca": False, "acoes": acoes}


@app.post("/api/fechar")
def fechar(pedido: PedidoChat):
    """JSON da semana (FECHO.md) + padrões. Ainda não guarda."""
    mensagens = [m.model_dump() for m in pedido.mensagens]
    try:
        dados = llm.extrair_json(conversa.montar_contexto_fecho(),
                                 [{"role": "user", "content": conversa.transcricao(mensagens)}])
    except Exception as e:
        raise _erro_llm(e)

    temas_validos = memoria.nomes_temas()
    for campo in ("aprendizagens", "bloqueios", "prioridades"):
        dados[campo] = [
            {"texto": str(i.get("texto", "")),
             "tema": i.get("tema") if i.get("tema") in temas_validos else "outro"}
            for i in (dados.get(campo) or []) if isinstance(i, dict)
        ]
    dados["notas_temas"] = [t for t in (dados.get("notas_temas") or [])
                            if isinstance(t, str) and t in temas_validos][:3]
    sid, periodo = memoria.semana_atual()
    semana = {
        "semana": sid,
        "periodo": periodo,
        "registado_em": date.today().isoformat(),
        "energia": dados.get("energia"),
        "energia_nota": dados.get("energia_nota") or "",
        "prioridades_anteriores": dados.get("prioridades_anteriores") or [],
        "correu_bem": dados.get("correu_bem") or [],
        "aprendizagens": dados["aprendizagens"],
        "bloqueios": dados["bloqueios"],
        "resumo": dados.get("resumo") or "",
        "prioridades": dados["prioridades"],
        "ajuste_habito": dados.get("ajuste_habito") or "",
        "notas_temas": dados["notas_temas"],
    }
    metas = [s["meta"] for s in conversa.semanas_anteriores()] + [memoria.meta_de(semana)]
    semana["padroes"] = padroes.detetar(metas)
    return {"semana": semana}


@app.post("/api/guardar")
def guardar(pedido: PedidoGuardar):
    """Escreve memoria/diario/<semana>.md e a linha no INDEX.md."""
    try:
        return {"ficheiro": memoria.guardar_semana(pedido.semana)}
    except (ValueError, KeyError, TypeError) as e:
        raise HTTPException(400, f"Semana inválida: {e}")


@app.post("/api/notas", status_code=201)
def criar_nota(pedido: PedidoNota):
    """Guarda uma nota do dia (literal, com a hora). Sem resposta do agente, sem pergunta.

    O filtro de bem-estar corre primeiro: com alerta, NÃO guarda e devolve a resposta de apoio.
    """
    alerta = seguranca.verificar(pedido.texto)
    if alerta:
        # não guarda; devolve a resposta de apoio (200, não 201: não foi criado nada)
        return JSONResponse(status_code=200,
                            content={"alerta_seguranca": True, "nivel": alerta["nivel"],
                                     "resposta": alerta["resposta"]})
    try:
        nota = memoria.guardar_nota(pedido.texto, pedido.data)
        da_semana = memoria.notas_da_semana(memoria.semana_de(nota["data"]))
    except ValueError as e:
        raise HTTPException(400, f"Nota inválida: {e}")
    return {"id": nota["id"], "data": nota["data"], "hora": nota["hora"],
            "texto": nota["texto"], "tema_sugerido": nota["tema"],
            "insight": memoria.insight_de_notas(da_semana)}


@app.get("/api/notas")
def listar_notas(semana: str | None = None):
    """Notas da semana indicada (ou da atual) e o insight diário (uma linha, já calculada)."""
    try:
        notas = memoria.notas_da_semana(semana)
    except ValueError as e:
        raise HTTPException(400, f"Semana inválida: {e}")
    return {"notas": [{"id": n["id"], "data": n["data"], "hora": n["hora"],
                       "texto": n["texto"], "tema_sugerido": n["tema"]} for n in notas],
            "insight": memoria.insight_de_notas(notas)}


@app.delete("/api/notas/{nid}", status_code=204)
def apagar_nota(nid: str):
    """Remove a nota (reescreve o ficheiro do dia; a última apaga o ficheiro)."""
    try:
        apagou = memoria.apagar_nota(nid)
    except ValueError as e:
        raise HTTPException(400, f"Nota inválida: {e}")
    if not apagou:
        raise HTTPException(404, "Essa nota já não existe.")
    return Response(status_code=204)


@app.get("/api/memoria")
def ver_memoria():
    """Contexto, semanas, padrões e métricas para o painel."""
    semanas = memoria.listar_semanas(ultimas=0)
    metas = [s["meta"] for s in semanas]
    return {
        "contexto": memoria.carregar_contexto(),
        "semanas": [
            {
                "semana": s["meta"]["semana"],
                "periodo": s["meta"].get("periodo"),
                "energia": s["meta"].get("energia"),
                "resumo": s["resumo"],
                "prioridades": s["prioridades"],
                "padroes": s["meta"].get("padroes") or [],
                "markdown": s["corpo"],
            }
            for s in semanas
        ],
        "padroes": padroes.detetar(metas),
        "metricas": padroes.metricas(metas),
    }


@app.delete("/api/memoria")
def apagar_memoria():
    """«Apagar tudo» (servidor): o diário vai para a lixeira e o INDEX fica limpo.

    Devolve o token para o «Desfazer» (POST /api/memoria/restaurar). As conversas do
    navegador são apagadas pelo próprio frontend.
    """
    return {"token_desfazer": memoria.apagar_diario()}


@app.post("/api/memoria/restaurar")
def restaurar_memoria(pedido: PedidoToken):
    """O «Desfazer» do «Apagar tudo»: recoloca o diário e o INDEX de antes."""
    try:
        restitui = memoria.restaurar_diario(pedido.token_desfazer)
    except ValueError as e:
        raise HTTPException(400, f"Pedido inválido: {e}")
    if not restitui:
        raise HTTPException(404, "Esse pedido de desfazer já não existe.")
    return {"restaurado": True}


# ---------------------------------------------------------------------------
# Consentimento: o que o agente pode ler (memoria/CONSENTIMENTO.md)
# ---------------------------------------------------------------------------

@app.get("/api/consentimento")
def ver_consentimento():
    """Toggles do servidor (lidos do .md a cada pedido) — o painel «O que o agente sabe sobre ti»."""
    return consentimento.estado()


@app.put("/api/consentimento")
def por_consentimento(pedido: PedidoConsentimento):
    """Escreve as três opções (sempre todas, true/false) em memoria/CONSENTIMENTO.md."""
    c = pedido.consentimento
    faltam = [k for k in consentimento.CHAVES if k not in c]
    a_mais = set(c) - set(consentimento.CHAVES)
    if faltam or a_mais or not all(isinstance(c[k], bool) for k in consentimento.CHAVES):
        raise HTTPException(400, "Envia as três opções — agenda, conversa_livre e "
                                 "diario_completo_no_widget — com true ou false em cada uma.")
    return consentimento.guardar(c)


@app.get("/api/consentimento/contexto")
def contexto_consentimento(modo: str = "semanal"):
    """«Ver tudo»: as secções de memória montadas na hora (dados, não prompts), sem LLM."""
    if modo not in ("semanal", "geral"):
        raise HTTPException(400, "modo tem de ser semanal ou geral.")
    return {"contexto": conversa.montar_contexto_dados(modo)}


@app.get("/api/estado")
def estado():
    """Disponibilidade do LLM e semana atual, para o cabeçalho do frontend."""
    mock = llm.modo_mock()
    semana, periodo = memoria.semana_atual()
    return {"disponivel": not mock, "modo": "mock" if mock else "llm",
            "modelo": None if mock else os.getenv("OPENAI_MODEL", "").strip() or llm.MODELO_POR_OMISSAO,
            "semana": semana, "periodo": periodo}


def _escapar_ics(texto: str) -> str:
    """Escapes de texto do RFC 5545 (barra, ponto e vírgula, vírgula, mudanças de linha)."""
    return (texto.replace("\\", "\\\\").replace(";", "\\;")
            .replace(",", "\\,").replace("\r\n", "\\n").replace("\n", "\\n"))


def _proxima_sexta(agora: datetime) -> date:
    """A próxima sexta-feira à hora da reflexão (hoje ainda conta se a hora não passou)."""
    dias = (4 - agora.weekday()) % 7  # segunda=0 … sexta=4
    if dias == 0 and (agora.hour, agora.minute) >= (HORA_REFLEXAO.hour, HORA_REFLEXAO.minute):
        dias = 7
    return (agora + timedelta(days=dias)).date()


@app.get("/api/ics")
def ics(semana: str | None = None):
    """Ficheiro .ics: reflexão semanal recorrente (sexta, 17:00, Lisboa) com as prioridades
    da semana indicada (ou da última guardada) na descrição."""
    semanas = memoria.listar_semanas(ultimas=0)
    if semana:
        alvo = next((s for s in semanas if s["meta"]["semana"] == semana), None)
        if alvo is None:
            raise HTTPException(404, f"Semana desconhecida: {semana}")
    else:
        alvo = semanas[-1] if semanas else None

    agora = datetime.now(FUSO)
    inicio = datetime.combine(_proxima_sexta(agora), HORA_REFLEXAO, tzinfo=FUSO).astimezone(timezone.utc)
    descricao = "5 minutos para fechar a semana: o que correu bem, o que aprendeste, o que bloqueou."
    if alvo:
        if alvo["prioridades"]:
            descricao += ("\n\nPrioridades para a semana:\n"
                          + "\n".join(f"{n}. {p}" for n, p in enumerate(alvo["prioridades"], 1)))
        if alvo["ajuste"]:
            descricao += "\n\nAjuste a experimentar: " + alvo["ajuste"]
    linhas = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Agente de Reflexao Semanal//PT",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        f"UID:reflexao-{alvo['meta']['semana'] if alvo else 'semanal'}@agente-reflexao-semanal",
        f"DTSTAMP:{agora.astimezone(timezone.utc):%Y%m%dT%H%M%SZ}",
        f"DTSTART:{inicio:%Y%m%dT%H%M%SZ}",
        "DURATION:PT15M",
        "RRULE:FREQ=WEEKLY",
        "SUMMARY:Reflexão semanal",
        f"DESCRIPTION:{_escapar_ics(descricao)}",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return Response("\r\n".join(linhas) + "\r\n", media_type="text/calendar; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="reflexao-semanal.ics"'})


@app.post("/api/resumo-mensal")
def resumo_mensal():
    """(P2) Evolução das prioridades e aprendizagens nas últimas 4 semanas guardadas.

    Com LLM: agente/MENSAL.md + diário + padrões + métricas. Sem chave: texto determinístico
    com os mesmos factos (conversa.resumo_mensal_mock).
    """
    if llm.modo_mock():
        return {"texto": conversa.resumo_mensal_mock()}
    try:
        texto = llm.responder(conversa.montar_contexto_mensal(),
                              [{"role": "user", "content": "Escreve o resumo das últimas 4 semanas."}])
    except Exception as e:
        raise _erro_llm(e)
    return {"texto": texto.strip()}


# Tem de ficar no fim: serve o frontend em "/"
app.mount("/", StaticFiles(directory=RAIZ / "frontend", html=True, check_dir=False), name="frontend")
