// Leitura dos arquivos enviados (CSV, Excel e PDF) para estruturas simples.
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const { decodificarTexto } = require('../../shared');

const ehCsv = (arquivo) => arquivo.originalname.toLowerCase().endsWith('.csv');
const ehPdf = (arquivo) =>
  arquivo.mimetype === 'application/pdf' || arquivo.originalname.toLowerCase().endsWith('.pdf');

/** CSV exportado do Excel em pt-BR (separador ";", aceita "," quando não houver ";"). */
function lerCsv(texto) {
  const linhas = texto.split(/\r?\n/);
  const separador = linhas[0].includes(';') ? ';' : ',';
  const cabecalhos = linhas[0].split(separador).map((h) => h.trim());
  const registros = [];
  for (let i = 1; i < linhas.length; i++) {
    if (!linhas[i].trim()) continue;
    const colunas = linhas[i].split(separador);
    const registro = {};
    cabecalhos.forEach((h, indice) => (registro[h] = (colunas[indice] || '').trim()));
    registros.push(registro);
  }
  return registros;
}

function lerPlanilha(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
}

/** Lê CSV ou Excel e devolve uma linha por objeto, com os cabeçalhos sem espaços nas pontas. */
function lerTabela(arquivo) {
  const linhas = ehCsv(arquivo) ? lerCsv(decodificarTexto(arquivo.buffer)) : lerPlanilha(arquivo.buffer);
  return linhas.map((linha) =>
    Object.fromEntries(Object.entries(linha).map(([chave, valor]) => [chave.trim(), valor]))
  );
}

// Aceita as formas de exportação do pdf-parse 1.x (função) e 2.x (classe)
async function extrairTextoPdf(buffer) {
  try {
    if (typeof pdfParse === 'function') return (await pdfParse(buffer)).text;
    if (pdfParse && typeof pdfParse.default === 'function') return (await pdfParse.default(buffer)).text;
    if (pdfParse && typeof pdfParse.PDFParse === 'function') {
      return (await new pdfParse.PDFParse().parse(buffer)).text;
    }
    throw new Error('A biblioteca pdf-parse não foi carregada como uma função válida.');
  } catch (err) {
    throw new Error('Erro ao processar PDF: ' + err.message);
  }
}

module.exports = { ehPdf, lerCsv, lerTabela, extrairTextoPdf };
