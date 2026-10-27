"""Servidor FastAPI. Endpoints em docs/ARQUITETURA.md §API. Dono: Backend A.

Correr a partir da raiz do repo:  python -m uvicorn backend.app:app --reload
Depois abrir http://localhost:8000
"""
import logging
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend import conversa, llm, memoria, padroes, seguranca

RAIZ = Path(__file__).resolve().parent.parent
NOTA_VAGA = "A última resposta foi vaga: faz UMA pergunta de seguimento concreta; não assumas nada."

app = FastAPI(title="Agente de Reflexão Semanal")
log = logging.getLogger("uvicorn.error")
log.info("LLM: %s", "modo mock (sem OPENAI_API_KEY)" if llm.modo_mock() else "Gemini")


class Mensagem(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class PedidoChat(BaseModel):
    mensagens: list[Mensagem] = []


class PedidoGuardar(BaseModel):
    semana: dict


def _erro_llm(e: Exception) -> HTTPException:
    log.exception("Falha no LLM")
    return HTTPException(502, f"O LLM não respondeu: {e}")


@app.post("/api/chat")
def chat(pedido: PedidoChat):
    """Abertura (mensagens vazias), perguntas, seguimento se vago, marcador de fecho."""
    mensagens = [m.model_dump() for m in pedido.mensagens]
    ultima = next((m["content"] for m in reversed(mensagens) if m["role"] == "user"), None)
    if ultima:
        alerta = seguranca.verificar(ultima)
        if alerta:
            return {"resposta": alerta["resposta"], "pronto_para_fechar": False, "alerta_seguranca": True}
    nota = NOTA_VAGA if ultima and seguranca.e_vaga(ultima) else None
    try:
        texto = llm.responder(conversa.montar_contexto(nota), mensagens)
    except Exception as e:
        raise _erro_llm(e)
    pronto = conversa.MARCADOR_FECHO in texto
    texto = texto.replace(conversa.MARCADOR_FECHO, "").strip()
    return {"resposta": texto, "pronto_para_fechar": pronto, "alerta_seguranca": False}


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


class PedidoLLM(BaseModel):
    mensagens: list[Mensagem]
    json_: bool = Field(False, alias="json")


@app.get("/api/llm")
def llm_estado():
    """Ponte do frontend (frontend/ponte.js): o modo live só liga se houver chave."""
    return {"disponivel": not llm.modo_mock()}


@app.post("/api/llm")
def llm_ponte(pedido: PedidoLLM):
    """Ponte do frontend: as mensagens vêm já montadas pelo app.js; devolve texto ou JSON do Gemini."""
    if llm.modo_mock():
        raise HTTPException(503, "Sem chave: o modo live está desligado.")
    mensagens = [m.model_dump() for m in pedido.mensagens]
    try:
        if pedido.json_:
            return {"json": llm.extrair_json("", mensagens)}
        return {"texto": llm.responder("", mensagens)}
    except Exception as e:
        raise _erro_llm(e)


@app.post("/api/resumo-mensal")
def resumo_mensal():
    """(P2) Evolução das prioridades e aprendizagens nas últimas 4 semanas."""
    raise HTTPException(501, "A6: por implementar")


# Tem de ficar no fim: serve o frontend em "/"
app.mount("/", StaticFiles(directory=RAIZ / "frontend", html=True, check_dir=False), name="frontend")
