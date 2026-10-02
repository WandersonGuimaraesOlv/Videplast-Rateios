// Orquestra o rateio: lê a lista de setores e uma ou mais medições e devolve o relatório consolidado.
const { ehPdf, lerTabela, extrairTextoPdf } = require('./leitura-service');
const { ehColorido } = require('./demonstrativo-service');
const {
  detectarTelefonia,
  montarMapaSetores,
  novoAcumulador,
  somarMedicaoTexto,
  somarMedicaoTabela,
  montarRelatorio,
} = require('./calculo-service');

/**
 * @param {{ medicoes: Express.Multer.File[], setores: Express.Multer.File }} arquivos
 *   Várias medições são somadas (ex.: fatura P&B + fatura colorida do mesmo mês).
 */
async function gerarRateio({ medicoes, setores }) {
  const linhasSetores = lerTabela(setores);
  if (linhasSetores.length === 0) throw new Error('A lista de setores não tem linhas.');

  const isTelefonia = detectarTelefonia(linhasSetores);
  const { mapa, setoresDesconhecidos } = montarMapaSetores(linhasSetores, isTelefonia);
  if (Object.keys(mapa).length === 0) {
    throw new Error(
      isTelefonia
        ? 'A lista de setores precisa das colunas "Número do Chip" e "Setor".'
        : 'A lista de setores precisa de uma coluna de série ("S/N" ou "Nº Serie") e uma de setor ("Setor" ou "Impressoras").'
    );
  }

  const acc = novoAcumulador();
  for (const medicao of medicoes) {
    const antes = acc.totalGeral + acc.valorForaDoRelatorio;
    let colorido = false;
    if (ehPdf(medicao)) {
      const texto = await extrairTextoPdf(medicao.buffer);
      colorido = !isTelefonia && ehColorido(texto);
      somarMedicaoTexto(texto, mapa, isTelefonia, { acc, colorido });
    } else {
      somarMedicaoTabela(lerTabela(medicao), mapa, isTelefonia, { acc });
    }
    acc.arquivos.push({
      nome: medicao.originalname,
      colorido,
      total: acc.totalGeral + acc.valorForaDoRelatorio - antes,
    });
  }

  return montarRelatorio(acc, isTelefonia, setoresDesconhecidos);
}

module.exports = { gerarRateio };
