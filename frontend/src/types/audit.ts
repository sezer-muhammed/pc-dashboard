export type AuditEvent = {
  id: number;
  created_at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  source_ip: string | null;
};
