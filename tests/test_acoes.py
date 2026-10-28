"""Botões de sugestão no chat (widget): marcador <<ACOES:…>>, validação e limites.

Critérios 1, 2 (parte servidor) e 6 da proposta docs/propostas/sugestoes-no-chat.md.
"""
import shutil

from backend import conversa, llm, memoria

PEDIDO_AJUDA = [{"role": "user", "content": "achas que podia melhorar alguma coisa na forma como trabalho?"}]


def _geral(cliente, monkeypatch, resposta_llm, historico=None):
    """POST /api/chat em modo geral com um LLM de mentira; devolve (json, o que o LLM recebeu)."""
    capturado = {}

    def fake(system, mensagens):
        capturado.update(system=system, mensagens=mensagens)
        return resposta_llm

    monkeypatch.setattr(llm, "modo_mock", lambda: False)
    monkeypatch.setattr(llm, "responder", fake)
    r = cliente.post("/api/chat", json={"mensagens": historico or PEDIDO_AJUDA, "modo": "geral"})
    assert r.status_code == 200, r.text
    return r.json(), capturado


# ---------------------------------------------------------------------------
# Catálogo (agente/ACOES.md)
# ---------------------------------------------------------------------------

def test_catalogo_e_carregado_do_ficheiro_em_cada_pedido():
    acoes = conversa.carregar_acoes()
    assert [a["id"] for a in acoes] == ["novo-habito", "plano-aprendizagem", "rever-padroes", "abrir-reflexao"]
    for a in acoes:
        assert a["etiqueta"]
        if a["tipo"] == "mensagem":
            assert a["mensagem"]
    assert [a["tipo"] for a in acoes] == ["mensagem", "mensagem", "mensagem", "navegacao"]


def test_contexto_geral_ve_o_catalogo_o_semanal_nao(cliente, monkeypatch):
    _, capturado = _geral(cliente, monkeypatch, "Fica registado.")
    assert "Ações sugeridas: catálogo" in capturado["system"]
    assert "<<ACOES:" in capturado["system"]
    assert "Ações sugeridas: catálogo" not in conversa.montar_contexto()


# ---------------------------------------------------------------------------
# Critério 1: marcador, ids inválidos, limite e modo semanal
# ---------------------------------------------------------------------------

def test_marcador_com_2_ids_validos_vira_acoes_sem_o_marcador(cliente, monkeypatch):
    r, _ = _geral(cliente, monkeypatch,
                  "«Reuniões a mais» saiu na semana de 5 e na de 19 de outubro.\n<<ACOES:novo-habito,rever-padroes>>")
    assert r["resposta"] == "«Reuniões a mais» saiu na semana de 5 e na de 19 de outubro."
    assert "<<ACOES" not in r["resposta"]
    assert [a["id"] for a in r["acoes"]] == ["novo-habito", "rever-padroes"]
    catalogo = {a["id"]: a for a in conversa.carregar_acoes()}
    for a in r["acoes"]:
        assert a["texto"] == catalogo[a["id"]]["etiqueta"]  # textos do catálogo
        assert a["tipo"] == catalogo[a["id"]]["tipo"]


def test_id_invalido_e_descartado(cliente, monkeypatch):
    r, _ = _geral(cliente, monkeypatch, "Não tens matéria para isso.\n<<ACOES:spam>>")
    assert r["resposta"] == "Não tens matéria para isso."
    assert r["acoes"] == []


def test_tres_validos_sao_truncados_a_dois(cliente, monkeypatch):
    r, _ = _geral(cliente, monkeypatch, "Fica registado.\n<<ACOES:novo-habito,plano-aprendizagem,rever-padroes>>")
    assert [a["id"] for a in r["acoes"]] == ["novo-habito", "plano-aprendizagem"]


def test_ids_deduplicados(cliente, monkeypatch):
    r, _ = _geral(cliente, monkeypatch, "Fica registado.\n<<ACOES:novo-habito,novo-habito>>")
    assert [a["id"] for a in r["acoes"]] == ["novo-habito"]


