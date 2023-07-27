# Build Node app
FROM node:18-bullseye
WORKDIR /app

# TODO split package.json copy and yarn install to have some intermediary images
COPY . /app
RUN yarn install

# Setup the example as a default configuration for the image
COPY .env.example /app/.env

RUN yarn compile

# Start interview app by default. To launch the admin app, configure the launcher to run
# yarn build:prod:admin && yarn start:admin
CMD yarn build:prod && yarn start
EXPOSE 8080
