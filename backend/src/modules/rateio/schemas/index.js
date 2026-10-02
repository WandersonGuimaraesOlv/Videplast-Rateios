const { z } = require('zod');

// Fatura P&B + colorida (e eventuais complementos) no mesmo envio
const MAX_MEDICOES = 4;

const extensao = (nome) => (nome.toLowerCase().match(/\.[a-z0-9]+$/) || [''])[0];

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

// req.files do multer.fields()
const uploadRateioSchema = z.object(
  {
    medicao: arquivoCom('medição', ['.pdf', '.csv', '.xls', '.xlsx'], MAX_MEDICOES),
    setores: arquivoCom('setores', ['.csv', '.xls', '.xlsx']),
  },
  { message: 'Ambos os arquivos são obrigatórios.' }
);

module.exports = { uploadRateioSchema, MAX_MEDICOES };
