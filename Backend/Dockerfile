FROM node:24.21.0-alpine AS frontend-build

WORKDIR /workspace/Frontend

COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci --no-audit

COPY Frontend/ ./
ARG VITE_API_URL=/NotasMax
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM node:26.5.1-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY Backend/package.json Backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit

COPY Backend/Controllers ./Controllers
COPY Backend/DB ./DB
COPY Backend/middlewares ./middlewares
COPY Backend/Models ./Models
COPY Backend/Routes ./Routes
COPY Backend/services ./services
COPY Backend/config.js Backend/index.js ./
COPY --from=frontend-build /workspace/Frontend/dist ./public

EXPOSE 5000
CMD ["node", "index.js"]
