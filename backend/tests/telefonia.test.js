const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');

const { lerFaturaTim, lerControleChips, calcularRateio, gerarPlanilhaRateio, nomeArquivoPlanilha } = require('../src/modules/telefonia');
const { separarNumeroEValor } = require('../src/modules/telefonia/services/fatura-tim-service');
const { extrairCentroCusto, normalizarTelefone } = require('../src/modules/telefonia/services/controle-chips-service');
const { distribuirProporcional, formatarTelefone } = require('../src/modules/telefonia/services/rateio-telefonia-service');
const { criarCadastroCentrosCusto } = require('../src/modules/centros-custo');
const { linhasFaturaTim, criarXlsx, CABECALHO_CONTROLE, linhaControle } = require('./support/arquivos');

const fatura = (dados) => lerFaturaTim(linhasFaturaTim(dados).join('\n'));
const controle = (linhas) => lerControleChips(criarXlsx([CABECALHO_CONTROLE, ...linhas.map(linhaControle)]), 'controle.xlsx');

describe('fatura TIM', () => {
  test('separa número e valor colados (celular, fixo, milhar e crédito)', () => {
    assert.deepEqual(separarNumeroEValor('6499903955325,90'), { numero: '64999039553', centavos: 2590 });
    assert.deepEqual(separarNumeroEValor('649994730096,09'), { numero: '64999473009', centavos: 609 });
    assert.deepEqual(separarNumeroEValor('64322211111.234,56'), { numero: '6432221111', centavos: 123456 });
    assert.deepEqual(separarNumeroEValor('64999039553-12,20'), { numero: '64999039553', centavos: -1220 });
  });

  test('lê o resumo do detalhamento: soma por linha, categorias, gerais e total', () => {
    const f = fatura({
      porAcesso: [
        ['Uso do', '64999990001', '6,09'],
        ['Mensalidades e Franquias', '64999990001', '25,90'],
        ['Mensalidades e Franquias', '64999990002', '25,90'],
        ['Outros Créditos e Débitos', '64999990002', '12,20'],
        ['Cobranças De Outras Operadoras', '64999990002', '5,22'],
      ],
      gerais: [['Outros Créditos e Débitos', '12,20']],
      total: '75,31',
    });
    assert.equal(f.totalCentavos, 7531);
    assert.equal(f.linhas.size, 2);
    assert.deepEqual(f.linhas.get('64999990001'), { totalCentavos: 3199, categorias: { uso: 609, mensalidades: 2590 } });
    assert.deepEqual(f.linhas.get('64999990002').categorias, { mensalidades: 2590, outros: 1220, outrasOperadoras: 522 });
    assert.deepEqual(f.geraisCliente, [{ categoria: 'Outros Créditos e Débitos', centavos: 1220 }]);
    assert.equal(f.cabecalho.referencia, 'OUT/26');
    assert.equal(f.cabecalho.vencimento, '20/10/2026');
    assert.equal(f.cabecalho.numeroFatura, '1234567890');
    assert.equal(f.cabecalho.quantidadeAcessos, 2);
  });

  test('PDF sem o resumo do detalhamento é recusado com mensagem clara', () => {
    assert.throws(() => lerFaturaTim('Fatura qualquer\nsem resumo'), { message: /Resumo do Detalhamento/ });
  });
});

