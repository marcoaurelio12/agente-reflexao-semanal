"""Monta o contexto (system prompt) a partir de agente/ e memoria/.

Ordem em docs/ARQUITETURA.md §Contexto. Os ficheiros são lidos em cada pedido, para a equipa
poder afinar os prompts sem reiniciar o servidor. Dono: Backend A (tarefas A2 e A4).
"""
import re
from pathlib import Path

import yaml

from backend import memoria, padroes

RAIZ = Path(__file__).resolve().parent.parent
PASTA_AGENTE = RAIZ / "agente"
PASTA_MEMORIA = RAIZ / "memoria"

MARCADOR_FECHO = "<<FECHAR>>"
MARCADOR_ACOES = re.compile(r"<<ACOES:([^<>\n]*)>>")


def _agente(nome: str) -> str:
    return (PASTA_AGENTE / nome).read_text(encoding="utf-8").strip()


def semanas_anteriores() -> list[dict]:
    """Até 4 entradas do diário antes da semana atual (ignora a atual, se já foi guardada num ensaio)."""
    atual, _ = memoria.semana_atual()
    return [s for s in memoria.listar_semanas(ultimas=0) if s["meta"]["semana"] < atual][-4:]


def _secoes_memoria(anteriores: list[dict]) -> dict[str, str]:
    sid, periodo = memoria.semana_atual()
    detetados = padroes.detetar([s["meta"] for s in anteriores])
    return {
        "pessoa": "## Quem é a pessoa\n\n" + memoria.carregar_contexto().strip(),
        "index": "## Índice do diário\n\n" + memoria.carregar_index().strip(),
        "diario": "## Diário das últimas semanas\n\n"
                  + "\n\n".join(s["markdown"].strip() for s in anteriores),
        "padroes": "## Padrões já detetados\n\n"
                   + ("\n".join(f"- {p['mensagem']} (semanas: {', '.join(p['semanas'])})" for p in detetados)
                      or "Nenhum."),
        "semana": f"## Semana atual\n\n{sid}, {memoria.periodo_legivel(periodo)}",
    }


def montar_contexto(nota_extra: str | None = None) -> str:
    """System prompt da conversa: prompts de agente/ + diário + padrões + agenda + semana atual (+ nota)."""
    s = _secoes_memoria(semanas_anteriores())
    partes = [_agente("AGENTE.md"), _agente("PERGUNTAS.md"), _agente("SEGURANCA.md"),
              s["pessoa"], s["index"], s["diario"], s["padroes"]]
    agenda = memoria.carregar_agenda(memoria.semana_atual()[0])
    if agenda:
        partes.append("## Agenda desta semana\n\n" + agenda.strip())
    partes.append(s["semana"])
    if nota_extra:
        partes.append(nota_extra)
    return "\n\n".join(partes)


def montar_contexto_fecho() -> str:
    """System prompt do fecho: agente/FECHO.md + temas.yaml + contexto, diário, padrões e semana atual."""
    s = _secoes_memoria(semanas_anteriores())
    temas = "## Temas permitidos (agente/temas.yaml)\n\n```yaml\n" + _agente("temas.yaml") + "\n```"
    return "\n\n".join([_agente("FECHO.md"), temas, s["pessoa"], s["diario"], s["padroes"], s["semana"]])


def montar_contexto_geral() -> str:
    """System prompt da conversa livre (widget): agente/GERAL.md + segurança + diário completo."""
    s = _secoes_memoria(listar_diario_completo())
    partes = [_agente("GERAL.md"), _agente("ACOES.md"), _agente("SEGURANCA.md"),
              s["pessoa"], s["index"], s["diario"], s["padroes"]]
    agenda = memoria.carregar_agenda(memoria.semana_atual()[0])
    if agenda:
        partes.append("## Agenda desta semana\n\n" + agenda.strip())
    partes.append(s["semana"])
    return "\n\n".join(partes)


def carregar_acoes() -> list[dict]:
    """Catálogo de ações do bloco yaml de agente/ACOES.md (lido em cada pedido)."""
    m = re.search(r"```yaml\n(.*?)\n```", _agente("ACOES.md"), re.S)
    dados = yaml.safe_load(m.group(1)) if m else {}
    return [a for a in (dados.get("acoes") or []) if isinstance(a, dict) and a.get("id")]


