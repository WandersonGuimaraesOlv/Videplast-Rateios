const config = require('./config');
const app = require('./app');

app.listen(config.porta, () => console.log(`[Servidor] Ativo na porta ${config.porta}`));
