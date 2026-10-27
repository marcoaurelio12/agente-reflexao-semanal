// Ponte entre o app.js (feito como artifact do Claude) e o backend Python.
// O app.js pede window.claude.use("sample"); aqui essa função chama POST /api/llm, que fala
// com o GLM-5.3 da z.ai. Sem chave no .env, GET /api/llm diz que não está disponível e o
// app.js usa as respostas de reserva.
(function () {
  function erro(codigo) {
    const e = new Error(codigo);
    e.code = codigo;
    return e;
  }

  const TEMPO_MAXIMO_MS = 25000; // depois disto o app.js usa a resposta de reserva

  async function pedir(corpo, signal) {
    const ctl = new AbortController();
    let esgotado = false;
    const relogio = setTimeout(() => { esgotado = true; ctl.abort(); }, TEMPO_MAXIMO_MS);
    if (signal) signal.addEventListener("abort", () => ctl.abort());
    let r;
    try {
      r = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
        signal: ctl.signal,
      });
    } catch (e) {
      if (esgotado) throw erro("timeout");
      throw erro(e && e.name === "AbortError" ? "cancelled" : "network");
    } finally {
      clearTimeout(relogio);
    }
    if (r.status === 429) throw erro("rate_limited");
    if (r.status === 503) throw erro("sampling_disabled");
    if (!r.ok) throw erro("llm_error");
    return r.json();
  }

  async function sample(mensagens, opts) {
    opts = opts || {};
    const d = await pedir({ mensagens }, opts.signal);
    if (opts.onText) opts.onText({ text: d.texto });
    return { text: d.texto };
  }

  sample.json = async function (prompt, opts) {
    opts = opts || {};
    const d = await pedir({ mensagens: [{ role: "user", content: prompt }], json: true }, opts.signal);
    return d.json;
  };

  window.claude = {
    use: async function (capacidade) {
      if (capacidade !== "sample") return null;
      try {
        const r = await fetch("/api/llm");
        const d = await r.json();
        return d.disponivel ? sample : null;
      } catch (e) {
        return null;
      }
    },
  };
})();
