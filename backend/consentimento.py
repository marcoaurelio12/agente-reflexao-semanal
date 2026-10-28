"""Consentimento: o que o agente pode ler. memoria/CONSENTIMENTO.md é a fonte de verdade,
lida em cada pedido (como os prompts de agente/). Sem base de dados: frontmatter YAML +
uma linha de histórico por mudança, auditável.

Toggles do servidor (valem para «a pessoa», DECISÕES 10 — sem login):
- agenda: a secção «Agenda desta semana» só entra no contexto com autorização (off por omissão)
- conversa_livre: o widget de conversa livre (on por omissão); off → /api/chat geral dá 403
- diario_completo_no_widget: o widget lê o diário completo ou só as últimas 4 semanas (off)

O 4.º toggle (guardar conversas no navegador) vive no localStorage do frontend.
"""
from datetime import datetime
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent
FICHEIRO = RAIZ / "memoria" / "CONSENTIMENTO.md"

CHAVES = ("agenda", "conversa_livre", "diario_completo_no_widget")
OMISSOES = {"agenda": False, "conversa_livre": True, "diario_completo_no_widget": False}
ROTULOS = {"agenda": "agenda", "conversa_livre": "conversa livre",
           "diario_completo_no_widget": "diário completo no widget"}


def _ler() -> tuple[dict, str]:
    """(frontmatter, corpo) do CONSENTIMENTO.md; ({}, "") se ainda não existir."""
    if not FICHEIRO.exists():
        return {}, ""
    texto = FICHEIRO.read_text(encoding="utf-8")
    if not texto.startswith("---"):
        return {}, texto
    _, fm, corpo = texto.split("---", 2)
    return yaml.safe_load(fm) or {}, corpo


def carregar() -> dict:
    """{agenda, conversa_livre, diario_completo_no_widget}, com omissões para o que faltar."""
    fm, _ = _ler()
    return {k: bool(fm.get(k, OMISSOES[k])) for k in CHAVES}


def estado() -> dict:
    """Corpo do GET /api/consentimento (e da resposta do PUT)."""
    fm, _ = _ler()
    return {"consentimento": carregar(),
            "atualizado_em": fm.get("atualizado_em"),
            "fonte": "memoria/CONSENTIMENTO.md"}


def guardar(novo: dict) -> dict:
    """Escreve o CONSENTIMENTO.md (as três chaves, sempre todas) e acrescenta linha de histórico.

    Quem valida as chaves é o endpoint (PUT /api/consentimento); aqui confia-se no que chegou.
    """
    dados = {k: bool(novo.get(k, OMISSOES[k])) for k in CHAVES}
    agora = datetime.now().isoformat(timespec="seconds")
    _, corpo = _ler()
    mudanca = "; ".join(f"{ROTULOS[k]} {'on' if dados[k] else 'off'}" for k in CHAVES)
    linhas = [
        "---",
        *[f"{k}: {str(dados[k]).lower()}" for k in CHAVES],
        f"atualizado_em: {agora}",
        "---",
        corpo.rstrip("\n"),
        f"- {agora} · {mudanca}",
        "",
    ]
    FICHEIRO.write_text("\n".join(linhas) + "\n", encoding="utf-8", newline="\n")
    return estado()
