"""GET /api/ics: ficheiro de calendário da reflexão semanal (RFC 5545)."""
import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

from backend.app import _proxima_sexta  # a mesma regra que o endpoint usa


def _get(cliente, **params):
    r = cliente.get("/api/ics", params=params)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("text/calendar")
    assert "reflexao-semanal.ics" in r.headers["content-disposition"]
    return r.text


def test_ics_e_um_calendario_valido_com_rrule(cliente):
    texto = _get(cliente)
    assert texto.startswith("BEGIN:VCALENDAR\r\n")
    assert texto.endswith("END:VCALENDAR\r\n")
    assert "\r\n" in texto  # RFC 5545 exige CRLF
    assert "RRULE:FREQ=WEEKLY" in texto
    assert "SUMMARY:Reflexão semanal" in texto
    m = re.search(r"^DTSTART:(\d{8})T(\d{6})Z\r?$", texto, re.M)
    assert m, "falta o DTSTART em UTC"
    # a primeira ocorrência é a próxima sexta-feira, às 17:00 de Lisboa
    # (17:00 UTC no inverno, 16:00 UTC no verão com o horário de Lisboa)
    inicio = datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S")
    assert date.fromisoformat(m.group(1)).weekday() == 4  # sexta
    assert inicio.hour in (16, 17) and inicio.minute == 0
    esperada = _proxima_sexta(datetime.now(ZoneInfo("Europe/Lisbon")))
    assert date.fromisoformat(m.group(1)) == esperada


def test_ics_traz_as_prioridades_da_ultima_semana(cliente):
    texto = _get(cliente)
    # última semana guardada no diário canónico: W43
    assert "UID:reflexao-2026-W43@agente-reflexao-semanal" in texto
    assert "1. Fechar o primeiro rascunho do documento de recomendações até sexta." in texto
    assert "Ajuste a experimentar:" in texto
    # vírgulas escapadas (RFC 5545): o ajuste da W43 tem "Experimenta, quando…"
    assert "Experimenta\\, quando" in texto


def test_ics_com_semana_pedido_e_404_desconhecida(cliente):
    texto = _get(cliente, semana="2026-W41")
    assert "UID:reflexao-2026-W41@" in texto
    assert cliente.get("/api/ics", params={"semana": "1999-W01"}).status_code == 404
