"""Memória entre semanas: lê e escreve o diário em markdown de memoria/.

Dono: Backend B (tarefa B1). Contrato em docs/ARQUITETURA.md §Interfaces internas.
"""
import json
import os
import re
import shutil
import unicodedata
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import yaml
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent
PASTA_MEMORIA = RAIZ / "memoria"
PASTA_DIARIO = PASTA_MEMORIA / "diario"
PASTA_AGENDA = PASTA_MEMORIA / "agenda"
PASTA_NOTAS = PASTA_MEMORIA / "notas"
PASTA_LIXEIRA = PASTA_MEMORIA / ".lixeira"
PASTA_AGENTE = RAIZ / "agente"
FICHEIRO_CONTEXTO = PASTA_MEMORIA / "CONTEXTO.md"
FICHEIRO_INDEX = PASTA_MEMORIA / "INDEX.md"
FICHEIRO_TEMAS = PASTA_AGENTE / "temas.yaml"

load_dotenv(RAIZ / ".env")

FUSO = ZoneInfo("Europe/Lisbon")
ID_SEMANA = re.compile(r"^\d{4}-W\d{2}$")
ID_NOTA = re.compile(r"^(\d{4}-\d{2}-\d{2})-(\d+)$")
TOKEN_LIXEIRA = re.compile(r"^[A-Za-z0-9_-]+$")
LINHA_NOTA = re.compile(r"^-\s*(\d{2}:\d{2}) — (.*)$")
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
         "setembro", "outubro", "novembro", "dezembro"]
DIAS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
ESTADOS = {"feito": "feito", "em-parte": "em parte", "nao-avancou": "não avançou",
           "sem-info": "sem informação"}


def _ler(caminho: Path) -> str:
    return caminho.read_text(encoding="utf-8")


def carregar_contexto() -> str:
    """Conteúdo de memoria/CONTEXTO.md (quem é a pessoa)."""
    return _ler(FICHEIRO_CONTEXTO)


def carregar_index() -> str:
    """Conteúdo de memoria/INDEX.md (uma linha por semana)."""
    return _ler(FICHEIRO_INDEX)


def _separar(texto: str) -> tuple[dict, str]:
    """(frontmatter, corpo) de uma entrada do diário."""
    if texto.startswith("---"):
        _, fm, corpo = texto.split("---", 2)
        return yaml.safe_load(fm) or {}, corpo.lstrip("\n")
    return {}, texto


def _secao(corpo: str, titulo: str) -> str:
    """Texto da secção "## <titulo>" até à secção seguinte."""
    m = re.search(rf"^## {re.escape(titulo)}[^\n]*\n(.*?)(?=^## |\Z)", corpo, re.M | re.S)
    return m.group(1).strip() if m else ""


def _itens_numerados(texto: str) -> list[str]:
    itens = []
    for linha in texto.splitlines():
        m = re.match(r"^\d+\.\s+(.*)", linha)
        if m:
            itens.append(m.group(1).strip())
        elif linha.strip() and itens:
            itens[-1] += " " + linha.strip()
    return itens


def listar_semanas(ultimas: int = 4) -> list[dict]:
    """As últimas N entradas do diário, por ordem cronológica (mais antiga primeiro).

    Cada item: {"meta": frontmatter (dict), "markdown": entrada completa, "resumo": texto da secção Resumo}.
    Também traz "corpo" (sem frontmatter), "prioridades" (lista de textos) e "ajuste" (secção
    Ajuste de hábito), para o painel e para o /api/ics.
    """
    semanas = []
    for caminho in sorted(PASTA_DIARIO.glob("*.md")):
        texto = _ler(caminho)
        meta, corpo = _separar(texto)
        meta["semana"] = str(meta.get("semana") or caminho.stem)
        semanas.append({
            "meta": meta,
            "markdown": texto,
            "corpo": corpo,
            "resumo": " ".join(_secao(corpo, "Resumo").split()),
            "prioridades": _itens_numerados(_secao(corpo, "Prioridades para a semana seguinte")),
            "ajuste": " ".join(_secao(corpo, "Ajuste de hábito").split()),
        })
    return semanas[-ultimas:] if ultimas > 0 else semanas


