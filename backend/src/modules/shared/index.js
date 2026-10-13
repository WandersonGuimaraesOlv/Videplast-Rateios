const { paraNumero, arredondar2 } = require('./utils/numeros');
const { brlParaCentavos, centavosParaReais } = require('./utils/dinheiro');
const { decodificarTexto, normalizar, normalizarCabecalho, normalizarCodigo } = require('./utils/texto');
const { getZodErrorMessage, arquivoCom } = require('./utils/validation');
const { extrairTextoPdf } = require('./utils/pdf');

module.exports = {
  paraNumero,
  arredondar2,
  brlParaCentavos,
  centavosParaReais,
  decodificarTexto,
  normalizar,
  normalizarCabecalho,
  normalizarCodigo,
  getZodErrorMessage,
  arquivoCom,
  extrairTextoPdf,
};
