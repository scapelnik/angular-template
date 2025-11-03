FROM node:22.2.0

# Crear grupo y usuario con los mismos UID y GID que el host
#RUN adduser joamona

WORKDIR /usr/src

RUN npm config set proxy http://proxy.gov.si:80
RUN npm config set https-proxy http://proxy.gov.si:80

RUN npm install -g @angular/cli@18.0.3

COPY . .
WORKDIR /usr/src/web

RUN npm install

