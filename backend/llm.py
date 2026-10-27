"""Chamadas ao LLM (SDK oficial da OpenAI), com modo mock quando não há OPENAI_API_KEY.

Lê OPENAI_API_KEY e OPENAI_MODEL do .env. Dono: Backend A (tarefas A1 e A4).
"""


def responder(system: str, mensagens: list[dict]) -> str:
    """Próxima mensagem do agente na conversa. Sem chave: resposta pré-escrita do modo mock."""
    raise NotImplementedError("A1")


def extrair_json(system: str, mensagens: list[dict]) -> dict:
    """Fecho da semana: o JSON pedido em agente/FECHO.md (response_format JSON + 1 nova tentativa)."""
    raise NotImplementedError("A4")
