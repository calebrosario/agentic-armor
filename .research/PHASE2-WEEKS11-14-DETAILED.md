
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

---

## Week 12: Hooks System

### Goals
- Implement task lifecycle hooks
- Implement git hooks
- Implement plan hooks
- Implement safety hooks

### Day 1-2: Task Lifecycle Hooks (2 days)

**Task 12.1: Implement Task Lifecycle Hooks Manager (6 hours)**

Deliverable: `hooks/task-lifecycle.ts`

Requirements:
- Hook registration system
- Hook execution on task state changes
- Async hook support
- Error handling for failed hooks
- Hook priority/ordering

Hook Types:
```typescript
// Before task starts
type BeforeTaskStartHook = (taskId: string, agentId: string) => Promise<void>;

// After task starts
type AfterTaskStartHook = (taskId: string, agentId: string) => Promise<void>;

// Before task completes
type BeforeTaskCompleteHook = (taskId: string, result: TaskResult) => Promise<void>;

// After task completes
type AfterTaskCompleteHook = (taskId: string, result: TaskResult) => Promise<void>;

// Before task fails
type BeforeTaskFailHook = (taskId: string, error: string) => Promise<void>;

// After task fails
type AfterTaskFailHook = (taskId: string, error: string) => Promise<void>;
```

Public API:
```typescript
class TaskLifecycleHooks {
  static getInstance(): TaskLifecycleHooks;
  
  // Hook registration
  registerBeforeTaskStart(hook: BeforeTaskStartHook, priority?: number): void;
  registerAfterTaskStart(hook: AfterTaskStartHook, priority?: number): void;
  registerBeforeTaskComplete(hook: BeforeTaskCompleteHook, priority?: number): void;
  registerAfterTaskComplete(hook: AfterTaskCompleteHook, priority?: number): void;
  registerBeforeTaskFail(hook: BeforeTaskFailHook, priority?: number): void;
  registerAfterTaskFail(hook: AfterTaskFailHook, priority?: number): void;
  
  // Hook execution (called by TaskLifecycle)
  async executeBeforeTaskStart(taskId: string, agentId: string): Promise<void>;
  async executeAfterTaskStart(taskId: string, agentId: string): Promise<void>;
  async executeBeforeTaskComplete(taskId: string, result: TaskResult): Promise<void>;
  async executeAfterTaskComplete(taskId: string, result: TaskResult): Promise<void>;
  async executeBeforeTaskFail(taskId: string, error: string): Promise<void>;
  async executeAfterTaskFail(taskId: string, error: string): Promise<void>;
  
  // Hook management
  unregisterHook(hookId: string): void;
  getAllHooks(): Hook[];
}
```

Integration Points:
- TaskLifecycle.startTask() → executeBeforeTaskStart() → executeAfterTaskStart()
- TaskLifecycle.completeTask() → executeBeforeTaskComplete() → executeAfterTaskComplete()
- TaskLifecycle.failTask() → executeBeforeTaskFail() → executeAfterTaskFail()

Acceptance Criteria:
- All 6 hook types defined
- Hook registration system implemented
- Hook priority ordering supported
- Async hook execution supported
- Error handling for failed hooks
- Integration points in TaskLifecycle identified

---

**Task 12.2: Implement checkpoint-creator Hook (4 hours)**

Deliverable: `hooks/task-lifecycle/checkpoint-creator.ts`

Requirements:
- Create checkpoint before task completes
- Include state.json in checkpoint
- Include JSONL logs in checkpoint
- Create checkpoint manifest

Hook Implementation:
```typescript
export function createCheckpointBeforeCompleteHook(): BeforeTaskCompleteHook {
  return async (taskId: string, result: TaskResult) => {
    const checkpointId = await multiLayerPersistence.createCheckpoint(
      taskId,
      `Checkpoint before completion: ${result.success ? 'success' : 'failed'}`
    );
    
    logger.info('Checkpoint created before task complete', { taskId, checkpointId });
  };
}
```