def carregar_agenda(semana_id: str) -> str | None:
    """Conteúdo de memoria/agenda/<semana_id>.md, ou None se não existir."""
    caminho = PASTA_AGENDA / f"{semana_id}.md"
    return _ler(caminho) if ID_SEMANA.match(semana_id) and caminho.exists() else None


# ---------------------------------------------------------------------------
# Notas do dia: memoria/notas/AAAA-MM-DD.md, um ficheiro por dia anotado.
# A nota é da pessoa: guarda-se literal (uma linha por nota), nunca resumo.
# O tema é sugestão automática por matching léxico (determinística, recalculada
# à leitura); o fecho da semana é que o confirma em temas.notas.
# ---------------------------------------------------------------------------

def dia_legivel(data_iso: str) -> str:
    """"2026-10-27" -> "terça, 27 de outubro"."""
    d = date.fromisoformat(data_iso)
    return f"{DIAS[d.weekday()]}, {d.day} de {MESES[d.month - 1]}"


def semana_de(data_iso: str) -> str:
    """"2026-10-27" -> "2026-W44"."""
    ano, sem, _ = date.fromisoformat(data_iso).isocalendar()
    return f"{ano}-W{sem:02d}"


def _tokens(texto: str) -> set[str]:
    """Palavras com mais de 3 letras, minúsculas e sem acentos."""
    sem_acentos = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode()
    return {p for p in re.sub(r"[^\w\s]", " ", sem_acentos.lower()).split() if len(p) > 3}


def tema_sugerido(texto: str) -> str | None:
    """Primeiro tema de temas.yaml cujo nome legível aparece no texto (palavras inteiras).

    Temas neutros ("entregas", "outro") não contam. None se nada bater.
    """
    neutros = set((carregar_temas().get("neutros") or {}))
    palavras = _tokens(texto)
    for tid, nome in nomes_temas().items():
        if tid in neutros:
            continue
        if _tokens(nome) & palavras:
            return tid
    return None


def insight_de_notas(notas: list[dict]) -> str | None:
    """Uma linha se ≥2 notas baterem no mesmo tema; None caso contrário. Sem LLM, sem conselho."""
    contagens: dict[str, int] = {}
    for n in notas:
        if n.get("tema"):
            contagens[n["tema"]] = contagens.get(n["tema"], 0) + 1
    if not contagens:
        return None
    tema, vezes = max(contagens.items(), key=lambda kv: kv[1])
    if vezes < 2:
        return None
    nomes = nomes_temas()
    return f"«{nomes.get(tema, tema)}» saiu em {vezes} notas desta semana."


def _ler_notas_do_dia(caminho: Path) -> list[dict]:
    """[{"hora", "texto", "tema"}] das linhas "- HH:MM — texto" do ficheiro do dia."""
    notas = []
    for linha in _separar(_ler(caminho))[1].splitlines():
        m = LINHA_NOTA.match(linha.strip())
        if m:
            texto = m.group(2).strip()
            notas.append({"hora": m.group(1), "texto": texto, "tema": tema_sugerido(texto)})
    return notas


def _escrever_dia_de_notas(caminho: Path, data: str, notas: list[dict]) -> None:
    temas = list(dict.fromkeys(n["tema"] for n in notas if n.get("tema")))
    linhas = [
        "---",
        f"data: {data}",
        f"temas: [{', '.join(temas)}]",
        "---",
        "",
        f"# Notas de {dia_legivel(data).split(', ')[1]}",
        "",
        *[f"- {n['hora']} — {n['texto']}" for n in notas],
    ]
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text("\n".join(linhas) + "\n", encoding="utf-8", newline="\n")


def guardar_nota(texto: str, data_iso: str | None = None) -> dict:
    """Acrescenta uma nota ao dia (ficheiro do dia em memoria/notas/) e devolve-a com id.

    O texto é literal (mudanças de linha colapsadas para manter uma linha por nota). O id é
    posicional: AAAA-MM-DD-N pela ordem das notas no ficheiro do dia.
    """
    agora = datetime.now(FUSO)
    data = data_iso or agora.date().isoformat()
    try:
        date.fromisoformat(data)
    except ValueError as e:
        raise ValueError(f"data inválida: {data!r}") from e
    limpo = " ".join((texto or "").split())
    if not limpo:
        raise ValueError("a nota está vazia")
    caminho = PASTA_NOTAS / f"{data}.md"
    notas = _ler_notas_do_dia(caminho) if caminho.exists() else []
    notas.append({"hora": agora.strftime("%H:%M"), "texto": limpo, "tema": tema_sugerido(limpo)})
    _escrever_dia_de_notas(caminho, data, notas)
    return {"id": f"{data}-{len(notas)}", "data": data, "hora": notas[-1]["hora"],
            "texto": limpo, "tema": notas[-1]["tema"]}


