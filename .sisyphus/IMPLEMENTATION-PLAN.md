# Approach 2 Implementation Plan: Beta Release Preparation (Phase 1 - v1.1)

**Date**: 2026-02-10
**Branch**: sisyphus_GLM-4.7/approach2-stability-beta
**Based On**: Research completed (5 background agents)

---

## Executive Summary

This document provides a comprehensive implementation plan for Phase 1: Stability (v1.1) of the Beta Release Preparation. The plan is based on extensive research completed via 5 parallel background agents analyzing:

1. Existing edge case implementations and patterns
2. Hooks system architecture
3. Git integration patterns
4. Docker image caching strategies
5. Event-driven architecture patterns

**Total Duration**: 4 weeks (Weeks 15-19)
**Total Features**: 12 items (10 edge cases + image caching + event-driven architecture + beta release)
**Estimated Effort**: 20-25 days

---

## Research Findings Summary

### 1. Existing Edge Case Patterns

**Implemented Edge Cases** (5/15 complete):

- ✅ Concurrency & Locking: Optimistic locking in `src/util/lock-manager.ts` and `src/util/optimistic-lock.ts` with timeouts, retries, conflict detection
- ✅ State Corruption: Recovery via `src/util/state-validator.ts` with SHA256 checksums, JSONL log reconstruction, prioritized recovery options
- ✅ MCP Crash Handling: Health monitoring in `src/mcp/server.ts` and `server-enhanced.ts` with detection, restart, timeout health checks
- ✅ Resource Exhaustion: Prevention via `src/hooks/safety-hooks/container-enforcer.ts` validation, timeouts in `src/docker/manager.ts`
- ✅ Network Isolation: Implied by tests (network-isolator.test.ts)

**Patterns Identified**:

- Timeouts everywhere: `setTimeout/clearTimeout` with configurable ms
- Recovery strategies: Prioritized options array, try-fail loops, logging
- Validation: Checksums, version checks, schema validation
- Monitoring: Health checks with timeout guards
- Cleanup: Lock expiration, stale removal
- Singletons: TaskRegistry, TaskLifecycle, MultiLayerPersistence (centralized state)

**Test Patterns**:

- `describe/it` blocks for specific failure scenarios
- Simulate failures (corruption, timeouts, crashes)
- Expect recoveryOptions arrays and automatic recovery
- Integration tests verify end-to-end flows

### 2. Hooks System Architecture

**Current Implementation**:

- **Manager**: `src/hooks/task-lifecycle.ts` - Singleton TaskLifecycleHooks with 6 hook types
- **Hook Types**: beforeTaskStart/afterTaskStart, beforeTaskComplete/afterTaskComplete, beforeTaskFail/afterTaskFail
- **Registration**: Priority-based registration (low=first), hooks stored per-type, auto-sorted
- **Execution**: Sequential async (await each hook in priority order), per-hook error isolation (continues on failure)
- **Integration**: Solely `src/task/lifecycle.ts` - calls hooks during state transitions

**Hook Implementations**:

- Git Hooks: `branch-creator.ts`, `branch-validator.ts`, `submodule-creator.ts`
- Plan Hooks: `file-creator.ts`, `updater.ts`, `finalizer.ts`
- Safety Hooks: `container-enforcer.ts`, `resource-monitor.ts`, `isolation-checker.ts`
- Task Lifecycle Extras: `checkpoint-creator.ts`, `task-resumer.ts`

**Event-Driven Migration Opportunities**:

- Direct 1:1 mapping: `task:beforeStart` {taskId, agentId}, etc.
- Decouple: Replace direct calls with event bus emit; hooks → listeners
- Async: Parallelize non-dependent hooks (currently sequential blocking)
- Scalability: Distribute across agents/services
- Backward Compat: Proxy sync calls to events during migration
- Ordering: Strict before/after pairs via priority queues
- Error Handling: Dead-letter queues vs current fire-and-forget

### 3. Git Integration Patterns

**Current State**:

- **Hook-based**: All Git ops in `src/hooks/git-hooks/` (branch-creator, branch-validator, submodule-creator)
- **Flow**: BeforeTaskStart → branch-validator (regex) → branch-creator (placeholder), AfterTaskStart → submodule-creator (placeholder)
- **Naming**: Strict `task/{taskId}` format with lowercase alphanum/hyphen validation via regex `/^task\/[a-z0-9-]+$/`
- **Error Handling**: Simple try-catch + rethrow Error, no retries or conflict resolution

