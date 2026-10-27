(function(){
"use strict";
const $ = (s, el) => (el || document).querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = o => JSON.parse(JSON.stringify(o));
const num = n => String(n).replace(".", ",");
const lc1 = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
const LOCK = '<svg class="lk" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="5.5" width="8" height="5.5" rx="1.2"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5"/></svg>';

/* ───────── Dados fictícios ───────── */
const TEMAS = {
  reunioes:"Reuniões sem agenda ou em excesso", interrupcoes:"Interrupções", prioridades:"Prioridades pouco claras",
  espera:"Espera por feedback ou por terceiros", sobrecarga:"Sobrecarga e prazos", cliente:"Comunicação com o cliente",
  equipa:"Comunicação na equipa", tempo:"Gestão de tempo", energia:"Energia baixa", tecnica:"Aprendizagem técnica"
};
const HABITOS = {
  reunioes:"Antes de aceitar uma reunião interna, pedir numa linha qual é a decisão a tomar.",
  espera:"Ao enviar um trabalho para revisão, propor logo uma data para o feedback.",
  interrupcoes:"Marcar dois blocos de foco por semana e silenciar as notificações durante esses blocos.",
  sobrecarga:"Na segunda de manhã, confirmar com o manager os prazos da semana e o que pode esperar.",
  prioridades:"Fechar cada reunião de equipa com uma frase: a minha prioridade até sexta é…",
  cliente:"Enviar ao cliente, no próprio dia, os próximos passos de cada reunião com os responsáveis.",
  equipa:"Pedir a um colega 10 minutos de revisão antes de cada entrega.",
  tempo:"Planear a semana na segunda com três blocos fixos para o entregável principal.",
  energia:"Reservar uma pausa real a meio do dia, fora do ecrã.",
  tecnica:"Guardar 30 minutos à sexta para registar o que aprendeste e onde o aplicaste."
};
const DAYS = [
  {k:"seg", nome:"segunda", Nome:"Segunda", data:"19 out"},
  {k:"ter", nome:"terça", Nome:"Terça", data:"20 out"},
  {k:"qua", nome:"quarta", Nome:"Quarta", data:"21 out"},
  {k:"qui", nome:"quinta", Nome:"Quinta", data:"22 out"},
  {k:"sex", nome:"sexta", Nome:"Sexta", data:"23 out"}
];
const DAYN = Object.fromEntries(DAYS.map(d => [d.k, d]));
const AG = {
  seg:[{h:"09:00", d:"1h30", t:"Alinhamento interno da equipa", ref:"o alinhamento interno da equipa", tipo:"interna", p:6, semAgenda:true, tr:"organizador"},
       {h:"14:00", d:"3h", t:"Bloco de foco: síntese das entrevistas", ref:"o bloco de foco para a síntese das entrevistas", tipo:"foco"}],
  ter:[{h:"09:30", d:"1h30", t:"Ponto de situação semanal", ref:"o ponto de situação semanal", tipo:"interna", p:5, semAgenda:true, tr:"ok", resumo:"Planeamento do workshop revisto. Sem decisões registadas."},
       {h:"11:30", d:"1h", t:"Revisão do modelo de custos com o manager", ref:"a revisão do modelo de custos com o manager", tipo:"revisao", p:2, tr:"ok", resumo:"O modelo de custos não chegou a ser discutido: o tempo acabou no ponto anterior. Remarcar."},
       {h:"15:00", d:"2h30", t:"Preparação do workshop", ref:"a preparação do workshop", tipo:"foco"}],
  qua:[{h:"09:00", d:"1h", t:"Sincronização com a equipa de TI", ref:"a sincronização com a equipa de TI", tipo:"interna", p:7, semAgenda:true, tr:"permissao"},
       {h:"10:30", d:"2h", t:"Bloco de foco: materiais do workshop", ref:"o bloco de foco para os materiais do workshop", tipo:"foco"}],
  qui:[{h:"14:00", d:"2h30", t:"Workshop com o cliente: operações de loja", ref:"o workshop com o cliente", tipo:"cliente", p:9, tr:"ok", resumo:"Validados 4 dos 6 processos-alvo. O cliente pediu a síntese escrita até terça; envio a cargo da Marta. Os restantes próximos passos ficaram sem responsável."}],
  sex:[{h:"12:00", d:"", t:"Entrega ao cliente: síntese das entrevistas (v1)", ref:"a entrega da síntese das entrevistas ao cliente", tipo:"entrega"}]
};
const TIPO_ORDER = ["cliente","revisao","entrega","foco","interna"];
const PLAY_DAY = {seg:"aprendizagem", ter:"playbook", qua:"aprendizagem", qui:"playbook", sex:"playbook"};
const BASE_WEEKS = [
  { semana:1, periodo:"2026-09-28 a 2026-10-02", energia:4,
    resumo:"Semana de arranque do mapeamento na loja-piloto. A apresentação ao cliente correu bem; as manhãs ficaram presas em reuniões internas.",
    correu_bem:[{texto:"Apresentação ao cliente", tema:"cliente"}],
    aprendizagens:[{texto:"Tabelas dinâmicas avançadas", tema:"tecnica", chave:"tabelas_dinamicas"}],
    bloqueios:[{texto:"Reuniões internas sem agenda ocupam as manhãs", tema:"reunioes"}],
    prioridades:[{id:"modelo_v1", texto:"Entregar o modelo de custos (v1)", prazo:"até quinta", estado:"feito"},
                 {id:"entrevistas", texto:"Marcar entrevistas com 3 gestores de loja", prazo:"até sexta", estado:"feito"},
                 {id:"dados_vendas", texto:"Pedir ao cliente acesso aos dados de vendas", prazo:"até terça", estado:"em-parte"}],
    ajuste_habito:{sugestao:"Agrupar o trabalho de análise num bloco de 2 horas à tarde.", testar:true} },
  { semana:2, periodo:"2026-10-05 a 2026-10-09", energia:3,
    resumo:"Entrega do modelo de custos dentro do prazo. Três dias parada à espera do feedback do manager.",
    correu_bem:[{texto:"Entrega do modelo de custos", tema:"tecnica"}],
    aprendizagens:[{texto:"Estruturar emails com a pirâmide de Minto", tema:"cliente", chave:"piramide_minto"}],
    bloqueios:[{texto:"3 dias à espera de feedback do manager", tema:"espera"}],
    prioridades:[{id:"workshop_interno", texto:"Preparar o workshop interno", prazo:"até quarta", estado:"feito"},
                 {id:"devolucoes", texto:"Documentar os processos de devolução", prazo:"até sexta", estado:"em-parte"},
                 {id:"comentarios_modelo", texto:"Rever com o manager os comentários ao modelo", prazo:"até quinta", estado:"em-parte"}],
    ajuste_habito:{sugestao:"Ao enviar um trabalho para revisão, propor logo uma data para o feedback.", testar:false} },
  { semana:3, periodo:"2026-10-12 a 2026-10-16", energia:3,
    resumo:"O workshop interno correu bem e a pirâmide de Minto voltou a ajudar no relatório. As reuniões sem agenda regressaram.",
    correu_bem:[{texto:"Workshop interno", tema:"equipa"}],
    aprendizagens:[{texto:"Voltou a usar a pirâmide de Minto num relatório", tema:"cliente", chave:"piramide_minto"}],
    bloqueios:[{texto:"Reuniões sem agenda, outra vez", tema:"reunioes"}],
    prioridades:[{id:"devolucoes", texto:"Documentar os processos de devolução", prazo:"até quarta", estado:null},
                 {id:"workshop_cliente", texto:"Preparar o workshop com o cliente", prazo:"até quinta", estado:null},
                 {id:"feedback_modelo", texto:"Pedir feedback ao manager sobre o modelo", prazo:"até terça", estado:null}],
    ajuste_habito:{sugestao:"Recusar reuniões internas sem agenda nas manhãs de foco.", testar:true} }
];
const PREFILLED = {
  seg:{estado:"feito", dur:"1:48", energia:3, energia_nota:"Manhã pesada, tarde produtiva.",
       correu_bem:{texto:"Avancei bem na síntese das entrevistas durante a tarde.", tema:"tempo"},
       bloqueio:{texto:"A manhã foi toda para o alinhamento interno, que não tinha agenda.", tema:"reunioes"},
       aprendizagem:{texto:"Usei a pirâmide de Minto para ordenar a síntese.", tema:"cliente", chave:"piramide_minto"}},
  ter:{estado:"feito", dur:"2:05", energia:3, energia_nota:"Normal, algum stress com o modelo.",
       correu_bem:{texto:"Deixei a preparação do workshop adiantada.", tema:"cliente"},
       bloqueio:{texto:"Na revisão com o Rui não chegámos ao modelo de custos; ficou por remarcar.", tema:"espera"},
       playbook:{texto:"Queria a decisão sobre os pressupostos do modelo. Não consegui."}},
  qua:{estado:"feito", dur:"1:37", energia:2, energia_nota:"Dormi mal a pensar no workshop.",
       correu_bem:{texto:"Fechei os materiais do workshop.", tema:"cliente"},
       bloqueio:{texto:"Mais uma reunião interna de manhã sem agenda.", tema:"reunioes"},
       aprendizagem:{texto:"Testei as perguntas do workshop com um colega antes.", tema:"equipa", chave:"testar_com_colega"}}
};
const DEF_PROFILE = {
  nome:"Marta", papel:"Consultora júnior", desde:"fevereiro de 2026", projeto:"Reorganização de processos · cliente de retalho", manager:"Rui",
  resp:["Preparar e conduzir workshops com o cliente","Documentar processos (situação atual e futura)","Manter o modelo de custos atualizado","Enviar as atas e os próximos passos ao cliente"],
  dias:["seg","ter","qua","qui","sex"], hora:"17:30", lembrete:"teams", relatorio:"sexta", estilo:"curtas",
  teams:true, transcricoes:true, sync:"22 out, 08:00"
};
const PKEY = "reflexao.perfil.v2";
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
/** "urgente" | "apoio" | null. Corre em todas as mensagens da pessoa, antes de qualquer validação. */
function bemEstar(texto){
  const t = String(texto || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/).filter(Boolean).join(" ");
  return ["urgente", "apoio"].find(nivel => BEM_ESTAR[nivel].some(e => t.includes(e))) || null;
}
const NEG = /^(n[ãa]o|nada|nenhum|nenhuma|zero)\b/i;

/* ───────── Perfil ───────── */
let P = loadProfile();
function loadProfile(){
  try{
    const r = localStorage.getItem(PKEY);
    if (r){
      const o = Object.assign(clone(DEF_PROFILE), JSON.parse(r));
      delete o.equipa; delete o.agregados;
      if (!Array.isArray(o.resp)) o.resp = clone(DEF_PROFILE.resp);
      if (!Array.isArray(o.dias) || !o.dias.length) o.dias = clone(DEF_PROFILE.dias);
      return o;
    }
  }catch(e){}
  return clone(DEF_PROFILE);
}
function saveProfile(){
  try{ localStorage.setItem(PKEY, JSON.stringify(P)); $("#savedInd").textContent = "Guardado neste navegador"; }
  catch(e){ $("#savedInd").textContent = "Aplicado nesta sessão"; }
  profileTouched();
}
// O relatório é gerado a partir do perfil (nome, agenda, responsabilidades). Se a pessoa ainda não o editou,
// volta a gerar-se; se já o editou, fica e aparece um aviso para atualizar.
function profileTouched(){
  if (!S || !S.report || S.saved) return;
  if (S.report.edited) S.report.stale = true; else S.report = null;
}
const lvl = () => P.teams ? (P.transcricoes ? 2 : 1) : 0;
function trStatus(ev){
  if (!ev.tr) return null;
  if (!P.transcricoes) return {lock:true, txt:"Bloqueada: transcrições desligadas no teu perfil"};
  if (ev.tr === "organizador") return {lock:true, txt:"Bloqueada: o organizador não ativou a transcrição"};
  if (ev.tr === "permissao") return {lock:true, txt:"Bloqueada: sem permissão para aceder a esta reunião"};
  return {lock:false, txt:ev.resumo};
}
function mainEvent(dk){
  if (!P.teams) return null;
  const evs = (AG[dk]||[]).slice().sort((a,b) => TIPO_ORDER.indexOf(a.tipo) - TIPO_ORDER.indexOf(b.tipo));
  return evs[0] || null;
}

/* ───────── Diagnóstico interno ─────────
   As ferramentas (contexto do dia, histórico, padrões, gravação, bem-estar) registam-se aqui e na
   consola (nível debug), nunca no ecrã. Para ver na consola do browser: reflexaoDiag() */
const DIAG = [];
function trace(fn, res){
  const x = {hora:new Date().toISOString(), dia:S && S.chat ? S.chat.dk : null, fn, res};
  DIAG.push(x); if (DIAG.length > 300) DIAG.shift();
  try{ console.debug("[reflexao]", fn, res); }catch(e){}
  return x;
}
window.reflexaoDiag = () => DIAG.slice();

/* ───────── Estado ───────── */
let S, SAMPLE = null, liveDisabled = false;
function freshState(opt){
  opt = opt || {};
  const days = {};
  DAYS.forEach(d => {
    if (PREFILLED[d.k]) days[d.k] = opt.empty ? {estado:"vazio", log:[]} : Object.assign(clone(PREFILLED[d.k]), {log:null});
    else days[d.k] = {estado:"futuro", log:[]};
  });
  return {
    engine: "live",
    weeks: opt.noHistory ? [] : clone(BASE_WEEKS), days, today:"qui", viewDay:"qui",
    chat:null, saved:false, newFile:false, report:null, reacoes:{},
    prevStatus: opt.noHistory ? {} : {devolucoes:"nao-avancou", workshop_cliente:"feito", feedback_modelo:"em-parte"}
  };
}
const firstOpenDay = () => ["qui","sex"].find(k => P.dias.includes(k) && S.days[k].estado === "futuro");
function expectedDays(){
  return DAYS.filter(d => { const e = S.days[d.k].estado; return ["feito","hoje","interrompido"].includes(e) || (e === "futuro" && P.dias.includes(d.k)); }).length;
}
function newChat(dk){
  return {dk, phase:"conversa", qs:questionsFor(dk), qi:0, clarifUsed:false, current:null, busy:false, ctl:null,
          liveTurns:[], startedAt:null, endedAt:null, interacoes:0, lastUser:null};
}
function questionsFor(dk){ return ["correu_bem","bloqueio","energia", P.teams ? PLAY_DAY[dk] : "aprendizagem"]; }

/* ───────── Classificação ───────── */
function classify(t, fallback){
  const s = t.toLowerCase();
  if (/reuni|alinhament|ponto de situa|sem agenda/.test(s)) return "reunioes";
  if (/interrup|notifica|chamad|pedidos|teams|slack/.test(s)) return "interrupcoes";
  if (/espera|feedback|aguard|depend|revis[ãa]o d|resposta d/.test(s)) return "espera";
  if (/prazo|sobrecarg|demasiad|urgent|atrasad/.test(s)) return "sobrecarga";
  if (/prioridad|indefin|confus|n[ãa]o sei o que/.test(s)) return "prioridades";
  if (/cansad|energia/.test(s)) return "energia";
  if (/cliente|workshop/.test(s)) return "cliente";
  if (/equipa|colega|manager|chefia/.test(s)) return "equipa";
  if (/tempo|organiz|planea/.test(s)) return "tempo";
  if (/excel|python|sql|tabela|t[ée]cnic|dados|f[óo]rmula/.test(s)) return "tecnica";
  return fallback || null;
}
function learnKey(t){
  const s = t.toLowerCase();
  if (/minto|pir[âa]mide/.test(s)) return "piramide_minto";
  if (/tabela/.test(s)) return "tabelas_dinamicas";
  if (/colega/.test(s) && /test|rev/.test(s)) return "testar_com_colega";
  return s.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9 ]/g,"").split(/\s+/).filter(w=>w.length>3).slice(0,3).join("_") || "outra";
}
function learnTema(t){ const s=t.toLowerCase(); if (/minto|pir[âa]mide|email|escrev|apresent|cliente|workshop|din[âa]mica/.test(s)) return "cliente"; return classify(t,"tecnica"); }

