"""Deteção de padrões entre semanas (a "capacidade própria" do agente).

O LLM classifica cada item com um tema de agente/temas.yaml; aqui só se conta.
Regras em docs/ARQUITETURA.md §Regras de padrões. Dono: Backend B (tarefa B2).
"""

TEMAS_NEUTROS = {"entregas", "outro"}
JANELA = 4  # últimas 4 semanas, incluindo a atual


def detetar(metas: list[dict]) -> list[dict]:
    """Padrões nas últimas JANELA semanas. Recebe frontmatters por ordem cronológica.

    Devolve [{"tipo", "tema", "semanas", "mensagem"}]; tipos: bloqueio_recorrente ·
    aprendizagem_a_consolidar · prioridade_que_transita · energia_em_queda.
    """
    raise NotImplementedError("B2")


def metricas(metas: list[dict]) -> dict:
    """{"energia": [{"semana", "valor"}], "prioridades_cumpridas": {"feitas", "parciais", "total"}}."""
    raise NotImplementedError("B2")
