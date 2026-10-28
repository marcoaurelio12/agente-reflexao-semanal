"""Notas do dia: guardar/listar/apagar, filtro de bem-estar, contexto da semana,
nota_recorrente e notas_temas no fecho (proposta docs/propostas/notas-do-dia.md)."""
import re
import shutil

import pytest

from backend import conversa, llm, memoria, padroes

TEXTO_REUNIOES = "outra vez reuniões de última hora, zero foco"


@pytest.fixture()
def notas_tmp(tmp_path, monkeypatch):
    """memoria/notas/ numa pasta temporária: os testes não deixam ficheiros em memoria/."""
    pasta = tmp_path / "notas"
    pasta.mkdir()
    monkeypatch.setattr(memoria, "PASTA_NOTAS", pasta)
    return pasta


def _post_nota(cliente, texto, data="2026-10-28"):
    return cliente.post("/api/notas", json={"texto": texto, "data": data})


# ---------------------------------------------------------------------------
# Guardar / listar / apagar
# ---------------------------------------------------------------------------

def test_guardar_nota_cria_o_ficheiro_do_dia_sem_tocar_no_index(cliente, notas_tmp):
    antes = memoria.FICHEIRO_INDEX.read_text(encoding="utf-8")
    r = _post_nota(cliente, TEXTO_REUNIOES)
    assert r.status_code == 201, r.text
    corpo = r.json()
    assert corpo["id"] == "2026-10-28-1"
    assert corpo["data"] == "2026-10-28"
    assert re.fullmatch(r"\d{2}:\d{2}", corpo["hora"])
    assert corpo["tema_sugerido"] == "reunioes-excessivas"
    assert corpo["insight"] is None  # uma nota só não gera insight

    ficheiro = notas_tmp / "2026-10-28.md"
    assert ficheiro.exists()
    texto = ficheiro.read_text(encoding="utf-8")
    assert "data: 2026-10-28" in texto
    assert "temas: [reunioes-excessivas]" in texto
    assert "# Notas de 28 de outubro" in texto
    assert f"- {corpo['hora']} — {TEXTO_REUNIOES}" in texto
    assert memoria.FICHEIRO_INDEX.read_text(encoding="utf-8") == antes  # o índice é do semanal


def test_get_devolve_as_notas_da_semana_e_o_insight(cliente, notas_tmp):
    _post_nota(cliente, TEXTO_REUNIOES, data="2026-10-27")
    _post_nota(cliente, "Reuniões sem agenda de novo, não se decidiu nada", data="2026-10-28")
    r = cliente.get("/api/notas", params={"semana": "2026-W44"})
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert [n["id"] for n in corpo["notas"]] == ["2026-10-27-1", "2026-10-28-1"]
    assert all(n["tema_sugerido"] == "reunioes-excessivas" for n in corpo["notas"])
    assert corpo["insight"] == "«Reuniões a mais ou sem agenda» saiu em 2 notas desta semana."


def test_temas_todos_diferentes_deixam_o_insight_a_null(cliente, notas_tmp):
    _post_nota(cliente, TEXTO_REUNIOES, data="2026-10-27")
    _post_nota(cliente, "Interrupções o dia todo, não fechei nada", data="2026-10-28")
    r = cliente.get("/api/notas", params={"semana": "2026-W44"})
    assert r.json()["insight"] is None


def test_apagar_nota_renumera_e_apaga_o_ficheiro_no_fim(cliente, notas_tmp):
    _post_nota(cliente, TEXTO_REUNIOES, data="2026-10-28")
    _post_nota(cliente, "Bloco de foco pela manhã correu bem", data="2026-10-28")
    assert cliente.delete("/api/notas/2026-10-28-1").status_code == 204
    corpo = cliente.get("/api/notas", params={"semana": "2026-W44"}).json()
    assert [n["id"] for n in corpo["notas"]] == ["2026-10-28-1"]  # ids posicionais: renumera
    assert (notas_tmp / "2026-10-28.md").exists()  # ainda há uma nota, o ficheiro fica
    assert cliente.delete("/api/notas/2026-10-28-1").status_code == 204
    assert not (notas_tmp / "2026-10-28.md").exists()  # a última nota apaga o ficheiro
    assert cliente.get("/api/notas", params={"semana": "2026-W44"}).json()["notas"] == []
    assert cliente.delete("/api/notas/2026-10-28-1").status_code == 404


