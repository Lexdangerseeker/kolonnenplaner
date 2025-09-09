export type TimeOffKind = "vacation" | "sick";
export type TimeOffStatus = "requested" | "approved" | "rejected";

export type TimeOff = {
  id: string;
  uid: string;
  name: string;
  kind: TimeOffKind;
  from_date: string; // YYYY-MM-DD
  to_date: string;   // YYYY-MM-DD
  status: TimeOffStatus;
  note?: string|null;
  created_at: string;
  decided_at?: string|null;
  decided_by?: string|null;
};