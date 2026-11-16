import { useState } from 'react'

export default function FormularioRateio({ carregando, onProcessar, onIrParaTelefonia }) {
  const [arquivosMedicao, setArquivosMedicao] = useState([])
  const [arquivoSetores, setArquivoSetores] = useState(null)
  const prontos = arquivosMedicao.length > 0 && arquivoSetores

  function enviar(e) {
    e.preventDefault()
    if (prontos) onProcessar(arquivosMedicao, arquivoSetores)
  }

  return (
    <section className="cartao">
      <h2>Consolidação mensal de impressão</h2>
      {onIrParaTelefonia && (
        <div className="mensagem mensagem-info dica-aba">
          <span>Fatura da TIM? Ela vai na aba Telefonia (TIM), junto com o Controle de Chips.</span>
          <button type="button" className="botao botao-discreto" onClick={onIrParaTelefonia}>
            Abrir a aba Telefonia (TIM)
          </button>
        </div>
      )}
      <form onSubmit={enviar} className="formulario">
        <div className="campos">
          <label className="campo">
            <span>1. Fatura / medição (PDF, CSV ou Excel)</span>
            <input
              type="file"
              multiple
              accept=".csv,.xls,.xlsx,.pdf"
              onChange={(e) => setArquivosMedicao([...e.target.files].slice(0, 4))}
            />
            <small>Pode enviar a fatura P&amp;B e a colorida juntas (até 4 arquivos).</small>
          </label>
          <label className="campo">
            <span>2. Lista de setores (CSV ou Excel)</span>
            <input type="file" accept=".csv,.xls,.xlsx" onChange={(e) => setArquivoSetores(e.target.files[0] || null)} />
            <small>Ex.: planilha "Rateio impressão" (colunas "Impressoras" e "Nº Serie", aba do mês mais recente).</small>
          </label>
        </div>
        <button type="submit" className="botao botao-primario" disabled={carregando || !prontos}>
          {carregando ? 'Processando arquivos...' : 'Cruzar dados e somar por setor'}
        </button>
      </form>
    </section>
  )
}
