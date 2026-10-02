import { FormularioRateio, TabelaRateio, TabelaValores, useRateio } from '../modules/rateio/index.js'
import { PainelDiagnostico } from '../modules/diagnostico/index.js'
import MensagemStatus from '../shared/components/MensagemStatus.jsx'

export default function App() {
  const { carregando, relatorio, erro, processar } = useRateio()

  return (
    <div className="pagina">
      <header className="topo">
        <h1>Sistema de Rateios Videplast</h1>
        <p>Consolidação mensal de impressão e telefonia por setor</p>
      </header>

      <main className="conteudo">
        <FormularioRateio carregando={carregando} onProcessar={processar} />
        <MensagemStatus tipo="erro">{erro}</MensagemStatus>
        {relatorio && <TabelaRateio relatorio={relatorio} />}
        {relatorio && <TabelaValores valores={relatorio.valores} />}
        <PainelDiagnostico />
      </main>
    </div>
  )
}
