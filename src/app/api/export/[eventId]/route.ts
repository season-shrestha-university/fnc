import { utils, write } from "xlsx";

type ExportMember = {
  id: string;
  name: string;
  date: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    eventName?: string;
    members?: ExportMember[];
  };

  if (!body.eventName || !Array.isArray(body.members)) {
    return Response.json({ error: "Invalid export data" }, { status: 400 });
  }

  const worksheet = utils.json_to_sheet(
    body.members.map((member) => ({
      Name: member.name,
      "Member ID": member.id,
      Date: member.date,
    })),
  );
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Attendance");
  const file = write(workbook, { bookType: "xlsx", type: "buffer" });
  const filename = `${body.eventName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-attendance.xlsx`;

  return new Response(file, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