def notas_da_semana(semana_id: str | None = None) -> list[dict]:
    """Notas da semana indicada (ou da atual), por ordem cronológica, cada uma com id.

    Só existem ficheiros para os dias anotados (minimização de dados).
    """
    sid = semana_id or semana_atual()[0]
    if not ID_SEMANA.match(sid):
        raise ValueError(f"semana inválida: {sid!r}")
    ano, sem = int(sid[:4]), int(sid[6:])
    inicio = date.fromisocalendar(ano, sem, 1)
    fim = inicio + timedelta(days=6)
    notas = []
    for caminho in sorted(PASTA_NOTAS.glob("*.md")):
        try:
            dentro = inicio <= date.fromisoformat(caminho.stem) <= fim
        except ValueError:
            continue  # ficheiro com nome que não é data
        if not dentro:
            continue
        for i, n in enumerate(_ler_notas_do_dia(caminho), 1):
            notas.append({"id": f"{caminho.stem}-{i}", "data": caminho.stem,
                          "hora": n["hora"], "texto": n["texto"], "tema": n["tema"]})
    return notas


def apagar_nota(nid: str) -> bool:
    """Remove a nota do dia (reescreve o ficheiro; a última nota apaga o ficheiro)."""
    m = ID_NOTA.match(nid)
    if not m:
        raise ValueError(f"id de nota inválido: {nid!r}")
    data, n = m.group(1), int(m.group(2))
    caminho = PASTA_NOTAS / f"{data}.md"
    if not caminho.exists():
        return False
    notas = _ler_notas_do_dia(caminho)
    if not 1 <= n <= len(notas):
        return False
    del notas[n - 1]
    if notas:
        _escrever_dia_de_notas(caminho, data, notas)
    else:
        caminho.unlink()  # a última nota apaga o ficheiro: o dia deixa de estar anotado
    return True


def _apagar_notas_da_semana(semana_id: str) -> None:
    """Apaga as notas da semana (chamado ao guardar a semana: fica o essencial no frontmatter)."""
    if not ID_SEMANA.match(semana_id):
        return
    ano, sem = int(semana_id[:4]), int(semana_id[6:])
    inicio = date.fromisocalendar(ano, sem, 1)
    fim = inicio + timedelta(days=6)
    for caminho in PASTA_NOTAS.glob("*.md"):
        try:
            dentro = inicio <= date.fromisoformat(caminho.stem) <= fim
        except ValueError:
            continue
        if dentro:
            caminho.unlink()


# ---------------------------------------------------------------------------
# «Apagar tudo» com lixeira: o diário sai de diario/ para memoria/.lixeira/<token>/
# e volta com «Desfazer» (token = nome da pasta). Sem bases de dados: são ficheiros.
# ---------------------------------------------------------------------------

def apagar_diario() -> str:
    """Move diario/*.md (e uma cópia do INDEX.md) para memoria/.lixeira/<token>/ e limpa o INDEX.

    Devolve o token (nome da pasta) para o «Desfazer».
    """
    token = datetime.now().strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:6]
    pasta = PASTA_LIXEIRA / token
    pasta.mkdir(parents=True, exist_ok=True)
    for caminho in sorted(PASTA_DIARIO.glob("*.md")):
        shutil.move(str(caminho), str(pasta / caminho.name))
    shutil.copy(str(FICHEIRO_INDEX), str(pasta / "INDEX.md"))
    linhas = [l for l in carregar_index().splitlines() if not l.startswith("- [")]
    FICHEIRO_INDEX.write_text("\n".join(linhas) + "\n", encoding="utf-8", newline="\n")
    return token


