FROM node:0.10-slim

MAINTAINER Humanitarian OpenStreetMap Team

ENV HOME /app
ENV PORT 8000

RUN mkdir -p  /app/activities
WORKDIR /app

COPY activities/package.json /app/

RUN npm install

RUN useradd \
  --home-dir /app/activities \
  --system \
  --user-group \
  oam \
  && chown -R oam:oam /app

USER oam
WORKDIR /app/activities

COPY . /app/activities

ENTRYPOINT ["npm"]
