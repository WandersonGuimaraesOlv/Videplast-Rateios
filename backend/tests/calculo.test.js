const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detectarTelefonia,
  montarMapaSetores,
  somarMedicaoTexto,
  somarMedicaoTabela,
  montarRelatorio,
  lerCsv,
} = require('../src/modules/rateio');
const { paraNumero } = require('../src/modules/shared');

const totalDe = (relatorio, setor) => relatorio.dados.find((d) => d.setor === setor).total;

test('paraNumero entende formatos brasileiros', () => {
  assert.equal(paraNumero('12,50'), 12.5);
  assert.equal(paraNumero('1.234,56'), 1234.56);
  assert.equal(paraNumero('R$ 1.234,56'), 1234.56);
  assert.equal(paraNumero('1.234'), 1234);
  assert.equal(paraNumero('12.5'), 12.5);
  assert.equal(paraNumero(300), 300);
  assert.equal(paraNumero(''), 0);
  assert.equal(paraNumero(undefined), 0);
});

test('lerCsv aceita ; e quebras de linha do Windows', () => {
  const linhas = lerCsv('S/N;Setor\r\nabc1 ;pcp\r\n\r\nXYZ;Guarita\r\n');
  assert.deepEqual(linhas, [
    { 'S/N': 'abc1', Setor: 'pcp' },
    { 'S/N': 'XYZ', Setor: 'Guarita' },
  ]);
});

test('impressoras: soma páginas da planilha por setor e avisa itens sem setor', () => {
  const setores = [
    { 'S/N': 'abc1', Setor: 'pcp' },
    { SerialNumber: 'XYZ9', Setor: 'Guarita' },
    { 'S/N': 'Q1', Setor: 'Diretoria' },
  ];
  assert.equal(detectarTelefonia(setores), false);
  const { mapa, setoresDesconhecidos } = montarMapaSetores(setores, false);
  assert.deepEqual(setoresDesconhecidos, ['DIRETORIA']);

  const medicao = [
    { 'S/N': 'ABC1', 'Páginas/Mês': '1.200' },
    { 'S/N': 'abc1', Páginas: 300 },
    { 'S/N': 'XYZ9', Total: '50' },
    { 'S/N': 'Q1', Total: '10' },
    { 'S/N': 'SEM-CADASTRO', Total: '999' },
  ];
  const relatorio = montarRelatorio(somarMedicaoTabela(medicao, mapa, false), false, setoresDesconhecidos);

  assert.equal(relatorio.tipo, 'impressoras');
  assert.equal(totalDe(relatorio, 'PCP'), 1500);
  assert.equal(totalDe(relatorio, 'GUARITA'), 50);
  assert.equal(relatorio.totalGeral, 1550);
  assert.equal(relatorio.dados.length, 16);
  assert.deepEqual(relatorio.avisos.itensSemSetor, ['SEMCADASTRO']);
  assert.equal(relatorio.avisos.valorForaDoRelatorio, 10);
});

test('telefonia: valores com vírgula decimal são somados corretamente', () => {
  const setores = [
    { 'Número do Chip': '62999990001', Setor: 'Expedição' },
    { 'Número do Chip': '62999990002', Setor: 'Expedição' },
  ];
  assert.equal(detectarTelefonia(setores), true);
  const { mapa } = montarMapaSetores(setores, true);
  const medicao = [
    { 'Número do Chip': '62999990001', Valor: '12,50' },
    { 'Número do Chip': '62999990002', Valor: '1.000,25' },
  ];
  const relatorio = montarRelatorio(somarMedicaoTabela(medicao, mapa, true), true);
  assert.equal(relatorio.tipo, 'telefonia');
  assert.equal(totalDe(relatorio, 'EXPEDIÇÃO'), 1012.75);
  assert.equal(relatorio.totalGeral, 1012.75);
});

test('PDF: chave mais longa vence e pega o último número da linha', () => {
  const { mapa } = montarMapaSetores(
    [
      { 'S/N': 'ABC12', Setor: 'PCP' },
      { 'S/N': 'ABC123', Setor: 'PCM' },
    ],
    false
  );
  const texto = ['Equipamento ABC123 Contador 1.250', 'Equipamento ABC12 Contador 300', 'Rodapé 99'].join('\n');
  const relatorio = montarRelatorio(somarMedicaoTexto(texto, mapa, false), false);
  assert.equal(totalDe(relatorio, 'PCM'), 1250);
  assert.equal(totalDe(relatorio, 'PCP'), 300);
  assert.equal(relatorio.totalGeral, 1550);
});

test('PDF de telefonia: pega o valor em reais da linha', () => {
  const { mapa } = montarMapaSetores([{ 'Número do Chip': '62999990001', Setor: 'PCP' }], true);
  const texto = 'Linha 62999990001 Plano Empresa R$ 1.049,90';
  const relatorio = montarRelatorio(somarMedicaoTexto(texto, mapa, true), true);
  assert.equal(totalDe(relatorio, 'PCP'), 1049.9);
});

