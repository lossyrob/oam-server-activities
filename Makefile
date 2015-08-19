DOCKER_IMAGE = oam/server-activities:latest

all: activities

activities:
	@docker build -f ./Dockerfile -t $(DOCKER_IMAGE) .

start: activities
	@docker run \
		--name oam-server-activities \
		--volume $(PWD)/activities:/app/activities \
		$(DOCKER_IMAGE) start

clean:
	@docker kill oam-server-aactivities >> /dev/null 2>&1 || true
	@docker rm oam-server-activities >> /dev/null 2>&1 || true

.PHONY: all activities start clean