describe('controle de chips', () => {
  test('normaliza telefone e extrai o código do centro de custo', () => {
    assert.equal(normalizarTelefone('64-912345678'), '64912345678');
    assert.equal(normalizarTelefone('+55 (64) 91234-5678'), '64912345678');
    assert.equal(normalizarTelefone('123'), '');
    assert.equal(extrairCentroCusto('1005COML06 (FATURAMENTO)'), '1005COML06');
    assert.equal(extrairCentroCusto(' 1005pauX53 '), '1005PAUX53');
    assert.equal(extrairCentroCusto(''), '');
  });

  test('lê as colunas pelo nome do cabeçalho e ignora linhas sem número', () => {
    const buffer = criarXlsx([
      CABECALHO_CONTROLE,
      linhaControle(['64-999990001', 'Fulano', 'Transporte', '1005COML04', '1005COML05']),
      ['', '', '', '', 'Reposição de chips', '', '', '', ''],
    ]);
    const { chips, duplicados } = lerControleChips(buffer, 'controle.xlsx');
    assert.equal(chips.size, 1);
    assert.deepEqual(chips.get('64999990001'), {
      numero: '64999990001', responsavel: 'Fulano', setor: 'Transporte',
      centroCusto: '1005COML04', centroCustoAntigo: '1005COML05', plano: '10GB - R$ 30,90',
    });
    assert.deepEqual(duplicados, []);
  });

  test('planilha sem a coluna de centro de custo atualizado é recusada', () => {
    const buffer = criarXlsx([['Número do Chip', 'Centro de Custo Antigo'], ['64999990001', '1005']]);
    assert.throws(() => lerControleChips(buffer, 'c.xlsx'), { message: /Centro de Custo ATUALIZADO/ });
  });

  test('aceita o controle em CSV salvo pelo Excel (Windows-1252, separador ;)', () => {
    const csv = Buffer.from(
      'Número do Chip;Colaborador Responsavel ATUAL;Setor ATUAL;Centro de Custo ATUALIZADO\n64-999990001;João;Expedição;1005COML08\n',
      'latin1'
    );
    const { chips } = lerControleChips(csv, 'controle.csv');
    assert.deepEqual(chips.get('64999990001'), {
      numero: '64999990001', responsavel: 'João', setor: 'Expedição',
      centroCusto: '1005COML08', centroCustoAntigo: '', plano: '',
    });
  });
});

