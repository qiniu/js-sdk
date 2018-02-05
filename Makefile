all : install dev

install :
	npm install

build:
	npm run build:prod 

dev: 
	npm run build:dev && npm run serve
	
	