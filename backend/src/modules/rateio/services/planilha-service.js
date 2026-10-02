// Planilha Excel única com os três relatórios do rateio, um por aba.
const XLSX = require('xlsx');

const FORMATO_MOEDA = '"R$" #,##0.00';
const FORMATO_INTEIRO = '#,##0';
const FORMATO_PERCENTUAL = '0.0%';

/** Aplica formato numérico às células de uma coluna (a partir da linha 2). */
function formatarColuna(aba, coluna, formato) {
  const intervalo = XLSX.utils.decode_range(aba['!ref']);
  for (let r = 1; r <= intervalo.e.r; r++) {
    const celula = aba[XLSX.utils.encode_cell({ r, c: coluna })];
    if (celula && celula.t === 'n') celula.z = formato;
  }
}

function criarAba(linhas, larguras) {
  const aba = XLSX.utils.aoa_to_sheet(linhas);
  aba['!cols'] = larguras.map((wch) => ({ wch }));
  return aba;
}

/**
 * @param {object} relatorio  resposta de gerarRateio (dados, totalGeral, valores, equipamentos)
 * @returns {Buffer} arquivo .xlsx
 */
function gerarPlanilha(relatorio) {
  const telefonia = relatorio.tipo === 'telefonia';
  const workbook = XLSX.utils.book_new();

  const tituloTotal = telefonia ? 'Valor (R$)' : 'Total de Páginas (Mês)';
  const paginas = criarAba(
    [
      ['Ordem', 'Setor', tituloTotal],
      ...relatorio.dados.map((d) => [d.ordem, d.setor, d.total]),
      ['', 'TOTAL GERAL', relatorio.totalGeral],
    ],
    [8, 28, 24]
  );
  formatarColuna(paginas, 2, telefonia ? FORMATO_MOEDA : FORMATO_INTEIRO);
  XLSX.utils.book_append_sheet(workbook, paginas, telefonia ? 'Valores por setor' : 'Páginas por setor');

  if (relatorio.valores) {
    const valores = criarAba(
      [
        ['Centro de Custo', 'Setor', 'Contrato', 'Páginas', 'Valor (R$)', 'Rateio (%)'],
        ...relatorio.valores.linhas.map((l) => [l.centroCusto, l.setor, l.contrato, l.paginas, l.valor, l.rateio]),
        ['Total', '', '', '', relatorio.valores.total, ''],
      ],
      [16, 28, 10, 10, 14, 11]
    );
    formatarColuna(valores, 3, FORMATO_INTEIRO);
    formatarColuna(valores, 4, FORMATO_MOEDA);
    formatarColuna(valores, 5, FORMATO_PERCENTUAL);
    XLSX.utils.book_append_sheet(workbook, valores, 'Valores a descontar');
  }

  if (relatorio.equipamentos?.length) {
    const auditoria = criarAba(
      [
        ['Número de Série', 'Contrato', 'Setor', telefonia ? 'Valor (R$)' : 'Volume Páginas', 'Arquivo de Origem'],
        ...relatorio.equipamentos.map((e) => [e.serie, e.contrato, e.setor || 'SEM SETOR', e.valor, e.arquivo]),
      ],
      [20, 16, 24, 15, 44]
    );
    formatarColuna(auditoria, 3, telefonia ? FORMATO_MOEDA : FORMATO_INTEIRO);
    XLSX.utils.book_append_sheet(workbook, auditoria, 'Auditoria equipamentos');
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { gerarPlanilha };
