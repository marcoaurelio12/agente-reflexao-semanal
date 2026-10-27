"""Monta o contexto (system prompt) a partir de agente/ e memoria/.

Ordem em docs/ARQUITETURA.md §Contexto. Os ficheiros são lidos em cada pedido, para a equipa
poder afinar os prompts sem reiniciar o servidor. Dono: Backend A (tarefas A2 e A4).
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA_AGENTE = RAIZ / "agente"
PASTA_MEMORIA = RAIZ / "memoria"

MARCADOR_FECHO = "<<FECHAR>>"


def montar_contexto(nota_extra: str | None = None) -> str:
    """System prompt da conversa: prompts de agente/ + diário + padrões + agenda + semana atual (+ nota)."""
    raise NotImplementedError("A2")


def montar_contexto_fecho() -> str:
    """System prompt do fecho: agente/FECHO.md + temas.yaml + contexto, diário, padrões e semana atual."""
    raise NotImplementedError("A4")
