"""Monta o contexto (system prompt) a partir de agente/ e memoria/.

Ordem em docs/ARQUITETURA.md §Contexto. Os ficheiros são lidos em cada pedido, para a equipa
poder afinar os prompts sem reiniciar o servidor. Dono: Backend A (tarefas A2 e A4).
"""
from pathlib import Path

from backend import memoria, padroes

RAIZ = Path(__file__).resolve().parent.parent
PASTA_AGENTE = RAIZ / "agente"
PASTA_MEMORIA = RAIZ / "memoria"

MARCADOR_FECHO = "<<FECHAR>>"


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


def transcricao(mensagens: list[dict]) -> str:
    """A conversa como texto, para o fecho (o LLM recebe-a numa só mensagem)."""
    quem = {"assistant": "Agente", "user": "Pessoa"}
    linhas = [f"{quem.get(m['role'], m['role'])}: {m['content']}" for m in mensagens]
    return "## Conversa desta semana\n\n" + "\n\n".join(linhas)
