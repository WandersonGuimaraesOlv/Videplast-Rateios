/**
 * Valores em reais trabalhados em CENTAVOS (inteiros) para não acumular erro de ponto
 * flutuante nas somas (ex.: 0,1 + 0,2 !== 0,3).
 */

/**
 * "1.390,67" | "-12,20" | "25,90" → centavos (139067 | -1220 | 2590).
 * @param {string} texto
 * @returns {number}
 */
function brlParaCentavos(texto) {
  const limpo = String(texto).trim().replace(/\s/g, '');
  const negativo = limpo.startsWith('-');
  const [inteiro, decimal = '00'] = limpo.replace('-', '').replace(/\./g, '').split(',');
  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2));
  if (!Number.isFinite(centavos)) throw new Error(`Valor monetário inválido: "${texto}"`);
  return negativo ? -centavos : centavos;
}

/** 139067 → 1390.67 */
const centavosParaReais = (centavos) => Math.round(centavos) / 100;

module.exports = { brlParaCentavos, centavosParaReais };
