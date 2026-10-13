const { Router } = require('express');
const multer = require('multer');
const config = require('../config');
const { uploadTelefoniaSchema, gerarRateioTelefonia } = require('../modules/telefonia');
const { getZodErrorMessage } = require('../modules/shared');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.limiteUploadMb * 1024 * 1024, files: 2 },
});
const receberArquivos = upload.fields([
  { name: 'fatura', maxCount: 1 },
  { name: 'controle', maxCount: 1 },
]);

// POST /api/rateio/telefonia — fatura TIM (PDF) + Controle de Chips (Excel/CSV)
router.post('/telefonia', (req, res) => {
  receberArquivos(req, res, async (erroUpload) => {
    if (erroUpload) {
      const erro =
        erroUpload.code === 'LIMIT_FILE_SIZE'
          ? `Arquivo maior que ${config.limiteUploadMb} MB.`
          : erroUpload.code === 'LIMIT_UNEXPECTED_FILE' || erroUpload.code === 'LIMIT_FILE_COUNT'
            ? 'Envie só a fatura (PDF) e o Controle de Chips (Excel).'
            : 'Falha no envio: ' + erroUpload.message;
      return res.status(400).json({ sucesso: false, erro });
    }

    const parsed = uploadTelefoniaSchema.safeParse(req.files || {});
    if (!parsed.success) {
      return res.status(400).json({ sucesso: false, erro: getZodErrorMessage(parsed.error) });
    }

    try {
      const rateio = await gerarRateioTelefonia({
        fatura: parsed.data.fatura[0],
        controle: parsed.data.controle[0],
      });
      return res.json({ sucesso: true, ...rateio });
    } catch (error) {
      console.error('Erro no rateio de telefonia:', error);
      return res.status(422).json({ sucesso: false, erro: error.message });
    }
  });
});

module.exports = router;
