FROM node:20-bookworm AS builder

ARG NODE_ENV=production

WORKDIR /misskey

COPY . ./

RUN apt update
RUN apt install -y build-essential
RUN git submodule update --init
RUN yarn install
RUN yarn build
RUN rm -rf .git

FROM node:20-bookworm-slim AS runner

WORKDIR /misskey

RUN apt update
RUN apt install -y ffmpeg tini

COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY --from=builder /misskey/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=builder /misskey/packages/backend/built ./packages/backend/built
COPY --from=builder /misskey/packages/client/node_modules ./packages/client/node_modules
COPY . ./

ENV NODE_ENV=production
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "run", "migrateandstart"]
