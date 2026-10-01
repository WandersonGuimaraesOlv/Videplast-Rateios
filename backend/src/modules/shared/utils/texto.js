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

module.exports = { decodificarTexto, normalizar };
