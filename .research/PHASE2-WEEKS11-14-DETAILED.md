
---

## Week 11: Docker Integration

### Goals
- Implement full Docker Manager lifecycle
- Create base Docker images
- Implement volume management
- Implement network isolation

### Day 1-2: Docker Manager (2 days)

**Task 11.1: Implement Docker Manager Full Lifecycle (8 hours)**

Deliverable: `src/docker/manager.ts` - Replace placeholder with full implementation

Requirements:
- Container creation with Dockerode SDK
- Container start, stop, restart, pause, unpause
- Container kill and remove
- Resource limits configuration (memory, CPU, PIDs, block I/O)
- Container inspection and status queries
- Log streaming (stdout/stderr separation)
- Error handling with detailed error codes

Public API:
```typescript
class DockerManager {
  async initialize(): Promise<void>;
  
  // Container lifecycle
  async createContainer(config: ContainerConfig): Promise<string>; // Returns container ID
  async startContainer(containerId: string): Promise<void>;
  async stopContainer(containerId: string, timeout?: number): Promise<void>;
  async restartContainer(containerId: string, timeout?: number): Promise<void>;
  async pauseContainer(containerId: string): Promise<void>;
  async unpauseContainer(containerId: string): Promise<void>;
  async killContainer(containerId: string, signal?: string): Promise<void>;
  async removeContainer(containerId: string, force?: boolean): Promise<void>;
  
  // Container info
  async inspectContainer(containerId: string): Promise<ContainerInfo>;
  async getContainerStatus(containerId: string): Promise<ContainerStatus>;
  async getContainerLogs(containerId: string, options?: LogOptions): Promise<LogStream>;
  async getContainerStats(containerId: string): Promise<ContainerStats>;
  
  // Batch operations
  async listContainers(all?: boolean): Promise<ContainerInfo[]>;
  async pruneContainers(): Promise<PruneResult>;
}
```

Integration Points:
- Use Dockerode SDK (already in dependencies)
- Connect via Unix socket: `/var/run/docker.sock`
- Use CONTAINER_MEMORY_MB, CONTAINER_CPU_SHARES, CONTAINER_PIDS_LIMIT from config
- Reference Phase -1 Docker Engine API research (.research/docker-engine-api-research.md)

Acceptance Criteria:
- All container lifecycle methods implemented
- Resource limits configurable
- Log streaming with stdout/stderr separation
- Error handling with OpenCodeError types
- 100% code coverage

---

**Task 11.2: Implement Container Creation Configuration (4 hours)**

Deliverable: `src/docker/container-config.ts`

Requirements:
- ContainerConfig interface
- Resource limits default values
- Environment variable handling
- Volume mount configuration
- Network configuration

```typescript
interface ContainerConfig {
  name: string;
  image: string;
  command?: string[];
  env?: Record<string, string>;
  workingDir?: string;
  mounts?: Mount[];
  network?: string;
  resourceLimits?: ResourceLimits;
  restartPolicy?: RestartPolicy;
}

interface Mount {
  source: string; // Host path or volume
  target: string; // Container path
  type: 'bind' | 'volume' | 'tmpfs';
  readOnly?: boolean;
}
```

Acceptance Criteria:
- ContainerConfig interface defined
- Default values from CONFIG applied
- All Docker mount types supported

---

### Day 3: Base Images (1 day)

**Task 11.3: Create opencode-sandbox-base Image (4 hours)**

Deliverable: `docker-images/opencode-sandbox-base/Dockerfile`

Requirements:
- Minimal base image
- Node.js runtime (v20+)
- Essential tools: git, curl, wget, vim, nano
- Security hardening (non-root user)
- WORKDIR configured

Dockerfile:
```dockerfile
FROM node:20-alpine

# Install essential tools
RUN apk add --no-cache git curl wget vim nano bash

# Create non-root user
RUN addgroup -g opencode opencode && \
    adduser -D -G opencode opencode opencode

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER opencode

# Set default command
CMD ["/bin/bash"]
```

Acceptance Criteria:
- Image builds successfully
- Node.js v20+ available
- Essential tools installed
- Runs as non-root user
- Image size <200MB

---

**Task 11.4: Create opencode-sandbox-developer Image (4 hours)**

Deliverable: `docker-images/opencode-sandbox-developer/Dockerfile`

Requirements:
- Based on opencode-sandbox-base
- Development tools: npm, yarn, typescript, tsx
- Additional tools: jq, docker CLI (for nested containers)
- MCP client library
- Pre-installed packages for common use cases

Dockerfile:
```dockerfile
FROM opencode-sandbox-base:latest

# Install development tools
RUN apk add --no-cache npm jq

# Install TypeScript globally
RUN npm install -g typescript tsx

# Install common utility packages
RUN npm install -g @anthropic-ai/sdk

# Verify installations
RUN node --version && npm --version && tsc --version && tsx --version

CMD ["/bin/bash"]
```

Acceptance Criteria:
- Image builds successfully
- Development tools available
- MCP SDK pre-installed
- Based on opencode-sandbox-base

---

**Task 11.5: Configure Image Build Pipeline (4 hours)**

