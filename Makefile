all : install build demo

install :
	npm install
	bower install

build :
	grunt

demo :
	node demo/server.js