  public async getSystemResourceUsage(): Promise<ResourceUsage> {
    // In a real implementation, this would query system metrics
    // For now, we'll aggregate container usage

    let totalMemoryUsed = 0;
    let totalPidsUsed = 0;
    let avgCpuUsed = 0;

    for (const usage of this.resourceUsage.values()) {
      totalMemoryUsed += usage.memory.used;
      totalPidsUsed += usage.pids.used;
      avgCpuUsed += usage.cpu.used;
    }

    const containerCount = this.resourceUsage.size;
    avgCpuUsed = containerCount > 0 ? avgCpuUsed / containerCount : 0;

    // Get system limits (in a real implementation, query system)
    const systemMemoryLimit = 8192; // 8GB default
    const systemPidsLimit = 1024;   // Default PID limit

    return {
      memory: {
        used: totalMemoryUsed,
        limit: systemMemoryLimit, // Always use system limit
        percentage: systemMemoryLimit > 0 ? (totalMemoryUsed / systemMemoryLimit) * 100 : 0,
      },
      cpu: {
        used: avgCpuUsed,
        limit: CONTAINER_CPU_SHARES * Math.max(containerCount, 1), // At least 1
      },
      pids: {
        used: totalPidsUsed,
        limit: systemPidsLimit, // Always use system limit
        percentage: systemPidsLimit > 0 ? (totalPidsUsed / systemPidsLimit) * 100 : 0,
      },
      disk: {
        used: 0, // Not implemented yet
        limit: 10240, // 10GB default
        percentage: 0,
      },
    };
  }
