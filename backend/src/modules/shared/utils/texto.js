/**
 * Decodifica o buffer de um CSV. O Excel em pt-BR costuma salvar em Windows-1252 (ANSI);
 * se o UTF-8 gerar caracteres inválidos, relê como latin1 para não perder acentos
 * ("Número do Chip", "EXPEDIÇÃO").
 * @param {Buffer} buffer
 */
function decodificarTexto(buffer) {
  const utf8 = buffer.toString('utf-8');
  return utf8.includes('�') ? buffer.toString('latin1') : utf8;
}

const normalizar = (valor) => String(valor ?? '').trim().toUpperCase();

const semAcentos = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Cabeçalho comparável: "Nº Serie" → "nserie", "Número do Chip" → "numerodochip". */
const normalizarCabecalho = (valor) => semAcentos(valor).toLowerCase().replace(/[^a-z0-9]/g, '');

/** Código comparável (S/N, chip): só letras e números. "016.7PH.H0C.1V5" → "0167PHH0C1V5". */
const normalizarCodigo = (valor) => semAcentos(valor).toUpperCase().replace(/[^A-Z0-9]/g, '');

module.exports = { decodificarTexto, normalizar, normalizarCabecalho, normalizarCodigo };