test('demonstrativo de faturamento: lê cópias das linhas grudadas do PDF', () => {
  const { lerDemonstrativo, ehColorido } = require('../src/modules/rateio');
  const texto = [
    'DEMONSTRATIVO DE FATURAMENTO - 09/2026',
    '21312 - VIDEPLAST - P&B',
    '016.7PH.H0C.1V533006MX611DE0,00 0254.013257.938 03.925',
    '016.7PH.H0C.X3934528MX611DE0,00108.299108.299 0 0',
    '016.7PH.H0C.X6033326MX611DE0,0090.07893.4104.4233.332',
    '32M.008.78 .   41840IRC32260,00126.523130.291 03.768',
    '514.45H.H22.5MD28786MS610DN0,00 0111.823112.395 0572',
    'R4P.066.131.2  37734M3655ID0,00 0413.964420.384 06.420',
    'Subtotal230,000',
  ].join('\n');
  assert.equal(lerDemonstrativo(texto)[3].serieImpressa, '32M.008.78');
  assert.deepEqual(lerDemonstrativo(texto).map(({ serie, copias }) => ({ serie, copias })), [
    { serie: '0167PHH0C1V5', copias: 3925 },
    { serie: '0167PHH0CX39', copias: 0 },
    { serie: '0167PHH0CX60', copias: 3332 },
    { serie: '32M00878', copias: 3768 },
    { serie: '51445HH225MD', copias: 572 },
    { serie: 'R4P0661312', copias: 6420 },
  ]);
  assert.equal(ehColorido(texto), false);
  assert.equal(ehColorido('22315 - VIDEPLAST INDUSTRIA - COLOR'), true);
});

test('planilha "Rateio impressão": várias séries por célula e prefixo diferente da fatura', () => {
  const setores = [
    { Impressoras: 'ACABAMENTO', 'Nº Serie': '45146PHH38N9R/451445HH23PWX' },
    { Impressoras: 'ARTES', 'Nº Serie': 'AK99000084D0/32M00878' },
    { Impressoras: 'EXPEDIÇÃO', 'Nº Serie': '70167PHH0DLXG' },
  ];
  const { mapa } = montarMapaSetores(setores, false);
  const leituras = [
    'DEMONSTRATIVO DE FATURAMENTO',
    '514.6PH.H38.N9R32814MS610DN0,00 0149.709153.628 03.919',
    '016.7PH.H0D.LXG34109MX611DE0,00 0209.208212.770 03.562',
    '32M.008.78 .   41840IRC32260,00126.523130.291 03.768',
  ].join('\n');
  const pb = montarRelatorio(somarMedicaoTexto(leituras, mapa, false), false);
  assert.equal(totalDe(pb, 'ACABAMENTO'), 3919);
  assert.equal(totalDe(pb, 'EXPEDIÇÃO'), 3562);
  assert.equal(totalDe(pb, 'ARTES'), 3768);

  // Na fatura colorida o mesmo equipamento vai para ARTES - COLORIDA
  const cor = montarRelatorio(somarMedicaoTexto(leituras, mapa, false, { colorido: true }), false);
  assert.equal(totalDe(cor, 'ARTES'), 0);
  assert.equal(totalDe(cor, 'ARTES - COLORIDA'), 3768);
});

test('lerTabela escolhe a aba do mês mais recente e acha o cabeçalho fora da linha 1', () => {
  const XLSX = require('xlsx');
  const { lerTabela } = require('../src/modules/rateio');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Impressoras', 'Nº Serie'], ['PCP', 'VELHO1234']]), 'Resumo');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Impressoras', 'Nº Serie'], ['PCP', 'JULHO1234']]), '07.2026');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Rateio de agosto'], [], ['Impressoras', 'Nº Serie'], ['PCP', 'AGOSTO123'], ['', '']]),
    '08.2026'
  );
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  assert.deepEqual(lerTabela({ originalname: 'Rateio impressão.xlsx', buffer }), [
    { Impressoras: 'PCP', 'Nº Serie': 'AGOSTO123' },
  ]);
});

test('valores a descontar: total da fatura dividido por centro de custo na proporção das páginas', () => {
  const { calcularValores } = require('../src/modules/rateio/services/valores-service');
  const dados = [
    { setor: 'IMPRESSÃO', total: 100 },
    { setor: 'SALA DE TINTAS', total: 100 },
    { setor: 'PCP', total: 100 },
    { setor: 'ARTES - COLORIDA', total: 50 },
  ];
  const centros = { IMPRESSÃO: '1005PIMP01', 'SALA DE TINTAS': '1005PIMP01', PCP: '1005PAUX52', 'ARTES - COLORIDA': '1005PAUX51' };
  const rotulos = [{ centroCusto: '1005PIMP01', rotulo: 'Impressão/ Sala de tintas' }];
  const faturas = [{ colorido: false, total: 100 }, { colorido: true, total: 1511.16 }];
  const { linhas, total } = calcularValores(dados, faturas, centros, rotulos);
  assert.deepEqual(
    linhas.map((l) => [l.centroCusto, l.setor, l.paginas, l.valor]),
    [
      ['1005PIMP01', 'Impressão/ Sala de tintas', 200, 66.67],
      ['1005PAUX52', 'PCP', 100, 33.33],
      ['1005PAUX51', 'Artes - Colorida', 50, 1511.16],
    ]
  );
  assert.equal(total, 1611.16);
  assert.equal(calcularValores(dados, [{ colorido: false, total: null }], centros), null);
});
