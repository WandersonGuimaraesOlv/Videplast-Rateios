import React, { useState } from 'react';

function App() {
    const [mensagem, setMensagem] = useState('');
    const [loading, setLoading] = useState(false);

    const testarConexao = async () => {
        setLoading(true);
        setMensagem('Testando comunicação com o servidor...');
        try {
            // Aponta para a porta configurada no seu backend (5000)
            const response = await fetch('http://localhost:5000/api/teste-rateio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
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

    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ borderBottom: '2px solid #0070f3', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h1>Sistema de Rateios Videplast</h1>
                <p style={{ color: '#666' }}>Painel de Controle e Automação de Relatórios</p>
            </header>

            <main>
                <section style={{ backgroundColor: '#f5f5f5', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h3>Validação de Ambiente</h3>
                    <p>Clique no botão abaixo para verificar a integridade da conexão entre a API Node.js e as tabelas do Supabase.</p>

                    <button
                        onClick={testarConexao}
                        disabled={loading}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            backgroundColor: loading ? '#ccc' : '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {loading ? 'Processando...' : 'Testar Gravação no Supabase'}
                    </button>
                </section>

                {mensagem && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        border: '1px solid #ccc',
                        borderRadius: '5px',
                        backgroundColor: '#f9f9f9',
                        whiteSpace: 'pre-line'
                    }}>
                        <strong>Resultado:</strong>
                        <p>{mensagem}</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;