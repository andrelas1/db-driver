FROM node:12.13.1

WORKDIR /usr/src/index
COPY package.json .
RUN npm install
COPY . .

CMD [ "npm", "start" ]
