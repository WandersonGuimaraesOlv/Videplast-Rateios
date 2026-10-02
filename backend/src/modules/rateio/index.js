const { uploadRateioSchema, MAX_MEDICOES } = require('./schemas');
const { gerarRateio } = require('./services/rateio-service');
const calculo = require('./services/calculo-service');
const { lerCsv, lerTabela } = require('./services/leitura-service');
const { lerDemonstrativo, ehColorido } = require('./services/demonstrativo-service');
const { ORDEM_SETORES } = require('./setores');

module.exports = { uploadRateioSchema, MAX_MEDICOES, gerarRateio, lerCsv, lerTabela, lerDemonstrativo, ehColorido, ORDEM_SETORES, ...calculo };
