// Reflexão Semanal — frontend. Fala só com a API de backend/app.py (contrato em docs/ARQUITETURA.md).
// Conversas de reflexão ficam neste navegador (localStorage); o diário das semanas fechadas
// vive no servidor, em memoria/diario/*.md.
(function(){
"use strict";
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const MES_CURTO = m => MESES[m - 1].slice(0, 3);
const num = n => String(n).replace(".", ",");
const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Mesmas expressões de backend/seguranca.py e agente/SEGURANCA.md (minúsculas, sem acentos). São
// específicas de propósito: "não aguento mais reuniões" é uma semana pesada, não um alerta.
// tests/test_seguranca.py confere que esta lista é igual à do backend (JSON válido, sem vírgulas finais).
const BEM_ESTAR = {
  "urgente": ["quero morrer", "nao quero viver", "nao vale a pena viver", "por fim a tudo",
              "acabar com tudo", "magoar-me", "fazer-me mal", "suicid"],
  "apoio": ["nao vejo saida", "sem saida nenhuma", "em baixo ha semanas", "ataque de panico",
            "ataques de panico", "choro todos os dias", "nao durmo ha dias", "sinto-me vazia",
            "sinto-me vazio", "estou a ir abaixo"]
};
/** "urgente" | "apoio" | null. Corre antes de enviar ao servidor (o backend volta a verificar). */
function bemEstar(texto){
  const t = String(texto || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/\s+/).filter(Boolean).join(" ");
  return ["urgente", "apoio"].find(nivel => BEM_ESTAR[nivel].some(e => t.includes(e))) || null;
}
// Cópias das respostas fixas de agente/SEGURANCA.md (o filtro do backend devolve as mesmas).
const CARE = {
  apoio: "Obrigado por partilhares isto comigo. Parece-me um momento difícil, e isso merece mais do que uma reflexão de 5 minutos. Falar com alguém pode ajudar: uma pessoa de confiança, o teu médico de família ou a linha SNS 24 (808 24 24 24), que tem aconselhamento psicológico. Queres fazer uma pausa aqui, ou preferes continuar a reflexão?",
  urgente: "Obrigado por me dizeres. O que descreves é sério e não tens de passar por isto sem ajuda. Se estás em perigo agora, liga 112. Também podes ligar para o SNS 24 (808 24 24 24) e pedir aconselhamento psicológico, ou falar já com alguém de confiança. Vou parar a reflexão por aqui."
};

/* ───────── Datas ───────── */
function dataIso(s){ const [a, m, d] = String(s).split("-").map(Number); return new Date(a, m - 1, d); }
function periodoLongo(p){
  const m = String(p || "").match(/(\d{4})-(\d{2})-(\d{2}) a (\d{4})-(\d{2})-(\d{2})/);
  if (!m) return p || "";
  const m1 = +m[2], d1 = +m[3], m2 = +m[5], d2 = +m[6];
  return m1 === m2 ? `${d1} a ${d2} de ${MESES[m2 - 1]}` : `${d1} de ${MESES[m1 - 1]} a ${d2} de ${MESES[m2 - 1]}`;
}
function periodoCurto(p){
  const m = String(p || "").match(/(\d{4})-(\d{2})-(\d{2}) a (\d{4})-(\d{2})-(\d{2})/);
  if (!m) return p || "";
  const d1 = +m[3], m1 = +m[2], d2 = +m[6], m2 = +m[5];
  return m1 === m2 ? `${d1} a ${d2} ${MES_CURTO(m2)}` : `${d1} ${MES_CURTO(m1)} a ${d2} ${MES_CURTO(m2)}`;
}
const hoje = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); };
function rotuloConv(ms){
  const d = new Date(ms), h = hoje();
  const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const mesmoDia = d.toDateString() === h.toDateString();
  const ontem = new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1).toDateString() === d.toDateString();
  const data = mesmoDia ? "hoje" : ontem ? "ontem" : `${d.getDate()} ${MES_CURTO(d.getMonth() + 1)}`;
  return {titulo: data, sub: `${data} · ${hora}`};
}

/* ───────── Estado ───────── */
const K_CONVS = "reflexao.conversas.v1", K_GERAL = "reflexao.geral.v1", K_CONSENT = "reflexao.consentimento.v1";
let ESTADO = null, MEMORIA = null, NOTAS = null;
let CONSENT = null;                  // {agenda, conversa_livre, diario_completo_no_widget} do servidor
let LOCAL = { guardar_conversas: true };  // toggle só do navegador
let convs = [], ativa = null;        // conversas de reflexão (a "ativa" está aberta no ecrã)
let GERAL = { msgs: [] };            // thread da conversa livre (widget)
let vista = "conversa", semanaAberta = null, semanaMarkdown = "";
let busy = false, wbusy = false;

