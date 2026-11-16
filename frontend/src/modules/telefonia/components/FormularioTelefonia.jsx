import { useState } from 'react'

export default function FormularioTelefonia({ carregando, onProcessar, onTrocarArquivo }) {
  const [fatura, setFatura] = useState(null)
  const [controle, setControle] = useState(null)
  const [ccValorGeral, setCcValorGeral] = useState('')
  const prontos = fatura && controle

  const escolher = (definir) => (e) => {
    definir(e.target.files[0] || null)
    onTrocarArquivo?.()
  }

  function trocarCcValorGeral(e) {
    setCcValorGeral(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))
    onTrocarArquivo?.()
  }

  function enviar(e) {
    e.preventDefault()
    if (prontos) onProcessar(fatura, controle, ccValorGeral)
  }

  return (
    <section className="cartao">
      <h2>Rateio de telefonia (TIM)</h2>
      <form onSubmit={enviar} className="formulario">
        <div className="campos">
          <label className="campo">
            <span>1. Fatura TIM (PDF)</span>
            <input type="file" name="fatura" accept=".pdf,application/pdf" onChange={escolher(setFatura)} />
            <small>A fatura completa, com o "Resumo do Detalhamento" por acesso.</small>
          </label>
          <label className="campo">
            <span>2. Controle de Chips (Excel)</span>
            <input type="file" name="controle" accept=".xlsx,.xls,.csv" onChange={escolher(setControle)} />
            <small>O centro de custo de cada linha vem da coluna "Centro de Custo ATUALIZADO".</small>
          </label>
          <label className="campo">
            <span>3. Valor fora das linhas (opcional)</span>
            <input
              type="text"
              name="ccValorGeral"
              value={ccValorGeral}
              onChange={trocarCcValorGeral}
              placeholder="Ex.: 1005PAUX50"
              maxLength={20}
              autoComplete="off"
            />
            <small>
              Multa ou cobrança da fatura que não é de nenhuma linha. Informe o centro de custo para lançar
              o valor inteiro nele; em branco, ele é dividido entre os setores.
            </small>
          </label>
        </div>
        <button type="submit" className="botao botao-primario" disabled={carregando || !prontos}>
          {carregando ? 'Calculando...' : 'Calcular rateio'}
        </button>
      </form>
    </section>
  )
}
