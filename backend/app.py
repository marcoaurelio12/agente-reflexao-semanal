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
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend import conversa, llm, memoria, padroes, seguranca

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


def _erro_llm(e: Exception) -> HTTPException:
    log.exception("Falha no LLM")
    return HTTPException(502, f"O LLM não respondeu: {e}")


@app.post("/api/chat")
def chat(pedido: PedidoChat):
    """Abertura (mensagens vazias), perguntas, seguimento se vago, marcador de fecho.

    modo="geral" usa o prompt de conversa livre (agente/GERAL.md) e nunca fecha a semana.
    """
    mensagens = [m.model_dump() for m in pedido.mensagens]
    ultima = next((m["content"] for m in reversed(mensagens) if m["role"] == "user"), None)
    if ultima:
        alerta = seguranca.verificar(ultima)
        if alerta:
            return {"resposta": alerta["resposta"], "pronto_para_fechar": False, "alerta_seguranca": True}
    geral = pedido.modo == "geral"
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
    return {"resposta": texto, "pronto_para_fechar": pronto and not geral, "alerta_seguranca": False}


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
    """(P2) Evolução das prioridades e aprendizagens nas últimas 4 semanas."""
    raise HTTPException(501, "A6: por implementar")


# Tem de ficar no fim: serve o frontend em "/"
app.mount("/", StaticFiles(directory=RAIZ / "frontend", html=True, check_dir=False), name="frontend")
