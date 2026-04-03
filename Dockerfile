FROM node:22-alpine

RUN apk add --no-cache python3 make g++ chromium git
# chromium for puppeteer PDF generation

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copy only the server-relevant packages (exclude mobile/expo)
COPY package.json ./
COPY packages/cli/package*.json ./packages/cli/
COPY packages/server/package*.json ./packages/server/
COPY packages/web/package*.json ./packages/web/

# Create a Docker-specific root package.json without the mobile workspace
RUN node -e "\
const p = require('./package.json');\
p.workspaces = ['packages/*'];\
require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2));"

RUN npm install --ignore-scripts

COPY packages/cli/src ./packages/cli/src
COPY packages/cli/tsconfig.json ./packages/cli/tsconfig.json
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/tsconfig.json
COPY packages/web/src ./packages/web/src
COPY packages/web/index.html ./packages/web/index.html
COPY packages/web/vite.config.ts ./packages/web/vite.config.ts
COPY packages/web/tsconfig.json ./packages/web/tsconfig.json
COPY packages/web/tsconfig.node.json ./packages/web/tsconfig.node.json
COPY packages/web/tailwind.config.js ./packages/web/tailwind.config.js
COPY packages/web/postcss.config.js ./packages/web/postcss.config.js

# Build CLI first (server depends on it)
RUN cd packages/cli && npm run build
# Build web SPA
RUN cd packages/web && npm run build
# Build server
RUN cd packages/server && npm run build

ENV CL_DB_PATH=/data/library.db
ENV PORT=3020

EXPOSE 3020

VOLUME ["/data"]

CMD ["node", "packages/server/dist/index.js"]
