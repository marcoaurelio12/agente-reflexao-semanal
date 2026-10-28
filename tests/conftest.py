"""Fixtures partilhadas dos testes: cliente da API e estado canónico do diário.

Os testes correm em modo mock (sem OPENAI_API_KEY), não falam com a rede e não deixam
ficheiros novos em memoria/: a semana da demo é apagada no início e no fim (reset_demo) e o
CONSENTIMENTO.md volta ao estado do repo (nenhum teste o pode sujar por engano).
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend import reset_demo
from backend.app import app

FICHEIRO_CONSENTIMENTO = Path(__file__).resolve().parent.parent / "memoria" / "CONSENTIMENTO.md"


@pytest.fixture(autouse=True)
def modo_mock(monkeypatch):
    """Sem chave, mesmo que o .env tenha uma: os testes nunca vão à rede nem gastam quota do LLM."""
    monkeypatch.setenv("OPENAI_API_KEY", "")


@pytest.fixture(autouse=True)
def estado_canonico():
    """Diário com W40 a W43 antes e depois dos testes (igual ao ensaio da demo)."""
    reset_demo.reset()
    consentimento = (FICHEIRO_CONSENTIMENTO.read_text(encoding="utf-8")
                     if FICHEIRO_CONSENTIMENTO.exists() else None)
    yield
    reset_demo.reset()
    if consentimento is not None:
        FICHEIRO_CONSENTIMENTO.write_text(consentimento, encoding="utf-8", newline="\n")


@pytest.fixture()
def cliente():
    return TestClient(app)
