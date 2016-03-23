all : install build demo

install :
	npm install
	bower install

build :
	grunt

dev :
	node demo/server.js

