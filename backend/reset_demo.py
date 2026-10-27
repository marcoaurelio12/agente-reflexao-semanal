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
    FICHEIRO_SEMANA.unlink(missing_ok=True)
    linhas = FICHEIRO_INDEX.read_text(encoding="utf-8").splitlines()
    restantes = [l for l in linhas if not l.startswith(f"- [{SEMANA_DEMO}]")]
    if restantes != linhas:
        FICHEIRO_INDEX.write_text("\n".join(restantes) + "\n", encoding="utf-8", newline="\n")
    print(f"Demo pronta: {SEMANA_DEMO} apagada do diário e do INDEX.md.")


if __name__ == "__main__":
    reset()
