#!/bin/bash

echo "Iniciando build do projeto Sistema de Rateios..."

# Instalar dependências do Backend
echo "Instalando dependências do backend..."
cd backend
npm install
cd ..

# Instalar dependências do Frontend
echo "Instalando dependências do frontend..."
cd frontend
npm install
# npm run build
cd ..

echo "Build concluído com sucesso!"
