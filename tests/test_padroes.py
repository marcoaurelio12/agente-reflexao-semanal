"""B4: as 4 regras de backend/padroes.py sobre o diário real (critério: 2026-W43.md)."""
from backend import memoria, padroes


def _metas(ultimas: int) -> list[dict]:
    return [s["meta"] for s in memoria.listar_semanas(ultimas=ultimas)]


def _como_tuplas(padroes: list[dict]) -> list[tuple]:
    return [(p["tipo"], p.get("tema"), tuple(p["semanas"])) for p in padroes]


def _w44_de_teste() -> dict:
    """Fecho da W44 no formato de /api/fechar: reuniões sem agenda de novo, energia a subir."""
    return memoria.meta_de({
        "semana": "2026-W44", "periodo": "2026-10-26 a 2026-11-01", "registado_em": "2026-10-30",
        "energia": 3,
        "aprendizagens": [{"texto": "…", "tema": "preparar-reunioes"}],
        "bloqueios": [{"texto": "…", "tema": "reunioes-excessivas"}],
        "prioridades": [{"texto": "…", "tema": "entregas"}, {"texto": "…", "tema": "dizer-nao"},
                        {"texto": "…", "tema": "foco-manha"}],
    })


def test_w41_a_w43_os_4_padroes_do_frontmatter_da_w43():
    detetados = padroes.detetar(_metas(3))
    referencia = _metas(0)[-1]["padroes"]  # os 4 padrões guardados no frontmatter da W43
    assert _como_tuplas(detetados) == _como_tuplas(referencia)
    assert [p["mensagem"] for p in detetados] == [p["mensagem"] for p in referencia]


def test_bloqueio_na_w44_vira_recorrente_3_de_4():
    detetados = padroes.detetar(_metas(3) + [_w44_de_teste()])
    assert ("bloqueio_recorrente", "reunioes-excessivas", ("2026-W41", "2026-W43", "2026-W44")) \
        in _como_tuplas(detetados)
    mensagem = next(p["mensagem"] for p in detetados
                    if p["tipo"] == "bloqueio_recorrente" and p["tema"] == "reunioes-excessivas")
    assert "3 das últimas 4 semanas" in mensagem


def test_w44_com_foco_manha_prioridade_4_semanas_seguidas():
    detetados = padroes.detetar(_metas(3) + [_w44_de_teste()])
    assert ("prioridade_que_transita", "foco-manha",
            ("2026-W41", "2026-W42", "2026-W43", "2026-W44")) in _como_tuplas(detetados)


def test_energia_a_subir_na_w44_nao_e_queda():
    detetados = padroes.detetar(_metas(3) + [_w44_de_teste()])
    assert not any(p["tipo"] == "energia_em_queda" for p in detetados)


def test_temas_neutros_nao_contam():
    w44 = _w44_de_teste()
    w44["temas"]["bloqueios"] = ["entregas", "outro"]
    w44["temas"]["prioridades"] = ["entregas"]
    detetados = padroes.detetar(_metas(3) + [w44])
    assert not any(p["tema"] in ("entregas", "outro") for p in detetados)


def test_metricas_somam_as_semanas():
    m = padroes.metricas(_metas(3))
    assert m["energia"] == [{"semana": "2026-W41", "valor": 4},
                            {"semana": "2026-W42", "valor": 3},
                            {"semana": "2026-W43", "valor": 2}]
    assert m["prioridades_cumpridas"] == {"feitas": 5, "parciais": 3, "total": 9}


# ---------------------------------------------------------------------------
# Critérios do enunciado B4: semanas escolhidas por id (o diário pode ter W40 e uma
# W44 de ensaio), W44 de teste só em memória: nada é escrito em memoria/.
# ---------------------------------------------------------------------------
W41_A_W43 = ("2026-W41", "2026-W42", "2026-W43")


def _metas_por_id(*ids: str) -> list[dict]:
    todas = {s["meta"]["semana"]: s["meta"] for s in memoria.listar_semanas(ultimas=0)}
    return [todas[i] for i in ids]


def _w44_frontmatter() -> dict:
    return {
        "semana": "2026-W44",
        "energia": 3,
        "temas": {"bloqueios": ["reunioes-excessivas"], "aprendizagens": ["preparar-reunioes"],
                  "prioridades": ["entregas", "dizer-nao", "foco-manha"]},
        "prioridades_anteriores": {"feitas": 1, "parciais": 1, "total": 3},
        "padroes": [],
    }


def test_por_id_w41_a_w43_igual_ao_campo_padroes_da_w43():
    metas = _metas_por_id(*W41_A_W43)
    assert padroes.detetar(metas) == metas[-1]["padroes"]


def test_por_id_w44_de_teste_da_bloqueio_recorrente_3_das_ultimas_4_sem_escrever_no_disco():
    antes = sorted(p.name for p in memoria.PASTA_DIARIO.iterdir())
    detetados = padroes.detetar(_metas_por_id(*W41_A_W43) + [_w44_frontmatter()])
    recorrentes = [p for p in detetados
                   if p["tipo"] == "bloqueio_recorrente" and p["tema"] == "reunioes-excessivas"]
    assert len(recorrentes) == 1
    assert recorrentes[0]["semanas"] == ["2026-W41", "2026-W43", "2026-W44"]
    assert "3 das últimas 4 semanas" in recorrentes[0]["mensagem"]
    assert sorted(p.name for p in memoria.PASTA_DIARIO.iterdir()) == antes
