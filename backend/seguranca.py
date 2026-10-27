"""Filtro de segurança que corre ANTES do LLM, e deteção de respostas vagas.

Expressões e respostas fixas em agente/SEGURANCA.md; expressões vagas em agente/PERGUNTAS.md.
Dono: Backend B (tarefa B3).
"""
import re
import unicodedata
from pathlib import Path

FICHEIRO_SEGURANCA = Path(__file__).resolve().parent.parent / "agente" / "SEGURANCA.md"

# Cópia das listas de agente/SEGURANCA.md (sem acentos, minúsculas). Atualizar as duas juntas.
URGENTE = ["quero morrer", "nao quero viver", "nao vale a pena viver", "por fim a tudo",
           "acabar com tudo", "magoar-me", "fazer-me mal", "suicid"]
APOIO = ["nao vejo saida", "sem saida nenhuma", "em baixo ha semanas", "ataque de panico",
         "ataques de panico", "choro todos os dias", "nao durmo ha dias", "sinto-me vazia",
         "sinto-me vazio", "estou a ir abaixo"]
# Cópia de agente/PERGUNTAS.md §Respostas vagas.
VAGAS = {"normal", "ok", "bem", "mal", "tudo bem", "mais ou menos", "nada", "sei la", "o costume"}


def _normalizar(texto: str) -> str:
    sem_acentos = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode()
    return " ".join(sem_acentos.lower().split())


def _resposta_fixa(nivel: str) -> str:
    """Blockquote da secção "### Resposta fixa: nível <nivel>" de agente/SEGURANCA.md."""
    texto = FICHEIRO_SEGURANCA.read_text(encoding="utf-8")
    m = re.search(rf"^### Resposta fixa: nível {nivel}\s*\n(.*?)(?=^#|\Z)", texto, re.M | re.S)
    linhas = [l[1:].strip() for l in (m.group(1) if m else "").splitlines() if l.startswith(">")]
    return " ".join(linhas)


def verificar(texto: str) -> dict | None:
    """{"nivel": "urgente" | "apoio", "resposta": str} se houver sinais de mal-estar sério; senão None.

    Compara em minúsculas e sem acentos. "não aguento mais reuniões sem agenda" NÃO dispara.
    """
    t = _normalizar(texto)
    for nivel, expressoes in (("urgente", URGENTE), ("apoio", APOIO)):
        if any(e in t for e in expressoes):
            return {"nivel": nivel, "resposta": _resposta_fixa(nivel)}
    return None


def e_vaga(texto: str) -> bool:
    """True se a resposta for curta ou vaga (menos de 4 palavras, ou só "normal", "ok", "sei lá"…)."""
    t = re.sub(r"[^\w\s-]", " ", _normalizar(texto))
    t = " ".join(t.split())
    return len(t.split()) < 4 or t in VAGAS