def test_datas_e_ids_invalidos_devolvem_400(cliente, notas_tmp):
    assert cliente.post("/api/notas", json={"texto": "x", "data": "28-10-2026"}).status_code == 400
    assert cliente.post("/api/notas", json={"texto": "   "}).status_code == 400
    assert cliente.get("/api/notas", params={"semana": "outubro"}).status_code == 400
    assert cliente.delete("/api/notas/nao-e-id").status_code == 400


# ---------------------------------------------------------------------------
# Filtro de bem-estar: a nota não é guardada
# ---------------------------------------------------------------------------

def test_mal_estar_na_nota_nao_guarda_e_devolve_a_resposta_de_apoio(cliente, notas_tmp):
    r = _post_nota(cliente, "estou em baixo há semanas e não vejo saída")
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["alerta_seguranca"] is True
    assert "SNS 24" in corpo["resposta"] and "808 24 24 24" in corpo["resposta"]
    assert list(notas_tmp.glob("*.md")) == []  # nada foi guardado


# ---------------------------------------------------------------------------
# A nota entra no contexto da semana
# ---------------------------------------------------------------------------

def _semana_demo(monkeypatch):
    monkeypatch.setattr(memoria, "semana_atual", lambda: ("2026-W44", "2026-10-26 a 2026-11-01"))


def test_nota_entra_nos_tres_contextos_com_o_dia(notas_tmp, monkeypatch):
    _semana_demo(monkeypatch)
    memoria.guardar_nota("manhãs sem foco, reuniões de última hora", "2026-10-27")
    linha = '- terça, 27 de outubro: "manhãs sem foco, reuniões de última hora"'
    for contexto in (conversa.montar_contexto(), conversa.montar_contexto_geral(),
                     conversa.montar_contexto_fecho()):
        assert "## Notas desta semana" in contexto
        assert linha in contexto


def test_sem_notas_nao_ha_seccao_nova(notas_tmp, monkeypatch):
    _semana_demo(monkeypatch)
    assert "## Notas desta semana" not in conversa.montar_contexto()


def test_contexto_limitado_as_ultimas_10_da_semana(notas_tmp, monkeypatch):
    _semana_demo(monkeypatch)
    for i in range(12):
        memoria.guardar_nota(f"nota número {i} da semana", "2026-10-28")
    contexto = conversa.montar_contexto()
    linhas = [l for l in contexto.splitlines() if 'de outubro: "' in l]
    assert len(linhas) == 10
    assert '"nota número 11 da semana"' in contexto  # as últimas 10
    assert '"nota número 0 da semana"' not in contexto


def test_abertura_nao_rebenta_com_notas(cliente, notas_tmp):
    _post_nota(cliente, TEXTO_REUNIOES, data="2026-10-28")
    r = cliente.post("/api/chat", json={"mensagens": []})
    assert r.status_code == 200, r.text
    assert "Inês" in r.json()["resposta"]


# ---------------------------------------------------------------------------
# Matching léxico (memoria.tema_sugerido) e insight (memoria.insight_de_notas)
# ---------------------------------------------------------------------------

def test_tema_sugerido_e_lexico_e_neutros_nao_contam():
    assert memoria.tema_sugerido(TEXTO_REUNIOES) == "reunioes-excessivas"
    assert memoria.tema_sugerido("Interrupções o dia todo") == "interrupcoes"
    assert memoria.tema_sugerido("dormi mal outra vez") is None  # "dormir" não bate com "dormi"
    assert memoria.tema_sugerido("entregas do projeto avançaram") is None  # neutros fora
    assert memoria.insight_de_notas([{"tema": "interrupcoes"}]) is None
    assert memoria.insight_de_notas([]) is None


# ---------------------------------------------------------------------------
# nota_recorrente (padroes.py) e notas_temas no fecho/frontmatter
# ---------------------------------------------------------------------------

