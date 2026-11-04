# The runtime as its own image, for the Kubernetes deploy (ctfd-workshop-platform
# docs/DEPLOY.md, "Runtimes on Kubernetes"). The app is built from its sources
# (Vite), then nginx serves the static result.
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# Under the path the workshop platform embeds it at; docker/nginx.conf serves
# it there and redirects any other version to it.
COPY --from=build /app/dist /usr/share/nginx/html/runtime/voxel-world/latest/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
