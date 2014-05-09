install : all

all :
	npm install
	grunt
	node demo/server.js
