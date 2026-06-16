export type TerminalSession = {
  name: string;
  windows: number;
  created: number | null;
  activity: number | null;
  attached: boolean;
  command: string | null;
  path: string | null;
};

export type TerminalSessions = { sessions: TerminalSession[] };
