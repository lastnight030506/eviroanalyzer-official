interface SyntaxEntry {
  timestamp: Date;
  procedure: string;
  rCode: string;
  parameters: Record<string, unknown>;
}

export class SyntaxLogger {
  private log: SyntaxEntry[] = [];

  logOperation(procedure: string, params: Record<string, unknown>, rCode: string) {
    this.log.push({ timestamp: new Date(), procedure, rCode, parameters: params });
  }

  getLog(): SyntaxEntry[] {
    return [...this.log];
  }

  generateScript(): string {
    return this.log.map(e => `# ${e.procedure}\n${e.rCode}`).join('\n\n');
  }

  clearLog() {
    this.log = [];
  }
}

export const syntaxLogger = new SyntaxLogger();