function carregar(k, padrao){ try{ const r = localStorage.getItem(k); return r ? JSON.parse(r) : clone(padrao); }catch(e){ return clone(padrao); } }
function guardar(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
// com «guardar conversas» desligado, a conversa aberta fica só em memória (efémera)
const salvarConvs = () => guardar(K_CONVS, convs.filter(c => !c.efemera));
const salvarGeral = () => guardar(K_GERAL, GERAL);
const convAtiva = () => convs.find(c => c.id === ativa) || null;

/* ───────── API ───────── */
async function api(url, corpo, metodo){
  const temCorpo = corpo != null;
  const r = await fetch(url, temCorpo || metodo ? {
    method: metodo || "POST",
    headers: temCorpo ? { "Content-Type": "application/json" } : undefined,
    body: temCorpo ? JSON.stringify(corpo) : null
  } : undefined);
  if (!r.ok){
    let detalhe = "";
    try{ detalhe = (await r.json()).detail || ""; }catch(e){}
    throw new Error(detalhe || `erro ${r.status}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

/* ───────── Toast ───────── */
let toastTimer = null;
function toast(txt, segs){
  $("#toastTxt").textContent = txt;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("#toast").hidden = true; }, (segs || 5) * 1000);
}

/* ───────── Cabeçalho e sidebar ───────── */
function renderTopo(){
  if (!ESTADO) return;
  $("#subtitulo").textContent = "Semana de " + periodoLongo(ESTADO.periodo);
  const b = $("#modoBadge");
  b.hidden = false;
  b.textContent = ESTADO.disponivel ? "Gemini" : "respostas de exemplo";
  b.className = "badge " + (ESTADO.disponivel ? "ok" : "");
  b.title = ESTADO.disponivel ? `As mensagens são escritas por ${ESTADO.modelo}` : "Sem chave do modelo no servidor: respostas pré-escritas";
}
function renderSidebar(){
  // conversas, da mais recente para a mais antiga (as efémeras só existem nesta sessão)
  const lista = convs.filter(c => !c.efemera);
  $("#convList").innerHTML = lista.length ? lista.map(c => {
    const rot = rotuloConv(c.criadaEm);
    const estado = c.guardada ? "guardada" : c.pronto ? "resumo pronto" : c.terminada ? "terminada" : "em curso";
    return `<li><button type="button" class="conv${c.id === ativa && vista === "conversa" ? " on" : ""}" data-id="${c.id}" aria-current="${c.id === ativa && vista === "conversa"}">
      <span class="ct">${esc(rot.titulo)}<span class="cs">${esc(rot.sub)}</span></span>
      <span class="ce ${c.guardada ? "ok" : ""}">${estado}</span></button>
      <button type="button" class="del" data-del="${c.id}" aria-label="Apagar a conversa de ${esc(rot.titulo)}" title="Apagar">×</button></li>`;
  }).join("") : '<li class="vazio">Ainda não há conversas — começa uma com «Nova reflexão», no topo.</li>';

  // diário: gráfico de energia + prioridades cumpridas + semanas
  const met = MEMORIA && MEMORIA.metricas;
  const ec = $("#energiaCard");
  if (met && met.energia.length > 1){
    ec.hidden = false;
    ec.innerHTML = graficoEnergia(met.energia) + '<div class="leg">energia por semana, de 1 a 5</div>';
  } else ec.hidden = true;
  const pm = $("#prioMeta");
  if (met && met.prioridades_cumpridas && met.prioridades_cumpridas.total){
    const p = met.prioridades_cumpridas;
    pm.hidden = false;
    pm.textContent = `Prioridades cumpridas: ${p.feitas} de ${p.total}` + (p.parciais ? ` (+${p.parciais} em parte)` : "");
  } else pm.hidden = true;

  $("#weekList").innerHTML = MEMORIA && MEMORIA.semanas.length
    ? MEMORIA.semanas.slice().reverse().map(s => `<li><button type="button" class="week${vista === "semana" && semanaAberta === s.semana ? " on" : ""}" data-semana="${esc(s.semana)}">
        <span class="wt">Semana de ${esc(periodoCurto(s.periodo))}</span>
        <span class="we">${s.energia != null ? "⚡ " + s.energia + "/5" : ""}</span></button></li>`).join("")
    : '<li class="vazio">Ainda não há semanas guardadas. A primeira entra no diário quando guardares um resumo.</li>';
}
function graficoEnergia(pontos){
  const W = 210, H = 64, x = i => 18 + i * ((W - 30) / Math.max(pontos.length - 1, 1)), y = v => 46 - (v - 1) * 8;
  const rotulo = sid => { const m = /W(\d+)$/.exec(sid || ""); return m ? m[1] : ""; };
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Energia por semana: ${pontos.map(p => `${p.semana}: ${p.valor}`).join(", ")}">`;
  [1, 3, 5].forEach(v => { s += `<line class="gl" x1="4" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}"/>`; });
  s += `<polyline class="ln" points="${pontos.map((p, i) => x(i) + "," + y(p.valor)).join(" ")}"/>`;
  pontos.forEach((p, i) => { s += `<circle class="pt" cx="${x(i)}" cy="${y(p.valor)}" r="3"/><text class="vl" x="${x(i)}" y="${y(p.valor) - 7}" text-anchor="middle">${p.valor}</text><text class="lb" x="${x(i)}" y="${H - 3}" text-anchor="middle">${rotulo(p.semana)}</text>`; });
  return s + "</svg>";
}

/* ───────── Conversa de reflexão ───────── */
function novaConversa(){
  const conv = { id: uid(), criadaEm: Date.now(), msgs: [], pronto: false, guardada: false, terminada: false, care: null, semana: null, ficheiro: null };
  convs.unshift(conv);
  ativa = conv.id;
  salvarConvs();
  abrirVista("conversa");
  renderSidebar();
  abertura(conv);
  return conv;
}
async function abertura(conv){
  busy = true; renderLog();
  conv.msgs.push({ role: "assistant", content: null });  // indicador "a escrever"
  renderLog();
  try{
    const r = await api("/api/chat", { mensagens: [] });
    conv.msgs[conv.msgs.length - 1].content = r.resposta;
    conv.erroArranque = null;
  }catch(e){
    conv.msgs.pop();
    conv.erroArranque = e.message;
  }
  busy = false;
  salvarConvs(); renderLog();
}
function abrirConversa(id){
  ativa = id; semanaAberta = null;
  abrirVista("conversa");
}
async function enviar(texto){
  const conv = convAtiva();
  if (!conv || busy) return;
  setErr("");
  // o filtro corre no browser antes de ir à rede (o backend volta a verificá-lo)
  const nivel = bemEstar(texto);
  if (nivel){
    conv.msgs.push({ role: "user", content: texto }, { role: "assistant", content: CARE[nivel] });
    conv.care = nivel;
    salvarConvs(); renderLog();
    return;
  }
  conv.msgs.push({ role: "user", content: texto });
  conv.pronto = false;
  busy = true; renderLog();
  conv.msgs.push({ role: "assistant", content: null });
  try{
    const r = await api("/api/chat", { mensagens: conv.msgs.filter(m => m.content != null && !m.falha).map(({ role, content }) => ({ role, content })) });
    conv.msgs[conv.msgs.length - 1].content = r.resposta;
    if (r.alerta_seguranca) conv.care = "servidor";
    if (r.pronto_para_fechar) conv.pronto = true;
  }catch(e){
    conv.msgs.pop();
    conv.msgs[conv.msgs.length - 1].falha = true;
    setErr("Não consegui enviar a mensagem (" + e.message + ").", texto);
  }
  busy = false;
  salvarConvs(); renderLog();
}
function setErr(txt, replay){
  const c = $("#cerr");
  if (!txt){ c.hidden = true; c.innerHTML = ""; return; }
  c.hidden = false;
  c.innerHTML = esc(txt) + (replay != null ? ' <button type="button" class="linkbtn" id="retryBtn">Tentar de novo</button>' : "");
  const r = $("#retryBtn");
  if (r) r.onclick = () => {
    const conv = convAtiva();
    setErr("");
    while (conv.msgs.length && conv.msgs[conv.msgs.length - 1].falha) conv.msgs.pop();
    salvarConvs(); renderLog();
    enviar(replay);
  };
}

/* ───────── Cartão de fecho (resumo gerado a partir da conversa) ───────── */
async function verResumo(){
  const conv = convAtiva();
  if (!conv || busy) return;
  busy = true; renderLog();
  try{
    const r = await api("/api/fechar", { mensagens: conv.msgs.map(({ role, content }) => ({ role, content })) });
    conv.semana = r.semana;
    conv.erroFecho = null;
  }catch(e){
    conv.erroFecho = "O resumo não foi gerado (" + e.message + ").";
  }
  busy = false;
  salvarConvs(); renderLog();
}
async function guardarSemana(){
  const conv = convAtiva();
  if (!conv || !conv.semana || busy) return;
  // as edições dos inputs já estão em conv.semana (eventos "input" do cartão)
  busy = true; renderLog();
  try{
    const r = await api("/api/guardar", { semana: conv.semana });
    conv.guardada = true;
    conv.ficheiro = r.ficheiro;
    toast("Semana guardada em " + r.ficheiro);
    if (!LOCAL.guardar_conversas) conv.efemera = true;  // sai do localStorage, fica só nesta sessão
    await carregarMemoria();
    await carregarNotas();  // as notas da semana são apagadas ao guardar (fica o essencial no diário)
  }catch(e){
    conv.erroGuardar = "Não consegui guardar (" + e.message + ").";
  }
  busy = false;
  salvarConvs(); renderLog(); renderSidebar();
}

/* ───────── Render da conversa ───────── */
const ICON = {
  rec:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.6 6.2A5 5 0 0 0 3.7 4.6"/><path d="M3.4 9.8a5 5 0 0 0 8.9 1.6"/><path d="M3.5 2.2v2.6h2.6"/><path d="M12.5 13.8v-2.6H9.9"/></svg>',
  cons:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14V8"/><path d="M8 8c0-2.8 2.1-4.6 5-4.6 0 2.8-2.1 4.6-5 4.6z"/><path d="M8 10c0-2.2-1.7-3.6-4-3.6 0 2.2 1.7 3.6 4 3.6z"/></svg>',
  trans:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8h10"/><path d="M9 4.5 12.5 8 9 11.5"/></svg>',
  ener:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 1.8 4 9h4l-1 5.2L12 7H8l1-5.2z"/></svg>'
};
const TIPO_PADRAO = { bloqueio_recorrente: ["rec", "Bloqueio recorrente"], aprendizagem_a_consolidar: ["cons", "Aprendizagem a consolidar"],
                      prioridade_que_transita: ["trans", "Prioridade que transita"], energia_em_queda: ["ener", "Energia"] };
const ESTADOS_PRIO = { "feito": "feito", "em-parte": "em parte", "nao-avancou": "não avançou", "sem-info": "sem info" };

function bolha(m, comNota){
  const who = m.role === "assistant" ? "Agente" : "Tu";
  const corpo = m.content == null ? '<span class="thinking" aria-label="A escrever"><i></i><i></i><i></i></span>' : esc(m.content);
  // no widget, cada mensagem da pessoa pode virar nota do dia (hover)
  const nota = comNota && m.role === "user" && m.content != null && !m.falha
    ? '<button type="button" class="notabtn" title="Guardar como nota do dia" aria-label="Guardar como nota do dia">✚ nota</button>' : "";
  return `<div class="msg ${m.role}${m.falha ? " falha" : ""}"><div class="who">${who}</div><div class="bubble">${corpo}</div>${m.falha ? '<div class="errline">Não foi enviada.</div>' : ""}${nota}</div>`;
}
function cartaoCuidado(nivel){
  const lis = ['<li>Alguém de confiança, dentro ou fora do trabalho</li><li>O teu médico de família</li>',
               '<li>SNS 24: <b>808 24 24 24</b>, com aconselhamento psicológico</li><li>Em perigo: <b>112</b></li>'].join("");
  return `<div class="care"><h4>Apoio humano</h4><ul>${lis}</ul>
    <p class="muted">Esta parte da conversa não é usada para padrões. O agente não faz diagnósticos.</p>
    <div class="row">${nivel === "urgente" ? "" : '<button type="button" class="btn" id="careContinuar">Continuar a reflexão</button>'}<button type="button" class="btn" id="careTerminar">Terminar por hoje</button></div></div>`;
}
function cartaoFecho(conv){
  const s = conv.semana, editavel = !conv.guardada;
  const estados = (s.prioridades_anteriores || []).map((p, i) => `<div class="prow-ant" data-i="${i}">
      <span class="pt">${esc(p.texto)}</span>
      <span class="mini" role="group" aria-label="Como ficou">${Object.entries(ESTADOS_PRIO).map(([k, l]) =>
        `<button type="button" data-estado="${k}" aria-pressed="${(p.estado || "sem-info") === k}"${editavel ? "" : " disabled"}>${l}</button>`).join("")}</span></div>`).join("");
  const lista = (itens) => itens && itens.length ? "<ul>" + itens.map(i => `<li>${esc(i.texto || i)}</li>`).join("") + "</ul>" : '<p class="muted">Nada registado.</p>';
  const padroes = (s.padroes || []).map(p => {
    const [ic, nome] = TIPO_PADRAO[p.tipo] || ["trans", p.tipo];
    return `<li><span class="ic" title="${esc(nome)}">${ICON[ic]}</span>${esc(p.mensagem)}</li>`;
  }).join("") || '<li class="muted">Nenhum padrão face às semanas anteriores.</li>';
  return `<div class="fecho" id="cartaoFecho">
    <div class="fhead">
      <div><div class="eyebrow">Resumo da semana · gerado a partir desta conversa</div>
        <h3>Semana de ${esc(periodoLongo(s.periodo))}</h3>
        ${s.energia != null ? `<div class="fener">Energia ${s.energia}/5${s.energia_nota ? " — " + esc(s.energia_nota) : ""}</div>` : ""}
      </div>
    </div>
    ${conv.guardada ? `<div class="banner ok">Semana guardada em <span class="mono">${esc(conv.ficheiro || "")}</span></div>` : ""}
    <section class="fsec"><div class="row sp"><h4>Resumo</h4>${editavel ? `<button type="button" class="linkbtn" data-editar="resumo">Editar</button>` : ""}</div>
      <p class="fresumo" data-campo="resumo">${esc(s.resumo)}</p></section>
    ${s.prioridades_anteriores && s.prioridades_anteriores.length ? `<section class="fsec"><h4>Prioridades da semana passada</h4>${estados}</section>` : ""}
    <section class="fsec triplo">
      <div><h4>Correu bem</h4>${lista(s.correu_bem)}</div>
      <div><h4>Aprendi</h4>${lista(s.aprendizagens)}</div>
      <div><h4>Bloqueou</h4>${lista(s.bloqueios)}</div>
    </section>
    <section class="fsec"><h4>Padrões assinalados</h4><ul class="padroes">${padroes}</ul></section>
    <section class="fsec"><h4>Ajuste de hábito</h4><p data-campo="ajuste">${esc(s.ajuste_habito)}</p></section>
    <section class="fsec"><div class="row sp"><h4>3 prioridades para a semana seguinte</h4>${editavel ? '<span class="hint">edita à vontade</span>' : ""}</div>
      ${(s.prioridades || []).map((p, i) => `<div class="prow" data-i="${i}"><span class="k">${i + 1}</span>
        <input type="text" value="${esc(p.texto)}" aria-label="Prioridade ${i + 1}" ${editavel ? "" : "readonly"} data-prio="${i}"></div>`).join("")}
      <div class="saverow">
        ${conv.guardada
          ? `<a class="btn" href="/api/ics?semana=${esc(s.semana)}" download>Adicionar ao calendário (.ics)</a>`
          : `<button type="button" class="btn primary" id="btnGuardar"${busy ? " disabled" : ""}>Guardar semana</button>
             <button type="button" class="btn" id="btnRefazer"${busy ? " disabled" : ""}>Gerar de novo</button>`}
      </div>
      <div class="ferr" id="erroFecho" role="alert">${esc(conv.erroGuardar || conv.erroFecho || "")}</div>
    </section></div>`;
}
function renderLog(){
  const conv = convAtiva();
  if (!conv) return;
  const rot = rotuloConv(conv.criadaEm);
  $("#chatTitle").textContent = "Reflexão de " + rot.titulo;
  const nome = MEMORIA && MEMORIA.contexto ? (/- Nome: ([^,\n]+)/.exec(MEMORIA.contexto) || [])[1] : null;
  $("#chatSub").textContent = (nome ? nome + " · " : "") + rot.sub;

  let h = "";
  conv.msgs.forEach(m => { h += bolha(m); });
  if (conv.erroArranque && !conv.msgs.length)
    h += `<div class="readonly">Não consegui falar com o agente (${esc(conv.erroArranque)}). <button type="button" class="linkbtn" id="retryArranque">Tentar de novo</button></div>`;
  if (conv.care) h += cartaoCuidado(conv.care);
  if (conv.pronto && !conv.semana && !conv.care)
    h += `<div class="acao"><button type="button" class="btn primary" id="btnResumo">Ver o resumo da semana</button>
          <span class="hint">gerado a partir desta conversa; revês e editas antes de guardar</span></div>`;
  if (conv.semana) h += cartaoFecho(conv);
  if (conv.terminada) h += '<div class="readonly">Fica por aqui. Podes voltar amanhã, ou começar outra reflexão.</div>';

  const log = $("#log");
  log.innerHTML = h;
  ligarCartao(conv);
  const ra = $("#retryArranque");
  if (ra) ra.onclick = () => { conv.erroArranque = null; renderLog(); abertura(conv); };
  const cc = $("#careContinuar");
  if (cc) cc.onclick = () => { conv.care = null; salvarConvs(); renderLog(); $("#msg").focus(); };
  const ct = $("#careTerminar");
  if (ct) ct.onclick = () => { conv.care = null; conv.terminada = true; salvarConvs(); renderLog(); };
  const br = $("#btnResumo");
  if (br) br.onclick = verResumo;
  renderComposer();
  log.scrollTop = log.scrollHeight;
}
function ligarCartao(conv){
  const s = conv.semana; if (!s) return;
  $$("#cartaoFecho input[data-prio]").forEach(inp => inp.addEventListener("input", () => {
    s.prioridades[+inp.dataset.prio].texto = inp.value;
    salvarConvs();
  }));
  $$('[data-estado]').forEach(b => b.addEventListener("click", () => {
    s.prioridades_anteriores[+b.closest(".prow-ant").dataset.i].estado = b.dataset.estado;
    salvarConvs(); renderLog();
  }));
  const er = $('[data-editar="resumo"]');
  if (er) er.onclick = () => {
    const p = $('[data-campo="resumo"]');
    const ta = p.querySelector("textarea");
    if (ta){
      s.resumo = ta.value;
      p.textContent = s.resumo;
      salvarConvs();
    } else {
      p.innerHTML = `<textarea class="tresumo" rows="4" aria-label="Resumo da semana">${esc(s.resumo)}</textarea>`;
      p.querySelector("textarea").focus();
    }
  };
  const bg = $("#btnGuardar"); if (bg) bg.onclick = guardarSemana;
  const bf = $("#btnRefazer");
  if (bf) bf.onclick = () => { if (confirm("Gerar o resumo de novo? As edições deste cartão perdem-se.")){ conv.semana = null; verResumo(); } };
}
function renderComposer(){
  const conv = convAtiva();
  const ta = $("#msg"), send = $("#sendBtn");
  const ok = !!conv && !busy && !conv.care && !conv.terminada;
  ta.disabled = !ok;
  send.disabled = !ok;
  ta.placeholder = !conv ? "" : conv.care ? "Escolhe uma das opções acima." : conv.terminada ? "Esta conversa terminou." : "Escreve a tua resposta…";
}

/* ───────── Vista de uma semana guardada ───────── */
function abrirSemana(sid){
  const s = MEMORIA.semanas.find(x => x.semana === sid);
  if (!s) return;
  semanaAberta = sid;
  semanaMarkdown = s.markdown || "";
  ativa = null;
  abrirVista("semana");
  $("#weekId").textContent = s.semana;
  $("#weekTitle").textContent = "Semana de " + periodoLongo(s.periodo);
  $("#weekIcs").href = "/api/ics?semana=" + encodeURIComponent(sid);
  $("#weekBody").innerHTML = corpoSemana(s.markdown || "");
  renderSidebar();
}

/* ───────── Exportar a semana em markdown ───────── */
function copiarTexto(txt, msgOk){
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(() => toast(msgOk), () => copiarTextoFallback(txt, msgOk));
  } else copiarTextoFallback(txt, msgOk);
}
function copiarTextoFallback(txt, msgOk){
  // seleção + cópia manual: para browsers sem acesso à clipboard API (ex.: contexto não seguro)
  const ta = document.createElement("textarea");
  ta.value = txt;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:-100px;opacity:0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try{ ok = document.execCommand("copy"); }catch(e){}
  ta.remove();
  if (ok) toast(msgOk);
  else toast("Não consegui copiar; tenta o «Descarregar .md».");
}
$("#weekCopiar").onclick = () => copiarTexto(semanaMarkdown, "Markdown da semana copiado.");
$("#weekDescarregar").onclick = () => {
  const blob = new Blob([semanaMarkdown || ""], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "semana-" + (semanaAberta || "atual") + ".md";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};

/* ───────── Resumo do mês (últimas 4 semanas) ───────── */
async function verResumoMensal(){
  const dlg = $("#mensalDialog"), corpo = $("#mensalTexto"), btn = $("#mensalBtn");
  if (!dlg.open) dlg.showModal();
  corpo.innerHTML = '<span class="thinking" aria-label="A preparar o resumo"><i></i><i></i><i></i></span>';
  btn.disabled = true;
  try{
    const r = await api("/api/resumo-mensal", {});
    corpo.textContent = r.texto;
  }catch(e){
    corpo.textContent = "Não consegui gerar o resumo (" + e.message + ").";
  }
  btn.disabled = false;
}
$("#mensalBtn").onclick = verResumoMensal;
$("#mensalClose").onclick = () => $("#mensalDialog").close();
$("#mensalDialog").addEventListener("click", e => { if (e.target === $("#mensalDialog")) $("#mensalDialog").close(); });

/* ───────── Notas do dia ───────── */
function rotuloDia(iso){
  const d = dataIso(iso), h = hoje();
  if (d.toDateString() === h.toDateString()) return "hoje";
  const ontem = new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return "ontem";
  return `${d.getDate()} ${MES_CURTO(d.getMonth() + 1)}`;
}
function renderNotas(){
  const box = $("#notasCard");
  if (!NOTAS || !NOTAS.notas || !NOTAS.notas.length){ box.hidden = true; box.innerHTML = ""; return; }
  // agrupadas por dia, como na proposta ("hoje", "ontem", data)
  const grupos = [];
  NOTAS.notas.forEach(n => {
    const rot = rotuloDia(n.data);
    let g = grupos[grupos.length - 1];
    if (!g || g.rot !== rot){ g = { rot, itens: [] }; grupos.push(g); }
    g.itens.push(n);
  });
  box.hidden = false;
  box.innerHTML = grupos.map(g =>
    `<div class="ngrupo"><div class="ndia">${esc(g.rot)}</div><ul>` +
    g.itens.map(n => `<li><span class="nhora">${esc(n.hora)}</span><span class="ntxt">${esc(n.texto)}</span>
      <button type="button" class="del" data-nota="${esc(n.id)}" aria-label="Apagar a nota" title="Apagar">×</button></li>`).join("")
    + "</ul></div>").join("")
    + (NOTAS.insight ? `<p class="ninsight">${esc(NOTAS.insight)}</p>` : "");
  // 2 cliques, como apagar conversas
  $$("#notasCard [data-nota]").forEach(b => b.onclick = () => {
    if (b.dataset.confirmado) apagarNota(b.dataset.nota);
    else { b.dataset.confirmado = "1"; b.textContent = "apagar?"; b.classList.add("certo"); }
  });
}
async function carregarNotas(){
  try{ NOTAS = await api("/api/notas"); }
  catch(e){ NOTAS = null; }
  renderNotas();
}
async function apagarNota(id){
  try{ await api("/api/notas/" + encodeURIComponent(id), null, "DELETE"); }
  catch(e){ toast("Não consegui apagar a nota (" + e.message + ")."); }
  carregarNotas();
}
async function guardarNota(texto, deOnde){
  try{
    const r = await api("/api/notas", { texto });
    if (r && r.alerta_seguranca){
      // mal-estar sério: a nota não é guardada; mostra-se a resposta de apoio
      if (deOnde === "widget"){
        GERAL.msgs.push({ role: "assistant", content: r.resposta });
        salvarGeral(); renderWidget();
      } else toast(r.resposta, 12);
      return;
    }
    toast("Nota guardada para a reflexão de sexta");
    await carregarNotas();
  }catch(e){
    toast("Não consegui guardar a nota (" + e.message + ").");
  }
}
$("#notaBtn").onclick = () => {
  const dlg = $("#notaDialog");
  if (!dlg.open) dlg.showModal();
  $("#notaTexto").value = "";
  $("#notaTexto").focus();
};
$("#notaClose").onclick = () => $("#notaDialog").close();
$("#notaDialog").addEventListener("click", e => { if (e.target === $("#notaDialog")) $("#notaDialog").close(); });
$("#notaTexto").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); $("#notaForm").requestSubmit(); }
});
$("#notaForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = $("#notaTexto").value.trim();
  if (!v) return;
  $("#notaDialog").close();
  guardarNota(v, "sidebar");
});
function mdLeve(linha){
  return esc(linha)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^(\d+)\.\s+(.*)$/, "<li>$2</li>")
    .replace(/^-\s+(.*)$/, "<li>$1</li>");
}
function corpoSemana(markdown){
  const linhas = markdown.split(/\r?\n/);
  const secções = [];
  let corrente = null, tituloTopo = "";
  linhas.forEach(l => {
    const t = /^# (.+)/.exec(l);
    const s = /^## (.+)/.exec(l);
    if (t){ tituloTopo = t[1]; return; }
    if (s){ corrente = { titulo: s[1], corpo: [] }; secções.push(corrente); return; }
    if (corrente != null) corrente.corpo.push(l);
  });
  return secções.filter(s => s.corpo.join("").trim()).map(s => {
    const html = s.corpo.join("\n").split(/\n\s*\n/).filter(b => b.trim()).map(bloco => {
      const ls = bloco.split(/\n/).filter(x => x.trim());
      return ls.every(x => /^(-|\d+\.)\s/.test(x.trim())) ? "<ul>" + ls.map(mdLeve).join("") + "</ul>" : "<p>" + ls.map(mdLeve).join("<br>") + "</p>";
    }).join("");
    return `<section class="wsec"><h4>${esc(s.titulo)}</h4>${html}</section>`;
  }).join("") || '<p class="muted">Esta semana ainda não tem conteúdo guardado.</p>';
}