Acceptance Criteria:
- Hook creates checkpoint with task state
- Hook includes logs in checkpoint
- Checkpoint manifest created
- Error handling implemented

---

**Task 12.3: Implement task-resumer Hook (4 hours)**

Deliverable: `hooks/task-lifecycle/task-resumer.ts`

Requirements:
- Load state from checkpoint
- Restore JSONL logs
- Set task status to pending
- Update TaskRegistry

Hook Implementation:
```typescript
export function createTaskResumerHook(): Hook {
  return async (taskId: string, checkpointId: string) => {
    // Restore checkpoint
    await multiLayerPersistence.restoreCheckpoint(taskId, checkpointId);
    
    // Set task to pending (ready to resume)
    const task = await taskRegistry.getById(taskId);
    if (task && task.status === 'completed') {
      await taskLifecycle.cancelTask(taskId);
      await taskRegistry.update(taskId, { status: 'pending' });
    }
    
    logger.info('Task resumed from checkpoint', { taskId, checkpointId });
  };
}
```

Acceptance Criteria:
- Hook restores checkpoint
- Hook sets task to pending
- Hook updates TaskRegistry
- Error handling for invalid checkpoint

---

### Day 3: Git Hooks (1 day)

**Task 12.4: Implement pre-task-branch-creator Hook (3 hours)**

Deliverable: `hooks/git-hooks/branch-creator.ts`

Requirements:
- Create Git branch for task
- Use naming convention: `task/TASK_ID`
- Set up workspace
- Handle existing branches

Hook Implementation:
```typescript
export function createPreTaskBranchCreatorHook(): BeforeTaskStartHook {
  return async (taskId: string, agentId: string) => {
    const branchName = `task/${taskId}`;
    const workspacePath = getWorkspacePath(taskId);
    
    // Create branch
    await exec(`git init ${workspacePath}`);
    await exec(`git checkout -b ${branchName}`, { cwd: workspacePath });
    
    logger.info('Task branch created', { taskId, branchName, workspacePath });
  };
}
```

Acceptance Criteria:
- Branch created with correct naming
- Workspace initialized as Git repo
- Existing branches handled gracefully
- Error handling for Git failures

---

**Task 12.5: Implement branch-name-validator Hook (2 hours)**

Deliverable: `hooks/git-hooks/branch-validator.ts`

Requirements:
- Validate task branch naming
- Enforce naming convention
- Reject invalid names

Hook Implementation:
```typescript
export function createBranchNameValidatorHook(): BeforeTaskStartHook {
  return async (taskId: string, agentId: string) => {
    const branchName = `task/${taskId}`;
    const pattern = /^task\/[a-z0-9-]+$/;
    
    if (!pattern.test(branchName)) {
      throw new Error(`Invalid branch name: ${branchName}`);
    }
    
    logger.info('Branch name validated', { taskId, branchName });
  };
}
```

Acceptance Criteria:
- Branch naming convention enforced
- Invalid names rejected
- Validation error messages clear

---

**Task 12.6: Implement submodule-creator Hook (3 hours)**

Deliverable: `hooks/git-hooks/submodule-creator.ts`

Requirements:
- Create Git submodule for task memory
- Initialize submodule
- Add submodule to parent repo

Hook Implementation:
```typescript
export function createSubmoduleCreatorHook(): AfterTaskStartHook {
  return async (taskId: string, agentId: string) => {
    const taskMemoryPath = getTaskMemoryPath(taskId);
    
    // Create submodule in parent repo
    await exec(`git submodule add ${taskMemoryPath} .task-memory/${taskId}`);
    
    logger.info('Task memory submodule created', { taskId, path: taskMemoryPath });
  };
}
```

Acceptance Criteria:
- Submodule created for task memory
- Submodule initialized
- Added to parent repo
- Error handling for Git failures

---

### Day 4: Plan Hooks (1 day)

**Task 12.7: Implement plan-file-creator Hook (3 hours)**

Deliverable: `hooks/plan-hooks/file-creator.ts`

