all : install build dev

install :
	npm install

build:
	npm run build:prod
dev: 
	npm run server 
	npm run build:dev