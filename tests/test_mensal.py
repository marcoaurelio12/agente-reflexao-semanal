"""POST /api/resumo-mensal (P2): em modo mock é determinístico e só com factos do diário;
com LLM, o system prompt é o agente/MENSAL.md e a resposta do modelo passa intacta."""

from backend import llm


def test_resumo_mensal_em_mock_devolve_factos_do_diario(cliente):
    r = cliente.post("/api/resumo-mensal")
    assert r.status_code == 200, r.text
    texto = r.json()["texto"]
    # janela completa do diário canónico (W40 a W43), por datas e nunca pelo código
    assert "últimas 4 semanas" in texto
    assert "28 de setembro a 25 de outubro" in texto
    assert "W4" not in texto
    # energia semana a semana (5, 4, 3, 2) e prioridades cumpridas (5 feitas de 9, 3 em parte)
    assert "5 na semana de 28 de setembro a 4 de outubro" in texto
    assert "2 na semana de 19 a 25 de outubro" in texto
    assert "De 9 prioridades, 5 ficaram feitas e 3 em parte" in texto
    # temas que mais apareceram, com o nome legível de temas.yaml
    assert "«Reuniões a mais ou sem agenda»" in texto
    assert "«Blocos de foco»" in texto
    # sem tom de avaliação
    baixo = texto.lower()
    for proibido in ("boa", "ótimo", "excelente", "devias", "tens de", "parabéns"):
        assert proibido not in baixo, proibido


def test_resumo_mensal_com_llm_usa_o_mensal_md_e_passa_a_resposta(cliente, monkeypatch):
    capturado = {}

    def fake(system, mensagens):
        capturado.update(system=system, mensagens=mensagens)
        return "Nas últimas 4 semanas, a energia passou de 5 para 2."

    monkeypatch.setattr(llm, "modo_mock", lambda: False)
    monkeypatch.setattr(llm, "responder", fake)
    r = cliente.post("/api/resumo-mensal")
    assert r.status_code == 200, r.text
    assert r.json() == {"texto": "Nas últimas 4 semanas, a energia passou de 5 para 2."}
    # o prompt vem de agente/MENSAL.md e o diário e as métricas entram no contexto
    assert "Resumo do mês" in capturado["system"]
    assert "Quem é a pessoa" in capturado["system"]
    assert "Diário das últimas semanas" in capturado["system"]
    assert "Padrões já detetados" in capturado["system"]
    assert "Energia por semana" in capturado["system"]
    assert "semana de 5 a 11 de outubro: 4" in capturado["system"]
    assert capturado["mensagens"] == [{"role": "user", "content": "Escreve o resumo das últimas 4 semanas."}]


def test_resumo_mensal_falha_do_llm_devolve_502(cliente, monkeypatch):
    def fake(system, mensagens):
        raise RuntimeError("rede fora")

    monkeypatch.setattr(llm, "modo_mock", lambda: False)
    monkeypatch.setattr(llm, "responder", fake)
    r = cliente.post("/api/resumo-mensal")
    assert r.status_code == 502
    assert "LLM" in r.json()["detail"]
