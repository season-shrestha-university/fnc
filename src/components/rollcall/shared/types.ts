export type Member = {
  checkInId: string;
  id: string;
  name: string;
  initials: string;
  /** Date for check-ins recorded in this session. */
  date: string;
  /** Calendar date for persisted check-ins. */
  createdDate?: string;
  color: string;
};