**Gaps Identified**:

- All Git execs are **placeholders** (commented out)
- No real branch conflict detection (only naming validation)
- No merge, checkout existing, push/commit/status operations
- No worktree support
- No submodule conflict detection/resolution
- No retry logic or Git-specific error handling

**Edge Cases to Implement**:

1. **Git Branch Naming Conflicts**: Add `git branch --list` check, unique suffix generation (timestamp + random), atomic branch creation with locks
2. **Git Submodule Conflict Detection**: Add `git submodule status` checks, conflict resolution strategies
3. **Workspace Path Sanitization**: Validate and sanitize paths, prevent path traversal

### 4. Docker Image Caching

**Research Findings**:

- **Layer Caching**: Docker uses layer-based caching, unchanged layers reused
- **BuildKit**: Advanced backends: inline, registry, local with `mode=max` for all layers
- **Version Management**: Use digests (`sha256:...`) for immutable refs, tags for mutable
- **Invalidation**: Dependency-based (file/instruction changes), time-based (`SOURCE_DATE_EPOCH`), event-based (Git commit in ARG), force via `--no-cache`
- **Offline**: Local backend fallback, pull-through caches, pre-pull for warming

**Implementation Approach for Agentic Armor**:

- Integrate BuildKit backend for Docker Engine API
- Registry cache for distributed/offline support
- Digest tags for versioning
- Cache mounts for package managers (node_modules)
- Layer ordering: deps first (package\*.json), then source
- Size limits via `docker builder prune --keep-storage 10GB`

### 5. Event-Driven Architecture

**Library Comparison**:
| Library | Perf | Features | TS Support | Use Case |
|---------|------|----------|------------|----------|
| Node EE | Baseline | Basic pub-sub | Full | Simple sync |
| EventEmitter3 | 2x faster | Wildcards, once() | Full | High-throughput |
| RxJS | Operator cost | Backpressure, retry | Full | Reactive streams |
| BullMQ | - | Redis queue, priorities | Full | Async jobs |
| NATS | - | JetStream persistence | Full | Pub-sub/messaging |

**Recommended Approach**:

- **Event Bus**: EventEmitter3 for high-performance pub-sub
- **Async Processing**: BullMQ for job queues (retries, priorities, dead-letter)
- **Event History**: RxJS ReplaySubject for replay capability
- **Migration**: Dual-write (hooks + events) → gradual consumer migration → remove hooks

**Event Ordering**:

- Strict before/after pairs preserved via priority metadata
- Partition by entity ID for FIFO ordering
- Idempotency + dedup for exactly-once semantics

---

## Implementation Plan

### Week 15-16: Implement 10 Remaining Edge Cases

**10 Edge Cases** (in priority order):

#### Week 15 (Days 1-5): High-Priority Edge Cases

**Day 1-2: Git Branch Naming Conflicts**

- **File**: `src/hooks/git-hooks/branch-creator.ts` (enhance existing)
- **Changes**:
  1. Uncomment and enable real Git exec operations
  2. Add `git branch --list` check before creation
  3. Implement unique suffix generation: `${timestamp}-${random}`
  4. Add atomic branch creation with file lock
  5. Implement retry logic (max 10 attempts)
- **Tests**: `tests/hooks/git-hooks.test.ts`
  - Test branch conflict detection
  - Test unique suffix generation
  - Test atomic operations

**Day 3: Git Submodule Conflict Detection**

- **File**: `src/hooks/git-hooks/submodule-creator.ts` (enhance existing)
- **Changes**:
  1. Uncomment Git exec operations
  2. Add `git submodule status` checks
  3. Implement conflict detection (dirty vs diverged)
  4. Add conflict resolution strategies (merge, rebase, skip)
- **Tests**: `tests/git/submodule-conflict.test.ts` (new)
  - Test submodule conflict detection
  - Test resolution strategies

**Day 4: Workspace Path Sanitization**

- **File**: `src/util/path-sanitizer.ts` (new)
- **Changes**:
  1. Implement path validation (no traversal, valid chars)
  2. Implement path sanitization (normalize, resolve)
  3. Add OS-specific checks (Windows vs Unix)
- **Tests**: `tests/util/path-sanitizer.test.ts` (new)
  - Test path traversal prevention
  - Test special character handling
  - Test OS-specific paths

**Day 5: Testing & Validation**