Deliverable: `docker-images/README.md`

Requirements:
- Build commands for both images
- Version tagging strategy
- Multi-stage build (if needed)
- Image caching strategy
- CI/CD integration instructions

README.md contents:
```markdown
# OpenCode Sandbox Docker Images

## Images

### opencode-sandbox-base
Minimal base image for OpenCode task sandboxes.

**Build**:
```bash
cd docker-images/opencode-sandbox-base
docker build -t opencode-sandbox-base:latest .
```

**Size target**: <200MB

### opencode-sandbox-developer
Development image with additional tools.

**Build**:
```bash
cd docker-images/opencode-sandbox-developer
docker build -t opencode-sandbox-developer:latest .
```

## Versioning
Images use semantic versioning: `v1.0.0`, `v1.0.1`, etc.
```

Acceptance Criteria:
- Build commands documented
- Versioning strategy defined
- README complete
- CI/CD instructions provided

---

### Day 4: Volume Management (1 day)

**Task 11.6: Implement Volume Manager (6 hours)**

Deliverable: `src/docker/volume-manager.ts`

Requirements:
- Workspace volume mounting
- Task-memory persistence volume mounting
- Volume lifecycle management (create, remove, list)
- Named volume support
- Bind mount support
- Volume cleanup on task deletion

Public API:
```typescript
class VolumeManager {
  static getInstance(): VolumeManager;
  
  async mountWorkspace(taskId: string, workspacePath: string): Promise<Mount>;
  async mountTaskMemory(taskId: string): Promise<Mount>;
  async unmountVolumes(taskId: string): Promise<void>;
  async listTaskVolumes(taskId: string): Promise<Volume[]>;
  async cleanupTaskVolumes(taskId: string): Promise<void>;
}
```

Acceptance Criteria:
- Workspace mounting implemented
- Task-memory mounting implemented
- Volume cleanup on task deletion
- Error handling for mount failures

---

**Task 11.7: Create Volume Tests (2 hours)**

Deliverable: `tests/docker/volume-manager.test.ts`

Test Cases:
- Mount workspace volume
- Mount task-memory volume
- List volumes by task
- Unmount volumes
- Cleanup task volumes
- Error handling for invalid paths

Acceptance Criteria:
- All volume operations tested
- Error cases covered
- 100% code coverage

---

### Day 5: Network Isolation (1 day)

**Task 11.8: Implement Network Manager (6 hours)**

Deliverable: `src/docker/network-manager.ts`

Requirements:
- Custom bridge network creation per task
- Network isolation (block external access)
- DNS configuration
- Network policy enforcement
- Network monitoring
- Network cleanup on task deletion

Public API:
```typescript
class NetworkManager {
  static getInstance(): NetworkManager;
  
  async createTaskNetwork(taskId: string): Promise<string>; // Returns network ID
  async connectContainerToNetwork(containerId: string, networkId: string): Promise<void>;
  async disconnectContainerFromNetwork(containerId: string, networkId: string): Promise<void>;
  async removeTaskNetwork(taskId: string): Promise<void>;
  async listTaskNetworks(taskId: string): Promise<NetworkInfo[]>;
  async isolateNetwork(networkId: string): Promise<void>;
}
```

Integration with existing NetworkIsolator:
- Use existing whitelist-based access control
- Integrate with NetworkIsolator from Phase 1

Acceptance Criteria:
- Task-specific bridge networks created
- Network isolation enforced
- DNS configuration supported
- Network cleanup on task deletion
- Integration with NetworkIsolator complete

---

**Task 11.9: Create Network Tests (2 hours)**

Deliverable: `tests/docker/network-manager.test.ts`

Test Cases:
- Create task network
- Connect container to network
- Disconnect container from network
- List task networks
- Remove task network
- Network isolation validation
- Error handling

Acceptance Criteria:
- All network operations tested
- Isolation validation tested
- Error cases covered

---

## Week 11 Deliverables Summary

**Files Created**:
- `src/docker/manager.ts` - Full Docker Manager lifecycle
- `src/docker/container-config.ts` - Container configuration
- `src/docker/volume-manager.ts` - Volume management
- `src/docker/network-manager.ts` - Network management
- `docker-images/opencode-sandbox-base/Dockerfile`
- `docker-images/opencode-sandbox-developer/Dockerfile`
- `docker-images/README.md`
- `tests/docker/manager.test.ts`
- `tests/docker/volume-manager.test.ts`
- `tests/docker/network-manager.test.ts`

**Total Lines of Code**: ~1,800+ lines

**Integration Points**:
- Docker Manager integrates with TaskRegistry
- Volume Manager integrates with MultiLayerPersistence
- Network Manager integrates with NetworkIsolator (Phase 1)
- MCP tools will use Docker Manager (Week 10 tools)

**Acceptance Criteria for Week 11**:
- [ ] Docker Manager full lifecycle implemented
- [ ] All 2 base images built successfully
- [ ] Volume management implemented
- [ ] Network isolation implemented
- [ ] All Docker tests created
- [ ] Integration with Phase 1 components complete
- [ ] 100% test coverage for Docker components

---
