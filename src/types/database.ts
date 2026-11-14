export type TrackedField =
  | "member_id"
  | "name"
  | "email"
  | "phone"
  | "address"
  | "dob"
  | "picture_url";

export interface EventRecord {
  id: string;
  name: string;
  event_date: string;
  tracked_fields: TrackedField[];
  created_at: string;
}

export interface MemberRecord {
  id: string;
  member_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  picture_url: string;
}
