dev:
	node scripts/bundle.js
prod:
	rm -rf .cache
	rm -rf build/*
	node scripts/bundle.js prod
	./scripts/hashfiles.sh
	./scripts/uploadstatic.sh
