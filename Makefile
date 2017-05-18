all:
	mkdir build | true
	rm build/*.js | true
	babel -d build/ src/
