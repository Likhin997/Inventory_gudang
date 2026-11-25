# Stage 1: Build Environment
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Environment
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/start.sh ./
RUN chmod +x start.sh
COPY --from=builder /app/run_migration.js ./
COPY --from=builder /app/run_seed.js ./
COPY --from=builder /app/firebase-applet-config.json* ./
EXPOSE 3000
CMD ["./start.sh"]
