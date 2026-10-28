"""Reset da demo: apaga memoria/diario/2026-W44.md, a linha dela no INDEX.md e as notas
dessa semana (as notas são apagadas ao guardar a semana; o reset imita esse estado final).

Correr a partir da raiz do repo:  python -m backend.reset_demo
Dono: Backend B (tarefa B5).
"""
from datetime import date, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SEMANA_DEMO = "2026-W44"
FICHEIRO_SEMANA = RAIZ / "memoria" / "diario" / f"{SEMANA_DEMO}.md"
FICHEIRO_INDEX = RAIZ / "memoria" / "INDEX.md"
PASTA_NOTAS = RAIZ / "memoria" / "notas"


def _datas_da_semana_demo() -> tuple[date, date]:
    ano, sem = int(SEMANA_DEMO[:4]), int(SEMANA_DEMO[6:])
    inicio = date.fromisocalendar(ano, sem, 1)
    return inicio, inicio + timedelta(days=6)


def reset() -> None:
    """Apaga a entrada da semana da demo (e a linha do INDEX.md) e as notas dessa semana."""
    FICHEIRO_SEMANA.unlink(missing_ok=True)
    linhas = FICHEIRO_INDEX.read_text(encoding="utf-8").splitlines()
    restantes = [l for l in linhas if not l.startswith(f"- [{SEMANA_DEMO}]")]
    if restantes != linhas:
        FICHEIRO_INDEX.write_text("\n".join(restantes) + "\n", encoding="utf-8", newline="\n")
    notas = ""
    if PASTA_NOTAS.is_dir():
        inicio, fim = _datas_da_semana_demo()
        for caminho in PASTA_NOTAS.glob("*.md"):
            try:
                dentro = inicio <= date.fromisoformat(caminho.stem) <= fim
            except ValueError:
                continue  # ficheiro com nome que não é data: não é da demo
            if dentro:
                caminho.unlink()
                notas = " e as notas da semana"
    print(f"Demo pronta: {SEMANA_DEMO} apagada do diário e do INDEX.md{notas}.")


if __name__ == "__main__":
    reset()
