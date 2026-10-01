import { useState } from 'react'

export default function FormularioRateio({ carregando, onProcessar }) {
  const [arquivoMedicao, setArquivoMedicao] = useState(null)
  const [arquivoSetores, setArquivoSetores] = useState(null)
  const prontos = arquivoMedicao && arquivoSetores

  function enviar(e) {
    e.preventDefault()
    if (prontos) onProcessar(arquivoMedicao, arquivoSetores)
  }

  return (
    <section className="cartao">
      <h2>Consolidação mensal (impressoras ou telefonia)</h2>
      <form onSubmit={enviar} className="formulario">
        <div className="campos">
          <label className="campo">
            <span>1. Fatura / medição (PDF, CSV ou Excel)</span>
            <input type="file" accept=".csv,.xls,.xlsx,.pdf" onChange={(e) => setArquivoMedicao(e.target.files[0] || null)} />
          </label>
          <label className="campo">
            <span>2. Lista de setores (CSV ou Excel)</span>
            <input type="file" accept=".csv,.xls,.xlsx" onChange={(e) => setArquivoSetores(e.target.files[0] || null)} />
            <small>Colunas "S/N" e "Setor" (impressoras) ou "Número do Chip" e "Setor" (telefonia).</small>
          </label>
        </div>
        <button type="submit" className="botao botao-primario" disabled={carregando || !prontos}>
          {carregando ? 'Processando arquivos...' : 'Cruzar dados e somar por setor'}
        </button>
      </form>
    </section>
  )
}
