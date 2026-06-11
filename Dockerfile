# Multi-stage build: the frontend and the Go binary are built in their
# own throwaway stages, and only the final static binary ships. Docker
# is deploy-only; the dev loop stays native (./dev.sh).

# Stage 1: build the frontend. lts/* in CI; pin the major here so image
# builds don't shift under us when a new LTS lands.
FROM node:22-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: build the binary, with the real frontend embedded in place of
# the committed placeholder (see internal/webdist).
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web /src/web/dist/ internal/webdist/dist/
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /spreadlab ./cmd/spreadlab

# Stage 3: minimal runtime. distroless/static has CA certs and tzdata
# but no shell, which is all a static Go binary needs.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /spreadlab /spreadlab
EXPOSE 8080
# No shell or curl in distroless, so the healthcheck is the binary
# probing its own /healthz (the -addr default targets localhost:8080).
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD ["/spreadlab", "-check"]
# 0.0.0.0, not the dev default localhost: inside a container the
# loopback interface is unreachable from outside.
ENTRYPOINT ["/spreadlab", "-addr", ":8080"]
