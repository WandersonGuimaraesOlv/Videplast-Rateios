const { z } = require('zod');

const extensao = (nome) => (nome.toLowerCase().match(/\.[a-z0-9]+$/) || [''])[0];

const arquivoCom = (rotulo, extensoes) =>
  z
    .array(z.object({ originalname: z.string(), buffer: z.instanceof(Buffer) }).passthrough(), {
      message: `Envie o arquivo de ${rotulo}.`,
    })
    .length(1, { message: `Envie o arquivo de ${rotulo}.` })
    .refine((arquivos) => extensoes.includes(extensao(arquivos[0].originalname)), {
      message: `${rotulo[0].toUpperCase()}${rotulo.slice(1)} deve ser ${extensoes.join(', ')}.`,
    })
    .refine((arquivos) => arquivos[0].buffer.length > 0, { message: `O arquivo de ${rotulo} está vazio.` });

// req.files do multer.fields()
const uploadRateioSchema = z.object(
  {
    medicao: arquivoCom('medição', ['.pdf', '.csv', '.xls', '.xlsx']),
    setores: arquivoCom('setores', ['.csv', '.xls', '.xlsx']),
  },
  { message: 'Ambos os arquivos são obrigatórios.' }
);

module.exports = { uploadRateioSchema };
