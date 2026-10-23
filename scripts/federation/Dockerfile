FROM node:24.22.1-bookworm AS build
ENV CYPRESS_INSTALL_BINARY=0
ENV PATH=/opt/federation-yarn/node_modules/.bin:$PATH
WORKDIR /misskey
# Copy the filtered application before installing dependencies: nested Docker
# using VFS otherwise duplicates the large dependency tree for every COPY.
COPY . .
WORKDIR /misskey/packages/backend
RUN --mount=type=secret,id=build-ca \
    if [ -f /run/secrets/build-ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build-ca; fi; \
    npm install --prefix /opt/federation-yarn yarn@1.22.19 && yarn install --production --frozen-lockfile --non-interactive \
    && yarn cache clean && rm -rf /root/.npm /root/.cache
FROM node:24.22.1-bookworm-slim
ENV NODE_ENV=production MK_DISABLE_CLUSTERING=1 MK_NO_DAEMONS=1
WORKDIR /misskey/packages/backend
COPY --from=build /misskey /misskey
CMD ["node", "/misskey/scripts/federation/peer.mjs"]
