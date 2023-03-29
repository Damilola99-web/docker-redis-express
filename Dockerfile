FROM node:14.17.3-alpine3.14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .


CMD [ "npm", "start" ]


# FROM node:14-alpine
# WORKDIR /app
# COPY package*.json ./
# RUN npm install --only=production
# COPY . .
# EXPOSE 3000
# CMD ["npm", "start"]