/* ───────── Validação das respostas ───────── */
const HINT = {
  correu_bem:"Escreve numa frase o que correu bem hoje.",
  bloqueio:'Diz o que te bloqueou ou atrasou, ou responde "não" se nada te bloqueou.',
  aprendizagem:"Escreve o que aprendeste ou fizeste de forma diferente.",
  playbook:"Responde numa frase sobre a reunião ou entrega em causa.",
  bem_check:"Escreve numa frase como te tens sentido."
};
function validate(key, raw){
  const s = raw.trim(), low = s.toLowerCase();
  if (key === "energia"){
    if (/^\D*[1-5]\D*$/.test(s) && (s.match(/\d/g)||[]).length === 1) return {ok:true};
    const n = s.match(/-?\d+(?:[.,]\d+)?/);
    if (n) return {ok:false, err:`"${n[0]}" está fora da escala. A energia é um número inteiro de 1 a 5.`};
    return {ok:false, err:`Resposta inválida para a energia: "${s}" não é um número. Responde com um valor de 1 a 5.`};
  }
  const words = low.match(/\p{L}+/gu) || [];
  if (!words.length) return {ok:false, err:(/\d/.test(s) ? "Esperava uma frase, não um número. " : "Resposta inválida. ") + HINT[key]};
  if (key === "bloqueio" && NEG.test(low) && words.length <= 5) return {ok:true, nenhum:true};
  if (words.length === 1 && words[0].length <= 2 && !["ok","sim","no"].includes(words[0])) return {ok:false, err:`Resposta inválida: "${s}" não responde à pergunta. ${HINT[key]}`};
  const joined = words.join("");
  if (/^(\p{L})\1{2,}$/u.test(joined)) return {ok:false, err:`Resposta inválida: parece texto ao acaso. ${HINT[key]}`};
  if (words.every(w => w.length >= 4 && !/[aeiouyáéíóúâêôãõà]/.test(w))) return {ok:false, err:`Resposta inválida: parece texto ao acaso. ${HINT[key]}`};
  return {ok:true};
}
function isVague(key, t){
  const s = t.toLowerCase().trim().replace(/[.!…]+$/,"");
  if (key === "bloqueio") return /^(algumas coisas|v[áa]rias coisas|mais ou menos|o costume|um pouco)$/.test(s);
  if (!["correu_bem","aprendizagem","playbook"].includes(key)) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return true;
  return /^(foi |foi um |um )?(dia )?(normal|ok|tranquilo|igual|o costume|nada de especial|nada|mais ou menos|bem)( como sempre)?$/.test(s) || /^(foi )?um dia normal/.test(s);
}

/* ───────── Textos ───────── */
function qText(dk, key){
  const ev = mainEvent(dk), abertas = P.estilo === "abertas";
  switch(key){
    case "correu_bem":
      if (ev) return `Hoje tiveste ${ev.ref}. O que correu bem no teu dia?` + (abertas ? " Pode ser algo pequeno." : "");
      return `O que correu bem hoje? Podes pensar nas tuas responsabilidades, por exemplo ${lc1(P.resp[0]||"o teu entregável principal")}.`;
    case "bloqueio": return 'Houve alguma coisa que te bloqueou ou atrasou hoje? Se não houve, basta dizer "não".';
    case "energia": return "De 1 a 5, como está a tua energia hoje? E o que mais contribuiu para isso?";
    case "aprendizagem": return dk === "sex" ? "O que aprendeste esta semana, ou fizeste de forma diferente?" : "O que aprendeste hoje, ou fizeste de forma diferente?";
    case "playbook": {
      const e = (AG[dk]||[]).find(x => ["cliente","revisao","entrega"].includes(x.tipo));
      if (!e) return "O que aprendeste hoje, ou fizeste de forma diferente?";
      const st = trStatus(e);
      if (e.tipo === "cliente") return (st && !st.lock) ? "Última pergunta. Na transcrição do workshop, o envio da síntese até terça ficou contigo, mas os outros próximos passos ficaram sem responsável. O que faltou para os fechar no fim?" : "Última pergunta. No fim do workshop, ficaram claros os próximos passos e quem fica com cada um?";
      if (e.tipo === "revisao") return "Última pergunta. Que decisão precisavas de trazer da revisão com o manager? Conseguiste?";
      return "Última pergunta. Alguém reviu a síntese antes de seguir para o cliente? O que mudou com isso?";
    }
    case "bem_check": return "Ontem e hoje a energia ficou em 2 ou menos. Como te tens sentido, para lá do trabalho?";
  }
  return "";
}
function clarifText(dk, key){
  const ev = mainEvent(dk);
  if (key === "correu_bem") return ev ? `Pensa só em ${ev.ref}: houve um momento em que algo correu como querias?` : "Consegues dar-me um momento concreto de hoje que tenha corrido como querias?";
  if (key === "aprendizagem") return "Houve alguma tarefa que fizeste de forma diferente do habitual?";
  if (key === "playbook") return dk === "qui" ? "Pensa só nos últimos minutos do workshop: quem ficou com cada próximo passo?" : dk === "ter" ? "O que levaste para pedir ao manager nessa revisão?" : "Quem viu a síntese antes de seguir para o cliente?";
  if (key === "bloqueio") return "Consegues dizer qual foi a coisa que mais te atrasou hoje?";
  return "Consegues dar-me um exemplo concreto?";
}
function buildLog(dk){
  const r = S.days[dk], L = [];
  const qs = r.aprendizagem ? ["correu_bem","bloqueio","energia","aprendizagem"] : ["correu_bem","bloqueio","energia","playbook"];
  qs.forEach(q => {
    L.push({r:"agent", t:qText(dk, q)});
    const a = q==="energia" ? String(r.energia) + (r.energia_nota ? ". " + r.energia_nota : "") : q==="bloqueio" ? (r.bloqueio.nenhum ? "Não." : r.bloqueio.texto) : (r[q] && r[q].texto);
    if (a) L.push({r:"user", t:a});
  });
  return L;
}

/* ───────── Semana 4 derivada dos dias ───────── */
function doneDays(){ return DAYS.filter(d => S.days[d.k].estado === "feito"); }
function w4Derived(){
  const ds = doneDays().map(d => [d.k, S.days[d.k]]);
  const en = ds.map(([,r]) => r.energia).filter(x => x != null);
  return {
    semana:4, periodo:"2026-10-19 a 2026-10-23",
    energia: en.length ? Math.round(en.reduce((a,b)=>a+b,0)/en.length*10)/10 : null,
    correu_bem: ds.map(([k,r]) => r.correu_bem && Object.assign({dia:k}, r.correu_bem)).filter(Boolean),
    aprendizagens: ds.map(([k,r]) => r.aprendizagem && Object.assign({dia:k}, r.aprendizagem)).filter(Boolean),
    bloqueios: ds.map(([k,r]) => r.bloqueio && !r.bloqueio.nenhum && Object.assign({dia:k}, r.bloqueio)).filter(Boolean),
    prioridades:[]
  };
}
function evalWeeks(){ const l = S.weeks.slice(); if (!S.saved) l.push(w4Derived()); return l.slice(-4); }
function findPatterns(){
  const W = evalWeeks(), out = [], cur = W[W.length-1];
  const byTema = {};
  W.forEach(w => (w.bloqueios||[]).forEach(b => { if (!b.tema) return; (byTema[b.tema] = byTema[b.tema] || []).push({semana:w.semana, texto:b.texto, dia:b.dia}); }));
  const rec = Object.entries(byTema).filter(([,v]) => new Set(v.map(x=>x.semana)).size >= 2 || v.filter(x=>x.semana===cur.semana).length >= 2)
    .sort((a,b)=>b[1].length-a[1].length);
  out.push({id:"bloqueio", nome:"Bloqueio recorrente", regra:"Mesmo tema em 2 das últimas 4 semanas, ou em 2 dias da mesma semana", estado: rec.length ? "on" : "off",
    itens: rec.map(([tema,v]) => ({tema, semanas:[...new Set(v.map(x=>x.semana))], dias:v.filter(x=>x.semana===cur.semana&&x.dia).map(x=>x.dia), citacoes:v}))});
  const byKey = {};
  W.forEach(w => (w.aprendizagens||[]).forEach(a => { if (!a.chave) return; (byKey[a.chave] = byKey[a.chave] || []).push({semana:w.semana, texto:a.texto}); }));
  const cons = Object.entries(byKey).filter(([,v]) => new Set(v.map(x=>x.semana)).size >= 2);
  out.push({id:"aprendizagem", nome:"Aprendizagem consolidada", regra:"Mesma aprendizagem em 2 ou mais semanas", estado: cons.length ? "good" : "off",
    itens: cons.map(([chave,v]) => ({chave, semanas:[...new Set(v.map(x=>x.semana))], citacoes:v}))});
  const arr = [];
  for (let i=1;i<W.length;i++){
    const prev = W[i-1].prioridades||[], c = W[i].prioridades||[];
    c.forEach(p => { const q = prev.find(x => x.id === p.id); if (q && q.estado !== "feito") arr.push({id:p.id, texto:p.texto, semanas:[W[i-1].semana, W[i].semana]}); });
  }
  out.push({id:"arrastada", nome:"Prioridade arrastada", regra:"Prioridade não concluída que volta 2 semanas seguidas", estado: arr.length ? "on" : "off", itens: arr.slice(-1)});
  let est = "wait", det = "", diasBaixos = false;
  const dd = doneDays().map(d => S.days[d.k].energia);
  for (let i=1;i<dd.length;i++) if (dd[i]<=2 && dd[i-1]<=2) diasBaixos = true;
  if (cur.energia != null){
    const e = W.slice(-3).map(w=>w.energia);
    const desce = e.length===3 && e[1]<=e[0] && e[2]<=e[1] && e[2]<e[0];
    est = (desce || diasBaixos) ? "warn" : "off";
    det = "Semanas: " + e.map(num).join(" → ") + (diasBaixos ? " · 2 dias seguidos com 2 ou menos" : "");
  }
  out.push({id:"energia", nome:"Energia em queda", regra:"3 semanas sem subir e a terminar abaixo; ou 2 dias seguidos com 2 ou menos", estado:est, itens: det ? [{det}] : []});
  return out;
}
const activeCount = () => findPatterns().filter(p => !["off","wait"].includes(p.estado)).length;

