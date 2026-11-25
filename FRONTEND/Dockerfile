# Etapa 1: Construcción
FROM node:22 AS builder

WORKDIR /app

# Argumento para la URL de la API (se incrusta en el bundle al construir)
ARG VITE_API_URL=http://localhost:4000

# Instalar exactamente las versiones del package-lock.json (build reproducible,
# y las mismas dependencias que analiza Snyk)
COPY package*.json ./
RUN npm ci

# Copiar código fuente (node_modules y dist quedan fuera por .dockerignore)
COPY . .

ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Etapa 2: Producción
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
