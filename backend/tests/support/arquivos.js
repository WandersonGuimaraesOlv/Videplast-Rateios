/**
 * Arquivos SINTÉTICOS para os testes (sem dados reais de colaboradores/telefones):
 * um PDF mínimo com o texto de uma fatura e planilhas montadas em memória.
 */
const XLSX = require('xlsx');

/**
 * PDF válido de uma página com cada linha de `linhas` como uma linha de texto.
 * Fonte Helvetica com WinAnsiEncoding (aceita acentos do português).
 * @param {string[]} linhas
 * @returns {Buffer}
 */
function criarPdf(linhas) {
  const escapar = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const conteudo = ['BT', '/F1 9 Tf', '40 800 Td', '11 TL']
    .concat(linhas.map((l) => `(${escapar(l)}) Tj T*`))
    .concat(['ET'])
    .join('\n');

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objetos.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

/**
 * Texto no formato da fatura TIM: cabeçalho + "RESUMO DO DETALHAMENTO".
 * @param {{ porAcesso: [string, string, string][], gerais?: [string, string][], total: string }} dados
 *   porAcesso: [categoria, numero, valor] ex.: ['Mensalidades e Franquias', '64999990001', '25,90']
 */
function linhasFaturaTim({ porAcesso, gerais = [], total }) {
  const resumo = [];
  let n = 1;
  const seq = () => String(n++).padStart(2, '0');
  for (const [cat, numero, valor] of porAcesso) resumo.push(`${seq()}Total de ${cat} Acesso ${numero}${valor}`);
  for (const [cat, valor] of gerais) resumo.push(`${seq()}Total de ${cat} Gerais do Cliente${valor}`);
  resumo.push(`${seq()}Total FATURA${total}`);
  return [
    `R$ ${total}`,
    'TIM S.A.',
    '20/10/2026',
    'VENCIMENTO',
    'EMISSÃO: 07/10/2026',
    'FATURA DE PAGAMENTO: 1234567890',
    'REF: OUT/26 PERÍODO 01/09/26 a 30/09/26',
    'CLIENTE: 7.0000000',
    `Quantidade de Acessos: ${new Set(porAcesso.map((p) => p[1])).size}`,
    'RESUMO DO DETALHAMENTO',
    'Valor',
    ...resumo,
  ];
}

/** Planilha .xlsx (uma aba) a partir de uma matriz [cabeçalho, ...linhas]. */
function criarXlsx(matriz, nomeAba = 'Inventario') {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matriz), nomeAba);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/** Cabeçalho igual ao do Controle de Chips real. */
const CABECALHO_CONTROLE = [
  'Número do Chip', 'Departamento ANTIGO', 'Nome/Responsável ANTIGO', 'Centro de Custo Antigo',
  'Validado por quem?', 'Colaborador Responsavel ATUAL', 'Setor ATUAL', 'Centro de Custo ATUALIZADO', 'Planos',
];

/** Linha do controle: [numero, responsavel, setor, ccAtual, ccAntigo] */
function linhaControle([numero, responsavel, setor, ccAtual, ccAntigo = '']) {
  return [numero, '', '', ccAntigo, '', responsavel, setor, ccAtual, '10GB - R$ 30,90'];
}

module.exports = { criarPdf, linhasFaturaTim, criarXlsx, CABECALHO_CONTROLE, linhaControle };
