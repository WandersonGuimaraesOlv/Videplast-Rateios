const express = require('express');
const cors = require('cors');

// Rotas por domínio
const diagnosticoRoutes = require('./routes/diagnostico.routes');
const rateioRoutes = require('./routes/rateio.routes');
const telefoniaRoutes = require('./routes/telefonia.routes');

const app = express();
app.use(cors());
app.use(express.json());

// Registro de rotas
app.use('/api', diagnosticoRoutes);
app.use('/api/rateio', rateioRoutes);
app.use('/api/rateio', telefoniaRoutes);

module.exports = app;