- Run all new edge case tests
- Integration tests for Git operations
- Verify backward compatibility

#### Week 16 (Days 1-5): Medium-Priority Edge Cases

**Day 1-2: Orphaned Container Detection**

- **File**: `src/docker/orphan-detector.ts` (new)
- **Changes**:
  1. Implement background detection (every 5 min)
  2. Label-based matching: `opencode.task.id`
  3. Auto-cleanup after 24h
  4. Log detection/cleanup events
- **Tests**: `tests/docker/orphan-detector.test.ts` (new)
  - Test orphan detection
  - Test auto-cleanup
  - Test labeling

**Day 3: Checkpoint Storage Optimization**

- **File**: `src/persistence/checkpoint-optimizer.ts` (new)
- **Changes**:
  1. Implement compression (gzip)
  2. Implement incremental backups (rsync)
  3. Implement storage limits (max GB)
  4. Add cleanup of old checkpoints
- **Tests**: `tests/persistence/checkpoint-optimizer.test.ts` (new)
  - Test compression
  - Test incremental backups
  - Test storage limits

**Day 4: Parallel Ultrawork Conflicts**

- **File**: `src/util/ultrawork-coordinator.ts` (new)
- **Changes**:
  1. Implement conflict detection between parallel agents
  2. Add result merging strategies
  3. Implement workspace isolation per agent
- **Tests**: `tests/util/ultrawork-conflict.test.ts` (new)
  - Test parallel conflict detection
  - Test result merging

**Day 5: Session Interruption Handling**

- **File**: `src/session/interruption-handler.ts` (new)
- **Changes**:
  1. Detect session interruption (disconnect, timeout)
  2. Implement graceful shutdown
  3. Save state on interruption
  4. Resume on reconnection
- **Tests**: `tests/session/interruption-handler.test.ts` (new)
  - Test interruption detection
  - Test graceful shutdown
  - Test resume

#### Week 16 (Days 6-10): Remaining Edge Cases

**Day 6-7: Docker Desktop Compatibility Layer**

- **File**: `src/docker/desktop-compat.ts` (new)
- **Changes**:
  1. Detect Docker Desktop version
  2. API compatibility layer (Sandbox API vs Standard)
  3. Version-specific workarounds
- **Tests**: `tests/docker/desktop-compat.test.ts` (new)
  - Test version detection
  - Test API compatibility

**Day 8: Large Filesystem Snapshots (Optimization)**

- **File**: `src/persistence/snapshot-optimizer.ts` (new)
- **Changes**:
  1. Implement selective snapshot (exclude large dirs)
  2. Add chunked backup for large files
  3. Optimize tar compression
- **Tests**: `tests/persistence/snapshot-optimizer.test.ts` (new)
  - Test selective snapshot
  - Test chunked backup

**Day 9: Risk-Based Checkpoint Refinement**

- **File**: `src/persistence/checkpoint-scheduler.ts` (new)
- **Changes**:
  1. Implement risk assessment (operation complexity, duration)
  2. Adaptive checkpoint scheduling (more frequent on high risk)
  3. ML-based prediction (optional, v2.0+)
- **Tests**: `tests/persistence/checkpoint-scheduler.test.ts` (new)
  - Test risk assessment
  - Test adaptive scheduling

**Day 10: Edge Cases Integration Testing**

- End-to-end test all 10 new edge cases
- Test interactions between edge cases
- Performance testing
- Documentation updates

### Week 17: Image Caching System

**Files to Create**:

- `src/docker/image-cache.ts` - Core cache manager
- `src/docker/image-version-manager.ts` - Versioning and tagging
- `src/docker/cache-invalidator.ts` - Cache invalidation strategies
- `config/image-cache.yaml` - Cache configuration

**Implementation**:

**Day 1-2: Cache Layer**

- Integrate BuildKit backend with Docker Engine API
- Implement local cache storage (`~/.opencode/image-cache/`)
- Implement registry cache integration
- Add cache hit/miss metrics

**Day 3: Version Management**

- Implement digest-based tagging (`sha256:...`)
- Implement mutable tags for latest
- Add version deduplication
- Implement garbage collection

**Day 4: Invalidation Strategies**

- Dependency-based invalidation (Dockerfile order)
- Time-based invalidation (TTL)
- Event-based (Git commit in ARG)
- Manual invalidation via CLI

**Day 5: Offline Capability**

- Local cache fallback
- Cache warming strategies (pre-pull)
- Cache export/import for air-gapped