/* ───────── Render: check-in ───────── */
function dayLabel(r, dk){
  if (r.estado === "futuro" && !P.dias.includes(dk)) return ["sem_checkin","sem check-in"];
  return {feito:["feito","feito"], hoje:["hoje","hoje"], futuro:["futuro","por fazer"], interrompido:["interrompido","interrompido"], vazio:["sem_checkin","apagado"]}[r.estado] || ["futuro","por fazer"];
}
function renderDays(){
  $("#ckTime").textContent = "check-in às " + P.hora;
  $("#days").innerHTML = DAYS.map(d => {
    const r = S.days[d.k], [cls, lab] = dayLabel(r, d.k);
    const line = r.estado === "feito" ? (r.bloqueio && !r.bloqueio.nenhum ? "Bloqueio: " + r.bloqueio.texto : "Sem bloqueios") : r.estado === "hoje" ? "Check-in em curso" : r.estado === "interrompido" ? "Terminado sem gravar" : r.estado === "vazio" ? "Dados apagados" : cls === "sem_checkin" ? "Desligado nas preferências" : "Disponível às " + P.hora;
    return `<button type="button" class="day ${cls}" data-day="${d.k}" aria-pressed="${S.viewDay===d.k}"><span class="dn">${d.Nome} <span class="muted" style="font-weight:400">${d.data}</span></span><span class="row">${r.energia!=null?`<span class="en">⚡${r.energia}</span>`:""}<span class="state ${cls}">${lab}</span></span><span class="dd">${esc(line)}</span></button>`;
  }).join("");
  const w3 = S.weeks.find(w=>w.semana===3);
  $("#prioList").innerHTML = !w3 ? '<li class="muted">Sem prioridades da semana anterior.</li>' : w3.prioridades.map(p => `<li><div>${esc(p.texto)} <span class="muted">${esc(p.prazo)}</span>${p.id==="devolucoes"?'<div class="muted" style="font-size:11.5px">vem da semana 2</div>':""}</div><span class="state">em aberto</span></li>`).join("");
}
function renderContext(){
  const dk = S.viewDay, d = DAYN[dk], L = lvl();
  $("#sources").innerHTML = `
    <div><span>Conversa</span><span class="pill good">sempre</span></div>
    <div><span>Agenda do Teams</span>${P.teams ? `<span class="pill good">importada · ${esc(P.sync)}</span>` : '<span class="pill off">desligada</span>'}</div>
    <div><span>Transcrições</span>${!P.teams ? '<span class="pill off">sem agenda</span>' : P.transcricoes ? '<span class="pill good">permitidas</span>' : `<span class="pill on">${LOCK} bloqueadas</span>`}</div>
    <div><span>Nível de acesso</span><span class="mono">${L}</span></div>`;
  $("#agTitle").innerHTML = `Agenda de ${d.nome} <span class="mono">${P.teams ? "Microsoft Teams · simulada" : "não importada"}</span>`;
  if (!P.teams){
    $("#agenda").innerHTML = `<div class="locked">A agenda não está a ser importada. O agente trabalha só com a conversa e as tuas responsabilidades.<a href="#perfil" class="btn small" style="text-decoration:none">Ligar o Teams no perfil</a></div>`;
  } else {
    const evs = AG[dk] || [];
    let h = '<div class="evs">' + evs.map(e => {
      const st = trStatus(e);
      const tr = st ? (st.lock ? `<div class="tr lock">${LOCK}<span>${esc(st.txt)}</span></div>` : `<div class="tr"><b>Transcrição:</b> ${esc(st.txt)}</div>`) : "";
      return `<div class="ev ${e.tipo}"><span class="h">${e.h}</span><span>${esc(e.t)}<br><span class="x">${[e.d, e.p?e.p+" pessoas":""].filter(Boolean).join(" · ")}${e.semAgenda?' · <span class="flag">sem agenda</span>':""}</span>${tr}</span></div>`;
    }).join("");
    if (P.dias.includes(dk)) h += `<div class="ev checkin"><span class="h">${esc(P.hora)}</span><span>Check-in diário<br><span class="x">2 min · lembrete ${({teams:"no Teams",email:"por email",nenhum:"desligado"})[P.lembrete]}</span></span></div>`;
    $("#agenda").innerHTML = h + "</div>";
  }
  const PT = findPatterns(), lab = {on:"ativo", good:"ativo", warn:"ativo", off:"inativo", wait:"à espera"}, cls = {on:"on", good:"good", warn:"on", off:"off", wait:"wait"};
  $("#rules").innerHTML = PT.map(p => {
    let ev = "";
    if (p.id==="bloqueio") ev = p.itens.map(i => `${esc(TEMAS[i.tema])}: semanas ${i.semanas.join(", ")}${i.dias.length?` · esta semana: ${i.dias.map(x=>DAYN[x].nome).join(", ")}`:""}`).join("<br>");
    if (p.id==="aprendizagem") ev = p.itens.map(i => `${esc(i.citacoes[0].texto)}: semanas ${i.semanas.join(", ")}`).join("<br>");
    if (p.id==="arrastada") ev = p.itens.map(i => `${esc(i.texto)}: semanas ${i.semanas.join(" → ")}`).join("<br>");
    if (p.id==="energia") ev = p.estado==="wait" ? "À espera do primeiro check-in." : esc(p.itens[0]?.det||"");
    return `<div class="rule"><div class="hd"><span class="nm">${p.nome}</span><span class="pill ${cls[p.estado]}">${lab[p.estado]}</span></div><div class="rx">${p.regra}</div>${ev?`<div class="ev2">${ev}</div>`:""}</div>`;
  }).join("");
  $("#respCtx").innerHTML = P.resp.map(r => `<li>${esc(r)}</li>`).join("") || '<li class="muted">Sem responsabilidades definidas.</li>';
}

