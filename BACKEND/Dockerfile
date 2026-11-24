FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Instalar solo dependencias de producción, exactamente las del lockfile
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar código de la aplicación
COPY src/ ./src/
COPY sql/ ./sql/

# La carpeta uploads no está versionada: se crea aquí y se entrega al usuario
# sin privilegios que ejecuta la API (la app escribe en uploads/documentos)
RUN mkdir -p uploads/documentos uploads/contracts && chown -R node:node uploads

USER node

EXPOSE 4000

CMD ["node", "src/app.js"]
