FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . . 

EXPOSE 3000

ENV HTTPS=true
CMD ["npm", "start"]
