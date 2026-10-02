const { paraNumero, arredondar2 } = require('./utils/numeros');
const { decodificarTexto, normalizar, normalizarCabecalho, normalizarCodigo } = require('./utils/texto');
const { getZodErrorMessage } = require('./utils/validation');

module.exports = {
  paraNumero,
  arredondar2,
  decodificarTexto,
  normalizar,
  normalizarCabecalho,
  normalizarCodigo,
  getZodErrorMessage,
};
