FROM node:0.12-slim

MAINTAINER Humanitarian OpenStreetMap Team

ENV HOME /app
ENV PORT 8000
ENV OAM_SWF_DOMAIN oam-tiler-test
ENV OAM_SWF_ACTIVITY_TASKLIST defaultTaskList
ENV AWS_DEFAULT_REGION us-west-2
ENV AWS_DYNAMODB_TABLE undefined
ENV DEBUG swfr:shell,swfr:activity

RUN apt-get update && apt-get install -y \
    git \
    gdal-bin

RUN mkdir -p  /app/activities /app/.aws
WORKDIR /app

COPY activities/package.json /app/

RUN npm install

RUN useradd \
  --home-dir /app \
  --system \
  --user-group \
  oam \
  && chown -R oam:oam /app

USER oam
WORKDIR /app/activities

COPY activities/ /app/activities

ENTRYPOINT ["npm"]