def restaurar_diario(token: str) -> bool:
    """Recoloca tudo o que está em memoria/.lixeira/<token>/ (o «Desfazer»).

    O INDEX.md volta ao estado de antes do apagar. False se o token não existir.
    """
    if not TOKEN_LIXEIRA.match(token):
        raise ValueError(f"token inválido: {token!r}")
    pasta = PASTA_LIXEIRA / token
    if not pasta.is_dir():
        return False
    PASTA_DIARIO.mkdir(parents=True, exist_ok=True)
    for caminho in sorted(pasta.glob("*.md")):
        if caminho.name == "INDEX.md":
            continue
        shutil.move(str(caminho), str(PASTA_DIARIO / caminho.name))
    indice = pasta / "INDEX.md"
    if indice.exists():
        shutil.move(str(indice), str(FICHEIRO_INDEX))
    shutil.rmtree(pasta, ignore_errors=True)
    return True


def meta_de(semana: dict) -> dict:
    """Converte o JSON do /api/fechar para o formato do frontmatter (temas, energia, contagens)."""
    anteriores = semana.get("prioridades_anteriores") or []
    return {
        "semana": semana.get("semana"),
        "periodo": semana.get("periodo"),
        "registado_em": semana.get("registado_em"),
        "energia": semana.get("energia"),
        "temas": {
            "bloqueios": [i.get("tema") or "outro" for i in semana.get("bloqueios") or []],
            "aprendizagens": [i.get("tema") or "outro" for i in semana.get("aprendizagens") or []],
            "prioridades": [i.get("tema") or "outro" for i in semana.get("prioridades") or []],
            "notas": list(semana.get("notas_temas") or []),
        },
        "prioridades_anteriores": {
            "feitas": sum(1 for p in anteriores if p.get("estado") == "feito"),
            "parciais": sum(1 for p in anteriores if p.get("estado") == "em-parte"),
            "total": len(anteriores),
        },
        "padroes": semana.get("padroes") or [],
    }


def _datas(periodo: str) -> tuple[date, date]:
    inicio, fim = periodo.split(" a ")
    return date.fromisoformat(inicio.strip()), date.fromisoformat(fim.strip())


def periodo_legivel(periodo: str) -> str:
    """"2026-10-26 a 2026-11-01" -> "26 de outubro a 1 de novembro"; mesmo mês: "19 a 25 de outubro"."""
    a, b = _datas(periodo)
    if a.month == b.month:
        return f"{a.day} a {b.day} de {MESES[b.month - 1]}"
    return f"{a.day} de {MESES[a.month - 1]} a {b.day} de {MESES[b.month - 1]}"


def _periodo_curto(periodo: str) -> str:
    """Formato do INDEX.md: "19 a 25 out" ou "26 out a 1 nov"."""
    a, b = _datas(periodo)
    if a.month == b.month:
        return f"{a.day} a {b.day} {MESES[b.month - 1][:3]}"
    return f"{a.day} {MESES[a.month - 1][:3]} a {b.day} {MESES[b.month - 1][:3]}"


def _lista_yaml(valores: list) -> str:
    return "[" + ", ".join(str(v) for v in valores) + "]"


def _frontmatter(meta: dict) -> str:
    t, pa = meta["temas"], meta["prioridades_anteriores"]
    energia = "null" if meta["energia"] is None else meta["energia"]
    linhas = [
        "---",
        f"semana: {meta['semana']}",
        f"periodo: {meta['periodo']}",
        f"registado_em: {meta['registado_em']}",
        f"energia: {energia}",
        "temas:",
        f"  bloqueios: {_lista_yaml(t['bloqueios'])}",
        f"  aprendizagens: {_lista_yaml(t['aprendizagens'])}",
        f"  prioridades: {_lista_yaml(t['prioridades'])}",
        f"  notas: {_lista_yaml(t['notas'])}",
        f"prioridades_anteriores: {{feitas: {pa['feitas']}, parciais: {pa['parciais']}, total: {pa['total']}}}",
    ]
    if not meta["padroes"]:
        linhas.append("padroes: []")
    else:
        linhas.append("padroes:")
        for p in meta["padroes"]:
            linhas += [
                f"  - tipo: {p['tipo']}",
                f"    tema: {p.get('tema') or 'null'}",
                f"    semanas: {_lista_yaml(p['semanas'])}",
                f"    mensagem: {json.dumps(p['mensagem'], ensure_ascii=False)}",
            ]
    linhas.append("---")
    return "\n".join(linhas)


