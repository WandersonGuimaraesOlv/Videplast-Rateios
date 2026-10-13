const XLSX = require('xlsx');

/**
 * Gera a planilha do rateio no mesmo formato da planilha manual "LISTA DE CELULAR -
 * TIM (RATEIO)": um bloco por centro de custo (linhas, TOTAL R$ e % a ser descontado)
 * e, no fim, a "Tabela de Rateio TIM". Totais e percentuais são FÓRMULAS, para quem
 * abrir a planilha conseguir conferir as contas.
 */

const MOEDA = '"R$" #,##0.00';
const PERCENTUAL = '0.00%';
const COLUNAS = ['NÚMERO', 'SETOR', 'RESPONSÁVEL', 'CENTRO DE CUSTO', '% NO SETOR', 'MENSALIDADES', 'USO', 'OUTROS CRÉD./DÉB.', 'OUTRAS OPERADORAS', 'VALOR'];
const COL = { numero: 0, setor: 1, responsavel: 2, cc: 3, pctSetor: 4, mens: 5, uso: 6, outros: 7, outrasOp: 8, valor: 9 };

// coluna/linha 0-based → "J12"
const ref = (c, r) => XLSX.utils.encode_cell({ c, r });

function criarAba() {
  const ws = {};
  let maxLinha = 0;
  const set = (c, r, cell) => {
    ws[ref(c, r)] = cell;
    maxLinha = Math.max(maxLinha, r);
  };
  const texto = (c, r, v) => set(c, r, { t: 's', v: String(v ?? '') });
  const numero = (c, r, v, z = MOEDA) => set(c, r, { t: 'n', v, z });
  const formula = (c, r, f, v, z = MOEDA) => set(c, r, { t: 'n', f, v, z });
  const fechar = (ultimaColuna) => {
    ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: ultimaColuna, r: maxLinha } });
    return ws;
  };
  return { ws, texto, numero, formula, fechar };
}

function nomeAba(referencia) {
  return `TIM ${String(referencia || '').replace(/[\\/?*[\]:]/g, '-')}`.trim().slice(0, 31);
}

/**
 * @param {ReturnType<import('./rateio-telefonia-service').calcularRateio>} rateio
 * @returns {Buffer} arquivo .xlsx
 */
