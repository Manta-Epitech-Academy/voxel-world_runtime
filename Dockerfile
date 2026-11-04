# The runtime as its own image, for the Kubernetes deploy (ctfd-workshop-platform
# docs/DEPLOY.md, "Runtimes on Kubernetes"). index.html is committed as built,
# so there is nothing to compile: nginx serves the two files.
FROM nginx:alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# Under the path the workshop platform embeds it at; docker/nginx.conf serves
# it there and redirects any other version to it.
COPY index.html embed.js /usr/share/nginx/html/runtime/voxel-world/latest/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