/* ───────── Navegação entre vistas ───────── */
function abrirVista(v){
  vista = v;
  $("#viewConversa").hidden = v !== "conversa";
  $("#viewSemana").hidden = v !== "semana";
  if (v === "conversa") renderLog();
  renderSidebar();
  fecharSidebar();
}

/* ───────── Sidebar em ecrãs pequenos ───────── */
function fecharSidebar(){ $("#sidebar").classList.remove("aberta"); $("#menuBtn").setAttribute("aria-expanded", "false"); }
$("#menuBtn").onclick = () => {
  const aberta = $("#sidebar").classList.toggle("aberta");
  $("#menuBtn").setAttribute("aria-expanded", String(aberta));
};

/* ───────── Widget de conversa livre ───────── */
function renderWidget(){
  const intro = '<div class="wintro">Pergunta o que quiseres sobre as tuas semanas — prioridades, padrões, o que disseste e quando.</div>';
  let h = intro;
  GERAL.msgs.forEach((m, i) => {
    h += bolha(m, true);
    // chips de ações sugeridas: só na última bolha do agente, enquanto não forem usados
    if (i === GERAL.msgs.length - 1 && m.role === "assistant" && m.content != null
        && !m.acoesUsadas && m.acoes && m.acoes.length){
      h += '<div class="chips" role="group" aria-label="Sugestões">'
           + m.acoes.map((a, j) => `<button type="button" class="chip" data-chip="${j}">${esc(a.texto)}</button>`).join("")
           + "</div>";
    }
  });
  $("#wlog").innerHTML = h;
  $$("#wlog .chip").forEach(b => b.onclick = () => usarChip(+b.dataset.chip));
  $$("#wlog .notabtn").forEach(b => b.onclick = () => {
    const li = b.closest(".msg"), idx = $$("#wlog .msg").indexOf(li);
    const m = GERAL.msgs[idx];
    if (m && m.content) guardarNota(m.content, "widget");
  });
  $("#wlog").scrollTop = $("#wlog").scrollHeight;
  const ta = $("#wmsg"), send = $("#wsendBtn");
  ta.disabled = wbusy; send.disabled = wbusy;
}
function usarChip(j){
  const ultima = GERAL.msgs[GERAL.msgs.length - 1];
  const acao = ultima && ultima.acoes ? ultima.acoes[j] : null;
  if (!acao || wbusy) return;
  ultima.acoesUsadas = true;
  salvarGeral();
  if (acao.tipo === "navegacao"){
    $("#widget").hidden = true;
    $("#widgetBtn").setAttribute("aria-expanded", "false");
    novaConversa();  // abre "Nova reflexão" sem pedido ao servidor
  } else {
    renderWidget();
    enviarGeral(acao.mensagem);  // a mensagem exata do catálogo, como se fosse da pessoa
  }
}
async function enviarGeral(texto){
  if (wbusy) return;
  $("#werr").hidden = true;
  const nivel = bemEstar(texto);
  if (nivel){
    GERAL.msgs.push({ role: "user", content: texto }, { role: "assistant", content: CARE[nivel] });
    salvarGeral(); renderWidget();
    return;
  }
  GERAL.msgs.push({ role: "user", content: texto });
  wbusy = true; renderWidget();
  GERAL.msgs.push({ role: "assistant", content: null });
  try{
    const r = await api("/api/chat", { modo: "geral", mensagens: GERAL.msgs.filter(m => m.content != null).map(({ role, content }) => ({ role, content })) });
    const ult = GERAL.msgs[GERAL.msgs.length - 1];
    ult.content = r.resposta;
    ult.acoes = r.acoes || [];  // os chips voltam ao reabrir o widget enquanto não usados
  }catch(e){
    GERAL.msgs.pop();
    GERAL.msgs[GERAL.msgs.length - 1].falha = true;
    $("#werr").hidden = false;
    $("#werr").textContent = "Não consegui enviar (" + e.message + ").";
  }
  wbusy = false;
  salvarGeral(); renderWidget();
}
$("#widgetBtn").onclick = () => {
  const w = $("#widget");
  w.hidden = !w.hidden;
  $("#widgetBtn").setAttribute("aria-expanded", String(!w.hidden));
  if (!w.hidden){ renderWidget(); $("#wmsg").focus(); }
};
$("#widgetClose").onclick = () => { $("#widget").hidden = true; $("#widgetBtn").setAttribute("aria-expanded", "false"); };

