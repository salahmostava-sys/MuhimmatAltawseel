const { ensurePostRequest } = require('../_lib');
const { createRequire } = require('node:module');
const { salaryEngineHandler } = createRequire(__dirname)('../../server/lib/handlers.js');

module.exports = async function handler(req, res) {
  if (!ensurePostRequest(req, res)) return;
  return salaryEngineHandler(req, res);
};
