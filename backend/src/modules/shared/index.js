const { paraNumero, arredondar2 } = require('./utils/numeros');
const { decodificarTexto, normalizar } = require('./utils/texto');
const { getZodErrorMessage } = require('./utils/validation');

module.exports = { paraNumero, arredondar2, decodificarTexto, normalizar, getZodErrorMessage };