/* ───────── Memória do servidor ───────── */
async function carregarMemoria(){ MEMORIA = await api("/api/memoria"); renderSidebar(); if (vista === "conversa") renderLog(); }

/* ───────── Consentimento: «O que o agente sabe sobre ti» ───────── */
function aplicarConversaLivre(){
  const pode = !CONSENT || CONSENT.conversa_livre;
  $("#widgetBtn").hidden = !pode;
  if (!pode){
    $("#widget").hidden = true;
    $("#widgetBtn").setAttribute("aria-expanded", "false");
  }
}
function renderConsent(){
  if (!CONSENT) return;
  $("#togAgenda").checked = !!CONSENT.agenda;
  $("#togGeral").checked = !!CONSENT.conversa_livre;
  $("#togCompleto").checked = !!CONSENT.diario_completo_no_widget;
  $("#togLocal").checked = !!LOCAL.guardar_conversas;
  $("#consentModo").textContent = ESTADO && ESTADO.disponivel
    ? "(agora: " + ESTADO.modelo + ")" : "(agora: respostas de exemplo)";
}
async function carregarConsent(){
  try{ CONSENT = (await api("/api/consentimento")).consentimento; }
  catch(e){ CONSENT = null; }
  aplicarConversaLivre();
  renderConsent();
}
async function porConsent(){
  // escreve sempre as três opções (contrato do PUT)
  CONSENT = { agenda: $("#togAgenda").checked, conversa_livre: $("#togGeral").checked,
              diario_completo_no_widget: $("#togCompleto").checked };
  try{
    const r = await api("/api/consentimento", { consentimento: CONSENT }, "PUT");
    CONSENT = r.consentimento;
    toast("Preferências guardadas.");
  }catch(e){
    toast("Não consegui guardar as preferências (" + e.message + ").");
  }
  aplicarConversaLivre();
  renderConsent();
}
["togAgenda", "togGeral", "togCompleto"].forEach(id =>
  $("#" + id).addEventListener("change", () => porConsent()));
