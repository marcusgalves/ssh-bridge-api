# Use uma imagem oficial do Node.js
FROM node:18-alpine

# Instala OpenSSH client
RUN apk add --no-cache openssh-client

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm ci --only=production

# Copia o código da aplicação
COPY . .

# Cria usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Define as permissões corretas para SSH
RUN mkdir -p /home/nodejs/.ssh && \
    chown -R nodejs:nodejs /home/nodejs/.ssh && \
    chmod 700 /home/nodejs/.ssh

# Muda para o usuário não-root
USER nodejs

# Expõe a porta da aplicação
EXPOSE 3000

# Define variáveis de ambiente
ENV NODE_ENV=production

# Comando de inicialização
CMD ["npm", "start"]