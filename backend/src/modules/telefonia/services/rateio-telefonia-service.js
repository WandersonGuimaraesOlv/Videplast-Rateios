const { centavosParaReais } = require('../../shared');
const { normalizarNome } = require('../../centros-custo');

/**
 * Rateio da fatura de telefonia por centro de custo.
 *
 * Regra: cada linha (acesso) entra com o valor REAL que a operadora cobrou dela no
 * mês (mensalidades + uso + outros créditos/débitos + outras operadoras) e vai para o
 * "Centro de Custo ATUALIZADO" do Controle de Chips. O percentual de cada centro de
 * custo é o total dele dividido pelo total da fatura — a soma sempre fecha com a fatura.
 * Valor da fatura que não pertence a nenhuma linha é rateado proporcionalmente.
 *
 * O CC é SEMPRE o da coluna "Centro de Custo ATUALIZADO" — o sistema não troca por
 * setor nem preenche linha vazia; só sugere nos avisos. Com o cadastro de centros de
 * custo, cada grupo leva o nome oficial do CC e os códigos da coluna são conferidos.
 */

const GRUPO_SEM_CC = 'SEM CENTRO DE CUSTO';
const GRUPO_NAO_CADASTRADO = 'NÃO CADASTRADO NO CONTROLE';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

/** "64999745640" → "(64) 99974-5640"; "6432221111" → "(64) 3222-1111". */
function formatarTelefone(numero) {
  const m = /^(\d{2})(\d{4,5})(\d{4})$/.exec(numero);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : numero;
}

/** Texto que mais se repete (ignorando maiúsculas/acentos), mantendo a grafia da 1ª ocorrência. */
function maisFrequente(textos) {
  const contagem = new Map();
  for (const t of textos.filter(Boolean)) {
    const chave = normalizarNome(t);
    const atual = contagem.get(chave) || { texto: t, n: 0 };
    atual.n += 1;
    contagem.set(chave, atual);
  }
  let melhor = null;
  for (const item of contagem.values()) if (!melhor || item.n > melhor.n) melhor = item;
  return melhor ? melhor.texto : '';
}

const qtdLinhas = (n) => `${n} linha${n > 1 ? 's' : ''}`;
const descreverItem = (item) => `${item.codigo} (${item.nome})`;

/**
 * CC da linha = coluna "Centro de Custo ATUALIZADO" do controle. Única regra: em RV todo
 * CC começa com 1005, então outro prefixo é digitação (1007PAUX21 → 1005PAUX21).
 */
function centroCustoDaLinha(chip, cadastro) {
  return chip.centroCusto && cadastro ? cadastro.ajustarUnidade(chip.centroCusto) : chip.centroCusto;
}

/**
 * Distribui `centavos` entre os grupos proporcionalmente aos totais, sem perder centavo
 * (método do maior resto).
 */