$("#togLocal").addEventListener("change", () => {
  LOCAL.guardar_conversas = $("#togLocal").checked;
  guardar(K_CONSENT, LOCAL);
  salvarConvs();
});
$("#privacidadeBtn").onclick = () => { renderConsent(); $("#consentDialog").showModal(); };
$("#consentClose").onclick = () => $("#consentDialog").close();
$("#consentDialog").addEventListener("click", e => { if (e.target === $("#consentDialog")) $("#consentDialog").close(); });

$("#verTudoBtn").onclick = async () => {
  const box = $("#verTudoBox");
  if (box.hidden === false){ box.hidden = true; return; }
  box.hidden = false;
  $("#verTudoPre").textContent = "a montar…";
  try{
    const r = await api("/api/consentimento/contexto?modo=semanal");
    $("#verTudoPre").textContent = r.contexto;
  }catch(e){
    $("#verTudoPre").textContent = "Não consegui montar o contexto (" + e.message + ").";
  }
};

$("#exportarBtn").onclick = async () => {
  try{
    const [mem, cons] = await Promise.all([api("/api/memoria"), api("/api/consentimento")]);
    const dados = {
      exportado_em: new Date().toISOString(),
      o_que_e: "Exportação completa: conversas deste navegador, diário e consentimento do servidor.",
      consentimento_servidor: cons.consentimento,
      consentimento_navegador: LOCAL,
      conversas: convs.filter(c => !c.efemera),
      conversa_livre: GERAL,
      memoria: mem
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }));
    a.download = "reflexao-semanal-tudo-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }catch(e){
    toast("Não consegui exportar (" + e.message + ").");
  }
};

