"""Painel de consentimento: GET/PUT persiste, a agenda respeita o contexto, «Ver tudo»
expõe as secções de dados e o «Apagar tudo» tem lixeira com «Desfazer»
(proposta docs/propostas/consentimento.md, critérios 1, 2, 3 e 6)."""
import shutil

import pytest

from backend import consentimento, conversa, llm, memoria

OMISSOES = {"agenda": False, "conversa_livre": True, "diario_completo_no_widget": False}


@pytest.fixture()
def consent_tmp(tmp_path, monkeypatch):
    """CONSENTIMENTO.md numa pasta temporária: PUT não mexe no ficheiro do repo."""
    caminho = tmp_path / "CONSENTIMENTO.md"
    monkeypatch.setattr(consentimento, "FICHEIRO", caminho)
    return caminho


@pytest.fixture()
def semana_demo(monkeypatch):
    monkeypatch.setattr(memoria, "semana_atual", lambda: ("2026-W44", "2026-10-26 a 2026-11-01"))


def _put(cliente, **valores):
    corpo = {**OMISSOES, **valores}
    return cliente.put("/api/consentimento", json={"consentimento": corpo}), corpo


# ---------------------------------------------------------------------------
# GET/PUT persiste (critério 1)
# ---------------------------------------------------------------------------

def test_get_sem_ficheiro_devolve_as_omissoes(cliente, consent_tmp):
    r = cliente.get("/api/consentimento")
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["consentimento"] == OMISSOES
    assert corpo["atualizado_em"] is None
    assert corpo["fonte"] == "memoria/CONSENTIMENTO.md"


def test_put_escreve_o_ficheiro_e_get_volta_a_ler(cliente, consent_tmp):
    r, enviado = _put(cliente, agenda=True, conversa_livre=False, diario_completo_no_widget=True)
    assert r.status_code == 200, r.text
    assert r.json()["consentimento"] == enviado
    assert r.json()["atualizado_em"]

    texto = consent_tmp.read_text(encoding="utf-8")  # o .md é a fonte, auditável
    assert "agenda: true" in texto and "conversa_livre: false" in texto
    assert "diario_completo_no_widget: true" in texto
    assert texto.count("- 20") >= 1  # linha de histórico

    # "reiniciado o servidor": o GET relê o ficheiro a cada pedido (sem cache)
    assert cliente.get("/api/consentimento").json()["consentimento"] == enviado


def test_put_incompleto_ou_com_tipos_errados_da_400(cliente, consent_tmp):
    r = cliente.put("/api/consentimento", json={"consentimento": {"agenda": True}})
    assert r.status_code == 400
    r = cliente.put("/api/consentimento", json={"consentimento": {**OMISSOES, "agenda": "sim"}})
    assert r.status_code == 400
    assert not consent_tmp.exists()  # nada foi escrito


# ---------------------------------------------------------------------------
# A agenda só entra no contexto com consentimento (critério 2)
# ---------------------------------------------------------------------------

def test_agenda_no_contexto_so_com_consentimento(cliente, consent_tmp, semana_demo):
    # memoria/agenda/2026-W44.md existe no repo; omissão é agenda: false
    assert "## Agenda desta semana" not in conversa.montar_contexto()
    assert "## Agenda desta semana" not in cliente.get("/api/consentimento/contexto").json()["contexto"]

    _put(cliente, agenda=True)
    assert "## Agenda desta semana" in conversa.montar_contexto()
    assert "## Agenda desta semana" in conversa.montar_contexto_geral()
    contexto = cliente.get("/api/consentimento/contexto", params={"modo": "semanal"}).json()["contexto"]
    assert "## Agenda desta semana" in contexto


def test_contexto_expoe_so_as_seccoes_de_dados(cliente, consent_tmp, semana_demo):
    contexto = cliente.get("/api/consentimento/contexto").json()["contexto"]
    for secao in ("## Quem é a pessoa", "## Índice do diário", "## Diário das últimas semanas",
                  "## Padrões já detetados", "## Semana atual"):
        assert secao in contexto, secao
    # e mais nada: nem prompts nem catálogo de ações (são públicos no repo, não são dados)
    for proibido in ("Quem és", "Ações sugeridas: catálogo", "<<FECHAR>>", "Respostas vagas"):
        assert proibido not in contexto, proibido
    r = cliente.get("/api/consentimento/contexto", params={"modo": "estranho"})
    assert r.status_code == 400


