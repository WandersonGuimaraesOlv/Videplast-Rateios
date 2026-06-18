import React, { useState } from 'react';

// Ordem estrita e obrigatória definida para o relatório consolidado da Videplast
const ORDEM_SETORES = [
    "ACABAMENTO", "EXPEDIÇÃO", "SALA DE TINTAS", "LABORATORIO",
    "CONTROLE DE QUALIDADE", "PCM", "CADASTRO", "IMPRESSÃO",
    "EXTRUSÃO", "FATURAMENTO", "GUARITA", "RECURSOS HUMANOS",
    "ALMOXARIFADO", "PCP", "ARTES", "ARTES - COLORIDA"
];

function App() {
    const [mensagem, setMensagem] = useState('');
    const [loading, setLoading] = useState(false);
    const [relatorioConsolidado, setRelatorioConsolidado] = useState([]);
    const [totalGeralPaginas, setTotalGeralPaginas] = useState(0);

    // Estados para armazenar os arquivos selecionados
    const [arquivoMedicao, setArquivoMedicao] = useState(null);
    const [arquivoSetores, setArquivoSetores] = useState(null);

    // 1. Função original de teste rápido do ambiente
    const testarConexao = async () => {
        setLoading(true);
        setMensagem('Testando comunicação com o servidor...');
        try {
            const response = await fetch('http://localhost:5000/api/teste-rateio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.sucesso) {
                setMensagem('✅ Sucesso: ' + data.mensagem);
            } else {
                setMensagem('❌ Erro no Supabase: ' + (data.erro || data.mensagem));
            }
        } catch (error) {
            setMensagem('❌ Erro de rede: Não foi possível alcançar o backend na porta 5000.');
        }
        setLoading(false);
    };

    // 2. Rota de processamento e consolidação real dos dados de impressoras
    const processarRelatorioImpressao = async (e) => {
        e.preventDefault();
        if (!arquivoMedicao || !arquivoSetores) {
            alert('Por favor, selecione ambos os arquivos (Medição e Setores/IPs) para realizar o cruzamento.');
            return;
        }

        setLoading(true);
        setMensagem('Processando e cruzando dados de impressão...');
        setRelatorioConsolidado([]);

        const formData = new FormData();
        formData.append('medicao', arquivoMedicao);
        formData.append('setores', arquivoSetores);

        try {
            const response = await fetch('http://localhost:5000/api/rateio/impressoras', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.sucesso) {
                setMensagem('✅ Relatório consolidado gerado com sucesso!');
                setRelatorioConsolidado(data.dados);
                setTotalGeralPaginas(data.totalGeral);
            } else {
                setMensagem('❌ Erro ao processar: ' + data.erro);
            }
        } catch (error) {
            setMensagem('❌ Erro de rede: Falha ao enviar relatórios para o backend.');
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ borderBottom: '2px solid #0070f3', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h1>Sistema de Rateios Videplast</h1>
                <p style={{ color: '#666' }}>Painel de Controle e Automação de Relatórios Consolidados</p>
            </header>

            <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Bloco 1: Upload e Cruzamento de Dados Reais */}
                <section style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#333' }}>Consolidação de Impressoras (Mensal)</h3>
                    <form onSubmit={processarRelatorioImpressao} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1', minWidth: '250px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>1. Lista Medição / Faturamento (CSV/Excel):</label>
                                <input
                                    type="file"
                                    accept=".csv,.xls,.xlsx"
                                    onChange={(e) => setArquivoMedicao(e.target.files[0])}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>

                            <div style={{ flex: '1', minWidth: '250px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>2. Lista Setores / IPs de Origem (CSV/Excel):</label>
                                <input
                                    type="file"
                                    accept=".csv,.xls,.xlsx"
                                    onChange={(e) => setArquivoSetores(e.target.files[0])}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                alignSelf: 'flex-start',
                                padding: '12px 24px',
                                fontSize: '16px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                backgroundColor: loading ? '#ccc' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                fontWeight: 'bold'
                            }}
                        >
                            {loading ? 'Processando Arquivos...' : 'Cruzar Dados e Somar por Setor'}
                        </button>
                    </form>
                </section>

                {/* Bloco 2: Exibição da Tabela Consolidada */}
                {relatorioConsolidado.length > 0 && (
                    <section style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Relatório de Impressão Consolidado</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#0070f3', color: 'white' }}>
                                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Ordem</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Setor</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Total de Páginas (Mês)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ORDEM_SETORES.map((setor, index) => {
                                    const correspondencia = relatorioConsolidado.find(
                                        item => item.setor.toUpperCase().trim() === setor.toUpperCase().trim()
                                    );
                                    const totalPaginas = correspondencia ? correspondencia.totalPaginas : 0;

                                    return (
                                        <tr key={setor} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{index + 1}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>{setor}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>{totalPaginas.toLocaleString('pt-BR')}</td>
                                        </tr>
                                    );
                                })}
                                <tr style={{ backgroundColor: '#e5e7eb', fontWeight: 'bold' }}>
                                    <td colSpan="2" style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>TOTAL GERAL:</td>
                                    <td style={{ padding: '12px', border: '1px solid #ddd', color: '#0070f3' }}>{totalGeralPaginas.toLocaleString('pt-BR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                )}

                {/* Bloco 3: Diagnóstico */}
                <section style={{ backgroundColor: '#f5f5f5', padding: '1.5rem', borderRadius: '8px' }}>
                    <h4>Ferramentas de Diagnóstico</h4>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>Verifique se o backend e o banco de dados estão respondendo normalmente.</p>
                    <button
                        onClick={testarConexao}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px'
                        }}
                    >
                        Validar Conexão API/Supabase
                    </button>
                </section>

                {mensagem && (
                    <div style={{
                        padding: '15px',
                        border: '1px solid #ccc',
                        borderRadius: '5px',
                        backgroundColor: '#fff',
                        whiteSpace: 'pre-line',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <strong>Status do Sistema:</strong>
                        <p style={{ marginTop: '5px' }}>{mensagem}</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;