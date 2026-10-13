const { z } = require('zod');

/**
 * Extrai a primeira mensagem de erro amigável de um ZodError.
 * @param {import('zod').ZodError} error
 * @returns {string}
 */
function getZodErrorMessage(error) {
  if (!error) return 'Dados inválidos.';
  if (Array.isArray(error.issues) && error.issues.length > 0) return error.issues[0].message;
  return error.message || 'Dados inválidos.';
}

const extensao = (nome) => (nome.toLowerCase().match(/\.[a-z0-9]+$/) || [''])[0];

/**
 * Schema de um campo de upload do multer.fields(): de 1 a `maximo` arquivos, com as
 * extensões aceitas e sem arquivo vazio.
 * @param {string} rotulo nome do arquivo nas mensagens ("medição", "fatura")
 * @param {string[]} extensoes ex.: ['.pdf', '.csv']
 */
const arquivoCom = (rotulo, extensoes, maximo = 1) =>
  z
    .array(z.object({ originalname: z.string(), buffer: z.instanceof(Buffer) }).passthrough(), {
      message: `Envie o arquivo de ${rotulo}.`,
    })
    .min(1, { message: `Envie o arquivo de ${rotulo}.` })
    .max(maximo, { message: `Envie no máximo ${maximo} arquivo(s) de ${rotulo}.` })
    .refine((arquivos) => arquivos.every((a) => extensoes.includes(extensao(a.originalname))), {
      message: `${rotulo[0].toUpperCase()}${rotulo.slice(1)} deve ser ${extensoes.join(', ')}.`,
    })
    .refine((arquivos) => arquivos.every((a) => a.buffer.length > 0), {
      message: `O arquivo de ${rotulo} está vazio.`,
    });

module.exports = { getZodErrorMessage, arquivoCom };