function distribuirProporcional(centavos, totais) {
  const base = totais.reduce((a, b) => a + b, 0);
  if (base === 0 || centavos === 0) return totais.map(() => 0);
  const brutos = totais.map((t) => (centavos * t) / base);
  const partes = brutos.map((b) => Math.trunc(b));
  let resto = centavos - partes.reduce((a, b) => a + b, 0);
  const ordem = brutos.map((b, i) => ({ i, frac: Math.abs(b - Math.trunc(b)) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; resto !== 0 && k < ordem.length; k += 1) {
    const passo = Math.sign(resto);
    partes[ordem[k].i] += passo;
    resto -= passo;
  }
  return partes;
}

/**
 * @param {ReturnType<import('./fatura-tim-service').lerFaturaTim>} fatura
 * @param {ReturnType<import('./controle-chips-service').lerControleChips>} controle
 * @param {ReturnType<import('../../centros-custo').criarCadastroCentrosCusto> | null} [cadastro]
 *   cadastro oficial de centros de custo; sem ele o nome do grupo vem do Controle de Chips
 */
function calcularRateio(fatura, controle, cadastro = null) {
  const { chips, duplicados = [] } = controle;
  const grupos = new Map();
  const semCentroCusto = [];
  const naoCadastrados = [];

  for (const [numero, cobranca] of fatura.linhas) {
    const chip = chips.get(numero);
    const centroCusto = chip ? centroCustoDaLinha(chip, cadastro) : '';
    let chave;
    if (!chip) {
      chave = GRUPO_NAO_CADASTRADO;
      naoCadastrados.push(numero);
    } else if (!centroCusto) {
      chave = GRUPO_SEM_CC;
      semCentroCusto.push(chip);
    } else {
      chave = centroCusto;
    }

    if (!grupos.has(chave)) grupos.set(chave, { chave, linhas: [] });
    grupos.get(chave).linhas.push({
      numero,
      numeroFormatado: formatarTelefone(numero),
      responsavel: chip ? chip.responsavel : '',
      setor: chip ? chip.setor : '',
      plano: chip ? chip.plano : '',
      centroCustoAntigo: chip ? chip.centroCustoAntigo : '',
      categoriasCentavos: cobranca.categorias,
      totalCentavos: cobranca.totalCentavos,
    });
  }

  const lista = [...grupos.values()].map((g) => ({
    ...g,
    subtotalCentavos: g.linhas.reduce((a, l) => a + l.totalCentavos, 0),
  }));

  // Diferença entre o total da fatura e a soma das linhas (ex.: cobrança geral do cliente)
  const somaLinhas = lista.reduce((a, g) => a + g.subtotalCentavos, 0);
  const naoAtribuido = fatura.totalCentavos - somaLinhas;
  const ajustes = distribuirProporcional(naoAtribuido, lista.map((g) => g.subtotalCentavos));

  const totalFatura = fatura.totalCentavos;
  const gruposFinal = lista.map((g, i) => {
    const especial = g.chave === GRUPO_SEM_CC || g.chave === GRUPO_NAO_CADASTRADO;
    const oficial = !especial && cadastro ? cadastro.buscar(g.chave) : null;
    const totalCentavos = g.subtotalCentavos + ajustes[i];
    return {
      centroCusto: especial ? null : g.chave,
      tipo: g.chave === GRUPO_SEM_CC ? 'sem_centro_custo' : g.chave === GRUPO_NAO_CADASTRADO ? 'nao_cadastrado' : 'centro_custo',
      setor: especial ? g.chave : (oficial ? oficial.nome : maisFrequente(g.linhas.map((l) => l.setor))),
      // true/false = existe ou não no cadastro de CCs; null = não se aplica / sem cadastro
      cadastrado: especial || !cadastro ? null : Boolean(oficial),
      quantidadeLinhas: g.linhas.length,
      linhas: g.linhas
        .sort((a, b) => a.numero.localeCompare(b.numero))
        .map((l) => ({
          numero: l.numero,
          numeroFormatado: l.numeroFormatado,
          responsavel: l.responsavel,
          setor: l.setor,
          plano: l.plano,
          centroCustoAntigo: l.centroCustoAntigo,
          categorias: Object.fromEntries(Object.entries(l.categoriasCentavos).map(([k, v]) => [k, centavosParaReais(v)])),
          total: centavosParaReais(l.totalCentavos),
          percentualNoGrupo: g.subtotalCentavos ? l.totalCentavos / g.subtotalCentavos : 0,
        })),
      subtotal: centavosParaReais(g.subtotalCentavos),
      ajusteGeral: centavosParaReais(ajustes[i]),
      total: centavosParaReais(totalCentavos),
      percentual: totalFatura ? totalCentavos / totalFatura : 0,
    };
  });

  const ordemTipo = { centro_custo: 0, sem_centro_custo: 1, nao_cadastrado: 2 };
  gruposFinal.sort((a, b) => ordemTipo[a.tipo] - ordemTipo[b.tipo]
    || collator.compare(a.setor, b.setor)
    || collator.compare(a.centroCusto || '', b.centroCusto || ''));

  const totalRateadoCentavos = gruposFinal.reduce((a, g) => a + Math.round(g.total * 100), 0);
  const gruposCc = gruposFinal.filter((g) => g.tipo === 'centro_custo');

  /** Código do CC com o nome do cadastro (ou indicando que não existe). */
  const descreverCc = (codigo) => {
    if (!cadastro) return codigo;
    const item = cadastro.buscar(codigo);
    return item ? descreverItem(item) : `${codigo} (não existe no cadastro)`;
  };

  const avisos = [];
  if (semCentroCusto.length) {
    avisos.push({
      tipo: 'sem_centro_custo',
      mensagem: `${semCentroCusto.length} linha(s) sem "Centro de Custo ATUALIZADO" no Controle de Chips. Preencha o centro de custo e gere o rateio de novo.`,
      itens: semCentroCusto.map((c) => {
        let texto = `${formatarTelefone(c.numero)} — ${c.responsavel || 'sem responsável'} (${c.setor || 'sem setor'})`;
        if (c.centroCustoAntigo) texto += ` · CC antigo: ${descreverCc(c.centroCustoAntigo)}`;
        const sugestoes = cadastro ? cadastro.buscarPorNome(c.setor) : [];
        if (sugestoes.length) texto += ` · pelo setor, o CC seria ${sugestoes.map(descreverItem).join(' ou ')}`;
        return texto;
      }),
    });
  }
  if (naoCadastrados.length) {
    avisos.push({
      tipo: 'nao_cadastrado',
      mensagem: `${naoCadastrados.length} linha(s) cobradas na fatura não estão no Controle de Chips.`,
      itens: naoCadastrados.map(formatarTelefone),
    });
  }

  // Setores já explicados por um aviso do cadastro não se repetem em "setor_em_varios_cc"
  const setoresAvisados = new Set();
  if (cadastro) {
    const inexistentes = gruposCc.filter((g) => g.cadastrado === false);
    if (inexistentes.length) {
      avisos.push({
        tipo: 'cc_inexistente',
        mensagem: `${inexistentes.length} centro(s) de custo do Controle de Chips não existem no cadastro de centros de custo. Corrija o código no controle e gere o rateio de novo.`,
        itens: inexistentes.map((g) => {
          g.linhas.forEach((l) => setoresAvisados.add(normalizarNome(l.setor)));
          const sugestoes = [...cadastro.sugerirParaCodigo(g.centroCusto), ...cadastro.buscarPorNome(g.setor)]
            .filter((item, i, todos) => todos.findIndex((x) => x.codigo === item.codigo) === i);
          const dica = sugestoes.length ? ` · o certo deve ser ${sugestoes.map(descreverItem).join(' ou ')}` : '';
          return `${g.centroCusto} — ${g.setor || 'sem setor'} (${qtdLinhas(g.quantidadeLinhas)})${dica}`;
        }),
      });
    }

    // Linha cujo setor tem CC próprio no cadastro, mas foi lançada em outro CC (que existe)
    const divergentes = new Map();
    for (const g of gruposCc.filter((x) => x.cadastrado)) {
      for (const l of g.linhas) {
        const oficiais = cadastro.buscarPorNome(l.setor);
        if (!oficiais.length || oficiais.some((o) => o.codigo === g.centroCusto)) continue;
        const chave = normalizarNome(l.setor);
        if (!divergentes.has(chave)) divergentes.set(chave, { setor: l.setor, oficiais, ccs: new Map() });
        const ccs = divergentes.get(chave).ccs;
        ccs.set(g.centroCusto, (ccs.get(g.centroCusto) || 0) + 1);
        setoresAvisados.add(chave);
      }
    }
    if (divergentes.size) {
      avisos.push({
        tipo: 'setor_cc_divergente',
        mensagem: `${divergentes.size} setor(es) têm centro de custo próprio no cadastro, mas as linhas estão em outro CC no Controle de Chips. O rateio usa o CC do controle; confira se está certo.`,
        itens: [...divergentes.values()].map((d) => `${d.setor}: no cadastro é ${d.oficiais.map(descreverItem).join(' ou ')}; no controle está em ${[...d.ccs].map(([cc, n]) => `${descreverCc(cc)} — ${qtdLinhas(n)}`).join(', ')}`),
      });
    }
  }

  if (naoAtribuido !== 0) {
    avisos.push({
      tipo: 'valor_geral',
      mensagem: `R$ ${centavosParaReais(naoAtribuido).toFixed(2).replace('.', ',')} da fatura não pertence a nenhuma linha e foi rateado proporcionalmente entre os centros de custo.`,
      itens: fatura.geraisCliente.map((g) => `${g.categoria}: R$ ${centavosParaReais(g.centavos).toFixed(2).replace('.', ',')}`),
    });
  }
  // Mesmo setor em centros de custo diferentes costuma ser erro de digitação no controle
  // (ex.: "Manutenção" em 1005PAUX21 e 1005PAUX12).
  const ccsPorSetor = new Map();
  for (const g of gruposCc) {
    for (const l of g.linhas) {
      const chave = normalizarNome(l.setor);
      if (!chave || setoresAvisados.has(chave)) continue;
      if (!ccsPorSetor.has(chave)) ccsPorSetor.set(chave, { setor: l.setor, ccs: new Map() });
      const ccs = ccsPorSetor.get(chave).ccs;
      ccs.set(g.centroCusto, (ccs.get(g.centroCusto) || 0) + 1);
    }
  }
  const setoresDivididos = [...ccsPorSetor.values()].filter((s) => s.ccs.size > 1);
  if (setoresDivididos.length) {
    avisos.push({
      tipo: 'setor_em_varios_cc',
      mensagem: `${setoresDivididos.length} setor(es) aparecem em mais de um centro de custo no Controle de Chips. Confira se está certo (pode ser erro de digitação).`,
      itens: setoresDivididos.map((s) => `${s.setor}: ${[...s.ccs].map(([cc, n]) => `${cc} (${qtdLinhas(n)})`).join(', ')}`),
    });
  }
  if (duplicados.length) {
    avisos.push({
      tipo: 'duplicado',
      mensagem: `${duplicados.length} número(s) aparecem mais de uma vez no Controle de Chips (foi usada a última linha).`,
      itens: duplicados.map(formatarTelefone),
    });
  }
  const semCobranca = [...chips.values()].filter((c) => !fatura.linhas.has(c.numero));
  if (semCobranca.length) {
    avisos.push({
      tipo: 'sem_cobranca',
      mensagem: `${semCobranca.length} chip(s) do controle não aparecem nesta fatura (sem cobrança no mês).`,
      itens: semCobranca.map((c) => `${formatarTelefone(c.numero)} — ${c.responsavel || 'sem responsável'}`),
    });
  }

  return {
    fatura: { ...fatura.cabecalho, total: centavosParaReais(totalFatura), linhasCobradas: fatura.linhas.size },
    totalRateado: centavosParaReais(totalRateadoCentavos),
    conferido: totalRateadoCentavos === totalFatura,
    grupos: gruposFinal,
    avisos,
  };
}

module.exports = { calcularRateio, formatarTelefone, distribuirProporcional, GRUPO_SEM_CC, GRUPO_NAO_CADASTRADO };
