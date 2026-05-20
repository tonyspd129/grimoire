---
name: docker-ops
description: Debug docker-compose service failures, manage containers, volumes, and networking
category: system
triggers: [docker, container, compose, image, volume, network, exit, restart, unhealthy, dockerfile]
---

## Docker Operations — Debugging and Management

### First steps when something fails

```bash
docker compose ps                          # what's running / what exited?
docker compose logs --tail=50 service     # recent logs
docker compose logs -f service            # follow logs
docker inspect <container-id>             # full container state
```

### Service keeps restarting

```bash
docker compose logs service | tail -100   # look for panic/error
docker compose up service                 # run in foreground to see output
docker stats                              # is it OOM killing?
```

Common causes:
- App crashes on startup → check logs for the actual error
- Missing env var → add to `.env` or `environment:` section
- Port already in use → `ss -tlnp | grep <port>`
- Volume permissions → check `docker inspect` for volume mounts
- Health check failing → test the health check command manually

### Image and container management

```bash
docker compose build --no-cache service  # rebuild without cache
docker compose pull                      # update images
docker image prune -f                    # remove dangling images
docker system prune -af --volumes        # nuclear option: remove everything
```

### Shell into a running container

```bash
docker compose exec service bash         # interactive shell
docker compose exec service sh           # if bash not available
docker compose run --rm service bash     # fresh container
```

### Networking

```bash
docker network ls
docker network inspect <network>
# Services communicate via service name, not localhost
# e.g., from 'app' service, reach 'db' at postgres://db:5432
```

### Volume management

```bash
docker volume ls
docker volume inspect <volume>
docker volume rm <volume>               # only if container is stopped
```

### docker compose v2 syntax (use this, not docker-compose)

```bash
docker compose up -d                    # detached
docker compose down                     # stop + remove containers
docker compose down -v                  # also remove volumes
docker compose restart service
docker compose exec service env         # inspect environment
```

### Useful compose file patterns

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
      interval: 5s
      retries: 5

volumes:
  pgdata:
```
