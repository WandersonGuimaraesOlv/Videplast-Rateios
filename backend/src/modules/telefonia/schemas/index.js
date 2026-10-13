const { z } = require('zod');
const { arquivoCom } = require('../../shared');

// req.files do multer.fields(): PDF da fatura TIM + planilha do Controle de Chips
const uploadTelefoniaSchema = z.object(
  {
    fatura: arquivoCom('fatura', ['.pdf']),
    controle: arquivoCom('Controle de Chips', ['.xlsx', '.xls', '.csv']),
  },
  { message: 'Envie a fatura (PDF) e o Controle de Chips (Excel).' }
);

module.exports = { uploadTelefoniaSchema };
