import { useState } from 'react'

export default function FormularioTelefonia({ carregando, onProcessar, onTrocarArquivo }) {
  const [fatura, setFatura] = useState(null)
  const [controle, setControle] = useState(null)
  const prontos = fatura && controle

  const escolher = (definir) => (e) => {
    definir(e.target.files[0] || null)
    onTrocarArquivo?.()
  }

  function enviar(e) {
    e.preventDefault()
    if (prontos) onProcessar(fatura, controle)
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
        </div>
        <button type="submit" className="botao botao-primario" disabled={carregando || !prontos}>
          {carregando ? 'Calculando...' : 'Calcular rateio'}
        </button>
      </form>
    </section>
  )
}
