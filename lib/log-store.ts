export interface ServerErrorLogEntry {
  id: string;
  digest: string;
  errorMessage: string;
  stackTrace: string;
  routeType: 'render' | 'route' | 'action' | 'proxy';
  requestPath: string;
  timestamp: string;
}

export class InMemoryLogStore {
  private logs: ServerErrorLogEntry[] = [];
  private readonly maxEntries = 50;

  public add(entry: Omit<ServerErrorLogEntry, 'id' | 'timestamp'>): ServerErrorLogEntry {
    const newEntry: ServerErrorLogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(newEntry);
    if (this.logs.length > this.maxEntries) {
      this.logs.pop();
    }
    return newEntry;
  }

  public getByDigest(digest: string): ServerErrorLogEntry | undefined {
    return this.logs.find((log) => log.digest === digest);
  }

  public getAll(): ServerErrorLogEntry[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }
}

// Global Singleton (서버 Node.js 프로세스 수명 주기 동안 유지)
const globalForLogs = globalThis as unknown as { logStore?: InMemoryLogStore };
export const logStore = globalForLogs.logStore ?? new InMemoryLogStore();
globalForLogs.logStore = logStore;
