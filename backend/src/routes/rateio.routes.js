const { Router } = require('express');
const multer = require('multer');
const config = require('../config');
const { uploadRateioSchema, gerarRateio } = require('../modules/rateio');
const { getZodErrorMessage } = require('../modules/shared');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.limiteUploadMb * 1024 * 1024, files: 2 },
});
const receberArquivos = upload.fields([
  { name: 'medicao', maxCount: 1 },
  { name: 'setores', maxCount: 1 },
]);

// POST /api/rateio/impressoras — medição (PDF/CSV/Excel) + lista de setores (CSV/Excel)
router.post('/impressoras', (req, res) => {
  receberArquivos(req, res, async (erroUpload) => {
    if (erroUpload) {
      const erro =
        erroUpload.code === 'LIMIT_FILE_SIZE'
          ? `Arquivo maior que ${config.limiteUploadMb} MB.`
          : 'Falha no envio: ' + erroUpload.message;
      return res.status(400).json({ sucesso: false, erro });
    }

    const parsed = uploadRateioSchema.safeParse(req.files || {});
    if (!parsed.success) {
      return res.status(400).json({ sucesso: false, erro: getZodErrorMessage(parsed.error) });
    }

    try {
      const relatorio = await gerarRateio({
        medicao: parsed.data.medicao[0],
        setores: parsed.data.setores[0],
      });
      return res.json({ sucesso: true, ...relatorio });
    } catch (error) {
      console.error('Erro no processamento do rateio:', error);
      return res.status(422).json({ sucesso: false, erro: error.message });
    }
  });
});

module.exports = router;
