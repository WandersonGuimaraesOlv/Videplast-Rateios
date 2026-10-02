// Leitura dos arquivos enviados (CSV, Excel e PDF) para estruturas simples.
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const { decodificarTexto } = require('../../shared');
const { temColuna } = require('../colunas');

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

// Aba "MM.AAAA" → número comparável (AAAAMM); outras abas → 0
const mesDaAba = (nome) => {
  const m = String(nome).match(/^\s*(\d{2})\.(\d{4})/);
  return m ? Number(m[2]) * 100 + Number(m[1]) : 0;
};

/** Linha de cabeçalho: a primeira (até a 15ª) com coluna de S/N ou de chip. */
const acharCabecalho = (linhas) =>
  linhas.slice(0, 15).findIndex((l) => temColuna(l.map(String), 'serie') || temColuna(l.map(String), 'chip'));

/**
 * Lê a planilha escolhendo a aba certa: a do mês mais recente ("08.2026") quando houver abas
 * mensais, senão a primeira que tiver coluna de S/N ou chip. O cabeçalho não precisa estar na linha 1.
 */
function lerPlanilha(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const abas = [...workbook.SheetNames].sort((a, b) => mesDaAba(b) - mesDaAba(a));
  for (const aba of abas) {
    const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[aba], { header: 1, defval: '' });
    const indice = acharCabecalho(linhas);
    if (indice < 0) continue;
    const cabecalhos = linhas[indice].map((c) => String(c).trim());
    return linhas
      .slice(indice + 1)
      .filter((l) => l.some((c) => String(c).trim() !== ''))
      .map((l) => Object.fromEntries(cabecalhos.map((c, i) => [c, l[i]]).filter(([c]) => c)));
  }
  // Sem coluna conhecida: devolve a primeira aba como está, para a mensagem de erro orientar o usuário
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
