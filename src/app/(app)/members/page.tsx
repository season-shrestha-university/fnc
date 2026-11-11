import { getMembers } from "@/app/actions";
import MemberDirectory from "@/components/rollcall/members/member-directory";

export default function MembersPage() {
  const membersPromise = getMembers();
  return <MemberDirectory membersPromise={membersPromise} />;
}
