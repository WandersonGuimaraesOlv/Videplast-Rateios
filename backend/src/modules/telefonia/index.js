const { extrairTextoPdf } = require('../shared');
const { cadastroPadrao } = require('../centros-custo');
const { uploadTelefoniaSchema } = require('./schemas');
const { lerFaturaTim, CATEGORIAS } = require('./services/fatura-tim-service');
const { lerControleChips } = require('./services/controle-chips-service');
const { calcularRateio } = require('./services/rateio-telefonia-service');
const { gerarPlanilhaRateio, nomeArquivoPlanilha } = require('./services/planilha-telefonia-service');

/**
 * Fluxo completo: PDF da fatura TIM + Controle de Chips → rateio por centro de custo, com a
 * planilha Excel junto (base64), como o rateio de impressão.
 * @param {{ fatura: Express.Multer.File, controle: Express.Multer.File }} arquivos
 * @param {{ cadastro?: ReturnType<import('../centros-custo').criarCadastroCentrosCusto> | null }} [opcoes]
 */
async function gerarRateioTelefonia({ fatura, controle }, { cadastro = cadastroPadrao } = {}) {
  const texto = await extrairTextoPdf(fatura.buffer);
  const rateio = calcularRateio(lerFaturaTim(texto), lerControleChips(controle.buffer, controle.originalname), cadastro);
  return {
    ...rateio,
    planilha: gerarPlanilhaRateio(rateio).toString('base64'),
    nomePlanilha: nomeArquivoPlanilha(rateio.fatura.referencia),
  };
}

module.exports = {
  uploadTelefoniaSchema,
  gerarRateioTelefonia,
  lerFaturaTim,
  lerControleChips,
  calcularRateio,
  gerarPlanilhaRateio,
  nomeArquivoPlanilha,
  CATEGORIAS,
};