Requirements:
- Create Plan.md file for task
- Include task metadata
- Include agent information

Hook Implementation:
```typescript
export function createPlanFileCreatorHook(): AfterTaskStartHook {
  return async (taskId: string, agentId: string) => {
    const task = await taskRegistry.getById(taskId);
    const planContent = generatePlanContent(task, agentId);
    const planPath = getPlanPath(taskId);
    
    await fs.writeFile(planPath, planContent, 'utf-8');
    
    logger.info('Plan file created', { taskId, agentId, planPath });
  };
}
```

Acceptance Criteria:
- Plan.md file created
- Task metadata included
- Agent information included
- Proper formatting

---

**Task 12.8: Implement plan-updater Hook (3 hours)**

Deliverable: `hooks/plan-hooks/updater.ts`

Requirements:
- Update Plan.md on task progress
- Append execution notes
- Track subtasks

Hook Implementation:
```typescript
export function createPlanUpdaterHook(): AfterTaskCompleteHook {
  return async (taskId: string, result: TaskResult) => {
    const planPath = getPlanPath(taskId);
    const planContent = await fs.readFile(planPath, 'utf-8');
    const updatedPlan = updatePlanContent(planContent, result);
    
    await fs.writeFile(planPath, updatedPlan, 'utf-8');
    
    logger.info('Plan file updated', { taskId, result });
  };
}
```

Acceptance Criteria:
- Plan.md updated on completion
- Execution notes appended
- Subtasks tracked
- Formatting preserved

---

**Task 12.9: Implement plan-finalizer Hook (2 hours)**

Deliverable: `hooks/plan-hooks/finalizer.ts`

Requirements:
- Mark plan as complete in Plan.md
- Add summary section
- Add next steps

Hook Implementation:
```typescript
export function createPlanFinalizerHook(): AfterTaskCompleteHook {
  return async (taskId: string, result: TaskResult) => {
    const planPath = getPlanPath(taskId);
    const planContent = await fs.readFile(planPath, 'utf-8');
    const finalizedPlan = finalizePlanContent(planContent, result);
    
    await fs.writeFile(planPath, finalizedPlan, 'utf-8');
    
    logger.info('Plan finalized', { taskId, result });
  };
}
```

Acceptance Criteria:
- Plan marked as complete
- Summary section added
- Next steps documented

---

### Day 5: Safety Hooks (1 day)

**Task 12.10: Implement container-safety-enforcer Hook (3 hours)**

Deliverable: `hooks/safety-hooks/container-enforcer.ts`

Requirements:
- Validate container configuration
- Enforce security policies
- Check resource limits
- Validate image source

Hook Implementation:
```typescript
export function createContainerSafetyEnforcerHook(): BeforeTaskStartHook {
  return async (taskId: string, agentId: string) => {
    const task = await taskRegistry.getById(taskId);
    const config = task.metadata?.containerConfig;
    
    // Validate image source
    if (!isAllowedImage(config?.image)) {
      throw new Error(`Image not allowed: ${config?.image}`);
    }
    
    // Validate resource limits
    validateResourceLimits(config?.resourceLimits);
    
    // Enforce security policies
    enforceSecurityPolicies(config);
    
    logger.info('Container safety enforced', { taskId, config });
  };
}
```

Acceptance Criteria:
- Image source validation
- Resource limit validation
- Security policy enforcement
- Clear error messages

---

**Task 12.11: Implement resource-limit-monitor Hook (2 hours)**

Deliverable: `hooks/safety-hooks/resource-monitor.ts`

Requirements:
- Monitor container resource usage
- Alert on threshold breaches
- Enforce limits

Hook Implementation:
```typescript
export function createResourceLimitMonitorHook(): AfterTaskStartHook {
  return async (taskId: string, agentId: string) => {
    const containerId = getContainerIdForTask(taskId);
    
    // Start periodic monitoring
    startResourceMonitoring(taskId, containerId, {
      memory: { threshold: 85, alert: true },
      cpu: { threshold: 80, alert: true },
      pids: { threshold: 80, alert: true },
    });
    
    logger.info('Resource monitoring started', { taskId, containerId });
  };
}
```

