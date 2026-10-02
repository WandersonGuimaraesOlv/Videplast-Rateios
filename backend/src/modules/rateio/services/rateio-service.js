// Orquestra o rateio: lê a lista de setores e uma ou mais medições e devolve o relatório consolidado.
const { ehPdf, lerTabela, lerRotulosCentroCusto, extrairTextoPdf } = require('./leitura-service');
const { ehColorido, lerResumoFatura } = require('./demonstrativo-service');
const { montarCentrosCusto, calcularValores } = require('./valores-service');
const { gerarPlanilha } = require('./planilha-service');
const { atualizarHistorico } = require('./historico-service');
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
  const faturas = [];
  for (const medicao of medicoes) {
    const antes = acc.totalGeral + acc.valorForaDoRelatorio;
    const arquivo = medicao.originalname;
    let colorido = false;
    let resumo = { contrato: null, mes: null, precoPagina: null, locacao: 0, total: null };
    if (ehPdf(medicao)) {
      const texto = await extrairTextoPdf(medicao.buffer);
      colorido = !isTelefonia && ehColorido(texto);
      resumo = lerResumoFatura(texto);
      somarMedicaoTexto(texto, mapa, isTelefonia, { acc, colorido, arquivo, contrato: resumo.contrato || '' });
    } else {
      somarMedicaoTabela(lerTabela(medicao), mapa, isTelefonia, { acc, arquivo });
    }
    const total = acc.totalGeral + acc.valorForaDoRelatorio - antes;
    acc.arquivos.push({ nome: arquivo, colorido, total, contrato: resumo.contrato, valorFatura: resumo.total });
    faturas.push({ colorido, ...resumo });
  }

  const relatorio = montarRelatorio(acc, isTelefonia, setoresDesconhecidos);
  relatorio.valores = isTelefonia
    ? null
    : calcularValores(relatorio.dados, faturas, montarCentrosCusto(linhasSetores), lerRotulosCentroCusto(setores));

  // Planilha histórica com abas mensais: devolve ela mesma com o mês novo. Senão, relatório avulso.
  const historico = ehPdf(setores) || /\.csv$/i.test(setores.originalname)
    ? null
    : await atualizarHistorico(setores.buffer, relatorio, faturas).catch((erro) => {
        console.error('Não foi possível atualizar a planilha histórica:', erro);
        return null;
      });
  if (historico) {
    relatorio.planilha = historico.buffer.toString('base64');
    relatorio.nomePlanilha = setores.originalname.replace(/\.xlsx?$/i, '') + ` - ${historico.aba}.xlsx`;
    relatorio.avisos.historico = historico.avisos;
  } else {
    relatorio.planilha = gerarPlanilha(relatorio).toString('base64');
    relatorio.nomePlanilha = `rateio-${relatorio.tipo}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  }
  return relatorio;
}

module.exports = { gerarRateio };
