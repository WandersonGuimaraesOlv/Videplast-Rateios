// Orquestra o rateio: lê os dois arquivos e devolve o relatório consolidado.
const { ehPdf, lerTabela, extrairTextoPdf } = require('./leitura-service');
const {
  detectarTelefonia,
  montarMapaSetores,
  somarMedicaoTexto,
  somarMedicaoTabela,
  montarRelatorio,
} = require('./calculo-service');

/**
 * @param {{ medicao: Express.Multer.File, setores: Express.Multer.File }} arquivos
 */
async function gerarRateio({ medicao, setores }) {
  const linhasSetores = lerTabela(setores);
  if (linhasSetores.length === 0) throw new Error('A lista de setores não tem linhas.');

  const isTelefonia = detectarTelefonia(linhasSetores);
  const { mapa, setoresDesconhecidos } = montarMapaSetores(linhasSetores, isTelefonia);
  if (Object.keys(mapa).length === 0) {
    throw new Error(
      isTelefonia
        ? 'A lista de setores precisa das colunas "Número do Chip" e "Setor".'
        : 'A lista de setores precisa das colunas "S/N" (ou "SerialNumber"/"Série") e "Setor".'
    );
  }

  const acc = ehPdf(medicao)
    ? somarMedicaoTexto(await extrairTextoPdf(medicao.buffer), mapa, isTelefonia)
    : somarMedicaoTabela(lerTabela(medicao), mapa, isTelefonia);

  return montarRelatorio(acc, isTelefonia, setoresDesconhecidos);
}

module.exports = { gerarRateio };
