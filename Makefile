all : install build dev

install :
	npm install
	bower install

build :
	npm run build

dev :
	npm run watch
	node demo/server.js

