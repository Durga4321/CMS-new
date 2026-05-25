import { toast } from "sonner";

export function exportCsv(filename, headers, rows) {
  if (!rows.length) {
    toast.error("No records available to export");
    return;
  }

  const csv = [headers, ...rows]
    .map((row) => row.map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