/* ───────── Chat ───────── */
const log = $("#log");
function scrollDown(){ log.scrollTop = log.scrollHeight; }
function el(tag, cls, text){ const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function drawEntry(x){
  if (x.r === "agent" || x.r === "user"){
    const row = el("div", "msg " + x.r + (x.live?" live":"") + (x.err?" err":""));
    row.append(el("div","who", x.r==="agent" ? "Agente" : (P.nome || "Pessoa")));
    const b = el("div","bubble");
    if (x.t == null) b.innerHTML = '<span class="thinking" aria-label="A escrever"><i></i><i></i><i></i></span>'; else b.textContent = x.t;
    row.append(b);
    if (x.err) row.append(el("div","errline", x.err));
    x.node = b; log.appendChild(row); return row;
  }
  if (x.r === "note"){ const r = el("div","note", x.t); log.appendChild(r); return r; }
  if (x.r === "care"){ const r = careCard(x); log.appendChild(r); return r; }
  if (x.r === "action"){ const r = actionRow(x); log.appendChild(r); return r; }
}
function push(x){ const c = S.days[S.chat.dk]; c.log.push(x); if (S.viewDay === S.chat.dk) { drawEntry(x); scrollDown(); } return x; }
function renderChat(){
  log.innerHTML = "";
  const dk = S.viewDay, r = S.days[dk], d = DAYN[dk];
  $("#chatTitle").textContent = `Check-in de ${d.nome}, ${d.data}`;
  if (r.estado === "feito" && !r.log) r.log = buildLog(dk);
  if (r.estado === "feito" && dk !== (S.chat && S.chat.dk)){
    const ro = el("div","readonly"); ro.innerHTML = `<span>Registado · ${esc(r.dur||"")} · só leitura</span>`;
    log.appendChild(ro);
  }
  if (r.estado === "futuro"){
    const ro = el("div","readonly");
    const emCurso = S.chat && S.days[S.chat.dk].estado === "hoje";
    ro.textContent = !P.dias.includes(dk) ? `Não há check-in à ${d.nome}: o dia está desligado nas preferências do perfil.` : emCurso ? `O check-in de ${d.nome} abre às ${P.hora}. Termina primeiro o de ${DAYN[S.chat.dk].nome}.` : `O check-in de ${d.nome} abre às ${P.hora}.`;
    log.appendChild(ro);
  }
  if (r.estado === "vazio"){ const ro = el("div","readonly"); ro.textContent = `Os dados de ${d.nome} foram apagados.`; log.appendChild(ro); }
  if (!S.chat && !firstOpenDay()){ const ro = el("div","readonly"); ro.textContent = "Não há mais check-ins esta semana com as tuas preferências. O relatório semanal está disponível."; log.appendChild(ro); }
  (r.log||[]).forEach(drawEntry);
  scrollDown();
  renderComposer();
  renderChatHead();
}
function renderChatHead(){
  const c = S.chat, dk = S.viewDay, r = S.days[dk];
  let sub = "", dots = "";
  if (c && c.dk === dk && r.estado === "hoje"){
    sub = `Pergunta ${Math.min(c.qi+1, c.qs.length)} de ${c.qs.length}${c.current && c.current.clarif ? " · clarificação" : ""}`;
    dots = c.qs.map((q,i) => `<i class="${i<c.qi?"d":i===c.qi?"a":""}"></i>`).join("");
  } else if (r.estado === "feito") { sub = "4 perguntas respondidas"; dots = "<i class='d'></i>".repeat(4); }
  else sub = r.estado === "interrompido" ? "Terminado sem gravar" : "Ainda não começou";
  $("#chatSub").textContent = sub; $("#dots").innerHTML = dots;
  tick();
}
function tick(){
  const c = S.chat, k = $("#clock");
  if (c && c.dk === S.viewDay){
    const ms = c.startedAt ? ((c.endedAt||Date.now()) - c.startedAt) : 0;
    const s = Math.floor(ms/1000);
    k.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")} / 2:00`;
    k.classList.toggle("over", ms > 120000); k.hidden = false;
  } else if (S.days[S.viewDay].dur){ k.textContent = S.days[S.viewDay].dur + " / 2:00"; k.classList.remove("over"); k.hidden = false; }
  else k.hidden = true;
}
setInterval(() => { if (S && S.chat && S.chat.startedAt && !S.chat.endedAt && S.viewDay === S.chat.dk) tick(); }, 1000);
function setErr(t){ $("#cerr").textContent = t || ""; $("#msg").setAttribute("aria-invalid", t ? "true" : "false"); }

function canType(){
  const c = S.chat;
  return !!(c && c.current && c.dk === S.viewDay && S.days[c.dk].estado === "hoje" && c.phase === "conversa" && !c.busy);
}
function chipsFor(){
  if (!canType()) return [];
  const k = S.chat.current.key, dk = S.chat.dk, clar = S.chat.current.clarif;
  const T = (t,cls) => ({t, cls:cls||""});
  if (k === "correu_bem"){
    if (clar) return [T(dk==="qui" ? "Quando o cliente validou 4 dos 6 processos ao vivo." : "Fechei a síntese a tempo e sem pressas.")];
    return dk==="qui" ? [T("O workshop correu muito bem: validámos 4 dos 6 processos."), T("Normal."), T("d","test")]
                      : [T("A síntese das entrevistas seguiu para o cliente a horas."), T("Normal."), T("d","test")];
  }
  if (k === "bloqueio") return dk==="qui" ? [T("Perdi a manhã com pedidos internos e mais uma reunião sem agenda."), T("Não, hoje não."), T("Estou em baixo há semanas e não vejo saída.","test")]
                                         : [T("Esperei pela revisão do Rui até à última hora."), T("Não."), T("Estou em baixo há semanas e não vejo saída.","test")];
  if (k === "energia") return [T(dk==="qui" ? "3, o workshop correu bem mas foi intenso." : "3, dia calmo.")].concat(["1","2","3","4","5"].map(n => ({t:n, cls:"num"})), [T("d","test"), T("7","test")]);
  if (k === "playbook") return clar ? [T("Só a síntese ficou atribuída; o resto ficou no ar.")]
    : dk==="qui" ? [T("Ficaram os próximos passos, mas não os responsáveis de cada um.")] : dk==="ter" ? [T("Queria a decisão sobre os pressupostos. Não consegui.")] : [T("Sim, uma colega reviu e apanhou dois erros nos números.")];
  if (k === "aprendizagem") return clar ? [T("Desta vez testei as perguntas com um colega antes.")] : [T("Voltei a usar a pirâmide de Minto para estruturar a síntese."), T("Nada de especial.")];
  if (k === "bem_check") return [T("Cansada, mas estou bem.")];
  return [];
}
function renderComposer(){
  const box = $("#chips"), list = chipsFor(), ok = canType(), c = S.chat;
  box.innerHTML = list.length ? '<span class="lbl">Sugestões:</span>' : "";
  list.forEach(o => { const b = el("button", "chip " + o.cls, o.t); b.type = "button"; b.onclick = () => onUser(o.t); box.appendChild(b); });
  const ta = $("#msg"), send = $("#sendBtn");
  ta.disabled = !ok;
  const r = S.days[S.viewDay];
  ta.placeholder = ok ? `Responde como ${P.nome||"a pessoa"}…` : (c && c.phase === "care" && c.dk === S.viewDay) ? "Escolhe uma das opções acima." : r.estado === "feito" ? "Este check-in já está registado." : "Sem pergunta em aberto.";
  if (c && c.busy && c.ctl){ send.textContent = "Parar"; send.classList.add("stop"); send.disabled = false; }
  else { send.textContent = "Enviar"; send.classList.remove("stop"); send.disabled = !ok; }
  if (!ok) setErr("");
}

/* ───────── Motor ───────── */
function rulesPrompt(dk){
  const d = DAYN[dk], L = lvl();
  let ctx = `Nível de acesso: ${L}.\n`;
  if (P.teams){
    ctx += `Agenda de ${d.nome} (importada do Teams):\n` + (AG[dk]||[]).map(e => {
      const st = trStatus(e);
      return `- ${e.h} · ${e.t}${e.d?" · "+e.d:""}${e.p?" · "+e.p+" pessoas":""}${e.semAgenda?" · sem agenda":""}${st ? (st.lock ? " · transcrição BLOQUEADA (não uses nem adivinhes o conteúdo)" : " · transcrição: " + st.txt) : ""}`;
    }).join("\n");
  } else ctx += "Agenda: não importada.";
  const dias = doneDays().map(x => { const r = S.days[x.k]; return `- ${x.Nome}: energia ${r.energia}; correu bem: ${r.correu_bem?.texto||"-"}; bloqueio: ${r.bloqueio?.nenhum?"nenhum":(r.bloqueio?.texto||"-")}.`; }).join("\n");
  const mem = S.weeks.map(w => `Semana ${w.semana}: energia ${w.energia}; bloqueio: ${w.bloqueios.map(x=>x.texto).join("; ")}; aprendizagem: ${w.aprendizagens.map(x=>x.texto).join("; ")}.`).join("\n");
  const pats = findPatterns().filter(p=>!["off","wait"].includes(p.estado)).map(p=>"- "+p.nome).join("\n") || "- nenhum";
  return `És um agente de reflexão diária para consultores. Fazes um check-in de 2 minutos com ${P.nome} (persona fictícia de uma demo) ao fim do dia de ${d.nome}, ${d.data}. Escreves em português europeu.

Regras fixas:
- Tom curioso e concreto. Perguntas abertas. Sugestões como hipótese, nunca "devias ter…".
- Não avalias, não dás nota, não diagnosticas e não reportas à chefia.
- Usas só factos do contexto abaixo ou do que a pessoa disse. Nunca adivinhas o conteúdo de uma reunião com transcrição bloqueada.
- Cada mensagem tua tem no máximo 3 frases curtas e exatamente uma pergunta. Sem markdown, sem listas, sem emojis.
- ${P.estilo==="abertas" ? "A pessoa prefere perguntas mais abertas." : "A pessoa prefere perguntas curtas e diretas."}
- Em cada passo a aplicação diz-te o que transmitir. Segue-a e adapta só a forma.

Perfil: ${P.papel}, na função desde ${P.desde}; projeto: ${P.projeto}; manager: ${P.manager}.
Responsabilidades:
${P.resp.map(r=>"- "+r).join("\n")}

${ctx}

Check-ins anteriores desta semana:
${dias || "- nenhum"}

Memória das semanas anteriores:
${mem}

Padrões ativos (decididos por regras, não por ti):
${pats}`;
}
function directive(content){
  const c = S.chat;
  return (c.lastUser ? `Resposta de ${P.nome}: «${c.lastUser}»\n\n` : "") + `[Aplicação] Escreve a tua próxima mensagem. Transmite isto pelas tuas palavras, ajustado ao que foi dito, sem acrescentar factos: «${content}»`;
}
const HIDE = ["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"];
function liveOn(){ return S.engine === "live" && SAMPLE && !liveDisabled; }
async function agentSay(content){
  const c = S.chat;
  c.busy = true; renderComposer();
  if (liveOn()){
    const x = push({r:"agent", t:null, live:true});
    const ctl = new AbortController(); c.ctl = ctl; renderComposer();
    c.liveTurns.push({role:"user", content: directive(content)});
    try{
      const r = await SAMPLE([{role:"user", content: rulesPrompt(c.dk)}, ...c.liveTurns.slice(-12)], {cache:false, modelTier:"quick", signal:ctl.signal,
        onText:({text}) => { x.t = text; if (x.node) { x.node.textContent = text; scrollDown(); } }});
      x.t = r.text; c.liveTurns.push({role:"assistant", content:r.text});
    }catch(e){
      // Sem resposta do modelo: fica a mensagem de reserva, sem rótulo do modelo nem nota de erro.
      x.t = content; x.live = false;
      if (x.node && x.node.parentNode) x.node.parentNode.classList.remove("live");
      c.liveTurns.push({role:"assistant", content});
      trace("llm_chat", "erro: " + ((e && (e.code || e.message)) || "desconhecido"));
      // Não voltar a tentar nesta sessão (evita esperar o tempo-limite em cada mensagem).
      if (!e || e.code !== "cancelled"){ liveDisabled = true; S.engine = "guiao"; renderEngine(); }
    }
    if (x.node) x.node.textContent = x.t;
    c.ctl = null;
  } else {
    const x = push({r:"agent", t:null});
    await sleep(c.startedAt ? 480 : 0);
    x.t = content; if (x.node) x.node.textContent = content;
    c.liveTurns.push({role:"user", content: directive(content)}, {role:"assistant", content});
  }
  c.lastUser = null; c.busy = false; renderComposer(); renderChatHead(); scrollDown();
}
async function liveClassify(text){
  if (!liveOn()) return classify(text, "tempo");
  try{
    const r = await SAMPLE.json(`Classifica este bloqueio de trabalho num destes temas. Responde só com JSON {"tema":"<chave>"}.\nTemas: ${Object.entries(TEMAS).map(([k,v])=>k+" = "+v).join("; ")}.\nBloqueio: «${text}»`, {modelTier:"quick"});
    return (r && TEMAS[r.tema]) ? r.tema : classify(text, "tempo");
  }catch(e){ trace("llm_classificar", "erro: " + ((e && (e.code || e.message)) || "desconhecido") + " · classificação local"); return classify(text, "tempo"); }
}

/* ───────── Fluxo diário ───────── */
async function startDay(dk){
  const r = S.days[dk];
  r.estado = "hoje"; r.log = [];
  S.today = dk; S.viewDay = dk; S.chat = newChat(dk);
  renderAll(); renderChat();
  const c = S.chat, L = lvl(), evs = P.teams ? (AG[dk]||[]) : [];
  const locked = evs.filter(e => { const s = trStatus(e); return s && s.lock; }).length;
  const open = evs.filter(e => { const s = trStatus(e); return s && !s.lock; }).length;
  trace("get_day_context", P.teams ? `nível ${L} · ${evs.length} evento${evs.length===1?"":"s"} do Teams${open?` · ${open} transcrição disponível`:""}${locked?` · ${locked} bloqueada${locked>1?"s":""}`:""}` : "nível 0 · só a conversa e as responsabilidades");
  trace("get_history", `${doneDays().length} check-ins esta semana · ${S.weeks.length} semanas em memória`);
  c.current = {key:c.qs[0], clarif:false};
  await agentSay(`Olá, ${P.nome}. Check-in de ${DAYN[dk].nome}, 2 minutos. ` + qText(dk, c.qs[0]));
  renderAll();
}
async function onUser(text){
  const c = S.chat;
  if (!canType()) return;
  if (!c.startedAt) c.startedAt = Date.now();
  // O filtro corre antes de validar a resposta (como no backend, antes do LLM): uma frase de
  // mal-estar dita na pergunta da energia também tem de chegar aqui, e não ser rejeitada por "não é um número".
  const alerta = bemEstar(text);
  if (alerta){ setErr(""); c.interacoes++; c.lastUser = text; push({r:"user", t:text}); return careFlow(alerta); }
  const key = c.current.key, v = validate(key, text);
  if (!v.ok){
    push({r:"user", t:text, err:v.err + " Não foi gravada."});
    setErr(v.err);
    return;
  }
  setErr("");
  c.interacoes++; c.lastUser = text;
  push({r:"user", t:text});
  const r = S.days[c.dk];
  if (key === "bem_check"){ advanceQ(); return askCurrent("Obrigado por partilhares. "); }
  if (key === "energia"){
    r.energia = Number(text.match(/[1-5]/)[0]);
    const nota = text.replace(/[1-5]/, "").replace(/^[\s,.;:/–—-]+/, "").trim();
    r.energia_nota = nota ? nota.charAt(0).toUpperCase() + nota.slice(1) : null;
    const prevDay = doneDays().filter(d => d.k !== c.dk).slice(-1)[0];
    const pe = prevDay ? S.days[prevDay.k].energia : null;
    renderAll();
    if (r.energia <= 2 && pe != null && pe <= 2){
      trace("wellbeing_check", "energia em 2 ou menos dois dias seguidos · perguntar com cuidado");
      c.current = {key:"bem_check", clarif:false};
      return agentSay(`Registado: ${r.energia}. ` + qText(c.dk, "bem_check"));
    }
    const pre = pe == null ? `Registado: ${r.energia}. ` : r.energia < pe ? `Registado: ${r.energia}, abaixo de ${prevDay.nome} (${pe}). Fica como observação. ` : r.energia === pe ? `Registado: ${r.energia}, igual a ${prevDay.nome}. ` : `Registado: ${r.energia}, acima de ${prevDay.nome} (${pe}). `;
    advanceQ(); return askCurrent(pre);
  }
  if (isVague(key, text) && !c.clarifUsed){
    c.clarifUsed = true; c.current = {key, clarif:true};
    return agentSay(clarifText(c.dk, key));
  }
  const vague = isVague(key, text);
  let pre = "";
  if (key === "correu_bem") r.correu_bem = {texto:text, tema: vague ? null : classify(text, "cliente"), ...(vague?{sem_detalhe:true}:{})};
  if (key === "aprendizagem"){
    r.aprendizagem = vague ? null : {texto:text, tema:learnTema(text), chave:learnKey(text)};
    if (r.aprendizagem){
      renderAll();
      const cons = findPatterns().find(p=>p.id==="aprendizagem").itens.find(i => i.chave === r.aprendizagem.chave && i.semanas.includes(4) && i.semanas.length >= 2);
      if (cons){ trace("find_patterns", `aprendizagem consolidada · semanas ${cons.semanas.join(", ")}`); pre = `Isto já aparece nas semanas ${cons.semanas.join(", ")}: parece estar a tornar-se um hábito teu. `; }
    }
  }
  if (key === "playbook") r.playbook = {texto:text};
  if (key === "bloqueio"){
    if (v.nenhum){ r.bloqueio = {nenhum:true}; pre = "Ótimo. "; }
    else {
      c.busy = true; renderComposer();
      const tema = vague ? null : await liveClassify(text);
      c.busy = false;
      r.bloqueio = {texto:text, tema, ...(vague?{sem_detalhe:true}:{})};
      renderAll();
      if (tema){
        const outrosDias = doneDays().filter(d => d.k!==c.dk && S.days[d.k].bloqueio && S.days[d.k].bloqueio.tema === tema).map(d => d.nome);
        const semanas = S.weeks.filter(w => w.bloqueios.some(b => b.tema === tema)).map(w => w.semana);
        if (outrosDias.length || semanas.length){
          trace("find_patterns", `bloqueio recorrente · ${TEMAS[tema].toLowerCase()}`);
          const partes = [];
          if (outrosDias.length) partes.push(`esta semana (${outrosDias.join(" e ")})`);
          if (semanas.length) partes.push(`nas semanas ${semanas.join(" e ")}`);
          pre = `Isto já apareceu ${partes.join(" e ")}. Guardo-o para o relatório de sexta, onde proponho um ajuste. `;
        } else trace("find_patterns", `tema: ${TEMAS[tema].toLowerCase()} · sem recorrência`);
      }
    }
  }
  advanceQ();
  if (c.qi >= c.qs.length) return finishDay();
  return askCurrent(pre);
}
function advanceQ(){ const c = S.chat; c.qi++; c.clarifUsed = false; c.current = c.qi < c.qs.length ? {key:c.qs[c.qi], clarif:false} : null; }
async function askCurrent(pre){
  const c = S.chat;
  if (!c.current) return finishDay();
  // O perfil pode mudar a meio: a pergunta sobre a reunião ou entrega só faz sentido com a agenda importada.
  if (!c.current.clarif){
    if (c.current.key === "playbook" && !P.teams) c.current.key = c.qs[c.qi] = "aprendizagem";
    else if (c.current.key === "aprendizagem" && P.teams && PLAY_DAY[c.dk] === "playbook") c.current.key = c.qs[c.qi] = "playbook";
  }
  await agentSay((pre||"") + qText(c.dk, c.current.key));
  renderAll();
}
async function finishDay(){
  const c = S.chat, r = S.days[c.dk];
  c.endedAt = Date.now();
  const s = Math.floor((c.endedAt - (c.startedAt||c.endedAt))/1000); r.dur = `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  trace("wellbeing_check", "sem sinais de alerta");
  r.estado = "feito";
  trace("save_day", `semana 4 · dia ${c.dk}`);
  c.phase = "feito";
  S.report = null;
  const isLast = c.dk === "sex" || !DAYS.some(d => DAYS.indexOf(d) > DAYS.findIndex(x=>x.k===c.dk) && P.dias.includes(d.k));
  const nextDay = DAYS.slice(DAYS.findIndex(x=>x.k===c.dk)+1).find(d => P.dias.includes(d.k));
  await agentSay(isLast ? "Registado. Com isto fecha a semana: o relatório semanal está pronto para rever." : `Registado. O próximo check-in é ${nextDay.nome}, às ${P.hora}.`);
  push({r:"action", kind: nextDay && !isLast ? "next" : "report", dk: nextDay && nextDay.k});
  renderAll();
}
function actionRow(x){
  const r = el("div","row");
  if (x.kind === "next"){
    const b = el("button","btn primary", `Avançar para ${DAYN[x.dk].nome} (simulação)`); b.type = "button";
    b.onclick = () => { b.disabled = true; startDay(x.dk); };
    if (S.days[x.dk].estado !== "futuro") b.disabled = true;
    r.append(b);
  }
  const a = el("a","btn" + (x.kind==="report"?" primary":""), "Abrir o relatório semanal"); a.href = "#semana"; a.style.textDecoration = "none";
  r.append(a);
  return r;
}

/* ───────── Bem-estar ───────── */
// Respostas fixas, adaptadas de agente/SEGURANCA.md ao check-in de 2 minutos. No nível urgente o agente
// pára: não há "Continuar o check-in" (SEGURANCA.md: "Vou parar a reflexão por aqui").
const CARE = {
  apoio: "Obrigado por me dizeres isto. O que descreves pesa muito e merece mais atenção do que um check-in. Deixo as perguntas de lado por hoje. Falar com alguém pode ajudar: uma pessoa de confiança, a tua chefia ou os RH, o teu médico de família, ou a linha SNS 24 (808 24 24 24). Se estiveres em perigo, liga 112.",
  urgente: "Obrigado por me dizeres. O que descreves é sério e não tens de passar por isto sem ajuda. Se estás em perigo agora, liga 112. Também podes ligar para o SNS 24 (808 24 24 24) e pedir aconselhamento psicológico, ou falar já com alguém de confiança. Vou parar o check-in por aqui."
};
async function careFlow(nivel){
  const c = S.chat, texto = CARE[nivel] || CARE.apoio;
  c.phase = "care";
  // a mensagem de mal-estar não fica no registo usado para padrões
  trace("wellbeing_check", `sinais de alerta (${nivel}) · encaminhar para apoio humano`);
  c.busy = true; renderComposer();
  const x = push({r:"agent", t:null}); await sleep(450); x.t = texto; if (x.node) x.node.textContent = texto;
  c.busy = false;
  push({r:"care", nivel});
  renderAll();
}
function careCard(x){
  const c = el("div","care"), urgente = x.nivel === "urgente";
  const lis = ['<li>Alguém de confiança, dentro ou fora do trabalho</li>', '<li>A tua chefia ou os Recursos Humanos</li>', '<li>O teu médico de família</li>',
    '<li>SNS 24: <span class="num">808 24 24 24</span>, com aconselhamento psicológico</li>', '<li>Em perigo: <span class="num">112</span></li>'];
  if (urgente) lis.unshift(lis.pop());
  c.innerHTML = `<h4>Apoio humano</h4>
    <ul>${lis.join("")}</ul>
    <div class="muted" style="font-size:12px">Esta parte da conversa não é usada para padrões nem fica gravada. O agente não faz diagnósticos.</div>
    <div class="row">${urgente ? "" : '<button type="button" class="btn">Continuar o check-in</button>'}<button type="button" class="btn">Terminar por hoje</button></div>`;
  const botoes = c.querySelectorAll("button"), end = botoes[botoes.length - 1], go = urgente ? null : botoes[0];
  const off = () => { if (go) go.disabled = true; end.disabled = true; };
  const done = S.chat && S.chat.phase !== "care";
  if (done || x.used) off();
  if (go) go.onclick = async () => { x.used = true; off(); S.chat.phase = "conversa"; S.chat.lastUser = null; await askCurrent("Combinado, sem pressa. "); };
  end.onclick = async () => {
    x.used = true; off();
    const ch = S.chat, r = S.days[ch.dk];
    ch.phase = "feito"; ch.endedAt = Date.now(); r.estado = "interrompido";
    ["correu_bem","bloqueio","aprendizagem","playbook"].forEach(k => delete r[k]); r.energia = null;
    await agentSay("Fica por aqui. Não gravei nada deste check-in. Cuida de ti.");
    const nextDay = DAYS.slice(DAYS.findIndex(q=>q.k===ch.dk)+1).find(d => P.dias.includes(d.k));
    push({r:"action", kind: nextDay ? "next" : "report", dk: nextDay && nextDay.k});
    renderAll();
  };
  return c;
}

/* ───────── Relatório semanal ───────── */
function concrete(t, prazo){
  if (!(t||"").trim()) return {ok:false, txt:"Por preencher."};
  const w = (t||"").trim().split(/\s+/)[0] || "";
  if (!/(ar|er|ir|or|ôr)$/i.test(w)) return {ok:false, txt:"Começa por um verbo (ex.: enviar, pedir, reservar)."};
  if (!(prazo||"").trim()) return {ok:false, txt:"Falta o prazo."};
  if ((t||"").trim().split(/\s+/).length < 3) return {ok:false, txt:"Diz o que vais entregar."};
  return {ok:true, txt:"Concreta e com prazo"};
}
function topBloqueio(){
  const cnt = {}, w = w4Derived();
  w.bloqueios.forEach(b => { if (b.tema){ cnt[b.tema] = cnt[b.tema] || []; cnt[b.tema].push(b.dia); } });
  const e = Object.entries(cnt).sort((a,b)=>b[1].length-a[1].length)[0];
  return e ? {tema:e[0], dias:e[1]} : null;
}
function scriptedReport(){
  const w = w4Derived(), n = doneDays().length, exp = expectedDays(), lastW = S.weeks.filter(x=>x.semana<4).slice(-1)[0], prevE = lastW ? lastW.energia : null, top = topBloqueio();
  const parts = [];
  if (!n) parts.push("Ainda não há check-ins registados nesta semana.");
  else parts.push(S.days.qui.estado === "feito" ? "Semana centrada na preparação e realização do workshop com o cliente." : "Semana de preparação do workshop com o cliente.");
  if (top) parts.push(`O bloqueio mais frequente foi ${TEMAS[top.tema].toLowerCase()} (${top.dias.map(d=>DAYN[d].nome).join(", ")}).`);
  if (w.energia != null) parts.push(prevE == null ? `Energia média de ${num(w.energia)}.` : `Energia média de ${num(w.energia)}, ${w.energia < prevE ? "abaixo" : w.energia === prevE ? "igual" : "acima"} da semana passada (${num(prevE)}).`);
  if (n && n < exp) parts.push(`Relatório com ${n} de ${exp} check-ins.`);
  const prioridades = P.teams ? [
    {id:"sintese_workshop", texto:"Enviar a síntese do workshop ao cliente", prazo:"até terça"},
    {id:"feedback_modelo", texto:"Pedir ao manager feedback sobre o modelo na reunião de segunda", prazo:"segunda"},
    {id:"relatorio_final", texto:"Reservar 2 manhãs para o relatório final", prazo:"até quinta"}
  ] : [
    {id:"devolucoes_p1", texto:"Documentar a primeira parte dos processos de devolução", prazo:"até quarta"},
    {id:"feedback_modelo", texto:"Pedir ao manager feedback sobre o modelo", prazo:"até segunda"},
    {id:"foco", texto:"Proteger 2 manhãs para o entregável principal", prazo:"até quinta"}
  ];
  return {resumo: parts.join(" "), prioridades, ajuste: HABITOS[top ? top.tema : "tempo"], testar:true, fonte:"guiao"};
}
async function liveReport(btn){
  if (!liveOn()) return;
  if (S.report) delete S.report.liveErr;
  btn.disabled = true; btn.textContent = "O Gemini está a escrever…";
  const dias = doneDays().map(x => { const r = S.days[x.k]; return `${x.Nome}: energia ${r.energia}; correu bem: ${r.correu_bem?.texto||"-"}; bloqueio: ${r.bloqueio?.nenhum?"nenhum":(r.bloqueio?.texto||"-")}; aprendizagem: ${r.aprendizagem?.texto||"-"}; reunião/entrega: ${r.playbook?.texto||"-"}`; }).join("\n");
  const pats = patternLines().map(p => "- " + p.txt).join("\n") || "- nenhum";
  let falhou = true;
  try{
    const r = await SAMPLE.json(`${rulesPrompt("sex")}\n\nCheck-ins da semana 4:\n${dias}\n\nPadrões (já decididos por regras):\n${pats}\n\nEscreve o relatório semanal. Responde só com JSON:\n{"resumo":"3 a 4 frases, impessoal","prioridades":[{"texto":"verbo no infinitivo + entregável","prazo":"ex.: até terça"},{"texto":"…","prazo":"…"},{"texto":"…","prazo":"…"}],"ajuste":"um ajuste pequeno de hábito ou método, para experimentar na próxima semana, numa frase que começa por um verbo no infinitivo"}\nUsa só factos dos check-ins, da agenda e das responsabilidades. Exatamente 3 prioridades.`, {modelTier:"default"});
    if (r && typeof r.resumo === "string" && Array.isArray(r.prioridades) && r.prioridades.length){
      S.report = {resumo:r.resumo, ajuste:String(r.ajuste||"").replace(/^experimenta[:,]?\s*/i,""), testar:true, fonte:"claude",
        prioridades: r.prioridades.slice(0,3).map((p,i)=>({id:"p"+(i+1), texto:String(p.texto||""), prazo:String(p.prazo||"")}))};
      falhou = false;
    } else trace("llm_relatorio", "resposta sem o formato esperado");
  }catch(e){
    trace("llm_relatorio", "erro: " + ((e && (e.code || e.message)) || "desconhecido"));
    if (e && HIDE.includes(e.code)){ liveDisabled = true; S.engine = "guiao"; renderEngine(); }
  }
  if (falhou && S.report) S.report.liveErr = "Não foi possível reescrever o relatório agora. Mantém-se a versão anterior.";
  renderReport();
}
function patternLines(){
  return findPatterns().filter(p => !["off","wait"].includes(p.estado)).map(p => {
    if (p.id==="bloqueio") return p.itens.map(i => ({cls:"", html:`<b>${esc(TEMAS[i.tema])}</b>: ${i.semanas.length>1?`semanas ${i.semanas.join(", ")}`:"esta semana"}${i.dias.length?` (esta semana: ${i.dias.map(d=>DAYN[d].nome).join(", ")})`:""}. <span class="q">“${esc(i.citacoes[0].texto)}”</span>`, txt:`${TEMAS[i.tema]}: semanas ${i.semanas.join(", ")}${i.dias.length?"; dias "+i.dias.join(", "):""}`}));
    if (p.id==="aprendizagem") return p.itens.map(i => ({cls:"cons", html:`Aprendizagem consolidada: <b>${esc(i.citacoes[i.citacoes.length-1].texto)}</b> (semanas ${i.semanas.join(", ")}).`, txt:`Aprendizagem consolidada: ${i.citacoes[0].texto}`}));
    if (p.id==="arrastada") return p.itens.map(i => ({cls:"", html:`<b>${esc(i.texto)}</b> passou da semana ${i.semanas[0]} para a ${i.semanas[1]} sem fechar. Ainda faz sentido, ou divide-se?`, txt:`Prioridade arrastada: ${i.texto}`}));
    if (p.id==="energia") return [{cls:"ener", html:`${esc(p.itens[0].det)}. Fica como observação.`, txt:`Energia: ${p.itens[0].det}`}];
    return [];
  }).flat();
}
const ESTADOS = {"feito":"feito", "em-parte":"em parte", "nao-avancou":"não avançou", "sem-info":"sem info"};
const ICON = {
  rec:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.6 6.2A5 5 0 0 0 3.7 4.6"/><path d="M3.4 9.8a5 5 0 0 0 8.9 1.6"/><path d="M3.5 2.2v2.6h2.6"/><path d="M12.5 13.8v-2.6H9.9"/></svg>',
  cons:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14V8"/><path d="M8 8c0-2.8 2.1-4.6 5-4.6 0 2.8-2.1 4.6-5 4.6z"/><path d="M8 10c0-2.2-1.7-3.6-4-3.6 0 2.2 1.7 3.6 4 3.6z"/></svg>',
  trans:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8h10"/><path d="M9 4.5 12.5 8 9 11.5"/></svg>',
  ener:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 1.8 4 9h4l-1 5.2L12 7H8l1-5.2z"/></svg>'
};
const TIPO_LAB = {rec:"Bloqueio recorrente", cons:"Aprendizagem a consolidar", trans:"Prioridade que transita", ener:"Energia"};
const HABITO_NOME = {piramide_minto:"A pirâmide de Minto", tabelas_dinamicas:"As tabelas dinâmicas", testar_com_colega:"Testar o trabalho com um colega antes"};
const lista = a => a.length <= 1 ? (a[0] || "") : a.slice(0,-1).join(", ") + " e " + a[a.length-1];

/* O feedback sai das regras de padrões, com as palavras da própria pessoa como prova. */
function feedbackItems(){
  const out = [];
  findPatterns().forEach(p => {
    if (["off","wait"].includes(p.estado)) return;
    if (p.id === "bloqueio") p.itens.forEach(i => {
      const nesta = i.dias.map(d => DAYN[d].nome), antes = i.semanas.filter(s => s !== 4);
      const q = i.citacoes.filter(c => c.semana === 4).slice(-1)[0] || i.citacoes[i.citacoes.length-1];
      out.push({id:"rec_"+i.tema, tipo:"rec", titulo:`«${TEMAS[i.tema]}» voltou a travar-te`,
        evid:[nesta.length ? `Esta semana: ${lista(nesta)}.` : "", antes.length ? `Também ${antes.length>1?"nas semanas":"na semana"} ${lista(antes.map(String))}.` : ""].filter(Boolean).join(" "),
        quote: q && q.texto});
    });
    if (p.id === "aprendizagem") p.itens.forEach(i => {
      const last = i.citacoes[i.citacoes.length-1];
      out.push({id:"cons_"+i.chave, tipo:"cons", titulo:`${HABITO_NOME[i.chave] || "Uma aprendizagem tua"} está a tornar-se um hábito`,
        evid:`Aparece nas semanas ${lista(i.semanas.map(String))}. É algo que já resulta contigo.`, quote:last && last.texto});
    });
    if (p.id === "arrastada") p.itens.forEach(i => {
      const st = S.prevStatus[i.id];
      out.push({id:"trans_"+i.id, tipo:"trans", titulo:`«${i.texto}» passou da semana ${i.semanas[0]} para a ${i.semanas[1]}`,
        evid: st === "feito" ? "Esta semana marcaste-a como feita: fica fechada." : "Ainda faz sentido assim, ou divide-se em partes mais pequenas?"});
    });
    if (p.id === "energia" && p.itens[0]){
      const low = doneDays().map(d => [d, S.days[d.k]]).filter(([,r]) => r.energia != null && r.energia <= 2 && r.energia_nota).slice(-1)[0];
      out.push({id:"ener", tipo:"ener", titulo: /dias seguidos/.test(p.itens[0].det) ? "A energia ficou em 2 ou menos dois dias seguidos" : "A energia tem vindo a descer",
        evid:`${p.itens[0].det.replace("Semanas:", "Média por semana:")}. Fica como observação, não é um diagnóstico.`, quote: low ? `${low[1].energia_nota} (${low[0].nome})` : null});
    }
  });
  return out.slice(0, 4);
}
function spark(){
  const X = i => 6 + i*30, Y = v => 30 - (v-1)*6.5;
  const pts = DAYS.map((d,i) => ({i, e:S.days[d.k].energia, d}));
  const known = pts.filter(p => p.e != null && S.days[p.d.k].estado === "feito");
  let s = `<svg class="spark" viewBox="0 0 132 34" width="132" height="34" role="img" aria-label="Energia por dia: ${pts.map(p => p.d.nome + " " + (p.e ?? "sem registo")).join(", ")}"><line class="gl" x1="0" x2="132" y1="${Y(3)}" y2="${Y(3)}"/>`;
  if (known.length > 1) s += `<polyline class="ln" points="${known.map(p => X(p.i)+","+Y(p.e)).join(" ")}"/>`;
  known.forEach(p => s += `<circle class="pt" cx="${X(p.i)}" cy="${Y(p.e)}" r="2.6"/>`);
  return s + "</svg>";
}
function obHtml(o, dis){
  const r = S.reacoes[o.id] || {};
  return `<li class="ob ${o.tipo}" data-id="${esc(o.id)}"><span class="ic" title="${TIPO_LAB[o.tipo]}">${ICON[o.tipo]}</span>
    <h4><span class="sr">${TIPO_LAB[o.tipo]}: </span>${esc(o.titulo)}</h4>
    <div class="evd">${esc(o.evid)}${o.quote ? ` <q>${esc(o.quote)}</q>` : ""}</div>
    <div class="react"><span>Faz sentido para ti?</span><button type="button" data-v="sim" aria-pressed="${r.v==="sim"}"${dis}>Faz sentido</button><button type="button" data-v="nao" aria-pressed="${r.v==="nao"}"${dis}>Não bate certo</button>${r.v==="nao" ? `<input type="text" data-nota placeholder="O que falta? (opcional)" aria-label="O que falta nesta observação" value="${esc(r.nota||"")}"${dis}>` : ""}</div></li>`;
}
function saidList(items){
  return items.length ? items.map(x => `<li><span class="d">${x.dia}</span>${esc(x.texto)}</li>`).join("") : '<li class="none">Nada registado.</li>';
}
function renderReport(){
  if (!S.report) S.report = scriptedReport();
  const R = S.report, n = doneDays().length, exp = expectedDays(), w = w4Derived(), saved = S.saved, dis = saved ? " disabled" : "";
  const fb = feedbackItems();
  const w3 = S.weeks.find(x => x.semana === 3), prev = w3 ? w3.prioridades : [];
  const reflex = doneDays().filter(d => S.days[d.k].playbook).map(d => ({dia:d.k, texto:S.days[d.k].playbook.texto}));
  const banner = saved ? '<div class="banner ok">Semana guardada. Fica no histórico, mais abaixo.</div>'
    : R.liveErr ? `<div class="banner err" role="alert">${esc(R.liveErr)}</div>`
    : R.stale ? '<div class="banner"><span>O perfil mudou depois de editares este relatório.</span><button type="button" class="btn small" id="rStale">Atualizar e perder as edições</button></div>'
    : (n < exp) ? `<div class="banner"><span>${n} de ${exp} check-ins feitos. O relatório atualiza quando registares os restantes.</span></div>` : "";
  const box = $("#reportBox");
  box.innerHTML = `
  <header class="rhead"><div><div class="eyebrow">Relatório semanal · semana 4</div><h2>19 a 23 de outubro</h2>
    <div class="s">${esc(P.nome)} · ${R.fonte==="claude" ? "escrito pelo Gemini a partir dos check-ins" : "gerado a partir dos check-ins diários"} · ${P.relatorio==="segunda" ? "chega na segunda de manhã" : "chega na sexta, depois do check-in"}</div></div>
    <div class="row">${liveOn() && !saved ? '<button type="button" class="btn" id="rLive">Reescrever com o Gemini</button>' : ""}${saved ? "" : `<button type="button" class="btn" id="rRegen">${R.confirmRegen ? "Confirmar: perder as edições" : "Gerar de novo"}</button>`}</div></header>
  ${banner}
  <section class="fb" aria-label="Feedback da semana">
    <div class="fb-top"><div class="row" style="justify-content:space-between"><span class="eyebrow">Feedback da semana</span>${saved ? "" : `<button type="button" class="linkbtn" id="rEditResumo">${R.editResumo ? "Concluir" : "Editar resumo"}</button>`}</div>
      ${R.editResumo && !saved ? `<textarea id="rResumo" rows="3" aria-label="Resumo da semana">${esc(R.resumo)}</textarea>` : `<p>${esc(R.resumo)}</p>`}</div>
    ${fb.length ? `<ul class="obs">${fb.map(o => obHtml(o, dis)).join("")}</ul>` : '<div class="ob-empty">Sem padrões face às semanas anteriores. Isso também é informação.</div>'}
    <div class="exp"><div class="row" style="justify-content:space-between"><span class="eyebrow">Para experimentar na próxima semana</span>${saved ? "" : `<button type="button" class="linkbtn" id="rEditAjuste">${R.editAjuste ? "Concluir" : "Editar"}</button>`}</div>
      ${R.editAjuste && !saved ? `<textarea id="rAjuste" rows="2" aria-label="Ajuste a experimentar">${esc(R.ajuste)}</textarea>` : `<div class="txt">${esc(lc1(R.ajuste))}</div>`}
      <label class="check"><input type="checkbox" id="rTestar"${R.testar ? " checked" : ""}${dis}> Quero testar isto</label></div>
  </section>
  <div class="stats">
    <div class="stat"><b>${n}/${exp}</b><span>check-ins feitos</span></div>
    <div class="stat"><b>${w.energia != null ? num(w.energia) : "–"}</b><span>energia média, de 1 a 5</span>${n ? spark() : ""}</div>
    <div class="stat"><b>${w.bloqueios.length}</b><span>bloqueios registados</span></div>
    <div class="stat"><b>${fb.length}</b><span>padrões assinalados</span></div>
  </div>
  <section class="rcard"><header><h3>O que disseste esta semana</h3><span class="hint">só o que escreveste nos check-ins</span></header>
    <div class="said">
      <div><div class="eyebrow">Correu bem</div><ul>${saidList(w.correu_bem)}</ul></div>
      <div><div class="eyebrow">Aprendeste</div><ul>${saidList(w.aprendizagens.concat(reflex))}</ul></div>
      <div><div class="eyebrow">Bloqueou</div><ul>${saidList(w.bloqueios)}</ul></div>
    </div>
    <details class="more"><summary>Ver dia a dia</summary><div class="tablewrap"><table class="days-t"><thead><tr><th>Dia</th><th>Energia</th><th>Porquê</th><th>Bloqueio</th></tr></thead><tbody>${
      DAYS.map(d => { const r = S.days[d.k], f = r.estado === "feito";
        const sem = `<span class="muted">${r.estado==="interrompido" ? "terminado sem gravar" : r.estado==="vazio" ? "apagado" : "sem registo"}</span>`;
        return `<tr><td>${d.Nome}</td><td class="n">${f && r.energia != null ? r.energia : "–"}</td><td>${f ? esc(r.energia_nota || "–") : sem}</td><td>${f && r.bloqueio ? (r.bloqueio.nenhum ? '<span class="muted">nenhum</span>' : esc(r.bloqueio.texto)) : '<span class="muted">–</span>'}</td></tr>`; }).join("")
    }</tbody></table></div></details>
  </section>
  ${prev.length ? `<section class="rcard"><header><h3>Prioridades da semana passada</h3><span class="hint">marca como ficaram; não é uma nota</span></header><div>${
    prev.map(p => { const v = (saved ? p.estado : S.prevStatus[p.id]) || "sem-info";
      return `<div class="statrow" data-id="${p.id}"><span>${esc(p.texto)} <span class="muted">${esc(p.prazo)}</span></span><span class="mini" role="group" aria-label="Como ficou: ${esc(p.texto)}">${Object.entries(ESTADOS).map(([k,l]) => `<button type="button" data-v="${k}" aria-pressed="${k===v}"${dis}>${l}</button>`).join("")}</span></div>`; }).join("")
  }</div></section>` : ""}
  <section class="rcard"><header><h3>3 prioridades para a semana 5</h3><span class="hint">uma ação concreta e até quando</span></header>
    ${R.prioridades.map((p,i) => { const c = concrete(p.texto, p.prazo); return `<div class="prow" data-i="${i}"><span class="k">${i+1}</span><input type="text" id="rP${i}" aria-label="Prioridade ${i+1}" placeholder="Ex.: Enviar a síntese ao cliente" value="${esc(p.texto)}"${dis}><input type="text" class="prazo" id="rPz${i}" aria-label="Prazo da prioridade ${i+1}" placeholder="Ex.: até terça" value="${esc(p.prazo)}"${dis}><span class="chk ${c.ok?"ok":""}">${c.ok ? "✓ " : ""}${c.txt}</span></div>`; }).join("")}
    <div class="saverow"><button type="button" class="btn primary" id="rApprove"${dis}>${saved ? "Semana guardada" : "Guardar semana"}</button>${saved ? "" : '<span class="muted" style="font-size:12px">Guarda o resumo, o feedback e as prioridades.</span>'}</div>
    <div class="ferr" id="eReport" role="alert"></div>
  </section>`;

  const edited = () => { R.edited = true; R.confirmRegen = false; };
  box.querySelectorAll(".prow").forEach(row => row.addEventListener("input", () => {
    const i = row.dataset.i, c = concrete($("#rP"+i).value, $("#rPz"+i).value), k = row.querySelector(".chk");
    k.className = "chk " + (c.ok ? "ok" : ""); k.textContent = (c.ok ? "✓ " : "") + c.txt;
    R.prioridades[i].texto = $("#rP"+i).value; R.prioridades[i].prazo = $("#rPz"+i).value; edited();
  }));
  box.querySelectorAll(".statrow").forEach(r => r.addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b || b.disabled) return;
    S.prevStatus[r.dataset.id] = b.dataset.v; renderReport();
  }));
  box.querySelectorAll(".ob").forEach(li => {
    li.addEventListener("click", ev => {
      const b = ev.target.closest("button[data-v]"); if (!b || b.disabled) return;
      const cur = S.reacoes[li.dataset.id] || {};
      S.reacoes[li.dataset.id] = cur.v === b.dataset.v ? {} : {v:b.dataset.v, nota:cur.nota || ""};
      renderReport();
      if (S.reacoes[li.dataset.id].v === "nao"){ const inp = $(`.ob[data-id="${li.dataset.id}"] input[data-nota]`); if (inp) inp.focus(); }
    });
    li.addEventListener("input", ev => { if (ev.target.matches("[data-nota]")) S.reacoes[li.dataset.id].nota = ev.target.value; });
  });
  const rs = $("#rResumo"); if (rs) rs.addEventListener("input", () => { R.resumo = rs.value; edited(); });
  const ra = $("#rAjuste"); if (ra) ra.addEventListener("input", () => { R.ajuste = ra.value; edited(); });
  const rt = $("#rTestar"); if (rt) rt.addEventListener("change", () => R.testar = rt.checked);
  const er = $("#rEditResumo"); if (er) er.onclick = () => { R.editResumo = !R.editResumo; renderReport(); if (R.editResumo) $("#rResumo").focus(); };
  const ea = $("#rEditAjuste"); if (ea) ea.onclick = () => { R.editAjuste = !R.editAjuste; renderReport(); if (R.editAjuste) $("#rAjuste").focus(); };
  const rg = $("#rRegen"); if (rg) rg.onclick = () => {
    if (R.edited && !R.confirmRegen){ R.confirmRegen = true; renderReport(); $("#rRegen").focus(); return; }
    S.report = null; renderReport();
  };
  const st = $("#rStale"); if (st) st.onclick = () => { S.report = null; renderReport(); };
  const rl = $("#rLive"); if (rl) rl.onclick = () => liveReport(rl);
  $("#rApprove").onclick = approve;
  renderHistory();
}
function approve(){
  if (S.saved) return;
  const R = S.report;
  const prios = [0,1,2].map(i => ({id:R.prioridades[i].id, texto:$("#rP"+i).value.trim(), prazo:$("#rPz"+i).value.trim(), estado:null})).filter(p => p.texto);
  if (!prios.length){ $("#eReport").textContent = "Define pelo menos uma prioridade antes de gravar."; return; }
  if (!doneDays().length){ $("#eReport").textContent = "Ainda não há check-ins registados nesta semana."; return; }
  const w3 = S.weeks.find(w => w.semana === 3);
  if (w3) w3.prioridades.forEach(p => p.estado = S.prevStatus[p.id] || "sem-info");
  const w = w4Derived();
  const w4 = {
    semana:4, periodo:w.periodo, utilizador:"marta",
    resumo:R.resumo.trim(), check_ins:`${doneDays().length} de ${expectedDays()}`,
    dias: doneDays().map(d => { const r = S.days[d.k]; return {dia:d.k, energia:r.energia, energia_nota:r.energia_nota||null, correu_bem:r.correu_bem?r.correu_bem.texto:null, bloqueio:r.bloqueio?(r.bloqueio.nenhum?"nenhum":r.bloqueio.texto):null, tema_bloqueio:r.bloqueio&&r.bloqueio.tema||null}; }),
    correu_bem:w.correu_bem.map(x=>({texto:x.texto, tema:x.tema||null, dia:x.dia})),
    aprendizagens:w.aprendizagens.map(x=>({texto:x.texto, tema:x.tema, chave:x.chave, dia:x.dia})),
    bloqueios:w.bloqueios.map(x=>({texto:x.texto, tema:x.tema||null, dia:x.dia})),
    feedback: feedbackItems().map(o => { const r = S.reacoes[o.id] || {}; return {tipo:TIPO_LAB[o.tipo], observacao:o.titulo, reacao: r.v==="sim" ? "faz sentido" : r.v==="nao" ? "não bate certo" : null, nota:r.nota||null}; }),
    prioridades: prios,
    ajuste_habito:{sugestao:R.ajuste.trim(), testar:R.testar},
    energia:w.energia
  };
  S.weeks.push(w4); S.saved = true; S.newFile = true;
  trace("save_week", `semana 4 · ${prios.length} prioridades · ${w4.check_ins} check-ins`);
  renderAll(); renderReport();
}

/* ───────── Histórico ───────── */
function renderHistory(){
  const pts = S.weeks.map(w => ({s:w.semana, e:w.energia}));
  if (!S.saved){ const w = w4Derived(); pts.push({s:4, e:w.energia, parcial:true}); }
  const X = i => 30 + i*62, Y = v => 76 - (v-1)*15;
  let svg = `<svg viewBox="0 0 240 96" width="240" height="96" role="img" aria-label="Energia média por semana: ${pts.map(p => "semana " + p.s + ": " + (p.e == null ? "sem dados" : num(p.e))).join(", ")}">`;
  [1,3,5].forEach(v => svg += `<line class="gl" x1="18" x2="236" y1="${Y(v)}" y2="${Y(v)}"/><text class="tx" x="8" y="${Y(v)+3.5}" text-anchor="middle">${v}</text>`);
  pts.forEach((p,i) => svg += `<text class="tx" x="${X(i)}" y="93" text-anchor="middle">S${p.s}${p.parcial ? "*" : ""}</text>`);
  const known = pts.filter(p => p.e != null);
  if (known.length > 1) svg += `<polyline class="ln" points="${known.map(p => X(pts.indexOf(p))+","+Y(p.e)).join(" ")}"/>`;
  known.forEach((p,j) => { const i = pts.indexOf(p), last = j === known.length-1; svg += `<circle class="pt${last ? " last" : ""}" cx="${X(i)}" cy="${Y(p.e)}" r="${last ? 4 : 3.2}"/><text class="vl" x="${X(i)}" y="${Y(p.e)-8}" text-anchor="middle">${num(p.e)}</text>`; });
  $("#weekChart").innerHTML = svg + "</svg>" + (S.saved ? "" : '<div class="foot">* semana 4 em curso: média dos check-ins feitos.</div>');
  const W = evalWeeks(), cnt = {};
  W.forEach(w => new Set([...(w.bloqueios||[]), ...(w.aprendizagens||[]), ...(w.correu_bem||[])].map(x => x.tema).filter(Boolean)).forEach(t => cnt[t] = (cnt[t]||0) + 1));
  $("#themes").innerHTML = Object.entries(cnt).sort((a,b) => b[1]-a[1]).slice(0,4).map(([t,c]) => `<div class="trow"><span>${esc(TEMAS[t])}</span><span class="bar"><i style="width:${c/4*100}%"></i></span><span class="ct">${c}</span></div>`).join("") || '<div class="muted">Sem temas.</div>';
  $("#files").innerHTML = S.weeks.map(w => `<button type="button" class="file${w.semana===4 && S.newFile ? " new" : ""}" data-week="${w.semana}"><span>Semana ${w.semana}</span><span>${w.semana===4 && S.newFile ? "guardada agora" : esc(periodoCurto(w.periodo))}</span></button>`).join("") || '<div class="muted">Ainda não há semanas guardadas.</div>';
}

/* ───────── YAML ───────── */
function yq(v){ return v===null||v===undefined ? "null" : typeof v==="string" ? JSON.stringify(v) : String(v); }
function toYaml(o, ind){
  ind = ind || 0; const p = " ".repeat(ind); let s = "";
  for (const [k,v] of Object.entries(o)){
    if (Array.isArray(v)){
      if (!v.length){ s += `${p}${k}: []\n`; continue; }
      s += `${p}${k}:\n`;
      v.forEach(item => {
        if (item && typeof item === "object") Object.entries(item).forEach(([kk,vv],j) => s += `${p}  ${j===0?"- ":"  "}${kk}: ${yq(vv)}\n`);
        else s += `${p}  - ${yq(item)}\n`;
      });
    } else if (v && typeof v === "object") s += `${p}${k}:\n` + toYaml(v, ind+2);
    else s += `${p}${k}: ${yq(v)}\n`;
  }
  return s;
}
function yamlHtml(y){
  return esc(y).split("\n").map(l => l.replace(/^(\s*-?\s*)([a-z_0-9]+)(:)/, '$1<span class="k">$2</span>$3').replace(/(&quot;.*&quot;)$/, '<span class="s">$1</span>').replace(/: (-?[\d.]+|true|false|null)$/, ': <span class="n">$1</span>')).join("\n");
}
let currentCopy = "";
function openDialog(title, html, copyText, foot){
  currentCopy = copyText;
  $("#fileName").textContent = title;
  $("#fileBody").innerHTML = html;
  $("#fileFoot").textContent = foot || "";
  $("#fileFoot").hidden = !foot;
  $("#copyBtn").textContent = "Copiar";
  const d = $("#fileDlg"); if (d.showModal) d.showModal(); else d.setAttribute("open","");
}
function openYaml(title, obj, foot){
  const y = toYaml(obj);
  openDialog(title, `<pre>${yamlHtml(y)}</pre>`, y, foot);
}

/* ───────── Ver uma semana guardada ───────── */
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function periodoCurto(p){
  const m = String(p||"").match(/(\d{4})-(\d{2})-(\d{2}) a (\d{4})-(\d{2})-(\d{2})/);
  if (!m) return p || "";
  return `${+m[3]}${m[2]===m[5] ? "" : " " + MESES[+m[2]-1]} a ${+m[6]} ${MESES[+m[5]-1]}`;
}
const nomeDia = k => DAYN[k] ? DAYN[k].nome : k;
const estadoPrio = e => e ? (ESTADOS[e] || e) : "em aberto";
function weekHtml(w){
  const dia = x => x.dia ? ` <span class="muted">· ${esc(nomeDia(x.dia))}</span>` : "";
  const lst = (a, f) => a && a.length ? `<ul>${a.map(f).join("")}</ul>` : '<p class="muted">Nada registado.</p>';
  const sec = (t, body) => `<section><h4>${t}</h4>${body}</section>`;
  const meta = [w.energia != null ? `Energia média: ${num(w.energia)} de 5` : "", w.check_ins ? `${w.check_ins} check-ins` : ""].filter(Boolean).join(" · ");
  let h = (w.resumo ? `<p class="wk-res">${esc(w.resumo)}</p>` : "") + (meta ? `<div class="wk-meta">${meta}</div>` : "");
  h += sec("Correu bem", lst(w.correu_bem, x => `<li>${esc(x.texto)}${dia(x)}</li>`));
  h += sec("Aprendeste", lst(w.aprendizagens, x => `<li>${esc(x.texto)}${dia(x)}</li>`));
  h += sec("Bloqueou", lst(w.bloqueios, x => `<li>${esc(x.texto)}${dia(x)}</li>`));
  if (w.feedback && w.feedback.length) h += sec("Feedback", lst(w.feedback, x => `<li>${esc(x.observacao)}${x.reacao ? ` <span class="muted">· ${esc(x.reacao)}${x.nota ? ": " + esc(x.nota) : ""}</span>` : ""}</li>`));
  h += sec("Prioridades", lst(w.prioridades, p => `<li class="wk-p"><span>${esc(p.texto)} <span class="muted">${esc(p.prazo || "")}</span></span><span class="state">${esc(estadoPrio(p.estado))}</span></li>`));
  const a = w.ajuste_habito;
  if (a && a.sugestao) h += sec("Para experimentar", `<p>${esc(a.sugestao)} <span class="muted">${a.testar ? "· escolhido para testar" : "· não escolhido para testar"}</span></p>`);
  return `<div class="wk">${h}</div>`;
}
function weekText(w){
  const L = [`Semana ${w.semana} · ${periodoCurto(w.periodo)}`];
  const dia = x => x.dia ? ` (${nomeDia(x.dia)})` : "";
  const bloco = (t, a, f) => { L.push("", t); if (a && a.length) a.forEach(x => L.push("- " + f(x))); else L.push("- Nada registado."); };
  if (w.resumo) L.push("", w.resumo);
  if (w.energia != null) L.push("", `Energia média: ${num(w.energia)} de 5` + (w.check_ins ? ` · ${w.check_ins} check-ins` : ""));
  bloco("Correu bem", w.correu_bem, x => x.texto + dia(x));
  bloco("Aprendeste", w.aprendizagens, x => x.texto + dia(x));
  bloco("Bloqueou", w.bloqueios, x => x.texto + dia(x));
  if (w.feedback && w.feedback.length) bloco("Feedback", w.feedback, x => x.observacao + (x.reacao ? ` (${x.reacao}${x.nota ? ": " + x.nota : ""})` : ""));
  bloco("Prioridades", w.prioridades, p => `${p.texto}${p.prazo ? ", " + p.prazo : ""} [${estadoPrio(p.estado)}]`);
  if (w.ajuste_habito && w.ajuste_habito.sugestao) L.push("", "Para experimentar", "- " + w.ajuste_habito.sugestao);
  return L.join("\n");
}
function openFile(n){
  const w = S.weeks.find(x=>x.semana===n); if (!w) return;
  openDialog(`Semana ${w.semana} · ${periodoCurto(w.periodo)}`, weekHtml(w), weekText(w), w.semana === 4 && S.newFile ? "Guardada agora, neste computador." : "Guardada neste computador.");
}
function exportData(){
  return {
    exportado_em: new Date().toLocaleString("pt-PT"),
    perfil:{nome:P.nome, papel:P.papel, desde:P.desde, projeto:P.projeto, manager:P.manager},
    responsabilidades: P.resp.slice(),
    preferencias:{dias:P.dias.join(", "), hora:P.hora, lembrete:P.lembrete, relatorio:P.relatorio, perguntas:P.estilo, agenda_teams:P.teams, transcricoes:P.transcricoes},
    check_ins_semana_4: doneDays().map(d => { const r = S.days[d.k]; return {dia:d.k, energia:r.energia, porque:r.energia_nota||null, correu_bem:r.correu_bem?r.correu_bem.texto:null, bloqueio:r.bloqueio?(r.bloqueio.nenhum?"nenhum":r.bloqueio.texto):null, aprendizagem:r.aprendizagem?r.aprendizagem.texto:null}; }),
    semanas_guardadas: S.weeks.map(w => `Semana ${w.semana} (${periodoCurto(w.periodo)})`)
  };
}
const openExport = () => openYaml("Os meus dados", exportData(), "Cópia de tudo o que esta demo guarda sobre ti. Copia-a antes de apagar, se a quiseres manter.");
$("#closeDlg").onclick = () => { const d = $("#fileDlg"); d.close ? d.close() : d.removeAttribute("open"); };
$("#copyBtn").onclick = () => {
  const fallback = () => { const r = document.createRange(); r.selectNodeContents($("#fileBody")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("#copyBtn").textContent = "Selecionado"; };
  try{ navigator.clipboard.writeText(currentCopy).then(() => $("#copyBtn").textContent = "Copiado", fallback); }catch(e){ fallback(); }
};
$("#files").addEventListener("click", e => { const b = e.target.closest(".file"); if (b) openFile(Number(b.dataset.week)); });

/* ───────── Perfil: render e eventos ───────── */
const FIELDS = [["pNome","nome"],["pPapel","papel"],["pDesde","desde"],["pProjeto","projeto"],["pManager","manager"]];
function renderProfile(){
  FIELDS.forEach(([id,k]) => { const e = $("#"+id); if (document.activeElement !== e) e.value = P[k]; });
  $("#pDias").innerHTML = DAYS.map(d => `<label><input type="checkbox" id="pd_${d.k}" value="${d.k}"${P.dias.includes(d.k)?" checked":""}>${d.Nome}</label>`).join("");
  $("#pHora").value = P.hora; $("#pLembrete").value = P.lembrete; $("#pRelatorio").value = P.relatorio; $("#pEstilo").value = P.estilo;
  $("#pTeams").checked = P.teams; $("#pTr").checked = P.transcricoes; $("#pTr").disabled = !P.teams;
  $("#respList").innerHTML = P.resp.map((r,i) => `<li><span class="i">${i+1}</span><span>${esc(r)}</span><button type="button" data-i="${i}" aria-label="Remover: ${esc(r)}">Remover</button></li>`).join("");
  $("#respCount").textContent = `${P.resp.length} de 8`;
  $("#teamsSt").innerHTML = P.teams ? `<span class="pill good">Ligado</span><span>Última importação: ${esc(P.sync)} · ${Object.values(AG).flat().length} eventos esta semana</span><button type="button" class="btn small" id="syncBtn">Importar agora</button>` : '<span class="pill off">Desligado</span><span>A agenda não é lida. As perguntas usam só a conversa e as responsabilidades.</span>';
  $("#who").textContent = P.nome || "Sem nome";
}
FIELDS.forEach(([id,k]) => $("#"+id).addEventListener("input", e => {
  const v = e.target.value;
  if (k === "nome" || k === "papel"){
    const err = !v.trim() ? "Campo obrigatório." : v.trim().length < 2 ? "Demasiado curto." : "";
    $(k==="nome"?"#eNome":"#ePapel").textContent = err; e.target.setAttribute("aria-invalid", err ? "true" : "false");
    if (err) return;
  }
  P[k] = v.trim(); saveProfile(); $("#who").textContent = P.nome;
}));
$("#pDias").addEventListener("change", () => {
  const sel = DAYS.filter(d => $("#pd_"+d.k).checked).map(d => d.k);
  if (!sel.length){ $("#eDias").textContent = "Escolhe pelo menos um dia."; $("#pd_"+P.dias[0]).checked = true; return; }
  $("#eDias").textContent = ""; P.dias = sel; saveProfile(); renderAll();
});
$("#pHora").addEventListener("change", e => {
  const v = e.target.value;
  if (!/^\d{2}:\d{2}$/.test(v)){ $("#eHora").textContent = "Indica uma hora válida, por exemplo 17:30."; return; }
  const h = Number(v.slice(0,2));
  if (h < 7 || h > 22){ $("#eHora").textContent = "Escolhe uma hora entre as 07:00 e as 22:00."; e.target.setAttribute("aria-invalid","true"); return; }
  $("#eHora").textContent = ""; e.target.setAttribute("aria-invalid","false"); P.hora = v; saveProfile(); renderAll();
});
[["pLembrete","lembrete"],["pRelatorio","relatorio"],["pEstilo","estilo"]].forEach(([id,k]) => $("#"+id).addEventListener("change", e => { P[k] = e.target.value; saveProfile(); renderAll(); }));
$("#pTeams").addEventListener("change", async e => {
  P.teams = e.target.checked;
  if (P.teams){ $("#teamsSt").innerHTML = '<span class="pill wait">A importar do Teams…</span>'; await sleep(650); P.sync = "agora"; }
  saveProfile(); renderAll();
});
$("#pTr").addEventListener("change", e => { P.transcricoes = e.target.checked; saveProfile(); renderAll(); });
$("#teamsSt").addEventListener("click", async e => {
  if (!e.target.closest("#syncBtn")) return;
  $("#teamsSt").innerHTML = '<span class="pill wait">A importar do Teams…</span>'; await sleep(650);
  const d = new Date(); P.sync = `hoje, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; saveProfile(); renderAll();
});
function addResp(){
  const inp = $("#respNew"), v = inp.value.trim(), e = $("#eResp");
  const words = v.match(/\p{L}+/gu) || [];
  if (!v){ e.textContent = "Escreve a responsabilidade antes de adicionar."; return; }
  if (words.length < 2 || words.every(w => w.length < 3)){ e.textContent = `Responsabilidade inválida: "${v}" é demasiado curta. Descreve-a numa frase, por exemplo "Enviar as atas ao cliente".`; return; }
  if (P.resp.length >= 8){ e.textContent = "Máximo de 8 responsabilidades. Remove uma antes de adicionar."; return; }
  if (P.resp.some(r => r.toLowerCase() === v.toLowerCase())){ e.textContent = "Essa responsabilidade já está na lista."; return; }
  e.textContent = ""; P.resp.push(v); inp.value = ""; saveProfile(); renderAll();
}
$("#respAdd").onclick = addResp;
$("#respNew").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); addResp(); } });
$("#respList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const i = Number(b.dataset.i), removed = P.resp[i];
  P.resp.splice(i, 1); saveProfile(); renderAll();
  toast(`Removeste «${removed}».`, () => { P.resp.splice(Math.min(i, P.resp.length), 0, removed); saveProfile(); renderAll(); toast("Responsabilidade reposta.", null, 3); });
});

