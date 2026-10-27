// Ponte entre o app.js (feito como artifact do Claude) e o backend Python.
// O app.js pede window.claude.use("sample"); aqui essa função chama POST /api/llm, que fala
// com o GLM-5.3 da z.ai. Sem chave no .env, GET /api/llm diz que não está disponível e o
// app.js fica no modo guião.
(function () {
  function erro(codigo) {
    const e = new Error(codigo);
    e.code = codigo;
    return e;
  }

  async function pedir(corpo, signal) {
    let r;
    try {
      r = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
        signal,
      });
    } catch (e) {
      throw erro(e && e.name === "AbortError" ? "cancelled" : "network");
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
