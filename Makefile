DOCKER_IMAGE = oam/server-activities:latest

all: build

build:
	@docker build -f ./Dockerfile -t $(DOCKER_IMAGE) .

start: activities
	@docker run \
		-i -t \
		--name oam-server-activities \
		--volume $(PWD)/activities:/app/activities \
	        --volume $(HOME)/.aws:/app/.aws \
		$(DOCKER_IMAGE) start

clean:
	@docker kill oam-server-activities >> /dev/null 2>&1 || true
	@docker rm oam-server-activities >> /dev/null 2>&1 || true

.PHONY: all build start clean
