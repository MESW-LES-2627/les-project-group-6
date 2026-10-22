# Backend image, built from the repository root so the shared pnpm workspace
# files are available: docker build -f apps/backend/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --filter @bookmarked/backend
COPY apps/backend apps/backend
RUN pnpm --filter @bookmarked/backend build \
  && pnpm --filter @bookmarked/backend deploy --prod --legacy /out \
  && cp -r apps/backend/dist /out/dist

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
