FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types packages/shared-types
COPY apps/worker apps/worker

RUN npm ci
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/worker

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared-types packages/shared-types
COPY apps/worker/package.json apps/worker/package.json

RUN npm ci --omit=dev
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

CMD ["npm", "run", "start", "--workspace=apps/worker"]