describe('rateio de telefonia', () => {
  test('agrupa pelo centro de custo atualizado e fecha com o total da fatura', () => {
    const r = calcularRateio(
      fatura({
        porAcesso: [
          ['Mensalidades e Franquias', '64999990001', '25,90'],
          ['Uso do', '64999990001', '6,09'],
          ['Mensalidades e Franquias', '64999990002', '25,90'],
          ['Mensalidades e Franquias', '64999990003', '25,90'],
        ],
        total: '83,79',
      }),
      controle([
        ['64999990001', 'Ana', 'Transporte', '1005COML04'],
        ['64999990002', 'Bia', 'Transporte', '1005COML04'],
        ['64999990003', 'Caio', 'RH', '1005ADMI09'],
      ]),
    );
    assert.equal(r.conferido, true);
    assert.equal(r.totalRateado, 83.79);
    assert.deepEqual(r.grupos.map((g) => [g.setor, g.centroCusto, g.total]), [
      ['RH', '1005ADMI09', 25.9],
      ['Transporte', '1005COML04', 57.89],
    ]);
    const transporte = r.grupos[1];
    assert.ok(Math.abs(transporte.percentual - 57.89 / 83.79) < 1e-12);
    assert.equal(transporte.linhas[0].numeroFormatado, '(64) 99999-0001');
    assert.ok(Math.abs(r.grupos.reduce((a, g) => a + g.percentual, 0) - 1) < 1e-12);
    assert.deepEqual(r.avisos, []);
  });

  test('linhas sem CC e fora do controle viram grupos separados com aviso', () => {
    const r = calcularRateio(
      fatura({
        porAcesso: [
          ['Mensalidades e Franquias', '64999990001', '10,00'],
          ['Mensalidades e Franquias', '64999990002', '20,00'],
          ['Mensalidades e Franquias', '64999990009', '30,00'],
        ],
        total: '60,00',
      }),
      controle([
        ['64999990001', 'Ana', 'Transporte', '1005COML04'],
        ['64999990002', 'Carla', 'Extrusão', '', '1005HACB02'],
        ['64999990005', 'Sem uso', 'Almoxarifado', '1005PAUX53'],
      ]),
    );
    assert.deepEqual(r.grupos.map((g) => [g.tipo, g.setor, g.total]), [
      ['centro_custo', 'Transporte', 10],
      ['sem_centro_custo', 'SEM CENTRO DE CUSTO', 20],
      ['nao_cadastrado', 'NÃO CADASTRADO NO CONTROLE', 30],
    ]);
    assert.equal(r.conferido, true);
    const tipos = r.avisos.map((a) => a.tipo);
    assert.deepEqual(tipos, ['sem_centro_custo', 'nao_cadastrado', 'sem_cobranca']);
    assert.match(r.avisos[0].itens[0], /Carla.*CC antigo: 1005HACB02/);
    assert.deepEqual(r.avisos[1].itens, ['(64) 99999-0009']);
  });

  test('valor da fatura fora das linhas é rateado proporcionalmente sem perder centavo', () => {
    const r = calcularRateio(
      fatura({
        porAcesso: [
          ['Mensalidades e Franquias', '64999990001', '10,00'],
          ['Mensalidades e Franquias', '64999990002', '20,00'],
        ],
        gerais: [['Outros Créditos e Débitos', '1,00']],
        total: '31,00',
      }),
      controle([
        ['64999990001', 'Ana', 'Transporte', '1005COML04'],
        ['64999990002', 'Caio', 'RH', '1005ADMI09'],
      ]),
    );
    assert.equal(r.conferido, true, 'soma dos grupos = 31,00');
    assert.deepEqual(r.grupos.map((g) => [g.centroCusto, g.subtotal, g.ajusteGeral, g.total]), [
      ['1005ADMI09', 20, 0.67, 20.67],
      ['1005COML04', 10, 0.33, 10.33],
    ]);
    assert.equal(r.avisos[0].tipo, 'valor_geral');
  });

  test('mesmo setor em centros de custo diferentes gera aviso', () => {
    const r = calcularRateio(
      fatura({
        porAcesso: [
          ['Mensalidades e Franquias', '64999990001', '10,00'],
          ['Mensalidades e Franquias', '64999990002', '10,00'],
        ],
        total: '20,00',
      }),
      controle([
        ['64999990001', 'Ana', 'Manutenção', '1005PAUX21'],
        ['64999990002', 'Caio', 'MANUTENCAO', '1007PAUX21'],
      ]),
    );
    const aviso = r.avisos.find((a) => a.tipo === 'setor_em_varios_cc');
    assert.ok(aviso);
    assert.match(aviso.itens[0], /1005PAUX21 \(1 linha\), 1007PAUX21 \(1 linha\)/);
  });

  test('com o cadastro de CCs: o CC é sempre o da coluna (só 1007→1005); o resto vira aviso', () => {
    const cadastro = criarCadastroCentrosCusto([
      { centro_custo: '1005PAUX21', setores: 'Manutencao', unidade: '1005' },
      { centro_custo: '1005PAUX41', setores: 'Pesquisa e Desenvolvimento', unidade: '1005' },
      { centro_custo: '1005COML05', setores: 'Assistencia Tecnica', unidade: '1005' },
      { centro_custo: '1005PAUX53', setores: 'Almoxarifado Central', unidade: '1005' },
      { centro_custo: '1005HACB02', setores: 'Pool Corte e Solda', unidade: '1005' },
    ]);
    const r = calcularRateio(
      fatura({
        porAcesso: [1, 2, 3, 4, 5, 6].map((n) => ['Mensalidades e Franquias', `6499999000${n}`, '10,00']),
        total: '60,00',
      }),
      controle([
        ['64999990001', 'Ana', 'Manutenção', '1005PAUX21'],
        ['64999990002', 'Caio', 'MANUTENCAO', '1007PAUX21'],
        ['64999990003', 'Dani', 'Pesquisa e Desenvolvimento', '1005COML05'],
        ['64999990004', 'Bruno', 'Almoxarifado Central', '', '100001234'],
        ['64999990005', 'Carla', 'Extrusão', '', '1005HACB02'],
        ['64999990006', 'Edu', 'Setor Novo', '1005ZZZZ01'],
      ]),
      cadastro,
    );
    assert.equal(r.conferido, true);
    assert.deepEqual(r.grupos.map((g) => [g.centroCusto, g.setor, g.cadastrado, g.total]), [
      ['1005COML05', 'Assistencia Tecnica', true, 10],
      ['1005PAUX21', 'Manutencao', true, 20],
      ['1005ZZZZ01', 'Setor Novo', false, 10],
      [null, 'SEM CENTRO DE CUSTO', null, 20],
    ], 'P&D fica no CC da coluna (1005COML05) e linha sem CC não é preenchida pelo setor');
    assert.deepEqual(r.grupos[1].linhas.map((l) => l.responsavel), ['Ana', 'Caio'],
      'em RV todo CC é 1005: 1007PAUX21 conta como 1005PAUX21 sem aviso');

    const aviso = (tipo) => r.avisos.find((a) => a.tipo === tipo);
    assert.deepEqual(r.avisos.map((a) => a.tipo), ['sem_centro_custo', 'cc_inexistente', 'setor_cc_divergente']);
    assert.deepEqual(aviso('sem_centro_custo').itens, [
      '(64) 99999-0004 — Bruno (Almoxarifado Central) · CC antigo: 100001234 (não existe no cadastro) · pelo setor, o CC seria 1005PAUX53 (Almoxarifado Central)',
      '(64) 99999-0005 — Carla (Extrusão) · CC antigo: 1005HACB02 (Pool Corte e Solda)',
    ]);
    assert.deepEqual(aviso('cc_inexistente').itens, ['1005ZZZZ01 — Setor Novo (1 linha)']);
    assert.deepEqual(aviso('setor_cc_divergente').itens, [
      'Pesquisa e Desenvolvimento: no cadastro é 1005PAUX41 (Pesquisa e Desenvolvimento); no controle está em 1005COML05 (Assistencia Tecnica) — 1 linha',
    ]);
  });

  test('distribuição proporcional e formatação de telefone', () => {
    assert.deepEqual(distribuirProporcional(100, [1, 1, 1]), [34, 33, 33]);
    assert.deepEqual(distribuirProporcional(-100, [1, 1, 1]), [-34, -33, -33]);
    assert.deepEqual(distribuirProporcional(0, [5, 5]), [0, 0]);
    assert.equal(formatarTelefone('6432221111'), '(64) 3222-1111');
  });
});

