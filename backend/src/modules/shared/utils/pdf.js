const pdfParse = require('pdf-parse');

/**
 * Extrai o texto de um PDF. Aceita as formas de exportação do pdf-parse 1.x (função) e
 * 2.x (classe).
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extrairTextoPdf(buffer) {
  // Buffers pequenos do Node ficam dentro de um pool compartilhado (byteOffset ≠ 0) e o
  // pdf.js do pdf-parse 1.x lê o ArrayBuffer inteiro ignorando o offset ("bad XRef entry"
  // em PDFs pequenos vindos do upload). Uma cópia própria evita isso.
  const dados =
    buffer.byteOffset === 0 && buffer.byteLength === buffer.buffer.byteLength ? buffer : new Uint8Array(buffer);
  try {
    if (typeof pdfParse === 'function') return (await pdfParse(dados)).text;
    if (pdfParse && typeof pdfParse.default === 'function') return (await pdfParse.default(dados)).text;
    if (pdfParse && typeof pdfParse.PDFParse === 'function') {
      return (await new pdfParse.PDFParse().parse(dados)).text;
    }
    throw new Error('A biblioteca pdf-parse não foi carregada como uma função válida.');
  } catch (err) {
    throw new Error('Erro ao processar PDF: ' + err.message);
  }
}

module.exports = { extrairTextoPdf };
