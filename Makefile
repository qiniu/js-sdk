all : install build dev

install :
	npm install

build:
	npm run build:prod

serve:
	npm run serve

dev: 
	npm run build:dev
	
	