def _meta(sid, **temas):
    return {"semana": sid, "energia": None,
            "temas": {"bloqueios": [], "aprendizagens": [], "prioridades": [], **temas}}


def test_nota_recorrente_com_fixture_minima():
    w43 = _meta("2026-W43", notas=["reunioes-excessivas"])
    w44 = _meta("2026-W44", notas=["reunioes-excessivas"])
    detetados = padroes.detetar([w43, w44])
    recorrentes = [p for p in detetados if p["tipo"] == "nota_recorrente"]
    assert len(recorrentes) == 1
    p = recorrentes[0]
    assert p["tema"] == "reunioes-excessivas"
    assert p["semanas"] == ["2026-W43", "2026-W44"]
    assert p["mensagem"] == ("«Reuniões a mais ou sem agenda» aparece em notas de 2 "
                             "das últimas 2 semanas.")


def test_notas_sozinhas_nao_criam_bloqueios_nem_padroes():
    detetados = padroes.detetar([_meta("2026-W44", notas=["reunioes-excessivas"])])
    assert detetados == []  # uma semana só, e notas não são factos classificados


def test_fecho_valida_notas_temas_e_meta_de_escreve_no_frontmatter(cliente, monkeypatch):
    fake = {
        "energia": 3, "energia_nota": "", "prioridades_anteriores": [], "correu_bem": [],
        "aprendizagens": [], "bloqueios": [], "resumo": "", "prioridades": [],
        "ajuste_habito": "",
        "notas_temas": ["reunioes-excessivas", "tema-inexistente", "cansaco-sono", "foco-manha"],
    }
    monkeypatch.setattr(llm, "extrair_json", lambda system, mensagens: dict(fake))
    _semana_demo(monkeypatch)
    r1 = cliente.post("/api/fechar", json={"mensagens": []})
    r2 = cliente.post("/api/fechar", json={"mensagens": []})
    semana = r1.json()["semana"]
    # só ids válidos, truncado a 3; e o fecho é idempotente
    assert semana["notas_temas"] == ["reunioes-excessivas", "cansaco-sono", "foco-manha"]
    assert r2.json()["semana"]["notas_temas"] == semana["notas_temas"]

    meta1, meta2 = memoria.meta_de(semana), memoria.meta_de(semana)
    assert meta1 == meta2  # idempotente
    assert meta1["temas"]["notas"] == semana["notas_temas"]
    assert "  notas: [reunioes-excessivas, cansaco-sono, foco-manha]" in memoria._frontmatter(meta1)


def test_guardar_semana_apaga_as_notas_da_semana(monkeypatch, notas_tmp, tmp_path):
    _semana_demo(monkeypatch)
    memoria.guardar_nota(TEXTO_REUNIOES, "2026-10-28")
    semana = {
        "semana": "2026-W44", "periodo": "2026-10-26 a 2026-11-01", "registado_em": "2026-10-30",
        "energia": 3, "prioridades_anteriores": [], "correu_bem": [], "aprendizagens": [],
        "bloqueios": [], "resumo": "r", "prioridades": [{"texto": "p", "tema": "entregas"}],
        "ajuste_habito": "", "notas_temas": ["reunioes-excessivas"], "padroes": [],
    }
    (tmp_path / "diario").mkdir()
    shutil.copy(memoria.FICHEIRO_INDEX, tmp_path / "INDEX.md")
    monkeypatch.setattr(memoria, "PASTA_DIARIO", tmp_path / "diario")
    monkeypatch.setattr(memoria, "FICHEIRO_INDEX", tmp_path / "INDEX.md")

    primeira = memoria.guardar_semana(dict(semana))
    conteudo = (tmp_path / "diario" / "2026-W44.md").read_text(encoding="utf-8")
    segunda = memoria.guardar_semana(dict(semana))  # idempotente: mesma entrada, uma linha
    assert primeira == segunda
    assert (tmp_path / "diario" / "2026-W44.md").read_text(encoding="utf-8") == conteudo
    assert (tmp_path / "INDEX.md").read_text(encoding="utf-8").count("- [2026-W44]") == 1
    assert list(notas_tmp.glob("*.md")) == []  # as notas saíram; ficou o essencial no frontmatter
