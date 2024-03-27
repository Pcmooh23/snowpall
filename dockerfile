FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

EXPOSE 3000
ENV HTTPS=true

COPY ./frontend-entrypoint.sh /

ENTRYPOINT ["/frontend-entrypoint.sh"]
