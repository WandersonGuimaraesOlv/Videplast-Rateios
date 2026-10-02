# Frontend do Sistema de Rateios: build do Vite + Nginx servindo o app e repassando /api ao backend.
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
# Subcaminho de publicação (ex.: rateios). Vazio = raiz do domínio
ARG VITE_BASE_PATH=
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV LIMITE_UPLOAD_MB=50
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
