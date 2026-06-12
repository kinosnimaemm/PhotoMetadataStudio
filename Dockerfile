FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    libimage-exiftool-perl \
    zip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV APP_MODE=cloud
ENV HOST=0.0.0.0
ENV PORT=4317

EXPOSE 4317

CMD ["npm", "start"]