let tokenDesfazer = null, backupApagar = null, apagarTimer = null;
function _resetBotaoApagar(){
  const b = $("#apagarBtn");
  delete b.dataset.confirmado;
  b.textContent = "Apagar tudo";
  b.classList.remove("certo");
}
$("#apagarBtn").onclick = async () => {
  const btn = $("#apagarBtn");
  if (btn.dataset.confirmado !== "1"){
    btn.dataset.confirmado = "1";        // 1.º clique: pede confirmação
    btn.textContent = "Tens a certeza? Clica outra vez";
    btn.classList.add("certo");
    setTimeout(_resetBotaoApagar, 5000);
    return;
  }
  _resetBotaoApagar();
  backupApagar = { convs: clone(convs), geral: clone(GERAL), ativa };
  try{
    const r = await api("/api/memoria", null, "DELETE");  // 2.º clique: apaga (com lixeira)
    tokenDesfazer = r.token_desfazer;
  }catch(e){
    toast("Não consegui apagar (" + e.message + ").");
    return;
  }
  convs = []; ativa = null; GERAL = { msgs: [] };
  localStorage.removeItem(K_CONVS);
  localStorage.removeItem(K_GERAL);
  $("#chatTitle").textContent = "Reflexão apagada";
  $("#chatSub").textContent = "";
  $("#log").innerHTML = '<div class="readonly">Diário e conversas apagados. Quando quiseres, começa uma «Nova reflexão» — ou desfaz nos próximos 15 segundos.</div>';
  await carregarMemoria();
  await carregarNotas();
  renderSidebar();
  $("#desfazerBtn").hidden = false;
  clearTimeout(apagarTimer);
  apagarTimer = setTimeout(() => { $("#desfazerBtn").hidden = true; tokenDesfazer = null; }, 15000);
};
$("#desfazerBtn").onclick = async () => {
  if (!tokenDesfazer) return;
  try{
    await api("/api/memoria/restaurar", { token_desfazer: tokenDesfazer });
    convs = backupApagar.convs || [];
    GERAL = backupApagar.geral || { msgs: [] };
    ativa = backupApagar.ativa && convs.some(c => c.id === backupApagar.ativa) ? backupApagar.ativa : null;
    salvarConvs(); salvarGeral();
    await carregarMemoria();
    await carregarNotas();
    if (ativa) abrirConversa(ativa);
    else renderSidebar();
    tokenDesfazer = null;
    clearTimeout(apagarTimer);
    $("#desfazerBtn").hidden = true;
    toast("Tudo restaurado.");
  }catch(e){
    toast("Não consegui restaurar (" + e.message + ").");
  }
};

