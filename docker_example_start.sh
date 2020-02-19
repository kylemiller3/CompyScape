#!/bin/bash

# create volumes
docker volume create --name postgres-data;
docker volume create --name compy-logs;

# pull postgres
docker pull postgres:12-alpine;

# create network
docker network create --subnet=10.5.0.0/16 dockernet;

# start postgres
docker run --restart always -e POSTGRES_PASSWORD=oralcumshot --name postgres --net dockernet -d -p 5432:5432/tcp --ip 10.5.1.100 --volume postgres-data:/var/lib/postgresql/data postgres:12-alpine

# build compy
./docker_build.sh

# create databases here

# start compy
docker run --name compy --net dockernet -d --volume compy-logs:/root/docker/CompyScape/logs compy