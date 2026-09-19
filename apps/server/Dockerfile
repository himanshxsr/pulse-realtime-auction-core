FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types packages/shared-types
COPY apps/server apps/server

RUN npm ci
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared-types packages/shared-types
COPY apps/server/package.json apps/server/package.json

RUN npm ci --omit=dev
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/src/lua ./apps/server/src/lua

EXPOSE 4000
CMD ["npm", "run", "start", "--workspace=apps/server"]
