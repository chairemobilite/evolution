# Build Node app
FROM node:24-trixie
# Corepack runs the Yarn version set in the packageManager field of package.json, in place of the image's Yarn 1.
# Make sure to install from npm since Node.js 25+ no longer bundles it.
RUN npm install -g corepack
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
