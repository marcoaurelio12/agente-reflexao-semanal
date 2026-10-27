# Fecho da semana: instruções de extração

Recebes a conversa desta semana, o diário das semanas anteriores, os padrões já detetados e os
temas permitidos (`temas.yaml`). Devolves APENAS um objeto JSON, sem texto à volta:

```json
{
  "energia": 3,
  "energia_nota": "frase curta com as palavras da pessoa",
  "prioridades_anteriores": [
    {"texto": "…", "estado": "feito | em-parte | nao-avancou | sem-info", "nota": "…"}
  ],
  "correu_bem": ["…"],
  "aprendizagens": [{"texto": "…", "tema": "id de temas.yaml"}],
  "bloqueios": [{"texto": "…", "tema": "id de temas.yaml"}],
  "resumo": "3 a 4 frases",
  "prioridades": [
    {"texto": "…", "tema": "…"},
    {"texto": "…", "tema": "…"},
    {"texto": "…", "tema": "…"}
  ],
  "ajuste_habito": "Experimenta …"
}
```

O servidor acrescenta depois `semana`, `periodo`, `registado_em` e `padroes`, e escreve a
entrada em `memoria/diario/` com o mesmo formato das semanas anteriores.

## Regras

1. **Só o que a pessoa disse.** Campo sem informação → lista vazia, `"energia": null` ou
   `"estado": "sem-info"`. Nunca preenchas com suposições.
2. **Itens** (correu bem, aprendizagens, bloqueios): na 1.ª pessoa, perto das palavras dela,
   em frases curtas ("Entreguei…", "Aprendi que…").
3. **Resumo:** 3 a 4 frases descritivas. Sem adjetivos de avaliação ("ótima semana", "semana
   fraca") e sem conselhos.
4. **Prioridades:** exatamente 3, concretas e verificáveis: verbo + o quê + quando ("Fechar o
   rascunho do documento até sexta"). Ligadas ao que foi dito. Se houver um bloqueio
   recorrente nos padrões, uma das prioridades ou o ajuste de hábito responde-lhe.
5. **Ajuste de hábito:** um só, pequeno, para experimentar na semana seguinte, formulado como
   experiência ("Experimenta…"). Se der, constrói sobre algo que já resultou (ex.: os blocos de foco).
6. **Temas:** usa só ids de `temas.yaml`. Se nenhum servir, `outro`.
7. **Prioridades anteriores:** uma entrada por cada prioridade da semana passada, com o estado
   que a pessoa descreveu.