/* ───────── Eventos ───────── */
$("#novaBtn").onclick = () => novaConversa();
$("#convList").addEventListener("click", e => {
  const del = e.target.closest("[data-del]");
  if (del){
    if (del.dataset.confirmado){ convs = convs.filter(c => c.id !== del.dataset.del); if (ativa === del.dataset.del) ativa = null; salvarConvs(); renderSidebar(); }
    else { del.dataset.confirmado = "1"; del.textContent = "apagar?"; del.classList.add("certo"); }
    return;
  }
  const b = e.target.closest("[data-id]");
  if (b) abrirConversa(b.dataset.id);
});
$("#weekList").addEventListener("click", e => {
  const b = e.target.closest("[data-semana]");
  if (b) abrirSemana(b.dataset.semana);
});
function ligarForm(formSel, areaSel, fn){
  const form = $(formSel), ta = $(areaSel);
  const autosize = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; };
  ta.addEventListener("input", autosize);
  ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const v = ta.value.trim();
    if (!v) return;
    ta.value = ""; autosize();
    fn(v);
  });
}
ligarForm("#form", "#msg", enviar);
ligarForm("#wform", "#wmsg", enviarGeral);

/* ───────── Arranque ───────── */
(async function boot(){
  try{
    const [estado, memoria] = await Promise.all([api("/api/estado"), api("/api/memoria")]);
    ESTADO = estado; MEMORIA = memoria;
  }catch(e){
    $("#subtitulo").textContent = "sem ligação ao servidor";
    document.body.insertAdjacentHTML("afterbegin",
      `<div class="aviso-erro">Não consigo chegar ao servidor (${esc(e.message)}). Confirma que o backend está a correr e recarrega a página.</div>`);
    return;
  }
  GERAL = carregar(K_GERAL, { msgs: [] });
  convs = carregar(K_CONVS, []);
  LOCAL = carregar(K_CONSENT, { guardar_conversas: true });
  renderTopo();
  renderSidebar();
  carregarNotas();
  carregarConsent();  // esconde o widget se a conversa livre estiver desligada
  if (convs.length) abrirConversa(convs[0].id);
  else novaConversa();
})();
})();
