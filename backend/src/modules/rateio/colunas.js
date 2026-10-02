// Nomes de coluna aceitos, já normalizados (sem acento, minúsculos, só letras e números).
// "Nº Serie" → "nserie"; "Impressoras" é a coluna de setor da planilha "Rateio impressão".
const { normalizarCabecalho } = require('../shared');

const COLUNAS = {
  serie: ['sn', 'serialnumber', 'serial', 'serie', 'nserie', 'noserie', 'numerodeserie', 'numeroserie', 'nseries'],
  chip: ['numerodochip', 'numerochip', 'chip'],
  setor: ['setor', 'impressoras', 'impressora', 'departamento'],
  centroCusto: ['centrodecusto', 'controdecusto', 'centrocusto', 'cc'],
  valor: ['paginasmes', 'nocopias', 'paginas', 'copias', 'total', 'valor'],
};

/** Valor da primeira coluna da linha cujo nome normalizado está em `tipo`, na ordem de preferência. */
function valorDaColuna(linha, tipo) {
  const porNome = {};
  for (const [coluna, valor] of Object.entries(linha)) porNome[normalizarCabecalho(coluna)] ??= valor;
  for (const nome of COLUNAS[tipo]) {
    const valor = porNome[nome];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') return valor;
  }
  return '';
}

/** Diz se uma lista de cabeçalhos tem alguma coluna do tipo pedido. */
const temColuna = (cabecalhos, tipo) =>
  cabecalhos.some((c) => COLUNAS[tipo].includes(normalizarCabecalho(c)));

module.exports = { COLUNAS, valorDaColuna, temColuna };
