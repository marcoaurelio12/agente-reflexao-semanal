"""Servidor FastAPI. Endpoints em docs/ARQUITETURA.md §API. Dono: Backend A.

Correr a partir da raiz do repo:  python -m uvicorn backend.app:app --reload
Depois abrir http://localhost:8000
"""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

RAIZ = Path(__file__).resolve().parent.parent

app = FastAPI(title="Agente de Reflexão Semanal")


class Mensagem(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class PedidoChat(BaseModel):
    mensagens: list[Mensagem] = []


class PedidoGuardar(BaseModel):
    semana: dict


@app.post("/api/chat")
def chat(pedido: PedidoChat):
    """Abertura (mensagens vazias), perguntas, seguimento se vago, marcador de fecho."""
    raise HTTPException(501, "A3: por implementar")


@app.post("/api/fechar")
def fechar(pedido: PedidoChat):
    """JSON da semana (FECHO.md) + padrões. Ainda não guarda."""
    raise HTTPException(501, "A4: por implementar")


@app.post("/api/guardar")
def guardar(pedido: PedidoGuardar):
    """Escreve memoria/diario/<semana>.md e a linha no INDEX.md."""
    raise HTTPException(501, "A4: por implementar")


@app.get("/api/memoria")
def memoria():
    """Contexto, semanas, padrões e métricas para o painel."""
    raise HTTPException(501, "A5: por implementar")


@app.post("/api/resumo-mensal")
def resumo_mensal():
    """(P2) Evolução das prioridades e aprendizagens nas últimas 4 semanas."""
    raise HTTPException(501, "A6: por implementar")


# Tem de ficar no fim: serve o frontend em "/"
app.mount("/", StaticFiles(directory=RAIZ / "frontend", html=True, check_dir=False), name="frontend")