def _sem_ponto(texto: str) -> str:
    return (texto or "").strip().rstrip(".")


def _marcadores(itens: list[str]) -> list[str]:
    return [f"- {i}" for i in itens] if itens else ["Nada registado."]


def _corpo(semana: dict) -> str:
    anteriores = []
    for p in semana.get("prioridades_anteriores") or []:
        nota = _sem_ponto(p.get("nota"))
        estado = ESTADOS.get(p.get("estado"), p.get("estado") or "sem informação")
        anteriores.append(f"- {_sem_ponto(p.get('texto'))}: **{estado}**" + (f" ({nota})" if nota else "") + ".")
    energia = semana.get("energia")
    partes = [
        f"# Semana de {periodo_legivel(semana['periodo'])}", "",
        "## Resumo", "", semana.get("resumo") or "", "",
        "## Prioridades da semana passada", "",
        *(anteriores or ["Sem prioridades da semana passada."]), "",
        "## Correu bem", "", *_marcadores(semana.get("correu_bem") or []), "",
        "## Aprendi", "", *_marcadores([i["texto"] for i in semana.get("aprendizagens") or []]), "",
        "## Bloqueou", "", *_marcadores([i["texto"] for i in semana.get("bloqueios") or []]), "",
        f"## Energia: {energia}/5" if energia is not None else "## Energia: sem registo", "",
        semana.get("energia_nota") or "", "",
        "## Prioridades para a semana seguinte", "",
        *[f"{n}. {p['texto']}" for n, p in enumerate(semana.get("prioridades") or [], 1)], "",
        "## Ajuste de hábito", "", semana.get("ajuste_habito") or "", "",
        "## Padrões assinalados", "",
        *([f"- {p['mensagem']}" for p in semana.get("padroes") or []] or ["Nenhum."]),
    ]
    return "\n".join(partes) + "\n"


def guardar_semana(semana: dict) -> str:
    """Escreve memoria/diario/<semana>.md no formato de 2026-W43.md e acrescenta a linha no INDEX.md.

    Devolve o caminho relativo à raiz (ex.: "memoria/diario/2026-W44.md").
    """
    sid = str(semana.get("semana", ""))
    if not ID_SEMANA.match(sid):
        raise ValueError(f"semana inválida: {sid!r}")
    meta = meta_de(semana)
    caminho = PASTA_DIARIO / f"{sid}.md"
    caminho.write_text(_frontmatter(meta) + "\n\n" + _corpo(semana), encoding="utf-8", newline="\n")

    t = meta["temas"]
    energia = f"energia {meta['energia']}/5" if meta["energia"] is not None else "energia sem registo"
    linha = (f"- [{sid}](diario/{sid}.md) · {_periodo_curto(meta['periodo'])} · {energia} · "
             f"{', '.join(t['bloqueios']) or '—'} · {', '.join(t['aprendizagens']) or '—'}")
    linhas = [l for l in carregar_index().splitlines() if not l.startswith(f"- [{sid}]")]
    pos = next((i for i, l in enumerate(linhas) if l.startswith("- [")), len(linhas))
    linhas.insert(pos, linha)
    FICHEIRO_INDEX.write_text("\n".join(linhas) + "\n", encoding="utf-8", newline="\n")
    _apagar_notas_da_semana(sid)  # fica o essencial (temas.notas) no frontmatter
    return f"memoria/diario/{sid}.md"


def semana_atual() -> tuple[str, str]:
    """("2026-W44", "2026-10-26 a 2026-11-01"). Respeita DEMO_SEMANA do .env."""
    demo = os.getenv("DEMO_SEMANA", "").strip()
    if ID_SEMANA.match(demo):
        ano, sem = int(demo[:4]), int(demo[6:])
    else:
        ano, sem, _ = date.today().isocalendar()
    inicio = date.fromisocalendar(ano, sem, 1)
    return f"{ano}-W{sem:02d}", f"{inicio} a {inicio + timedelta(days=6)}"


def carregar_temas() -> dict:
    """Conteúdo de agente/temas.yaml."""
    return yaml.safe_load(_ler(FICHEIRO_TEMAS))


def nomes_temas() -> dict:
    """{id: nome legível} de todos os grupos de temas.yaml."""
    return {k: v for grupo in carregar_temas().values() for k, v in (grupo or {}).items()}
