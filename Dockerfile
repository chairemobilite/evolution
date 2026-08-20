# Build Node app
FROM node:24-trixie
WORKDIR /app

# Git commit hash stamped into interview paradata (github.sha in CI). No default: when
# unset, resolveAppBuildId falls back to the local git revision, then to 'dev'.
ARG BUILD_ID
ENV BUILD_ID=$BUILD_ID

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