/* ───────── Apagar dados, com rede de segurança ─────────
   1) escolher o âmbito; 2) ver exatamente o que vai ser apagado; 3) poder ver uma cópia;
   4) escrever APAGAR; 5) 10 segundos para desfazer. */
let toastTimer = null, toastUndoFn = null;
function toast(txt, undo, secs){
  secs = secs || 10; clearInterval(toastTimer); toastUndoFn = undo || null;
  let left = secs; const t = $("#toast");
  const upd = () => $("#toastTxt").textContent = undo ? `${txt} Podes desfazer durante ${left} s.` : txt;
  upd(); $("#toastUndo").hidden = !undo; t.hidden = false;
  toastTimer = setInterval(() => { left--; if (left <= 0){ clearInterval(toastTimer); t.hidden = true; toastUndoFn = null; } else if (undo) upd(); }, 1000);
}
$("#toastUndo").onclick = () => { const u = toastUndoFn; clearInterval(toastTimer); $("#toast").hidden = true; toastUndoFn = null; if (u) u(); };
function snapshot(){ let stored = null; try{ stored = localStorage.getItem(PKEY); }catch(e){} return {S, P:clone(P), stored}; }
function restore(snap){
  if (S && S.chat && S.chat.ctl) S.chat.ctl.abort();
  S = snap.S; P = snap.P;
  try{ if (snap.stored == null) localStorage.removeItem(PKEY); else localStorage.setItem(PKEY, snap.stored); }catch(e){}
  renderProfile(); route(); renderAll();
  toast("Dados repostos.", null, 3);
}
const wScope = () => (document.querySelector('input[name="wscope"]:checked') || {}).value || "semana";
function wipeSummary(sc){
  const feitos = doneDays().map(d => d.nome), out = [];
  out.push(feitos.length ? `${feitos.length} check-in${feitos.length>1?"s":""} desta semana (${lista(feitos)})` : "Nenhum check-in registado esta semana");
  if (S.chat && S.days[S.chat.dk].estado === "hoje") out.push(`O check-in de ${DAYN[S.chat.dk].nome}, que está a meio`);
  out.push(S.saved ? "O relatório da semana 4, já guardado" : S.report && S.report.edited ? "O rascunho do relatório da semana 4, com as tuas edições" : "O rascunho do relatório da semana 4");
  if (Object.keys(S.reacoes).length) out.push("As tuas reações ao feedback");
  if (sc === "tudo"){
    const prev = S.weeks.filter(w => w.semana < 4).length;
    if (prev) out.push(`O histórico das semanas anteriores (${prev} semana${prev>1?"s":""})`);
    out.push(`O perfil (${P.nome}, ${P.resp.length} responsabilidades e as preferências), que volta aos valores de exemplo`);
  }
  return out;
}
function fillWipe(){
  const sc = wScope();
  $("#wipeList").innerHTML = wipeSummary(sc).map(x => `<li>${esc(x)}</li>`).join("");
  const live = S.chat && S.days[S.chat.dk].estado === "hoje";
  $("#wipeLive").hidden = !live;
  if (live) $("#wipeLive").textContent = `O check-in de ${DAYN[S.chat.dk].nome} está a meio e termina sem gravar.`;
  $("#wipeGo").textContent = sc === "tudo" ? "Apagar tudo" : "Apagar esta semana";
}
function closeWipe(){ const d = $("#wipeDlg"); d.close ? d.close() : d.removeAttribute("open"); }
$("#wipeBtn").onclick = () => {
  $("#wipeType").value = ""; $("#wipeGo").disabled = true;
  document.querySelector('input[name="wscope"][value="semana"]').checked = true;
  fillWipe();
  const d = $("#wipeDlg"); if (d.showModal) d.showModal(); else d.setAttribute("open","");
  $("#wipeX").focus();
};
$("#exportBtn").onclick = openExport;
$("#wipeExport").onclick = openExport;
$("#wipeX").onclick = closeWipe;
$("#wipeForm").addEventListener("change", e => { if (e.target.name === "wscope") fillWipe(); });
$("#wipeForm").addEventListener("submit", e => e.preventDefault());
$("#wipeType").addEventListener("input", () => { $("#wipeGo").disabled = $("#wipeType").value.trim().toUpperCase() !== "APAGAR"; });
$("#wipeGo").onclick = () => {
  if ($("#wipeType").value.trim().toUpperCase() !== "APAGAR") return;
  const sc = wScope(), snap = snapshot();
  closeWipe();
  if (S.chat && S.chat.ctl) S.chat.ctl.abort();
  if (sc === "tudo"){ try{ localStorage.removeItem(PKEY); }catch(e){} P = clone(DEF_PROFILE); }
  S = freshState({empty:true, noHistory: sc === "tudo"});
  renderProfile(); route(); startFirstDay();
  $("#savedInd").textContent = "";
  toast(sc === "tudo" ? "Apagaste todos os dados." : "Apagaste os check-ins e o relatório desta semana.", () => restore(snap));
};

