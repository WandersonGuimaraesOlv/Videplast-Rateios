import { useState } from 'react'
import { FormularioRateio, TabelaRateio, TabelaValores, useRateio } from '../modules/rateio/index.js'
import { FormularioTelefonia, RelatorioTelefonia, useRateioTelefonia } from '../modules/telefonia/index.js'
import { PainelDiagnostico } from '../modules/diagnostico/index.js'
import MensagemStatus from '../shared/components/MensagemStatus.jsx'

const ABAS = [
  { id: 'impressao', rotulo: 'Impressão' },
  { id: 'telefonia', rotulo: 'Telefonia (TIM)' },
]

export default function App() {
  const [aba, setAba] = useState(ABAS[0].id)
  const impressao = useRateio()
  const telefonia = useRateioTelefonia()

  return (
    <div className="pagina">
      <header className="topo">
        <h1>Sistema de Rateios Videplast</h1>
        <p>Consolidação mensal de impressão e telefonia por setor</p>
      </header>

      <nav className="abas" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            className={`aba${aba === a.id ? ' aba-ativa' : ''}`}
            onClick={() => setAba(a.id)}
          >
            {a.rotulo}
          </button>
        ))}
      </nav>

      <main className="conteudo">
        {/* As duas abas ficam montadas para não perder os arquivos escolhidos ao trocar de aba */}
        <div className="painel-aba" role="tabpanel" hidden={aba !== 'impressao'}>
          <FormularioRateio carregando={impressao.carregando} onProcessar={impressao.processar} />
          <MensagemStatus tipo="erro">{impressao.erro}</MensagemStatus>
          {impressao.relatorio && <TabelaRateio relatorio={impressao.relatorio} />}
          {impressao.relatorio && <TabelaValores valores={impressao.relatorio.valores} />}
        </div>
        <div className="painel-aba" role="tabpanel" hidden={aba !== 'telefonia'}>
          <FormularioTelefonia
            carregando={telefonia.carregando}
            onProcessar={telefonia.processar}
            onTrocarArquivo={telefonia.limpar}
          />
          <MensagemStatus tipo="erro">{telefonia.erro}</MensagemStatus>
          {telefonia.rateio && <RelatorioTelefonia rateio={telefonia.rateio} />}
        </div>
        <PainelDiagnostico />
      </main>
    </div>
  )
}
