const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { criarPdf, linhasFaturaTim, criarXlsx, CABECALHO_CONTROLE, linhaControle } = require('./support/arquivos');

let servidor;
let base;

test.before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => servidor.close());

const enviar = (arquivos) => {
  const form = new FormData();
  for (const [campo, nome, conteudo] of arquivos) form.append(campo, new Blob([conteudo]), nome);
  return fetch(`${base}/api/rateio/impressoras`, { method: 'POST', body: form });
};

test('GET /api/health responde ok', async () => {
  const resposta = await fetch(`${base}/api/health`);
  assert.equal(resposta.status, 200);
  assert.deepEqual(await resposta.json(), { status: 'ok' });
});

test('POST /api/teste-rateio sem Supabase configurado avisa em vez de quebrar', async () => {
  const resposta = await fetch(`${base}/api/teste-rateio`, { method: 'POST' });
  const corpo = await resposta.json();
  assert.equal(typeof corpo.sucesso, 'boolean');
});

test('POST /api/rateio/impressoras exige os dois arquivos', async () => {
  const resposta = await enviar([['setores', 'setores.csv', 'S/N;Setor\nA1;PCP']]);
  assert.equal(resposta.status, 400);
  assert.match((await resposta.json()).erro, /medição/);
});

test('POST /api/rateio/impressoras recusa extensão inválida', async () => {
  const resposta = await enviar([
    ['medicao', 'medicao.txt', 'x'],
    ['setores', 'setores.csv', 'S/N;Setor\nA1;PCP'],
  ]);
  assert.equal(resposta.status, 400);
});

test('POST /api/rateio/impressoras consolida CSV em latin1 (Excel pt-BR)', async () => {
  const setores = Buffer.from('S/N;Setor\nA1;Expedição\nB2;PCP\n', 'latin1');
  const medicao = Buffer.from('S/N;Páginas/Mês\nA1;100\nB2;1.500\n', 'latin1');
  const resposta = await enviar([
    ['medicao', 'medicao.csv', medicao],
    ['setores', 'setores.csv', setores],
  ]);
  const corpo = await resposta.json();
  assert.equal(resposta.status, 200, JSON.stringify(corpo));
  assert.equal(corpo.sucesso, true);
  assert.equal(corpo.dados.find((d) => d.setor === 'EXPEDIÇÃO').total, 100);
  assert.equal(corpo.totalGeral, 1600);
});

test('POST /api/rateio/impressoras com o Controle de Chips manda usar a aba Telefonia (TIM)', async () => {
  const fatura = criarPdf(linhasFaturaTim({ porAcesso: [['Mensalidades e Franquias', '64999990001', '25,90']], total: '25,90' }));
  const controle = criarXlsx([CABECALHO_CONTROLE, linhaControle(['64999990001', 'Fulano', 'Expedição', '1005COML08'])]);
  const resposta = await enviar([
    ['medicao', 'fatura.pdf', fatura],
    ['setores', 'controle.xlsx', controle],
  ]);
  const corpo = await resposta.json();
  assert.equal(resposta.status, 422, JSON.stringify(corpo));
  assert.match(corpo.erro, /Controle de Chips/);
  assert.match(corpo.erro, /"Telefonia \(TIM\)"/);
});
