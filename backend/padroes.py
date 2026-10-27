"""Deteção de padrões entre semanas (a "capacidade própria" do agente).

O LLM classifica cada item com um tema de agente/temas.yaml; aqui só se conta.
Regras em docs/ARQUITETURA.md §Regras de padrões. Dono: Backend B (tarefa B2).
"""
from backend import memoria

TEMAS_NEUTROS = {"entregas", "outro"}
JANELA = 4  # últimas 4 semanas, incluindo a atual


def _ocorrencias(janela: list[dict], campo: str) -> dict[str, list[str]]:
    """{tema: [semanas onde aparece em temas.<campo>]}, pela ordem em que surgem."""
    vistos: dict[str, list[str]] = {}
    for m in janela:
        for tema in dict.fromkeys((m.get("temas") or {}).get(campo) or []):
            if tema and tema not in TEMAS_NEUTROS:
                vistos.setdefault(tema, []).append(str(m["semana"]))
    return vistos


def detetar(metas: list[dict]) -> list[dict]:
    """Padrões nas últimas JANELA semanas. Recebe frontmatters por ordem cronológica.

    Devolve [{"tipo", "tema", "semanas", "mensagem"}]; tipos: bloqueio_recorrente ·
    aprendizagem_a_consolidar · prioridade_que_transita · energia_em_queda.
    """
    janela = metas[-JANELA:]
    if not janela:
        return []
    ids = [str(m["semana"]) for m in janela]
    nomes = memoria.nomes_temas()
    padroes = []

    for tema, semanas in _ocorrencias(janela, "bloqueios").items():
        if len(semanas) >= 2:
            padroes.append({
                "tipo": "bloqueio_recorrente", "tema": tema, "semanas": semanas,
                "mensagem": f"«{nomes.get(tema, tema)}» aparece como bloqueio em {len(semanas)} "
                            f"das últimas {len(janela)} semanas.",
            })

    for tema, semanas in _ocorrencias(janela, "aprendizagens").items():
        n = len(semanas)
        if n >= 2:
            seguidas = semanas == ids[-n:]
            quando = f"pela {n}.ª semana seguida" if seguidas else f"em {n} semanas"
            padroes.append({
                "tipo": "aprendizagem_a_consolidar", "tema": tema, "semanas": semanas,
                "mensagem": f"«{nomes.get(tema, tema)}» aparece como aprendizagem {quando}.",
            })

    for tema in _ocorrencias(janela, "prioridades"):
        seguidas = []
        for m in reversed(janela):
            if tema not in ((m.get("temas") or {}).get("prioridades") or []):
                break
            seguidas.insert(0, str(m["semana"]))
        if len(seguidas) >= 3:
            padroes.append({
                "tipo": "prioridade_que_transita", "tema": tema, "semanas": seguidas,
                "mensagem": f"«{nomes.get(tema, tema)}» é prioridade há {len(seguidas)} semanas seguidas.",
            })

    com_energia = [m for m in janela if m.get("energia") is not None]
    ult3, ult2 = com_energia[-3:], com_energia[-2:]
    if len(ult3) == 3 and ult3[0]["energia"] > ult3[1]["energia"] > ult3[2]["energia"]:
        padroes.append({
            "tipo": "energia_em_queda", "tema": None, "semanas": [str(m["semana"]) for m in ult3],
            "mensagem": f"A energia desceu de {ult3[0]['energia']} para {ult3[2]['energia']} "
                        f"nas últimas 3 semanas.",
        })
    elif len(ult2) == 2 and all(m["energia"] <= 2 for m in ult2):
        padroes.append({
            "tipo": "energia_em_queda", "tema": None, "semanas": [str(m["semana"]) for m in ult2],
            "mensagem": "A energia ficou em 2 ou menos nas últimas 2 semanas.",
        })
    return padroes


def metricas(metas: list[dict]) -> dict:
    """{"energia": [{"semana", "valor"}], "prioridades_cumpridas": {"feitas", "parciais", "total"}}."""
    soma = {"feitas": 0, "parciais": 0, "total": 0}
    for m in metas:
        pa = m.get("prioridades_anteriores") or {}
        for k in soma:
            soma[k] += int(pa.get(k) or 0)
    return {
        "energia": [{"semana": str(m["semana"]), "valor": m["energia"]}
                    for m in metas if m.get("energia") is not None],
        "prioridades_cumpridas": soma,
    }
