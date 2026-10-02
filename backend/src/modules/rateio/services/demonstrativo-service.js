// Leitura do "Demonstrativo de Faturamento" da Copysystems (PDF de impressão P&B ou colorida).
// O pdf-parse devolve cada equipamento numa linha com as colunas grudadas, por exemplo:
//   "016.7PH.H0C.1V533006MX611DE0,00 0254.013257.938 03.925"
//    série           código modelo vlr  [frq] anterior atual crédito cópias
// Por isso as cópias são achadas testando as divisões possíveis da parte numérica até
// encontrar uma em que atual − anterior = cópias.
const { normalizarCodigo } = require('../../shared');

// Série (com pontos/espaços), código de 5 dígitos, modelo começando por letra, valor básico "0,00"
const LINHA_EQUIPAMENTO = /^([A-Z0-9][A-Z0-9. ]*?)(\d{5})([A-Z][A-Z0-9-]*?)\d+,\d{2}(.*)$/;

// Número da medição: "0", "572" ou "254.013" (milhar com ponto)
const NUMERO = /^(0|[1-9]\d{0,2}(\.\d{3})*)$/;
const valor = (texto) => parseInt(texto.replace(/\./g, ''), 10);

/** Todas as formas de quebrar `texto` em `partes` números válidos. */
function* dividir(texto, partes) {
  if (partes === 1) {
    if (NUMERO.test(texto)) yield [texto];
    return;
  }
  for (let i = 1; i < texto.length; i++) {
    const cabeca = texto.slice(0, i);
    if (!NUMERO.test(cabeca)) continue;
    for (const resto of dividir(texto.slice(i), partes - 1)) yield [cabeca, ...resto];
  }
}

/** Cópias do mês a partir da parte numérica da linha ("0254.013257.938 03.925" → 3925). */
function copiasDaLinha(cauda) {
  const texto = cauda.replace(/\s+/g, '');
  // Com franquia: frq, anterior, atual, crédito, cópias. Sem franquia: anterior, atual, crédito, cópias.
  for (const partes of [5, 4]) {
    for (const numeros of dividir(texto, partes)) {
      const [anterior, atual, , copias] = numeros.slice(-4).map(valor);
      if (atual >= anterior && atual - anterior === copias) return copias;
    }
  }
  return null;
}

/**
 * Extrai { serie, copias } de cada equipamento do demonstrativo.
 * Devolve lista vazia se o texto não estiver nesse formato (aí vale a leitura genérica).
 */
function lerDemonstrativo(texto) {
  if (!/DEMONSTRATIVO DE FATURAMENTO/i.test(texto)) return [];
  const leituras = [];
  for (const linha of texto.split('\n')) {
    const match = linha.trim().toUpperCase().match(LINHA_EQUIPAMENTO);
    if (!match) continue;
    const copias = copiasDaLinha(match[4]);
    const serie = normalizarCodigo(match[1]);
    if (copias !== null && serie.length >= 6) leituras.push({ serie, copias });
  }
  return leituras;
}

/** Fatura de impressão colorida ("VIDEPLAST INDUSTRIA - COLOR"). */
const ehColorido = (texto) => /-\s*COLOR\b/i.test(texto);

module.exports = { lerDemonstrativo, copiasDaLinha, ehColorido };
