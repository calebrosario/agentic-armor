// Hooks Index - Phase 2: MVP Core
// Week 12: Complete Hooks System

// Task Lifecycle Hooks
export {
  TaskLifecycleHooks,
  taskLifecycleHooks,
  BeforeTaskStartHook,
  AfterTaskStartHook,
  BeforeTaskCompleteHook,
  AfterTaskCompleteHook,
  BeforeTaskFailHook,
  AfterTaskFailHook,
} from "./task-lifecycle";

// Task Lifecycle Hooks
export { createCheckpointBeforeCompleteHook } from "./task-lifecycle/checkpoint-creator";

export { resumeFromCheckpoint } from "./task-lifecycle/task-resumer";

// Git Hooks
export { createPreTaskBranchCreatorHook } from "./git-hooks/branch-creator";

export { createBranchNameValidatorHook } from "./git-hooks/branch-validator";

export { createSubmoduleCreatorHook } from "./git-hooks/submodule-creator";

export { createGitBranchConflictsHook } from "./git-hooks/git-branch-conflicts";

export { createGitSubmoduleConflictsHook } from "./git-hooks/git-submodule-conflicts";

// Plan Hooks
export { createPlanFileCreatorHook } from "./plan-hooks/file-creator";

export { createPlanUpdaterHook } from "./plan-hooks/updater";

export { createPlanFinalizerHook } from "./plan-hooks/finalizer";

// Safety Hooks
export { createContainerSafetyEnforcerHook } from "./safety-hooks/container-enforcer";

export {
  createResourceLimitMonitorHook,
  stopResourceMonitoring,
} from "./safety-hooks/resource-monitor";

export { createIsolationCheckerHook } from "./safety-hooks/isolation-checker";
