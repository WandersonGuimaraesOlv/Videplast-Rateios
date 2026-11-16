const { extrairTextoPdf } = require('../shared');
const { cadastroPadrao } = require('../centros-custo');
const { uploadTelefoniaSchema, opcoesTelefoniaSchema } = require('./schemas');
const { lerFaturaTim, CATEGORIAS } = require('./services/fatura-tim-service');
const { lerControleChips } = require('./services/controle-chips-service');
const { calcularRateio } = require('./services/rateio-telefonia-service');
const { gerarPlanilhaRateio, nomeArquivoPlanilha } = require('./services/planilha-telefonia-service');

/**
 * Fluxo completo: PDF da fatura TIM + Controle de Chips → rateio por centro de custo, com a
 * planilha Excel junto (base64), como o rateio de impressão.
 * @param {{ fatura: Express.Multer.File, controle: Express.Multer.File }} arquivos
 * @param {{ cadastro?: ReturnType<import('../centros-custo').criarCadastroCentrosCusto> | null, ccValorGeral?: string }} [opcoes]
 *   ccValorGeral: CC que recebe inteiro o valor da fatura fora das linhas (vazio = rateio proporcional)
 */
async function gerarRateioTelefonia({ fatura, controle }, { cadastro = cadastroPadrao, ccValorGeral = '' } = {}) {
  const texto = await extrairTextoPdf(fatura.buffer);
  const rateio = calcularRateio(lerFaturaTim(texto), lerControleChips(controle.buffer, controle.originalname), cadastro, { ccValorGeral });
  return {
    ...rateio,
    planilha: gerarPlanilhaRateio(rateio).toString('base64'),
    nomePlanilha: nomeArquivoPlanilha(rateio.fatura.referencia),
  };
}

module.exports = {
  uploadTelefoniaSchema,
  opcoesTelefoniaSchema,
  gerarRateioTelefonia,
  lerFaturaTim,
  lerControleChips,
  calcularRateio,
  gerarPlanilhaRateio,
  nomeArquivoPlanilha,
  CATEGORIAS,
};
