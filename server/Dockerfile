FROM node:24-slim AS deps

WORKDIR /app
COPY ./package.json ./package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

FROM deps AS dev
COPY . .
CMD ["npm", "run", "start:dev"]

FROM deps AS build
COPY . .
RUN npm run build

FROM node:24-slim AS prod
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json .
RUN npm run ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/.prisma ./.prisma
RUN useradd --create-home appuser
USER appuser
CMD ["node", "dist/main.js"]