// Manual mock for Dockerode library
// Public API for type-safe Jest mocks using jest.mocked() pattern

import { jest } from "@jest/globals";

// Mock Dockerode constructor
jest.mock("dockerode");

// Type-safe mock interface for tests
// jest.fn() returns 'never' type in strict TypeScript - documented Jest limitation
export interface MockedDockerode {
  createNetwork: any;
  getNetwork: any;
  listNetworks: any;
  removeNetwork: any;
  createVolume: any;
  getVolume: any;
  listVolumes: any;
  removeVolume: any;
  createContainer: any;
  getContainer: any;
  listContainers: any;
  info: any;
}

// Factory function for creating mocked Dockerode instances
export function createMockDockerode(): MockedDockerode {
  const mockStream = createMockStream();

  return {
    createNetwork: jest
      .fn<() => Promise<{ id: string; name: string }>>()
      .mockResolvedValue({
        id: "test-network-id",
        name: "test-network",
      }),
    getNetwork: jest.fn<any>().mockReturnValue({
      connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      disconnect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      remove: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      inspect: jest.fn<() => Promise<any>>().mockResolvedValue({
        Id: "test-network-id",
        Name: "test-network",
        Driver: "bridge",
        Scope: "local",
        Internal: true,
        Labels: {
          "opencode.taskId": "test-task",
          "opencode.managed": "true",
        },
        Created: Date.now() / 1000,
        Containers: {},
      }),
    }),
    listNetworks: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
    removeNetwork: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    createVolume: jest
      .fn<() => Promise<{ Name: string; Driver: string }>>()
      .mockResolvedValue({
        Name: "test-volume",
        Driver: "local",
      }),
    getVolume: jest.fn<any>().mockReturnValue({
      inspect: jest.fn<() => Promise<any>>().mockResolvedValue({
        Name: "test-volume",
        Driver: "local",
      }),
      remove: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }),
    listVolumes: jest
      .fn<() => Promise<{ Volumes: any[]; Warnings: string[] }>>()
      .mockResolvedValue({
        Volumes: [],
        Warnings: [],
      }),
    removeVolume: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    createContainer: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: "test-container-id",
      start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      remove: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      logs: jest.fn<any>().mockReturnValue(mockStream),
    }),
    getContainer: jest.fn<any>().mockReturnValue({
      inspect: jest.fn<() => Promise<any>>().mockResolvedValue({
        Id: "test-container-id",
        State: { Running: false },
      }),
      start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      restart: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      remove: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      logs: jest.fn<any>().mockReturnValue(mockStream),
    }),
    listContainers: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
    info: jest.fn<() => Promise<any>>().mockResolvedValue({
      ServerVersion: "29.1.5",
      OperatingSystem: "Alpine Linux",
    }),
  };
}

// Helper to create mock PassThrough streams
function createMockStream() {
  const { PassThrough } = require("stream");
  return new PassThrough();
}

// Reset all Dockerode mocks between tests
export function resetDockerodeMocks(): void {
  jest.clearAllMocks();
}
