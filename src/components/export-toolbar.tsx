"use client";

import { Download, FileJson, FileText, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: Record<string, string | number>): string {
  const keys = Object.keys(rows);
  const header = keys.join(",");
  const values = keys.map((k) => `${rows[k]}`).join(",");
  return `${header}\n${values}`;
}

export function ExportToolbar({
  baseName,
  payload,
  csvRow,
}: {
  baseName: string;
  payload: unknown;
  csvRow: Record<string, string | number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Download className="size-4" /> Export:
      </span>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          triggerDownload(
            `${baseName}.json`,
            JSON.stringify(payload, null, 2),
            "application/json",
          );
          toast.success("Downloaded config JSON");
        }}
      >
        <FileJson className="size-4" /> JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          triggerDownload(`${baseName}.csv`, toCSV(csvRow), "text/csv");
          toast.success("Downloaded parameters CSV");
        }}
      >
        <Sheet className="size-4" /> CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          toast.info("Opening print dialog", {
            description: "Use “Save as PDF” to export the report.",
          });
          setTimeout(() => window.print(), 300);
        }}
      >
        <FileText className="size-4" /> PDF
      </Button>
    </div>
  );
}
