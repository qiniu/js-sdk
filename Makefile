install : all

all :
	npm install
	grunt
	node demo/server/server.js