**Tests**:

- `tests/docker/image-cache.test.ts` (new)
- `tests/docker/image-version.test.ts` (new)
- `tests/docker/cache-invalidation.test.ts` (new)

### Week 18: Event-Driven Architecture

**Files to Create**:

- `src/events/event-bus.ts` - EventEmitter3-based bus
- `src/events/event-history.ts` - RxJS ReplaySubject
- `src/events/event-store.ts` - Persistent event storage
- `src/events/hook-adapter.ts` - Migration adapter for backward compat

**Implementation**:

**Day 1-2: Event Bus**

- Create EventBus class using EventEmitter3
- Define event types (TaskEvent, HookEvent, SystemEvent)
- Implement emit/on/off API
- Add wildcard support

**Day 3: Event History**

- Implement ReplaySubject from RxJS
- Add configurable buffer size (N events)
- Add time-window replay (last X minutes)
- Persist events to disk

**Day 4: Hook Migration**

- Create HookAdapter class
- Map existing 6 hooks to 6 events
- Dual-write: execute hooks + emit events
- Add configuration to enable/disable migration

**Day 5: Async Event Processing**

- Integrate BullMQ for async job processing
- Implement worker pool
- Add retry logic with backoff
- Add dead-letter queue

**Tests**:

- `tests/events/event-bus.test.ts` (new)
- `tests/events/event-history.test.ts` (new)
- `tests/events/hook-adapter.test.ts` (new)

### Week 19: Beta Release

**Day 1: Integration Testing**

- End-to-end test all Phase 1 features
- Test edge cases + image caching + event system
- Performance benchmarking
- Load testing (10+ concurrent agents)

**Day 2: Documentation**

- Update README.md with new features
- Update API.md
- Create migration guide (hooks → events)
- Update troubleshooting docs

**Day 3: Release Prep**

- Update version to v1.1.0-beta
- Create CHANGELOG.md
- Tag release
- Prepare deployment artifacts

**Day 4: Deploy Beta**

- Publish to npm (beta tag)
- Deploy docs
- Announce release
- Gather feedback

**Day 5: Feedback & Monitoring**

- Monitor beta usage
- Collect user feedback
- Identify issues
- Plan Phase 2 (Efficiency)

---

## State Machine Diagram

Create comprehensive state machine diagrams for:

1. Task Lifecycle with all 15 edge cases
2. Event System Flow (hooks → events)
3. Image Cache States (hit, miss, invalidation, rebuild)
4. Git Branch Creation Flow (conflict, retry, success)
5. Checkpoint Lifecycle (creation, optimization, restoration)

**Output**: `.sisyphus/plans/approach2-state-machines.md`

---

## Acceptance Criteria

### Phase 1: Stability (v1.1) Gates

**Functional Gates**:

- [ ] All 10 remaining edge cases implemented and tested
- [ ] Image caching functional with 90%+ cache hit rate
- [ ] Event-driven architecture operational with all hooks migrated
- [ ] Backward compatibility maintained (dual-write mode)

**Quality Gates**:

- [ ] Test coverage >90% for new features
- [ ] All edge cases have integration tests
- [ ] Performance benchmarks met (event emission <1ms, cache lookup <100ms)
- [ ] Documentation complete

**Integration Gates**:

- [ ] All features integrate with existing systems (TaskRegistry, TaskLifecycle, MultiLayerPersistence)
- [ ] No regression in existing functionality
- [ ] End-to-end tests pass
- [ ] Beta v1.1.0 released

---

## Risk Mitigation

| Risk                     | Impact | Mitigation                           |
| ------------------------ | ------ | ------------------------------------ |
| Git operations flaky     | Medium | Retry logic with exponential backoff |
| Image cache corruption   | High   | Checksum verification, backup cache  |
| Event system performance | Medium | Batch events, worker pool            |
| Breaking changes         | High   | Dual-write, feature flags            |
| Migration complexity     | High   | Gradual migration, rollback plan     |

---

## Next Steps

1. **Start Week 15**: Implement Git branch naming conflicts
2. **Commit after each edge case**: Atomic commits with tests
3. **Run tests daily**: Ensure no regression
4. **Update state machines**: After each feature completion
5. **Prepare for Beta**: Integration testing and documentation

---

**Plan Version**: 1.0
**Created**: 2026-02-10
**Based On**: Research completed (5 background agents)
**Total Duration**: 4 weeks (Weeks 15-19)