describe('planilha do rateio', () => {
  test('gera xlsx no formato da planilha manual, com fórmulas e tabela final', () => {
    const r = calcularRateio(
      fatura({
        porAcesso: [
          ['Mensalidades e Franquias', '64999990001', '25,90'],
          ['Mensalidades e Franquias', '64999990002', '25,90'],
          ['Mensalidades e Franquias', '64999990003', '30,00'],
        ],
        total: '81,80',
      }),
      controle([
        ['64999990001', 'Ana', 'Transporte', '1005COML04'],
        ['64999990002', 'Bia', 'Transporte', '1005COML04'],
        ['64999990003', 'Caio', 'RH', ''],
      ]),
    );
    const wb = XLSX.read(gerarPlanilhaRateio(r), { type: 'buffer', cellFormula: true });
    assert.deepEqual(wb.SheetNames, ['TIM OUT-26', 'Avisos']);
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets['TIM OUT-26'], { header: 1, defval: '' });
    const textoA = linhas.map((l) => l[0]);
    assert.ok(textoA.includes('TOTAL R$'));
    assert.ok(textoA.includes('TOTAL RATEIO A SER DESCONTADO:'));
    assert.ok(textoA.includes('TABELA DE RATEIO TIM'));

    const ws = wb.Sheets['TIM OUT-26'];
    const formulas = Object.keys(ws).filter((k) => ws[k].f).map((k) => ws[k].f);
    assert.ok(formulas.some((f) => /^SUM\(J\d+:J\d+\)$/.test(f)), 'TOTAL R$ é fórmula');
    assert.ok(formulas.some((f) => /^J\d+\/\$J\$\d+$/.test(f)), '% usa o total geral');

    const iTabela = textoA.indexOf('TABELA DE RATEIO TIM');
    assert.deepEqual(linhas.slice(iTabela + 2, iTabela + 4).map((l) => [l[0], l[1], l[2], l[3]]), [
      ['Transporte', '1005COML04', 2, 51.8],
      ['SEM CENTRO DE CUSTO', '-', 1, 30],
    ]);
    assert.equal(nomeArquivoPlanilha('OUT/26'), 'Rateio_TIM_OUT-26.xlsx');
  });
});