Acceptance Criteria:
- Resource monitoring started
- Thresholds configured
- Alerts implemented
- Monitoring stops on task completion

---

**Task 12.12: Implement isolation-checker Hook (3 hours)**

Deliverable: `hooks/safety-hooks/isolation-checker.ts`

Requirements:
- Verify network isolation
- Verify filesystem isolation
- Check for privileged mode
- Validate user namespaces

Hook Implementation:
```typescript
export function createIsolationCheckerHook(): AfterTaskStartHook {
  return async (taskId: string, agentId: string) => {
    const containerId = getContainerIdForTask(taskId);
    const container = await dockerManager.inspectContainer(containerId);
    
    // Verify network isolation
    verifyNetworkIsolation(container);
    
    // Verify filesystem isolation
    verifyFilesystemIsolation(container);
    
    // Check for privileged mode
    if (container.HostConfig.Privileged) {
      throw new Error('Privileged mode not allowed');
    }
    
    // Validate user namespaces
    if (!container.HostConfig.UsernsMode) {
      throw new Error('User namespaces required');
    }
    
    logger.info('Isolation verified', { taskId, containerId });
  };
}
```

Acceptance Criteria:
- Network isolation verified
- Filesystem isolation verified
- Privileged mode check
- User namespace validation

---

**Task 12.13: Create Hook Tests (4 hours)**

Deliverable: `tests/hooks/task-lifecycle.test.ts` and `tests/hooks/git-hooks.test.ts` and `tests/hooks/plan-hooks.test.ts` and `tests/hooks/safety-hooks.test.ts`

Test Cases:
- Task lifecycle hooks (all 6 types)
- Checkpoint creation
- Task resumption
- Git branch creation
- Branch name validation
- Submodule creation
- Plan file creation
- Plan file update
- Plan finalization
- Container safety enforcement
- Resource limit monitoring
- Isolation checking

Acceptance Criteria:
- All hooks tested
- Integration with TaskLifecycle tested
- Error cases tested
- 100% code coverage

---

## Week 12 Deliverables Summary

**Files Created**:
- `hooks/task-lifecycle.ts` - Hooks manager
- `hooks/task-lifecycle/checkpoint-creator.ts`
- `hooks/task-lifecycle/task-resumer.ts`
- `hooks/git-hooks/branch-creator.ts`
- `hooks/git-hooks/branch-validator.ts`
- `hooks/git-hooks/submodule-creator.ts`
- `hooks/plan-hooks/file-creator.ts`
- `hooks/plan-hooks/updater.ts`
- `hooks/plan-hooks/finalizer.ts`
- `hooks/safety-hooks/container-enforcer.ts`
- `hooks/safety-hooks/resource-monitor.ts`
- `hooks/safety-hooks/isolation-checker.ts`
- `tests/hooks/task-lifecycle.test.ts`
- `tests/hooks/git-hooks.test.ts`
- `tests/hooks/plan-hooks.test.ts`
- `tests/hooks/safety-hooks.test.ts`

**Total Files**: 14 files
**Total Lines of Code**: ~2,500+ lines

**Acceptance Criteria for Week 12**:
- [ ] Task lifecycle hooks manager implemented
- [ ] All 6 hook types defined and implemented
- [ ] 3 task lifecycle hooks implemented (checkpoint, resumer)
- [ ] 3 git hooks implemented (branch creator, validator, submodule)
- [ ] 3 plan hooks implemented (creator, updater, finalizer)
- [ ] 3 safety hooks implemented (container enforcer, resource monitor, isolation checker)
- [ ] Hook test suites created
- [ ] Integration with TaskLifecycle complete
- [ ] Integration with TaskRegistry complete
- [ ] Integration with MultiLayerPersistence complete
- [ ] 100% code coverage

---
