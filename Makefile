dev-up:
	docker-compose -f docker-compose.dev.yml up -d
api-logs:
	docker-compose -f docker-compose.dev.yml logs -f --tail=20 server
dev: dev-up api-logs
