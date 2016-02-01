install : all

all :
	npm install
	bower install
	grunt
	node demo/server.js
