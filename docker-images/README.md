# OpenCode Sandbox Docker Images

Base and development images for OpenCode task sandboxes.

## Images

### opencode-sandbox-base

Minimal base image for OpenCode task sandboxes.

**Features**:
- Node.js v20+ (Alpine Linux)
- Essential tools: git, curl, wget, vim, nano, bash
- Security hardening: non-root user (opencode)
- Target size: <200MB

**Build**:
```bash
cd docker-images/opencode-sandbox-base
docker build -t opencode-sandbox-base:latest .
```

**Verify**:
```bash
docker run --rm -it opencode-sandbox-base:latest bash
node --version  # Should show v20+
npm --version
git --version
whoami         # Should be 'opencode'
```

### opencode-sandbox-developer

Development image with additional tools.

**Features**:
- Based on opencode-sandbox-base
- Development tools: npm, typescript, tsx
- Additional tools: jq, build-base, python3
- MCP SDK pre-installed (@anthropic-ai/sdk)
- Target size: <300MB

**Build**:
```bash
# First build the base image
cd docker-images/opencode-sandbox-base
docker build -t opencode-sandbox-base:latest .

# Then build the developer image
cd docker-images/opencode-sandbox-developer
docker build -t opencode-sandbox-developer:latest .
```

**Verify**:
```bash
docker run --rm -it opencode-sandbox-developer:latest bash
tsc --version   # Should show TypeScript version
tsx --version
jq --version
python3 --version
npm list -g @anthropic-ai/sdk
```

## Versioning

Images use semantic versioning: `v1.0.0`, `v1.0.1`, etc.

**Tagging**:
```bash
# Tag with version
docker tag opencode-sandbox-base:latest opencode-sandbox-base:v1.0.0
docker tag opencode-sandbox-developer:latest opencode-sandbox-developer:v1.0.0

# Push to registry
docker push opencode-sandbox-base:v1.0.0
docker push opencode-sandbox-developer:v1.0.0
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build Docker Images

on:
  push:
    paths:
      - 'docker-images/**'
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
        
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
          
      - name: Build and push base image
        uses: docker/build-push-action@v4
        with:
          context: ./docker-images/opencode-sandbox-base
          push: true
          tags: |
            opencode-sandbox-base:latest
            opencode-sandbox-base:${{ github.ref_name }}
          cache-from: type=registry,ref=opencode-sandbox-base:latest
          cache-to: type=inline
          
      - name: Build and push developer image
        uses: docker/build-push-action@v4
        with:
          context: ./docker-images/opencode-sandbox-developer
          push: true
          tags: |
            opencode-sandbox-developer:latest
            opencode-sandbox-developer:${{ github.ref_name }}
          cache-from: type=registry,ref=opencode-sandbox-developer:latest
          cache-to: type=inline
```

## Security

### Base Image Security

- **Non-root user**: All containers run as `opencode` (UID 1000)
- **Minimal packages**: Only essential tools included
- **Alpine Linux**: Small attack surface
- **No privileged operations**: No sudo, no passwordless sudo

### Developer Image Security

- Inherits all base image security
- **Additional tools**: Only development tools, no system utilities
- **Read-only root**: Can be enabled via Docker Manager

### Security Hardening

When using these images with Docker Manager, the following security options are recommended:

```typescript
const security: SecurityOptions = {
  capDrop: ['ALL'],
  capAdd: ['NET_BIND_SERVICE'],
  readonlyRootfs: true,
  noNewPrivileges: true,
  usernsMode: 'host',
};
```

## Image Caching

### BuildKit Cache

Use BuildKit's inline cache for faster builds:

```bash
DOCKER_BUILDKIT=1 docker build \
  --cache-from=type=registry,ref=opencode-sandbox-base:latest \
  --cache-to=type=inline \
  -t opencode-sandbox-base:latest \
  docker-images/opencode-sandbox-base
```

### Multi-stage Builds

Images use single-stage builds for simplicity. For production, consider multi-stage builds to further reduce image size.

## Troubleshooting

### Image Size Too Large

1. Check for unnecessary packages in Dockerfile
2. Use `--no-cache` flag when installing packages
3. Clean up package manager cache after installs
4. Use `.dockerignore` to exclude unnecessary files

### Permission Issues

1. Ensure non-root user is created correctly
2. Verify workspace directory ownership
3. Check user UID/GUID compatibility with host system

### Build Failures

1. Check Node.js version compatibility
2. Verify Alpine package versions
3. Check for network connectivity during build
4. Review build logs for specific errors

## Maintenance

### Updating Images

1. Update `FROM` instruction with new base image version
2. Update package versions
3. Test new images thoroughly
4. Update version tags
5. Update this README

### Image Lifecycle

- **Base image**: Update monthly with Node.js updates
- **Developer image**: Update as needed with new tools
- **Security patches**: Immediate updates for CVEs
- **Testing**: Always test images before production use

## References

- [Node.js Docker Image](https://hub.docker.com/_/node)
- [Alpine Linux](https://www.alpinelinux.org/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Security](https://docs.docker.com/engine/security/)
