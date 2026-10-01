# Implantação no servidor Linux

O app roda em Docker Compose próprio (projeto `rateios`) e é publicado por caminho no Nginx do servidor, em **`/rateios/`**, como os demais sistemas. Nada de outros sistemas é alterado.

| Peça | Onde |
| :-- | :-- |
| Código | `~/rateios` |
| Containers | `rateios-web-1` (só em `127.0.0.1:8091`) e `rateios-api-1` (sem porta exposta) |
| Nginx do host | bloco `location /rateios/` no site que já publica os outros apps |

## 0. Conferência (só leitura)

```bash
docker compose version
ss -ltn | grep -E ':8091\b' && echo "PORTA 8091 OCUPADA: escolha outra em RATEIOS_PORTA" || echo "porta 8091 livre"
ls /etc/nginx/sites-enabled/
```

## 1. Código e configuração

```bash
git clone https://github.com/WandersonGuimaraesOlv/Videplast-Rateios.git ~/rateios
cd ~/rateios
cp .env.example .env && chmod 600 .env
nano .env        # RATEIOS_PORTA=8091, VITE_BASE_PATH=rateios (Supabase é opcional)
```

## 2. Subir os containers

```bash
docker compose up -d --build
docker compose ps                                   # web e api "healthy"
curl -s http://127.0.0.1:8091/api/health            # {"status":"ok"}
```

## 3. Nginx do host (precisa de sudo)

Bloco a inserir dentro do `server { }` do site:

```nginx
location = /rateios { return 301 /rateios/; }
location /rateios/ {
    proxy_pass http://127.0.0.1:8091/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50m;
    proxy_read_timeout 300s;
}
```

Sempre com backup e volta automática se o teste falhar:

```bash
SITE=/etc/nginx/sites-available/<site>
sudo cp "$SITE" "$SITE.bak-rateios"
sudoedit "$SITE"
sudo nginx -t && sudo systemctl reload nginx || { sudo cp "$SITE.bak-rateios" "$SITE"; echo "Nginx restaurado"; }
```

## 4. Teste

Abrir `https://<servidor>/rateios/`, clicar em "Validar conexão", enviar uma medição e a lista de setores e conferir os totais.

## Atualizar

```bash
cd ~/rateios && git pull && docker compose up -d --build
```

## Voltar atrás

```bash
cd ~/rateios && docker compose down
sudo cp "$SITE.bak-rateios" "$SITE" && sudo nginx -t && sudo systemctl reload nginx
```
