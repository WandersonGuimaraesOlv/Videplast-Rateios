/**
 * Extrai a primeira mensagem de erro amigável de um ZodError.
 * @param {import('zod').ZodError} error
 * @returns {string}
 */
function getZodErrorMessage(error) {
  if (!error) return 'Dados inválidos.';
  if (Array.isArray(error.issues) && error.issues.length > 0) return error.issues[0].message;
  return error.message || 'Dados inválidos.';
}

module.exports = { getZodErrorMessage };
