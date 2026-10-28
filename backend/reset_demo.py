"""Reset da demo: apaga memoria/diario/2026-W44.md, a linha dela no INDEX.md e as notas
dessa semana (as notas são apagadas ao guardar a semana; o reset imita esse estado final).
Se um ensaio do «Apagar tudo» ficou por desfazer, recoloca primeiro o diário da lixeira.

Correr a partir da raiz do repo:  python -m backend.reset_demo
Dono: Backend B (tarefa B5).
"""
import shutil
from datetime import date, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SEMANA_DEMO = "2026-W44"
PASTA_DIARIO = RAIZ / "memoria" / "diario"
FICHEIRO_SEMANA = PASTA_DIARIO / f"{SEMANA_DEMO}.md"
FICHEIRO_INDEX = RAIZ / "memoria" / "INDEX.md"
PASTA_NOTAS = RAIZ / "memoria" / "notas"
PASTA_LIXEIRA = RAIZ / "memoria" / ".lixeira"


def _datas_da_semana_demo() -> tuple[date, date]:
    ano, sem = int(SEMANA_DEMO[:4]), int(SEMANA_DEMO[6:])
    inicio = date.fromisocalendar(ano, sem, 1)
    return inicio, inicio + timedelta(days=6)


def _restaurar_da_lixeira_se_o_diario_ficou_vazio() -> bool:
    """«Apagar tudo» sem «Desfazer» deixou o diário vazio: recoloca a lixeira mais recente."""
    if not PASTA_LIXEIRA.is_dir() or any(PASTA_DIARIO.glob("*.md")):
        return False
    pastas = sorted(p for p in PASTA_LIXEIRA.iterdir() if p.is_dir())
    if not pastas:
        return False
    ultima = pastas[-1]
    for f in ultima.glob("*.md"):
        if f.name != "INDEX.md":
            shutil.move(str(f), str(PASTA_DIARIO / f.name))
    indice = ultima / "INDEX.md"
    if indice.exists():
        shutil.move(str(indice), str(FICHEIRO_INDEX))
    ultima.rmdir()
    return True


def reset() -> None:
    """Apaga a entrada da semana da demo (e a linha do INDEX.md) e as notas dessa semana."""
    restaurado = _restaurar_da_lixeira_se_o_diario_ficou_vazio()
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
    extra = " (diário restaurado da lixeira)" if restaurado else ""
    print(f"Demo pronta: {SEMANA_DEMO} apagada do diário e do INDEX.md{notas}{extra}.")


if __name__ == "__main__":
    reset()
