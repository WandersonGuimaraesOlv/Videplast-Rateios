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

// Campos de texto do mesmo formulário (req.body do multer)
const opcoesTelefoniaSchema = z.object({
  // CC que recebe inteiro o valor da fatura fora das linhas (ex.: multa); vazio = rateio proporcional
  ccValorGeral: z
    .string()
    .trim()
    .max(20, { message: 'Centro de custo do valor fora das linhas: no máximo 20 caracteres.' })
    .regex(/^[0-9A-Za-z]*$/, { message: 'Centro de custo do valor fora das linhas: use só letras e números (ex.: 1005PAUX50).' })
    .optional()
    .default(''),
});

module.exports = { uploadTelefoniaSchema, opcoesTelefoniaSchema };
