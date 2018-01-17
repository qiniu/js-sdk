all: dev 

<<<<<<< HEAD
install :
	npm install
	bower install

build :
	npm run build

dev :
	npm run watch
	node demo/server.js
=======
start:
	npm start
>>>>>>> new sdk

dev: 
	npm run dev 
	npm start