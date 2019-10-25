dev-up:
	docker-compose -f docker-compose.dev.yml up -d
api-logs:
	docker-compose -f docker-compose.dev.yml logs -f --tail=20 server
dev: dev-up api-logs

login: 
	docker login registry.gitlab.com
prod: login
	cd client && make prod
	docker build -t registry.gitlab.com/dropconfig/events .
	docker push registry.gitlab.com/dropconfig/events

deploy: prod
	docker-compose -f docker-compose.live.yml -H "ssh://root@206.189.232.223" pull
	docker-compose -f docker-compose.live.yml -H "ssh://root@206.189.232.223" up -d

api-logs-live: 
	docker-compose -f docker-compose.live.yml -H "ssh://root@206.189.232.223" logs -f --tail=20 server
	

