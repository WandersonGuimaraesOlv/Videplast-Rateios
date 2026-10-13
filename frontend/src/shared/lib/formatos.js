const inteiro = new Intl.NumberFormat('pt-BR')
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Páginas como inteiro com milhar; telefonia como R$. */
export const formatarTotal = (valor, tipo) =>
  tipo === 'telefonia' ? moeda.format(Number(valor) || 0) : inteiro.format(Number(valor) || 0)

/** 1390.67 → "R$ 1.390,67" */
export const formatarMoeda = (valor) => moeda.format(Number(valor) || 0)

/** 0.3583 → "35,83%" */
export const formatarPercentual = (fracao) => percentual.format(Number(fracao) || 0)
