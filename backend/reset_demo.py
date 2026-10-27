"""Reset da demo: apaga memoria/diario/2026-W44.md e a linha dela no INDEX.md.

Correr a partir da raiz do repo:  python -m backend.reset_demo
Dono: Backend B (tarefa B5).
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SEMANA_DEMO = "2026-W44"
FICHEIRO_SEMANA = RAIZ / "memoria" / "diario" / f"{SEMANA_DEMO}.md"
FICHEIRO_INDEX = RAIZ / "memoria" / "INDEX.md"


def reset() -> None:
    """Apaga a entrada da semana da demo e a linha correspondente no INDEX.md, se existirem."""
    raise NotImplementedError("B5")


if __name__ == "__main__":
    reset()