function gerarPlanilhaRateio(rateio) {
  const { fatura, grupos } = rateio;
  const aba = criarAba();
  let r = 0;

  aba.texto(0, r, `RATEIO DE TELEFONIA TIM — Referência ${fatura.referencia || '-'} (período ${fatura.periodo || '-'})`);
  r += 1;
  aba.texto(0, r, `Fatura ${fatura.numeroFatura || '-'} · Cliente ${fatura.cliente || '-'} · Vencimento ${fatura.vencimento || '-'} · ${fatura.linhasCobradas} linhas cobradas`);
  r += 2;

  const blocos = [];

  for (const g of grupos) {
    COLUNAS.forEach((titulo, c) => aba.texto(c, r, titulo));
    r += 1;
    const primeira = r;
    const ultimaLinhaDados = primeira + g.linhas.length - 1 + (g.ajusteGeral ? 1 : 0);
    const linhaTotal = ultimaLinhaDados + 1;

    for (const l of g.linhas) {
      aba.texto(COL.numero, r, l.numero);
      aba.texto(COL.setor, r, l.setor);
      aba.texto(COL.responsavel, r, l.responsavel);
      aba.texto(COL.cc, r, g.centroCusto || g.setor);
      aba.formula(COL.pctSetor, r, `${ref(COL.valor, r)}/${ref(COL.valor, linhaTotal)}`, l.percentualNoGrupo, PERCENTUAL);
      aba.numero(COL.mens, r, l.categorias.mensalidades || 0);
      aba.numero(COL.uso, r, l.categorias.uso || 0);
      aba.numero(COL.outros, r, (l.categorias.outros || 0) + (l.categorias.outrosServicos || 0));
      aba.numero(COL.outrasOp, r, l.categorias.outrasOperadoras || 0);
      aba.numero(COL.valor, r, l.total);
      r += 1;
    }
    if (g.ajusteGeral) {
      aba.texto(COL.numero, r, 'AJUSTE GERAL DA FATURA (proporcional)');
      aba.numero(COL.valor, r, g.ajusteGeral);
      r += 1;
    }

    aba.texto(COL.numero, r, 'TOTAL R$');
    aba.formula(COL.valor, r, `SUM(${ref(COL.valor, primeira)}:${ref(COL.valor, ultimaLinhaDados)})`, g.total);
    r += 1;
    aba.texto(COL.numero, r, 'TOTAL RATEIO A SER DESCONTADO:');
    blocos.push({ grupo: g, linhaTotal, linhaPercentual: r });
    r += 2;
  }

  // Total geral = soma dos blocos; conferência com o valor da fatura
  aba.texto(COL.numero, r, 'TOTAL RATEADO — TIM');
  aba.formula(COL.valor, r, blocos.map((b) => ref(COL.valor, b.linhaTotal)).join('+') || '0', rateio.totalRateado);
  aba.texto(COL.numero, r + 1, 'VALOR DA FATURA (PDF)');
  aba.numero(COL.valor, r + 1, fatura.total);
  aba.texto(COL.numero, r + 2, 'DIFERENÇA');
  aba.formula(COL.valor, r + 2, `${ref(COL.valor, r)}-${ref(COL.valor, r + 1)}`, Math.round((rateio.totalRateado - fatura.total) * 100) / 100);
  const totalGeralRef = `$${XLSX.utils.encode_col(COL.valor)}$${r + 1}`;
  for (const b of blocos) {
    aba.formula(COL.valor, b.linhaPercentual, `${ref(COL.valor, b.linhaTotal)}/${totalGeralRef}`, b.grupo.percentual, PERCENTUAL);
  }
  r += 5;

  // Tabela de Rateio (resumo por centro de custo)
  aba.texto(COL.numero, r, 'TABELA DE RATEIO TIM');
  r += 1;
  ['SETOR', 'CENTRO DE CUSTO', 'LINHAS', 'VALOR R$', '%'].forEach((t, c) => aba.texto(c, r, t));
  r += 1;
  const primeiraTabela = r;
  for (const b of blocos) {
    aba.texto(0, r, b.grupo.cadastrado === false ? `${b.grupo.setor} (CC FORA DO CADASTRO)` : b.grupo.setor);
    aba.texto(1, r, b.grupo.centroCusto || '-');
    aba.numero(2, r, b.grupo.quantidadeLinhas, '0');
    aba.formula(3, r, ref(COL.valor, b.linhaTotal), b.grupo.total);
    aba.formula(4, r, ref(COL.valor, b.linhaPercentual), b.grupo.percentual, PERCENTUAL);
    r += 1;
  }
  aba.texto(0, r, 'TOTAL');
  aba.formula(2, r, `SUM(${ref(2, primeiraTabela)}:${ref(2, r - 1)})`, grupos.reduce((a, g) => a + g.quantidadeLinhas, 0), '0');
  aba.formula(3, r, `SUM(${ref(3, primeiraTabela)}:${ref(3, r - 1)})`, rateio.totalRateado);
  aba.formula(4, r, `SUM(${ref(4, primeiraTabela)}:${ref(4, r - 1)})`, grupos.reduce((a, g) => a + g.percentual, 0), PERCENTUAL);

  const ws = aba.fechar(COLUNAS.length - 1);
  ws['!cols'] = [14, 26, 34, 18, 11, 14, 10, 17, 18, 13].map((wch) => ({ wch }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nomeAba(fatura.referencia));

  if (rateio.avisos.length) {
    const linhasAvisos = [['AVISO', 'DETALHE']];
    for (const a of rateio.avisos) {
      linhasAvisos.push([a.mensagem, '']);
      for (const item of a.itens || []) linhasAvisos.push(['', item]);
    }
    const wsAvisos = XLSX.utils.aoa_to_sheet(linhasAvisos);
    wsAvisos['!cols'] = [{ wch: 90 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsAvisos, 'Avisos');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/** Nome sugerido para o arquivo: "Rateio_TIM_OUT-26.xlsx". */
function nomeArquivoPlanilha(referencia) {
  return `Rateio_TIM_${String(referencia || 'sem-referencia').replace(/[^A-Za-z0-9]+/g, '-')}.xlsx`;
}

module.exports = { gerarPlanilhaRateio, nomeArquivoPlanilha };
