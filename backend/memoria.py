"""Memória entre semanas: lê e escreve o diário em markdown de memoria/.

Dono: Backend B (tarefa B1). Contrato em docs/ARQUITETURA.md §Interfaces internas.
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA_MEMORIA = RAIZ / "memoria"
PASTA_DIARIO = PASTA_MEMORIA / "diario"
PASTA_AGENDA = PASTA_MEMORIA / "agenda"
PASTA_AGENTE = RAIZ / "agente"
FICHEIRO_CONTEXTO = PASTA_MEMORIA / "CONTEXTO.md"
FICHEIRO_INDEX = PASTA_MEMORIA / "INDEX.md"
FICHEIRO_TEMAS = PASTA_AGENTE / "temas.yaml"


def carregar_contexto() -> str:
    """Conteúdo de memoria/CONTEXTO.md (quem é a pessoa)."""
    raise NotImplementedError("B1")


def carregar_index() -> str:
    """Conteúdo de memoria/INDEX.md (uma linha por semana)."""
    raise NotImplementedError("B1")


def listar_semanas(ultimas: int = 4) -> list[dict]:
    """As últimas N entradas do diário, por ordem cronológica (mais antiga primeiro).

    Cada item: {"meta": frontmatter (dict), "markdown": entrada completa, "resumo": texto da secção Resumo}.
    """
    raise NotImplementedError("B1")


def carregar_agenda(semana_id: str) -> str | None:
    """Conteúdo de memoria/agenda/<semana_id>.md, ou None se não existir."""
    raise NotImplementedError("B1")


def meta_de(semana: dict) -> dict:
    """Converte o JSON do /api/fechar para o formato do frontmatter (temas, energia, contagens)."""
    raise NotImplementedError("B1")


def guardar_semana(semana: dict) -> str:
    """Escreve memoria/diario/<semana>.md no formato de 2026-W43.md e acrescenta a linha no INDEX.md.

    Devolve o caminho relativo à raiz (ex.: "memoria/diario/2026-W44.md").
    """
    raise NotImplementedError("B1")


def semana_atual() -> tuple[str, str]:
    """("2026-W44", "2026-10-26 a 2026-11-01"). Respeita DEMO_SEMANA do .env."""
    raise NotImplementedError("B1")


def carregar_temas() -> dict:
    """Conteúdo de agente/temas.yaml."""
    raise NotImplementedError("B1")
