# Sistema de Rateios Videplast — regras do projeto

- Respostas, documentação e mensagens de commit/PR em **português do Brasil**.
- O que o sistema faz: cruza a fatura/medição mensal (PDF, CSV ou Excel) com a lista de setores (S/N ou chip → setor) e soma impressão (páginas) ou telefonia (R$) por setor, na ordem oficial de `ORDEM_SETORES`.
- Aba **Telefonia (TIM)**: lê o "Resumo do Detalhamento" da fatura TIM (PDF) e rateia o valor real de cada linha pelo **Centro de Custo ATUALIZADO** do Controle de Chips. Essa coluna é sempre a fonte do CC: o sistema não troca CC por setor nem preenche linha vazia; só sugere nos avisos. Única regra: em RV todo CC começa com `1005` (um `1007...` vale como `1005...`). Valores em centavos; a soma sempre fecha com o total da fatura.
- `modules/centros-custo/data/centros-custo.json` é a lista oficial de CCs de RV (mesmas colunas da tabela `centro_de_custo` do Supabase); dá o nome de cada CC e confere os códigos do controle.
- Nunca colocar arquivos reais (fatura, Controle de Chips) no repositório: têm nomes e telefones. Os testes usam arquivos sintéticos (`backend/tests/support/arquivos.js`).

## Estrutura (padrão do Imobilizados)

```
backend/src/
├── app.js                  # liga as rotas (exportado para os testes)
├── server.js               # sobe o servidor
├── config.js               # única leitura de variáveis de ambiente
├── lib/supabase.js
├── routes/*.routes.js      # rotas finas: validam com o schema e chamam o service
└── modules/<domínio>/      # index.js (barril), schemas/ (zod), services/ (regras)
    ├── rateio/             # impressão (e telefonia antiga por lista de chips)
    ├── telefonia/          # fatura TIM + Controle de Chips → rateio por centro de custo
    ├── centros-custo/      # lista oficial de CCs de RV
    ├── diagnostico/
    └── shared/             # utilidades (números pt-BR, dinheiro em centavos, PDF, texto, zod)
frontend/src/
├── app/                    # App.jsx, config.js (URL da API), estilos.css
├── modules/<domínio>/      # components/, hooks/, services/ e index.js público
└── shared/                 # lib/ (api, formatos) e components/
```

- Um módulo só é importado pelo `index.js` dele.
- Regras de cálculo ficam em funções puras com teste em `backend/tests/` (`npm test`).
- A URL da API é sempre relativa ao app (`/rateios/api/...` em produção); nada de `localhost` no código.

## Agentes (`.claude/agents/`)

| Agente | Quando usar |
| :-- | :-- |
| `auditor-rateio` | Depois de mexer em cálculo ou leitura de arquivos |
| `mapeador-layout` | Fatura, medição ou lista de setores em formato novo |
| `revisor-seguranca` | Antes de PR/implantação ou ao mexer em upload, rotas, Docker |
| `implantacao-servidor` | Publicar, atualizar ou desfazer no servidor Linux |