def test_diario_completo_no_widget_decide_o_alcance(cliente, consent_tmp, semana_demo, tmp_path):
    # diário de trabalho com 5 semanas (W39 a W43): o widget sem consentimento lê 4
    (tmp_path / "diario").mkdir()
    for f in memoria.PASTA_DIARIO.glob("*.md"):
        shutil.copy(f, tmp_path / "diario" / f.name)
    (tmp_path / "diario" / "2026-W39.md").write_text(
        "---\nsemana: 2026-W39\nperiodo: 2026-09-21 a 2026-09-27\nregistado_em: 2026-09-25\n"
        "energia: 4\ntemas:\n  bloqueios: []\n  aprendizagens: []\n  prioridades: []\n"
        "  notas: []\nprioridades_anteriores: {feitas: 0, parciais: 0, total: 0}\npadroes: []\n---\n"
        "# Semana de 21 a 27 de setembro\n\n## Resumo\n\nPrimeira.\n", encoding="utf-8")
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(memoria, "PASTA_DIARIO", tmp_path / "diario")
    try:
        geral = conversa.montar_contexto_geral()
        assert geral.count("# Semana de") == 4  # últimas 4 semanas (W40 a W43)
        _put(cliente, diario_completo_no_widget=True)
        geral = conversa.montar_contexto_geral()
        assert geral.count("# Semana de") == 5  # todas (W39 a W43)
        assert "# Semana de 21 a 27 de setembro" in geral
    finally:
        monkeypatch.undo()


# ---------------------------------------------------------------------------
# conversa_livre off → 403 em pt-PT (critério 3)
# ---------------------------------------------------------------------------

def test_conversa_livre_desligada_da_403_sem_chamar_o_llm(cliente, consent_tmp, monkeypatch):
    # o modo semanal nunca depende da conversa livre
    assert cliente.post("/api/chat", json={"mensagens": [{"role": "user", "content": "olá"}]}).status_code == 200

    monkeypatch.setattr(llm, "modo_mock", lambda: False)
    monkeypatch.setattr(llm, "responder",
                        lambda *a: (_ for _ in ()).throw(AssertionError("sem LLM")))
    _put(cliente, conversa_livre=False)
    r = cliente.post("/api/chat", json={"mensagens": [{"role": "user", "content": "olá"}],
                                        "modo": "geral"})
    assert r.status_code == 403
    assert "desligada" in r.json()["detail"]  # pt-PT

    # sem undo(): voltar atrás no monkeypatch desfaria também o consent_tmp deste teste
    monkeypatch.setattr(llm, "modo_mock", lambda: True)  # volta ao modo mock
    _put(cliente, conversa_livre=True)  # ligar de novo reabre a conversa livre
    ok = cliente.post("/api/chat", json={"mensagens": [{"role": "user", "content": "olá"}],
                                         "modo": "geral"})
    assert ok.status_code == 200 and ok.json()["acoes"] == []


# ---------------------------------------------------------------------------
# Apagar tudo com lixeira + desfazer (critério 6), em pastas temporárias
# ---------------------------------------------------------------------------

@pytest.fixture()
def memoria_tmp(tmp_path, monkeypatch):
    (tmp_path / "diario").mkdir()
    for f in memoria.PASTA_DIARIO.glob("*.md"):
        shutil.copy(f, tmp_path / "diario" / f.name)
    shutil.copy(memoria.FICHEIRO_INDEX, tmp_path / "INDEX.md")
    monkeypatch.setattr(memoria, "PASTA_DIARIO", tmp_path / "diario")
    monkeypatch.setattr(memoria, "FICHEIRO_INDEX", tmp_path / "INDEX.md")
    monkeypatch.setattr(memoria, "PASTA_LIXEIRA", tmp_path / ".lixeira")
    return tmp_path


def test_apagar_tudo_move_para_a_lixeira_e_limpa_o_index(cliente, memoria_tmp):
    r = cliente.delete("/api/memoria")
    assert r.status_code == 200, r.text
    token = r.json()["token_desfazer"]
    assert token and (memoria_tmp / ".lixeira" / token).is_dir()
    assert not list((memoria_tmp / "diario").glob("*.md"))
    assert "- [2026-W4" not in (memoria_tmp / "INDEX.md").read_text(encoding="utf-8")
    assert len(list((memoria_tmp / ".lixeira" / token).glob("*.md"))) == 5  # 4 semanas + INDEX


def test_desfazer_recoloca_tudo_e_o_token_sozinho_nao_repoe(cliente, memoria_tmp):
    antes = sorted(f.name for f in (memoria_tmp / "diario").glob("*.md"))
    indice_antes = (memoria_tmp / "INDEX.md").read_text(encoding="utf-8")
    token = cliente.delete("/api/memoria").json()["token_desfazer"]

    r = cliente.post("/api/memoria/restaurar", json={"token_desfazer": token})
    assert r.status_code == 200 and r.json() == {"restaurado": True}
    assert sorted(f.name for f in (memoria_tmp / "diario").glob("*.md")) == antes
    assert (memoria_tmp / "INDEX.md").read_text(encoding="utf-8") == indice_antes
    assert not (memoria_tmp / ".lixeira" / token).exists()

    # o token já foi usado: não há segunda restauração
    r2 = cliente.post("/api/memoria/restaurar", json={"token_desfazer": token})
    assert r2.status_code == 404
    r3 = cliente.post("/api/memoria/restaurar", json={"token_desfazer": "../../diario"})
    assert r3.status_code == 400  # token inválido não sai da lixeira
