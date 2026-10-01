const { Router } = require('express');
const { verificarSupabase } = require('../modules/diagnostico');

const router = Router();

// GET /api/health — healthcheck do Docker e do Nginx
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// POST /api/teste-rateio — botão "Validar Conexão API/Supabase"
router.post('/teste-rateio', async (req, res) => res.json(await verificarSupabase()));

module.exports = router;
