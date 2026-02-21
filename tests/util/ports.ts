// Port Allocation Utility for Testing
// Provides dynamic port allocation to prevent EADDRINUSE errors in tests

import net from "net";

const MAX_PORT = 65535;
const DEFAULT_MAX_ATTEMPTS = 1000;

export interface PortOptions {
  /** Port to start checking from (default: 3000) */
  startPort?: number;
  /** Maximum number of ports to try before giving up (default: 1000) */
  maxAttempts?: number;
}

async function tryPort(port: number): Promise<number | null> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        server.close();
        resolve(null);
      } else {
        resolve(null);
      }
    });

    server.once("listening", () => {
      server.close(() => resolve(port));
    });

    server.listen(port);
  });
}

export async function getAvailablePort(
  startPort: number = 3000,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): Promise<number> {
  const maxPort = Math.min(startPort + maxAttempts, MAX_PORT);

  for (let port = startPort; port <= maxPort; port++) {
    const result = await tryPort(port);
    if (result !== null) {
      return result;
    }
  }

  throw new Error(
    `No available port found after ${maxAttempts} attempts starting from ${startPort}`,
  );
}

export async function getAvailablePorts(
  count: number,
  startPort: number = 3000,
): Promise<number[]> {
  const ports: number[] = [];
  let currentPort = startPort;

  for (let i = 0; i < count; i++) {
    const port = await getAvailablePort(currentPort);
    ports.push(port);
    currentPort = port + 1;
  }

  return ports;
}
