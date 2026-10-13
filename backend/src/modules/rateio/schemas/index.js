const { z } = require('zod');
const { arquivoCom } = require('../../shared');

// Fatura P&B + colorida (e eventuais complementos) no mesmo envio
const MAX_MEDICOES = 4;

// req.files do multer.fields()
const uploadRateioSchema = z.object(
  {
    medicao: arquivoCom('medição', ['.pdf', '.csv', '.xls', '.xlsx'], MAX_MEDICOES),
    setores: arquivoCom('setores', ['.csv', '.xls', '.xlsx']),
  },
  { message: 'Ambos os arquivos são obrigatórios.' }
);

module.exports = { uploadRateioSchema, MAX_MEDICOES };
