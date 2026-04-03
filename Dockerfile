FROM node:22-alpine

RUN apk add --no-cache python3 make g++ chromium git
# chromium for puppeteer PDF generation

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copy workspace config
COPY package.json package-lock.json tsconfig.base.json ./

# Copy package.json files for all build-able packages
COPY packages/server/package.json ./packages/server/
COPY packages/cli/package.json ./packages/cli/
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN npm install

# Copy source files
COPY packages/server/ ./packages/server/
COPY packages/cli/ ./packages/cli/
COPY packages/web/ ./packages/web/

# Build all
RUN cd packages/server && npx tsc
RUN cd packages/cli && npx tsc
RUN cd packages/web && npx tsc -b && npx vite build

ENV PORT=3011
EXPOSE 3011

VOLUME ["/data"]

CMD ["node", "packages/server/dist/index.js"]
