FROM node:22-alpine

RUN apk add --no-cache python3 make g++ chromium
# chromium for puppeteer PDF generation

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
COPY packages/cli/package*.json ./packages/cli/
COPY packages/server/package*.json ./packages/server/
COPY packages/web/package*.json ./packages/web/

RUN npm ci --ignore-scripts

COPY . .

RUN npm run build

ENV CL_DB_PATH=/data/library.db
ENV PORT=3020

EXPOSE 3020

VOLUME ["/data"]

CMD ["node", "packages/server/dist/index.js"]
