
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

---

## Week 13: User Commands

### Goals
- Implement 6 task management commands
- Implement 2 checkpoint commands
- Implement 5 memory commands
- Integrate all commands with existing systems

### Day 1-3: Task Management Commands (3 days)

**Task 13.1: Implement /create-task Command (6 hours)**

Deliverable: `commands/task-management/create-task.ts`

Requirements:
- Command validation (required parameters)
- Task creation via TaskLifecycle
- Configuration support (metadata, resource limits)
- Error handling and user-friendly messages
- Command registration with CLI framework

Command Interface:
```typescript
interface CreateTaskCommand {
  name: string;
  description?: string;
  owner?: string;
  metadata?: Record<string, any>;
  resourceLimits?: ResourceLimits;
  workspacePath?: string;
}
```

Implementation:
```typescript
import { Command } from 'commander';
import { taskLifecycle } from '../../task/lifecycle';
import { TaskConfig } from '../../types';

export const createTaskCommand = new Command('create-task')
  .description('Create a new task')
  .argument('<name>', 'Task name')
  .option('-d, --description <string>', 'Task description')
  .option('-o, --owner <string>', 'Task owner')
  .option('-m, --metadata <JSON>', 'Task metadata as JSON')
  .action(async (name, options) => {
    try {
      const config: TaskConfig = {
        name,
        description: options.description,
        owner: options.owner,
        metadata: options.metadata ? JSON.parse(options.metadata) : undefined,
      };

      const task = await taskLifecycle.createTask(config);
      
      console.log('✅ Task created successfully');
      console.log(`   Task ID: ${task.id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Created At: ${task.createdAt.toISOString()}`);
    } catch (error: any) {
      console.error('❌ Failed to create task:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Command registered with CLI framework
- Required parameter validation
- Task created via TaskLifecycle
- Configuration options supported
- Error handling with user-friendly messages
- Success message with task details

---

**Task 13.2: Implement /resume-task Command (4 hours)**

Deliverable: `commands/task-management/resume-task.ts`

Requirements:
- Validate task exists and is pending
- Attach agent to task via TaskLifecycle.startTask()
- Load last checkpoint if available
- Set task to running state

Implementation:
```typescript
export const resumeTaskCommand = new Command('resume-task')
  .description('Resume a pending task')
  .argument('<taskId>', 'Task ID to resume')
  .option('-a, --agent <string>', 'Agent ID', 'system')
  .option('-c, --checkpoint <string>', 'Checkpoint ID to restore')
  .action(async (taskId, options) => {
    try {
      // If checkpoint specified, restore it first
      if (options.checkpoint) {
        await restoreCheckpoint(taskId, options.checkpoint);
      }
      
      const task = await taskLifecycle.startTask(taskId, options.agent);
      
      console.log('✅ Task resumed successfully');
      console.log(`   Task ID: ${task.id}`);
      console.log(`   Status: ${task.status}`);
    } catch (error: any) {
      console.error('❌ Failed to resume task:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task existence validation
- Agent attachment via startTask
- Optional checkpoint restoration
- Task state set to running
- Error handling

---

**Task 13.3: Implement /list-tasks Command (4 hours)**

Deliverable: `commands/task-management/list-tasks.ts`

Requirements:
- List tasks with optional filters
- Support filtering by status, owner
- Support limit and offset for pagination
- Display task summary

Implementation:
```typescript
export const listTasksCommand = new Command('list-tasks')
  .description('List all tasks')
  .option('-s, --status <status>', 'Filter by status')
  .option('-o, --owner <string>', 'Filter by owner')
  .option('-l, --limit <number>', 'Limit results', '100')
  .option('--offset <number>', 'Offset for pagination', '0')
  .option('-v, --verbose', 'Show detailed information', false)
  .action(async (options) => {
    try {
      const tasks = await taskRegistry.list({
        status: options.status,
        owner: options.owner,
        limit: options.limit,
        offset: options.offset,
      });

      displayTasks(tasks, options.verbose);
    } catch (error: any) {
      console.error('❌ Failed to list tasks:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Filter by status
- Filter by owner
- Pagination support (limit, offset)
- Verbose mode for details
- Formatted output

---

**Task 13.4: Implement /detach Command (3 hours)**

Deliverable: `commands/task-management/detach.ts`

Requirements:
- Validate task exists and has attached agent
- Detach agent from task
- Keep task in current state (don't stop)

Implementation:
```typescript
export const detachCommand = new Command('detach')
  .description('Detach agent from task')
  .argument('<taskId>', 'Task ID')
  .option('-a, --agent <string>', 'Agent ID to detach')
  .action(async (taskId, options) => {
    try {
      // Validate task and agent
      const task = await taskRegistry.getById(taskId);
      if (!task) {
        console.error('❌ Task not found');
        process.exit(1);
      }

      // Log detachment (actual detachment handled by MCP tool)
      logger.info('Agent detached from task', { taskId, agentId: options.agent });
      
      console.log('✅ Agent detached from task');
      console.log(`   Task ID: ${task.id}`);
      console.log(`   Agent: ${options.agent}`);
    } catch (error: any) {
      console.error('❌ Failed to detach agent:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task validation
- Agent validation
- Detachment logged
- Error handling
- Success message

---

**Task 13.5: Implement /complete-task Command (4 hours)**

Deliverable: `commands/task-management/complete-task.ts`

Requirements:
- Validate task exists and is running
- Set task to completed state
- Capture result/output
- Log completion

Implementation:
```typescript
export const completeTaskCommand = new Command('complete-task')
  .description('Mark a task as completed')
  .argument('<taskId>', 'Task ID')
  .option('-r, --result <JSON>', 'Task result as JSON')
  .option('-m, --message <string>', 'Completion message')
  .action(async (taskId, options) => {
    try {
      const result: TaskResult = {
        success: true,
        data: options.result ? JSON.parse(options.result) : undefined,
      };

      const task = await taskLifecycle.completeTask(taskId, result);
      
      console.log('✅ Task completed successfully');
      console.log(`   Task ID: ${task.id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Completed At: ${new Date().toISOString()}`);
    } catch (error: any) {
      console.error('❌ Failed to complete task:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task validation
- Completion via TaskLifecycle
- Result capture supported
- Message capture supported
- Success/error messages

---

**Task 13.6: Implement /cleanup-task Command (3 hours)**

Deliverable: `commands/task-management/cleanup-task.ts`

Requirements:
- Validate task exists
- Stop task if running
- Remove task from registry
- Cleanup persistence layers
- Cleanup Docker container

Implementation:
```typescript
export const cleanupTaskCommand = new Command('cleanup-task')
  .description('Cleanup a task and all its resources')
  .argument('<taskId>', 'Task ID')
  .option('--force', 'Force cleanup without confirmation', false)
  .action(async (taskId, options) => {
    try {
      const task = await taskRegistry.getById(taskId);
      if (!task) {
        console.error('❌ Task not found');
        process.exit(1);
      }

      if (!options.force) {
        const confirm = await promptConfirm(`Are you sure you want to cleanup task ${taskId}?`);
        if (!confirm) {
          console.log('Cleanup cancelled');
          process.exit(0);
        }
      }

      // Stop Docker container if running
      if (task.status === 'running') {
        await dockerManager.stopContainer(containerId);
      }

      // Delete task (cleanup persistence)
      await taskLifecycle.deleteTask(taskId);

      console.log('✅ Task cleaned up successfully');
      console.log(`   Task ID: ${taskId}`);
    } catch (error: any) {
      console.error('❌ Failed to cleanup task:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task validation
- Docker container stopped (if running)
- Persistence cleanup
- Confirmation prompt
- Force option
- Success/error messages

---

### Day 4: Checkpoint Commands (1 day)

**Task 13.7: Implement /checkpoint Command (4 hours)**

Deliverable: `commands/checkpoint/checkpoint.ts`

Requirements:
- Validate task exists
- Create checkpoint via MultiLayerPersistence
- Include description
- Return checkpoint ID

Implementation:
```typescript
export const checkpointCommand = new Command('checkpoint')
  .description('Create a checkpoint for a task')
  .argument('<taskId>', 'Task ID')
  .option('-d, --description <string>', 'Checkpoint description')
  .action(async (taskId, options) => {
    try {
      const checkpointId = await multiLayerPersistence.createCheckpoint(
        taskId,
        options.description || `Checkpoint created at ${new Date().toISOString()}`
      );

      console.log('✅ Checkpoint created successfully');
      console.log(`   Task ID: ${taskId}`);
      console.log(`   Checkpoint ID: ${checkpointId}`);
    } catch (error: any) {
      console.error('❌ Failed to create checkpoint:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task validation
- Checkpoint creation
- Description support
- Checkpoint ID returned
- Error handling

---

**Task 13.8: Implement /restore-checkpoint Command (4 hours)**

Deliverable: `commands/checkpoint/restore-checkpoint.ts`

Requirements:
- Validate task exists
- List available checkpoints
- Validate checkpoint ID
- Restore checkpoint via MultiLayerPersistence
- Set task to pending state

Implementation:
```typescript
export const restoreCheckpointCommand = new Command('restore-checkpoint')
  .description('Restore a task from a checkpoint')
  .argument('<taskId>', 'Task ID')
  .option('-c, --checkpoint <string>', 'Checkpoint ID to restore')
  .option('-l, --list', 'List available checkpoints', false)
  .action(async (taskId, options) => {
    try {
      if (options.list) {
        const checkpoints = await multiLayerPersistence.listCheckpoints(taskId);
        
        console.log('Available checkpoints:');
        checkpoints.forEach(cp => {
          console.log(`  - ${cp.id}: ${cp.description}`);
          console.log(`    Created: ${cp.timestamp}`);
        });
        return;
      }

      if (!options.checkpoint) {
        console.error('❌ Checkpoint ID required (or use --list)');
        process.exit(1);
      }

      const task = await taskRegistry.getById(taskId);
      if (!task) {
        console.error('❌ Task not found');
        process.exit(1);
      }

      await multiLayerPersistence.restoreCheckpoint(taskId, options.checkpoint);
      
      // Set task to pending
      await taskRegistry.update(taskId, { status: 'pending' });
      
      console.log('✅ Checkpoint restored successfully');
      console.log(`   Task ID: ${taskId}`);
      console.log(`   Checkpoint ID: ${options.checkpoint}`);
      console.log(`   Task Status: pending`);
    } catch (error: any) {
      console.error('❌ Failed to restore checkpoint:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task validation
- List checkpoints option
- Checkpoint validation
- Checkpoint restoration
- Task state reset to pending
- Error handling

---

### Day 5: Memory Commands (1 day)

**Task 13.9: Implement /task-history Command (4 hours)**

Deliverable: `commands/memory/task-history.ts`

Requirements:
- Validate task exists
- Load and display task history from JSONL logs
- Support filtering (level, date range)
- Support limit for output

Implementation:
```typescript
export const taskHistoryCommand = new Command('task-history')
  .description('Show task execution history')
  .argument('<taskId>', 'Task ID')
  .option('-l, --level <string>', 'Filter by log level')
  .option('--limit <number>', 'Limit number of entries', '50')
  .option('--start <date>', 'Start date filter')
  .option('--end <date>', 'End date filter')
  .action(async (taskId, options) => {
    try {
      const logs = await multiLayerPersistence.loadLogs(taskId, {
        level: options.level,
        limit: options.limit,
        startDate: options.start,
        endDate: options.end,
      });

      displayLogs(logs);
    } catch (error: any) {
      console.error('❌ Failed to load task history:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task validation
- Load logs from JSONL
- Filtering support (level, date, limit)
- Formatted output
- Error handling

---

**Task 13.10: Implement /task-executions Command (4 hours)**

Deliverable: `commands/memory/task-executions.ts`

Requirements:
- Validate task exists
- Display task execution statistics
- Show container info
- Show resource usage

Implementation:
```typescript
export const taskExecutionsCommand = new Command('task-executions')
  .description('Show task execution details')
  .argument('<taskId>', 'Task ID')
  .action(async (taskId) => {
    try {
      const task = await taskRegistry.getById(taskId);
      if (!task) {
        console.error('❌ Task not found');
        process.exit(1);
      }

      displayTaskDetails(task);
      
      // Get container info if task is running
      if (task.status === 'running' && task.metadata?.containerId) {
        const container = await dockerManager.inspectContainer(task.metadata.containerId);
        displayContainerInfo(container);
      }
    } catch (error: any) {
      console.error('❌ Failed to get task executions:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task validation
- Display task details
- Display container info (if running)
- Display resource usage
- Error handling

---

**Task 13.11: Implement /task-decisions Command (3 hours)**

Deliverable: `commands/memory/task-decisions.ts`

Requirements:
- Validate task exists
- Load and display agent decisions from decisions.md
- Support filtering by agent
- Support limit for output

Implementation:
```typescript
export const taskDecisionsCommand = new Command('task-decisions')
  .description('Show agent decisions for a task')
  .argument('<taskId>', 'Task ID')
  .option('-a, --agent <string>', 'Filter by agent ID')
  .option('--limit <number>', 'Limit number of decisions', '20')
  .action(async (taskId, options) => {
    try {
      const decisions = await multiLayerPersistence.loadDecisions(taskId);
      
      let filtered = decisions;
      if (options.agent) {
        filtered = decisions.filter(d => d.agentId === options.agent);
      }

      const limited = filtered.slice(0, options.limit || 20);

      displayDecisions(limited);
    } catch (error: any) {
      console.error('❌ Failed to load task decisions:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task validation
- Load decisions from decisions.md
- Agent filtering
- Limit support
- Formatted output
- Error handling

---

**Task 13.12: Implement /find-task Command (3 hours)**

Deliverable: `commands/memory/find-task.ts`

Requirements:
- Search tasks by name or metadata
- Support filtering by status, owner
- Display matching tasks
- Fuzzy matching support

Implementation:
```typescript
export const findTaskCommand = new Command('find-task')
  .description('Find tasks by name or metadata')
  .argument('<query>', 'Search query')
  .option('-s, --status <status>', 'Filter by status')
  .option('-o, --owner <string>', 'Filter by owner')
  .option('-m, --metadata <JSON>', 'Filter by metadata')
  .action(async (query, options) => {
    try {
      const allTasks = await taskRegistry.list();
      
      const matches = allTasks.filter(task => {
        const nameMatch = task.name.toLowerCase().includes(query.toLowerCase());
        const metaMatch = task.metadata ? JSON.stringify(task.metadata).toLowerCase().includes(query.toLowerCase()) : false;
        
        let statusMatch = true;
        if (options.status && task.status !== options.status) {
          statusMatch = false;
        }
        
        let ownerMatch = true;
        if (options.owner && task.owner !== options.owner) {
          ownerMatch = false;
        }
        
        let metaMatch = true;
        if (options.metadata) {
          const meta = JSON.parse(options.metadata);
          const taskMeta = task.metadata || {};
          metaMatch = Object.keys(meta).every(key => 
            taskMeta[key] === meta[key]
          );
        }
        
        return (nameMatch || metaMatch) && statusMatch && ownerMatch && metaMatch;
      });

      displaySearchResults(matches, query);
    } catch (error: any) {
      console.error('❌ Failed to find tasks:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Name and metadata search
- Fuzzy matching
- Status and owner filtering
- Formatted search results
- Error handling

---

**Task 13.13: Implement /task-stats Command (3 hours)**

Deliverable: `commands/memory/task-stats.ts`

Requirements:
- Display task statistics
- Count tasks by status
- Show most recent tasks
- Show task distribution by owner

Implementation:
```typescript
export const taskStatsCommand = new Command('task-stats')
  .description('Show task statistics')
  .action(async () => {
    try {
      const allTasks = await taskRegistry.list();
      
      // Count by status
      const statusCounts = allTasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Count by owner
      const ownerCounts = allTasks.reduce((acc, task) => {
        const owner = task.owner || 'none';
        acc[owner] = (acc[owner] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      displayStatistics(allTasks, statusCounts, ownerCounts);
    } catch (error: any) {
      console.error('❌ Failed to get task stats:', error.message);
      process.exit(1);
    }
  });
```

Acceptance Criteria:
- Task statistics displayed
- Status distribution shown
- Owner distribution shown
- Summary statistics
- Error handling

---

## Week 13 Deliverables Summary

**Files Created**:
- `commands/task-management/create-task.ts`
- `commands/task-management/resume-task.ts`
- `commands/task-management/list-tasks.ts`
- `commands/task-management/detach.ts`
- `commands/task-management/complete-task.ts`
- `commands/task-management/cleanup-task.ts`
- `commands/checkpoint/checkpoint.ts`
- `commands/checkpoint/restore-checkpoint.ts`
- `commands/memory/task-history.ts`
- `commands/memory/task-executions.ts`
- `commands/memory/task-decisions.ts`
- `commands/memory/find-task.ts`
- `commands/memory/task-stats.ts`

**Total Files**: 13 command files

**Integration Points**:
- All commands use TaskLifecycle
- Checkpoint commands use MultiLayerPersistence
- Task display uses TaskRegistry
- Cleanup command uses DockerManager

**Acceptance Criteria for Week 13**:
- [ ] 6 task management commands implemented
- [ ] 2 checkpoint commands implemented
- [ ] 5 memory commands implemented
- [ ] Command registration with CLI framework
- [ ] Error handling for all commands
- [ ] User-friendly messages
- [ ] Integration with existing systems

---

---

## Week 14: Integration & Alpha Release

### Goals
- Integrate all MVP components
- Create comprehensive end-to-end tests
- Write all documentation (README, API, user guide, developer guide)
- Prepare and execute Alpha v0.1.0 release
- Monitor deployment and gather feedback

### Day 1-2: Integration (2 days)

**Task 14.1: Component Integration Testing (8 hours)**

Deliverable: `tests/integration/component-integration.test.ts`

Requirements:
- Test TaskLifecycle + TaskRegistry integration
- Test TaskLifecycle + MultiLayerPersistence integration
- Test TaskLifecycle + LockManager integration
- Test MCP Tools + TaskLifecycle integration
- Test MCP Tools + Docker Manager integration (mocked for now)
- Test Hooks + TaskLifecycle integration
- Test Hooks + MultiLayerPersistence integration

Test Scenarios:
```typescript
describe('Component Integration', () => {
  test('TaskLifecycle + TaskRegistry', async () => {
    // Create task via lifecycle
    // Verify task in registry
    // Verify persistence layers created
  });

  test('TaskLifecycle + LockManager', async () => {
    // Create task
    // Verify lock acquired
    // Verify lock released on completion
  });

  test('MCP Tools + TaskLifecycle', async () => {
    // Call create_task_sandbox MCP tool
    // Verify task created via lifecycle
    // Verify task in registry
  });

  test('Hooks + TaskLifecycle', async () => {
    // Register hooks
    // Create task
    // Verify hooks triggered
    // Verify hook order and priority
  });

  test('Hooks + Persistence', async () => {
    // Register hooks
    // Create and complete task
    // Verify checkpoint created
    // Verify logs appended
    // Verify decisions recorded
  });
});
```

Acceptance Criteria:
- All component integrations tested
- Data flow validated between components
- Error propagation tested
- Lock contention scenarios tested
- Integration test suite created

---

**Task 14.2: End-to-End Workflow Testing (8 hours)**

Deliverable: `tests/integration/e2e-workflows.test.ts`

Requirements:
- Complete user workflows from start to finish
- Task creation → agent attachment → command execution → completion
- Checkpoint creation → task resumption → completion
- Multi-agent workflows (2+ agents working on same task)
- Error recovery workflows (task failure, container crash)

Test Scenarios:
```typescript
describe('End-to-End Workflows', () => {
  test('Complete task lifecycle', async () => {
    // 1. Create task
    // 2. Attach agent
    // 3. Execute commands
    // 4. Complete task
    // 5. Verify all persistence layers updated
    // 6. Verify task status in registry
  });

  test('Checkpoint and resume workflow', async () => {
    // 1. Create task
    // 2. Start task and do work
    // 3. Create checkpoint
    // 4. Complete/cancel task
    // 5. Create new task
    // 6. Restore from checkpoint
    // 7. Verify state restored
    // 8. Resume work
  });

  test('Multi-agent collaborative workflow', async () => {
    // 1. Create task
    // 2. Attach agent A
    // 3. Attach agent B (collaborative mode)
    // 4. Agent A makes changes
    // 5. Agent B makes changes
    // 6. Verify optimistic locking works
    // 7. Complete task
  });

  test('Error recovery workflow', async () => {
    // 1. Create task
    // 2. Simulate task failure
    // 3. Verify error logged
    // 4. Verify state corruption recovery
    // 5. Verify cleanup completed
  });

  test('Docker container workflow', async () => {
    // 1. Create task (with mocked Docker Manager)
    // 2. Simulate container creation
    // 3. Start container
    // 4. Execute commands
    // 5. Stop container
    // 6. Remove container
    // 7. Verify cleanup
  });
});
```

Acceptance Criteria:
- All E2E workflows tested
- Component interactions validated
- Error scenarios tested
- Recovery workflows validated
- Integration test suite created

---

### Day 3: Documentation (1 day)

**Task 14.3: Create README.md (4 hours)**

Deliverable: `docs/README.md`

Requirements:
- Project overview and description
- Installation instructions
- Quick start guide
- Architecture overview
- Key features
- Configuration guide
- Common use cases
- Troubleshooting section

README Structure:
```markdown
# OpenCode Tools - Task Management with Docker Sandboxes

## Overview
[Brief description of the project]

## Features
[Key features list]

## Installation
[Step-by-step installation guide]

## Quick Start
[Get started in 5 minutes]

## Architecture
[High-level architecture diagram]
[Component descriptions]

## Configuration
[Environment variables and config options]

## Usage
[Common use cases and examples]

## Development
[Developer setup instructions]

## Troubleshooting
[Common issues and solutions]

## Contributing
[How to contribute]
```

Acceptance Criteria:
- README created with all sections
- Installation instructions tested
- Quick start guide verified
- Architecture diagram included
- Configuration documented
- Troubleshooting section complete

---

**Task 14.4: Create API Documentation (3 hours)**

Deliverable: `docs/API.md`

Requirements:
- All MCP tools documented
- TaskRegistry API documented
- TaskLifecycle API documented
- MultiLayerPersistence API documented
- Hook system documented
- Command-line interface documented
- Request/response formats
- Error codes and messages

API Doc Structure:
```markdown
# API Documentation

## MCP Tools
### create_task_sandbox
### attach_agent_to_task
### execute_in_task
...

## Internal APIs
### TaskRegistry
### TaskLifecycle
### MultiLayerPersistence
### HookSystem

## Data Models
### Task
### Container
### LogEntry
...

## Errors
### OpenCodeError codes
### HTTP status codes
### Recovery strategies
```

Acceptance Criteria:
- All MCP tools documented
- All internal APIs documented
- Data models documented
- Error codes documented
- Code examples provided

---

**Task 14.5: Create User Guide (2 hours)**

Deliverable: `docs/USER_GUIDE.md`

Requirements:
- Getting started tutorial
- Task creation tutorial
- Agent attachment tutorial
- Checkpoint management tutorial
- Common workflows
- Best practices
- Tips and tricks

User Guide Structure:
```markdown
# User Guide

## Getting Started
[Setup tutorial]

## Your First Task
[Step-by-step tutorial]

## Working with Agents
[Multi-agent workflows]

## Checkpoints
[Checkpoint management guide]

## Advanced Workflows
[Complex scenarios]

## Best Practices
[Tips and recommendations]

## FAQ
[Common questions]
```

Acceptance Criteria:
- User guide created
- Tutorials step-by-step
- Workflows documented
- Best practices included
- FAQ section complete

---

**Task 14.6: Create Developer Guide (3 hours)**

Deliverable: `docs/DEVELOPER_GUIDE.md`

Requirements:
- Development setup
- Code organization
- Architecture details
- Testing guidelines
- Adding new tools
- Adding new hooks
- Adding new commands
- Deployment guide

Developer Guide Structure:
```markdown
# Developer Guide

## Development Setup
[Local development instructions]

## Project Structure
[Directory and file organization]

## Architecture
[Detailed architecture diagrams]

## Adding Features
[How to add tools, hooks, commands]

## Testing
[How to run tests, coverage goals]

## Deployment
[How to deploy releases]

## Contributing
[Code review process, commit conventions]
```

Acceptance Criteria:
- Developer guide created
- Setup instructions clear
- Architecture detailed
- Contribution guidelines defined
- Testing guide provided
- Deployment guide included

---

### Day 4: Alpha Release Prep (1 day)

**Task 14.7: Create Release Notes (4 hours)**

Deliverable: `RELEASE-NOTES-alpha.md`

Requirements:
- Release version and date
- Highlights and new features
- Bug fixes
- Known issues
- Migration guide (if any)
- Installation/upgrade instructions
- Breaking changes
- Next steps

Release Notes Template:
```markdown
# OpenCode Tools v0.1.0 - Alpha Release

## Release Date
[Date]

## What's New

### Features
- [New feature descriptions]

### Improvements
- [Improvement descriptions]

## Bug Fixes
- [Bug fixes]

## Installation

### Requirements
[System requirements]

### Upgrade Instructions
[Upgrade guide]

## Known Issues
[Known limitations and issues]

## Documentation
[Links to guides]

## Next Steps
[Upcoming features]
```

Acceptance Criteria:
- Release notes created
- Version: v0.1.0-alpha
- All new features listed
- Bug fixes documented
- Known issues listed
- Installation instructions clear

---

**Task 14.8: Tag Alpha Release (2 hours)**

Requirements:
- Create git tag: v0.1.0-alpha
- Tag should be annotated
- Tag should include release notes
- Tag should be signed (if configured)

Commands:
```bash
# Create annotated tag
git tag -a v0.1.0-alpha -m "OpenCode Tools Alpha Release v0.1.0"

# Push tag to remote
git push origin v0.1.0-alpha
```

Acceptance Criteria:
- Tag created successfully
- Tag is annotated
- Tag pushed to remote
- Tag format follows semver

---

**Task 14.9: Prepare Deployment Package (2 hours)**

Requirements:
- Create deployment directory
- Include all necessary files
- Create installation scripts
- Verify package integrity
- Create checksums

Deployment Package Structure:
```
opencode-tools-v0.1.0-alpha/
├── opencode-tools-*.tgz
├── README.md
├── CHANGELOG.md
├── UPGRADE.md
├── checksums.txt
└── install.sh
```

Acceptance Criteria:
- Deployment package created
- Installation script functional
- Checksums verified
- Package tested locally

---

### Day 5: Alpha Release (1 day)

**Task 14.10: Deploy Alpha Release (4 hours)**

Requirements:
- Deploy to staging environment first
- Verify deployment
- Promote to production
- Verify production deployment
- Monitor for issues
- Prepare rollback plan

Deployment Steps:
```bash
# 1. Deploy to staging
./deploy.sh staging v0.1.0-alpha

# 2. Verify staging
./verify.sh staging

# 3. Promote to production
./deploy.sh production v0.1.0-alpha

# 4. Verify production
./verify.sh production

# 5. Monitor deployment
./monitor.sh production v0.1.0-alpha
```

Acceptance Criteria:
- Staging deployment successful
- Staging verification passed
- Production deployment successful
- Production verification passed
- Monitoring active
- Rollback plan ready

---

**Task 14.11: Monitor Deployment & Gather Feedback (4 hours)**

Requirements:
- Monitor application logs
- Monitor error rates
- Monitor performance metrics
- Gather user feedback
- Document issues
- Create priority list for fixes

Monitoring Checklist:
```typescript
interface DeploymentChecklist {
  logs: string[];         // Log files to check
  metrics: string[];       // Metrics to monitor
  errors: string[];        // Error types to track
  userFeedback: string[]; // Feedback channels
}

const checks: DeploymentChecklist = {
  logs: ['app.log', 'error.log', 'access.log'],
  metrics: ['task_creation_time', 'container_start_time', 'api_response_time'],
  errors: ['OpenCodeError', 'DockerError', 'NetworkError'],
  userFeedback: ['github issues', 'discord channel', 'email'],
};
```

Acceptance Criteria:
- Deployment monitoring active
- Error tracking in place
- Performance metrics collected
- Feedback channels monitored
- Issue list prioritized
- Summary report created

---

## Week 14 Deliverables Summary

**Files Created**:
- `tests/integration/component-integration.test.ts` - Component integration tests
- `tests/integration/e2e-workflows.test.ts` - E2E workflow tests
- `docs/README.md` - Project README
- `docs/API.md` - API documentation
- `docs/USER_GUIDE.md` - User guide
- `docs/DEVELOPER_GUIDE.md` - Developer guide
- `RELEASE-NOTES-alpha.md` - Release notes
- `deploy/` - Deployment scripts and package
- `scripts/monitor.sh` - Monitoring script

**Total Files**: 10+ files
**Total Lines**: ~3,000+ lines

**Integration Points**:
- All MVP components integrated and tested
- Documentation references all components
- Deployment scripts reference all components

**Acceptance Criteria for Week 14**:
- [ ] Component integration tests created
- [ ] E2E workflow tests created
- [ ] README.md complete
- [ ] API.md complete
- [ ] User guide complete
- [ ] Developer guide complete
- [ ] Release notes created
- [ ] Alpha release tagged
- [ ] Deployment package created
- [ ] Alpha release deployed
- [ ] Monitoring active
- [ ] Feedback collection started

---

## Phase 2 Complete Summary

### Weeks 9-14 Status

| Week | Focus | Status | Files | Lines |
|------|-------|--------|-------|-------|
| Week 9 | Task Registry & Persistence | ✅ COMPLETE | 8 | ~1,500 |
| Week 10 | MCP Server | ✅ COMPLETE | 3 | ~550 |
| Week 11 | Docker Integration | 📋 PLANNED | 15+ | ~1,800 |
| Week 12 | Hooks System | 📋 PLANNED | 14 | ~2,500 |
| Week 13 | User Commands | 📋 PLANNED | 13 | ~2,200 |
| Week 14 | Integration & Release | 📋 PLANNED | 10+ | ~3,000 |

**Total Planned**: Weeks 9-14
**Total Implementation**: Weeks 9-10 (DONE)
**Total Planning**: Weeks 11-14 (DONE)

### Overall Acceptance Criteria

#### Functional Gates
- [ ] All 12 MVP features implemented (Weeks 9-10: PARTIAL, 11-14: PLANNED)
- [ ] All components integrated (Weeks 9-10: YES, 11-14: PLANNED)
- [ ] End-to-end tests pass (Weeks 9-10: PARTIAL, 14: PLANNED)
- [ ] Alpha release deployed (PLANNED)

#### Quality Gates
- [ ] Test coverage >80% (Weeks 9-10: YES, 11-14: PLANNED)
- [ ] Performance benchmarks met (Weeks 9-10: YES, 11-14: PLANNED)
- [ ] No critical bugs (Weeks 9-10: YES, 11-14: PLANNED)
- [ ] Documentation complete (Weeks 9-10: PARTIAL, 14: PLANNED)

#### Approval Gates
- [ ] Alpha release approved by QA (PENDING)
- [ ] Alpha release approved by leadership (PENDING)
- [ ] User feedback collected (PENDING)
- [ ] Go/No-Go decision for Phase 3 (PENDING)

### Next Steps After Week 14

1. **Implement Weeks 11-14** (4 weeks)
   - Week 11: Docker Integration (Docker Manager, volumes, networks)
   - Week 12: Hooks System (task lifecycle, git, plan, safety)
   - Week 13: User Commands (15 commands)
   - Week 14: Integration & Alpha Release

2. **Alpha Release Deployment** (Week 14)
   - Deploy v0.1.0-alpha
   - Monitor and gather feedback
   - Create bug fix prioritization list

3. **Phase 3 Planning** (After Alpha)
   - Review Alpha feedback
   - Plan Phase 3 (Stability Phase - v1.1 Beta)
   - Decide on remaining edge cases (10 items)

### Risk Assessment

**Completed Work (Weeks 9-10)**:
- Risk: LOW (All tested, good coverage)
- Confidence: HIGH (Solid implementations)

**Planned Work (Weeks 11-14)**:
- Risk: MEDIUM (New implementations, integration points clear)
- Confidence: HIGH (Detailed planning complete)

---

## Phase 2 Planning Complete

**All Weeks 9-14 detailed planning documents created**
- Week 11: 9 tasks with detailed acceptance criteria
- Week 12: 13 tasks with detailed acceptance criteria
- Week 13: 15 tasks with detailed acceptance criteria
- Week 14: 11 tasks with detailed acceptance criteria

**Total Tasks Planned**: 48 tasks
**Total Files Planned**: 65+ files
**Total Lines Planned**: 11,000+ lines

**Planning Documents**:
- `.research/PHASE2-PLANNING.md` - Overview plan
- `.research/PHASE2-WEEKS11-14-DETAILED.md` - Detailed breakdown (this file)

**Status**: Ready for implementation of Weeks 11-14

---