/* ───────── Navegação e controlos ───────── */
const VIEWS = {hoje:"viewHoje", semana:"viewSemana", perfil:"viewPerfil"};
function route(){
  const h = (location.hash || "#hoje").slice(1), v = VIEWS[h] ? h : "hoje";
  Object.entries(VIEWS).forEach(([k,id]) => $("#"+id).classList.toggle("on", k===v));
  $("#navHoje").toggleAttribute("aria-current", v==="hoje"); $("#navSemana").toggleAttribute("aria-current", v==="semana"); $("#navPerfil").toggleAttribute("aria-current", v==="perfil");
  ["navHoje","navSemana","navPerfil"].forEach(id => { const a = $("#"+id); if (a.hasAttribute("aria-current")) a.setAttribute("aria-current","page"); });
  if (v === "semana") renderReport();
  if (v === "perfil") renderProfile();
  if (v === "hoje") renderChat();
}
window.addEventListener("hashchange", route);
$("#days").addEventListener("click", e => { const b = e.target.closest(".day"); if (!b) return; S.viewDay = b.dataset.day; renderAll(); renderChat(); showPane("paneChat"); });
$("#form").addEventListener("submit", e => {
  e.preventDefault();
  const c = S.chat;
  if (c && c.busy && c.ctl){ c.ctl.abort(); return; }
  const ta = $("#msg"), v = ta.value.trim();
  if (!v){ if (canType()) setErr("Escreve uma resposta antes de enviar."); return; }
  ta.value = ""; autosize(); onUser(v);
});
const ta = $("#msg");
function autosize(){ ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; }
ta.addEventListener("input", () => { autosize(); if ($("#cerr").textContent) setErr(""); });
ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); $("#form").requestSubmit(); } });
$("#resetBtn").onclick = () => {
  const snap = snapshot();
  if (S.chat && S.chat.ctl) S.chat.ctl.abort();
  boot();
  toast("Demo recomeçada: os check-ins e o relatório desta sessão voltaram ao início.", () => restore(snap));
};
$("#engineSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.disabled) return; S.engine = b.dataset.engine; renderEngine(); if ((location.hash||"#hoje")==="#semana") renderReport(); });
function renderEngine(){
  $("#engGuiao").setAttribute("aria-checked", String(S.engine==="guiao"));
  $("#engLive").setAttribute("aria-checked", String(S.engine==="live"));
  $("#engLive").disabled = !SAMPLE || liveDisabled;
  $("#engLive").title = SAMPLE && !liveDisabled ? "As mensagens do agente passam a ser escritas pelo Gemini" : "Indisponível nesta vista";
}
function showPane(id){
  document.querySelectorAll("#subtabs button").forEach(x => x.setAttribute("aria-selected", String(x.dataset.pane===id)));
  ["paneDias","paneChat","paneCtx"].forEach(p => $("#"+p).classList.toggle("on", p===id));
}
$("#subtabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) showPane(b.dataset.pane); });

function renderAll(){
  renderDays(); renderContext(); renderChatHead(); renderComposer(); renderEngine();
  if ($("#viewPerfil").classList.contains("on")) renderProfile();
  if ($("#viewSemana").classList.contains("on")) renderHistory();
  $("#who").textContent = P.nome || "Sem nome";
}
function startFirstDay(){
  const k = firstOpenDay();
  if (k) return startDay(k);
  S.viewDay = "qui"; renderAll(); renderChat();
}
function boot(){
  S = freshState();
  renderProfile();
  route();
  startFirstDay();
}

// Só arranca depois de saber se o Gemini está disponível, para a 1.ª mensagem já vir dele.
const ligarGLM = (window.claude && typeof window.claude.use === "function")
  ? window.claude.use("sample").then(s => { SAMPLE = s || null; }).catch(() => { SAMPLE = null; })
  : Promise.resolve();
ligarGLM.then(() => { boot(); renderEngine(); });
})();
