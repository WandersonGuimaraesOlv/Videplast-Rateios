/**
 * Converte valores de planilhas/faturas para número.
 * Aceita número puro, "1234", "1.234", "12,50", "1.234,56" e "R$ 1.234,56".
 * @param {unknown} valor
 * @returns {number} 0 quando não há número válido
 */
function paraNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (valor === null || valor === undefined) return 0;
  let texto = String(valor).replace(/[^\d,.-]/g, '');
  if (!texto) return 0;
  if (texto.includes(',')) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(texto)) {
    // "1.234" ou "12.345.678" sem vírgula: pontos são separadores de milhar
    texto = texto.replace(/\./g, '');
  }
  const numero = parseFloat(texto);
  return Number.isFinite(numero) ? numero : 0;
}

/** Arredonda para 2 casas sem acumular erro de ponto flutuante na exibição. */
const arredondar2 = (n) => Math.round(n * 100) / 100;

module.exports = { paraNumero, arredondar2 };
