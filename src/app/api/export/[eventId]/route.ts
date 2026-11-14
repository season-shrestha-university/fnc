import { utils, write } from "xlsx";

import {
  defaultTrackedFields,
  requiredTrackedFields,
  trackedFieldOptions,
} from "@/components/rollcall/shared/member-utils";

type ExportMember = {
  id: string;
  name: string;
  date: string;
  email?: string;
  phone?: string;
  address?: string;
  dob?: string;
  pictureUrl?: string;
};

const fieldGetters: Record<string, (member: ExportMember) => string> = {
  Name: (member) => member.name,
  "Member ID": (member) => member.id,
  Email: (member) => member.email ?? "",
  Phone: (member) => member.phone ?? "",
  Address: (member) => member.address ?? "",
  "Date of birth": (member) => member.dob ?? "",
  Photo: (member) => member.pictureUrl ?? "",
};

function resolveExportColumns(trackedFields?: string[]): string[] {
  const requested = Array.isArray(trackedFields) && trackedFields.length
    ? trackedFields
    : defaultTrackedFields;
  const activeSet = new Set<string>([
    ...requiredTrackedFields,
    ...requested.filter((field) => field in fieldGetters),
  ]);
  const ordered = trackedFieldOptions.filter((field) => activeSet.has(field));
  return [...ordered, "Date"];
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    eventName?: string;
    trackedFields?: string[];
    members?: ExportMember[];
  };

  if (!body.eventName || !Array.isArray(body.members)) {
    return Response.json({ error: "Invalid export data" }, { status: 400 });
  }

  const columns = resolveExportColumns(body.trackedFields);
  const rows = body.members.map((member) => {
    const row: Record<string, string> = {};
    for (const column of columns) {
      row[column] =
        column === "Date" ? member.date : fieldGetters[column](member);
    }
    return row;
  });

  const worksheet = utils.json_to_sheet(rows, { header: columns });
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
