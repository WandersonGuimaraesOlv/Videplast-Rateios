const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { atualizarHistorico } = require('../src/modules/rateio/services/historico-service');

async function planilhaHistorica() {
  const wb = new ExcelJS.Workbook();
  const resumo = wb.addWorksheet('Resumo');
  resumo.addRow(['Impressoras', 'Nº Serie', new Date(Date.UTC(2026, 7, 1)), 'Quantidade autorizada', 'Diferença']);
  resumo.addRow(['PCP', 'X', { formula: "IFERROR(VLOOKUP(A2,'08.2026'!A1:F18,5,),0)", result: 10 }, 50, { formula: 'C2-D2', result: -40 }]);
  resumo.addRow(['ARTES - COLORIDA', 'Y', { formula: "IFERROR(VLOOKUP(A3,'08.2026'!A1:F18,5,),0)", result: 5 }, 20, { formula: 'C3-D3', result: -15 }]);
  resumo.addRow(['', '', { formula: 'SUM(C2:C3)', result: 15 }, { formula: 'SUM(D2:D3)', result: 70 }]);
  resumo.getColumn(5).width = 24;
  resumo.getColumn(6).hidden = true;
  const mes = wb.addWorksheet('08.2026');
  mes.addRow(['Impressoras', 'Nº Serie', 'IP', 'Modelo', 'Paginas', 'Custo pagina', 'Custo Locação', 'Total', 'Contro de Custo', 'Rateio']);
  mes.addRow(['PCP', 'R4P0661312', '', 'M3655', 10, 0.07, 0, { formula: '(E2*F2)+G2' }, '1005PAUX52', { formula: 'H2/($H$4-$H$3)' }]);
  mes.addRow(['ARTES - COLORIDA', 'AK9', '', 'IRC', 5, 0.4, 500, { formula: '(E3*F3)+G3' }, '1005PAUX51', 1]);
  mes.addRow(['TOTAL DE PÁGINAS', '', '', '', { formula: 'SUM(E2:E3)' }, 'TOTAL R$', '', { formula: 'SUM(H2:H3)' }]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('planilha histórica: cria a aba do mês novo e a coluna no Resumo', async () => {
  const relatorio = {
    dados: [
      { setor: 'PCP', total: 6420 },
      { setor: 'ARTES - COLORIDA', total: 2296 },
    ],
    valores: null,
    equipamentos: [{ serie: 'R4P.066.131.2', contrato: '21312 - P&B', setor: 'PCP', valor: 6420, arquivo: 'PB.pdf' }],
  };
  const faturas = [
    { colorido: false, mes: '09.2026', precoPagina: 0.07457, locacao: 0, total: 478.74 },
    { colorido: true, mes: '09.2026', precoPagina: 0.42616, locacao: 532.7, total: 1511.16 },
  ];
  const resultado = await atualizarHistorico(await planilhaHistorica(), relatorio, faturas);
  assert.equal(resultado.aba, '09.2026');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(resultado.buffer);
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Resumo', '09.2026', '08.2026']);

  const mes = wb.getWorksheet('09.2026');
  assert.equal(mes.getCell('E2').value, 6420);
  assert.equal(mes.getCell('F2').value, 0.07457);
  assert.equal(mes.getCell('E3').value, 2296);
  assert.equal(mes.getCell('F3').value, 0.42616);
  assert.equal(mes.getCell('G3').value, 532.7);
  assert.equal(mes.getCell('H2').formula, '(E2*F2)+G2');
  // A aba do mês anterior fica como estava
  assert.equal(wb.getWorksheet('08.2026').getCell('E2').value, 10);

  const resumo = wb.getWorksheet('Resumo');
  assert.equal(resumo.getCell('D1').value.toISOString().slice(0, 7), '2026-09');
  assert.match(resumo.getCell('D2').formula, /'09\.2026'!/);
  assert.equal(resumo.getCell('E1').value, 'Quantidade autorizada');
  assert.equal(resumo.getCell('F2').formula, 'D2-E2');
  assert.equal(resumo.getCell('D4').formula, 'SUM(D2:D3)');
  assert.equal(resumo.getCell('E4').formula, 'SUM(E2:E3)');
  // "Diferença" continua visível e a coluna oculta continua oculta
  assert.equal(resumo.getColumn(6).width, 24);
  assert.equal(resumo.getColumn(6).hidden, false);
  assert.equal(resumo.getColumn(7).hidden, true);
});

test('planilha histórica: crédito de cópias na fatura faz o Total da aba bater com a nota', async () => {
  const relatorio = { dados: [{ setor: 'PCP', total: 6420 }, { setor: 'ARTES - COLORIDA', total: 0 }], valores: null, equipamentos: [] };
  // 6.420 lidas, 5.000 cobradas × 0,07457 = 372,85
  const faturas = [{ colorido: false, mes: '09.2026', precoPagina: 0.07457, locacao: 0, total: 372.85, copiasCobradas: 5000 }];
  const resultado = await atualizarHistorico(await planilhaHistorica(), relatorio, faturas);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(resultado.buffer);
  const mes = wb.getWorksheet('09.2026');
  assert.equal(mes.getCell('F2').formula, '372.85/6420');
  assert.ok(Math.abs(mes.getCell('H2').result - 372.85) < 0.005);
  assert.match(mes.getCell('A5').text, /6\.420 páginas lidas, 1\.420 de crédito, 5\.000 cobradas/);
});

test('planilha sem abas mensais não é tratada como histórico', async () => {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Setores').addRow(['S/N', 'Setor']);
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  assert.equal(await atualizarHistorico(buffer, { dados: [] }, [{ mes: '09.2026' }]), null);
});