def montar_contexto_mensal() -> str:
    """System prompt do resumo mensal: agente/MENSAL.md + pessoa + diário + padrões + métricas."""
    semanas = memoria.listar_semanas(ultimas=4)
    s = _secoes_memoria(semanas)
    pc = padroes.metricas([x["meta"] for x in semanas])["prioridades_cumpridas"]
    energia = ", ".join(f"semana de {memoria.periodo_legivel(x['meta']['periodo'])}: {x['meta']['energia']}"
                        for x in semanas if x["meta"].get("energia") is not None)
    metricas = (f"- Energia por semana: {energia or 'sem registo'}\n"
                f"- Prioridades das semanas anteriores: {pc['feitas']} feitas, "
                f"{pc['parciais']} em parte, {pc['total']} ao todo")
    return "\n\n".join([_agente("MENSAL.md"), s["pessoa"], s["diario"], s["padroes"],
                        "## Métricas das últimas semanas\n\n" + metricas])


def listar_diario_completo() -> list[dict]:
    """Todas as semanas do diário (a conversa livre pode perguntar qualquer coisa, não só as últimas 4)."""
    return memoria.listar_semanas(ultimas=0)


def transcricao(mensagens: list[dict]) -> str:
    """A conversa como texto, para o fecho (o LLM recebe-a numa só mensagem)."""
    quem = {"assistant": "Agente", "user": "Pessoa"}
    linhas = [f"{quem.get(m['role'], m['role'])}: {m['content']}" for m in mensagens]
    return "## Conversa desta semana\n\n" + "\n\n".join(linhas)


# ---------------------------------------------------------------------------
# Resumo mensal sem chave: texto determinístico montado a partir dos factos do
# diário (padroes.metricas + contagens de temas). Nada de frases escritas à mão
# sobre a pessoa — só o que está calculado.
# ---------------------------------------------------------------------------

def _enumerar(itens: list[str]) -> str:
    """["a", "b", "c"] -> "a, b e c"."""
    if len(itens) <= 1:
        return "".join(itens)
    return ", ".join(itens[:-1]) + " e " + itens[-1]


def _plural(n: int, singular: str, plural: str) -> str:
    return singular if n == 1 else plural


def _contar_temas(metas: list[dict], campo: str) -> list[tuple[str, list[str]]]:
    """[(tema, [períodos legíveis onde aparece])], da contagem mais alta para a mais baixa.

    Temas neutros (padroes.TEMAS_NEUTROS) não contam, como nas regras de padrões.
    """
    vistos: dict[str, list[str]] = {}
    for meta in metas:
        for tema in dict.fromkeys((meta.get("temas") or {}).get(campo) or []):
            if tema and tema not in padroes.TEMAS_NEUTROS:
                vistos.setdefault(tema, []).append(memoria.periodo_legivel(meta["periodo"]))
    return sorted(vistos.items(), key=lambda kv: (-len(kv[1]), kv[0]))


def resumo_mensal_mock() -> str:
    """Resumo mensal do modo mock: energia semana a semana, prioridades cumpridas e temas
    repetidos, tudo calculado das últimas 4 semanas do diário."""
    semanas = memoria.listar_semanas(ultimas=4)
    if not semanas:
        return "Ainda não há semanas guardadas no diário."
    metas = [s["meta"] for s in semanas]
    nomes = memoria.nomes_temas()

    primeiro = semanas[0]["meta"]["periodo"].split(" a ")[0]
    ultimo = semanas[-1]["meta"]["periodo"].split(" a ")[-1]
    paragrafos = [f"Nas últimas {len(semanas)} semanas "
                  f"({memoria.periodo_legivel(f'{primeiro} a {ultimo}')})."]

    energia = [f"{s['meta']['energia']} na semana de {memoria.periodo_legivel(s['meta']['periodo'])}"
               for s in semanas if s["meta"].get("energia") is not None]
    if energia:
        paragrafos.append("A energia foi " + _enumerar(energia) + ".")

    pc = padroes.metricas(metas)["prioridades_cumpridas"]
    if pc["total"]:
        frase = (f"De {pc['total']} {_plural(pc['total'], 'prioridade', 'prioridades')}, "
                 f"{pc['feitas']} {_plural(pc['feitas'], 'ficou feita', 'ficaram feitas')}")
        if pc["parciais"]:
            frase += f" e {pc['parciais']} em parte"
        paragrafos.append(frase + ".")

    for campo, verbo in (("bloqueios", "apareceu como bloqueio"),
                         ("aprendizagens", "apareceu como aprendizagem")):
        for tema, periodos in _contar_temas(metas, campo):
            if len(periodos) >= 2:
                paragrafos.append(f"«{nomes.get(tema, tema)}» {verbo} nas semanas de "
                                  f"{_enumerar(periodos)}.")
    for tema, periodos in _contar_temas(metas, "prioridades"):
        if len(periodos) >= 2:
            paragrafos.append(f"«{nomes.get(tema, tema)}» foi prioridade em {len(periodos)} "
                              f"{_plural(len(periodos), 'semana', 'semanas')}.")
    return "\n\n".join(paragrafos)
