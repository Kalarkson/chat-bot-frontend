dc = docker compose

up: build
	$(dc) up -d

build:
	$(dc) build

down:
	$(dc) down

stop:
	$(dc) stop
	
restart:
	$(dc) restart

update:
	git pull
	$(dc) build
	$(dc) up -d

logs: 
	$(dc) logs

logs-file: 
	$(dc) logs > compose.log

dev:
	npm run dev

install:
	npm install