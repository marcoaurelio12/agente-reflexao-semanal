"""Filtro de segurança que corre ANTES do LLM, e deteção de respostas vagas.

Expressões e respostas fixas em agente/SEGURANCA.md; expressões vagas em agente/PERGUNTAS.md.
Dono: Backend B (tarefa B3).
"""


def verificar(texto: str) -> dict | None:
    """{"nivel": "urgente" | "apoio", "resposta": str} se houver sinais de mal-estar sério; senão None.

    Compara em minúsculas e sem acentos. "não aguento mais reuniões sem agenda" NÃO dispara.
    """
    raise NotImplementedError("B3")


def e_vaga(texto: str) -> bool:
    """True se a resposta for curta ou vaga (menos de 4 palavras, ou só "normal", "ok", "sei lá"…)."""
    raise NotImplementedError("B3")