def test_modo_semanal_devolve_sempre_acoes_vazias(cliente, monkeypatch):
    monkeypatch.setattr(llm, "modo_mock", lambda: False)
    monkeypatch.setattr(llm, "responder", lambda *a: "Fica registado.\n<<ACOES:novo-habito>>")
    r = cliente.post("/api/chat", json={"mensagens": PEDIDO_AJUDA})
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["acoes"] == []
    assert "<<ACOES" not in corpo["resposta"]  # o marcador nunca chega à pessoa


# ---------------------------------------------------------------------------
# Critério 2 (parte servidor): o clique envia a mensagem do catálogo como
# mensagem normal da pessoa; o pedido não ganha campo novo.
# ---------------------------------------------------------------------------

def test_acao_traz_a_mensagem_exata_do_catalogo(cliente, monkeypatch):
    r, _ = _geral(cliente, monkeypatch, "Fica registado.\n<<ACOES:novo-habito>>")
    catalogo = {a["id"]: a for a in conversa.carregar_acoes()}
    assert r["acoes"][0]["mensagem"] == catalogo["novo-habito"]["mensagem"]


def test_mensagem_do_catalogo_chega_ao_llm_como_mensagem_da_pessoa(cliente, monkeypatch):
    catalogo = {a["id"]: a for a in conversa.carregar_acoes()}
    # 1.ª troca: o agente responde com chips
    r, _ = _geral(cliente, monkeypatch, "Fica registado.\n<<ACOES:novo-habito>>")
    # o clique (no frontend) envia a mensagem do catálogo num pedido normal, sem campo novo
    historico = PEDIDO_AJUDA + [{"role": "assistant", "content": r["resposta"]},
                                {"role": "user", "content": r["acoes"][0]["mensagem"]}]
    r2, capturado = _geral(cliente, monkeypatch, "Na semana de 5 de outubro resultou. Experimenta…",
                           historico)
    assert r2["resposta"].startswith("Na semana de 5")
    assert capturado["mensagens"] == historico  # nada além de role/content viajou no pedido
    assert capturado["mensagens"][-1]["content"] == catalogo["novo-habito"]["mensagem"]


# ---------------------------------------------------------------------------
# Critério 6: em modo mock, acoes é sempre []; /api/fechar e /api/guardar intocados
# ---------------------------------------------------------------------------

def test_mock_geral_e_semanal_devolvem_acoes_vazias(cliente):
    # a fixture modo_mock garante que não há chave: o geral responde com a mensagem fixa
    # de reserva e o semanal com a conversa de exemplo; nenhum dos dois tem marcador
    for pedido in ({"mensagens": [{"role": "user", "content": "olá"}], "modo": "geral"},
                   {"mensagens": []}):
        r = cliente.post("/api/chat", json=pedido)
        assert r.status_code == 200, r.text
        corpo = r.json()
        assert corpo["resposta"].strip()
        assert corpo["acoes"] == []


def test_fecho_e_guardar_nao_ganharam_campo_acoes(cliente, monkeypatch, tmp_path):
    monkeypatch.setattr(memoria, "semana_atual",
                        lambda: ("2026-W44", "2026-10-26 a 2026-11-01"))
    r = cliente.post("/api/fechar", json={"mensagens": []})
    assert r.status_code == 200, r.text
    assert set(r.json().keys()) == {"semana"}
    semana = r.json()["semana"]
    assert "acoes" not in semana

    # guardar numa pasta temporária, como faz o teste do fluxo completo
    (tmp_path / "diario").mkdir()
    for f in memoria.PASTA_DIARIO.glob("*.md"):
        shutil.copy(f, tmp_path / "diario" / f.name)
    shutil.copy(memoria.FICHEIRO_INDEX, tmp_path / "INDEX.md")
    monkeypatch.setattr(memoria, "PASTA_DIARIO", tmp_path / "diario")
    monkeypatch.setattr(memoria, "FICHEIRO_INDEX", tmp_path / "INDEX.md")
    g = cliente.post("/api/guardar", json={"semana": semana})
    assert g.status_code == 200, g.text
    assert g.json() == {"ficheiro": "memoria/diario/2026-W44.md"}
