"use client";

import { useState } from "react";
import { Download, FileJson, FileText, Loader2, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { USE_MOCKS } from "@/lib/api/client";
import { exportSessionBackend } from "@/lib/api/backend";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function triggerDownload(filename: string, content: string, mime: string) {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

function toCSV(rows: Record<string, string | number>): string {
  const keys = Object.keys(rows);
  return `${keys.join(",")}\n${keys.map((k) => `${rows[k]}`).join(",")}`;
}

export function ExportToolbar({
  baseName,
  payload,
  csvRow,
  sessionId,
}: {
  baseName: string;
  payload: unknown;
  csvRow: Record<string, string | number>;
  sessionId?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const useBackend = !USE_MOCKS && !!sessionId;

  async function handle(format: "json" | "pdf" | "csv") {
    if (useBackend) {
      // Fetch the server-generated file (real manifest, ReportLab PDF, etc.).
      setBusy(format);
      try {
        const blob = await exportSessionBackend(sessionId!, format);
        downloadBlob(`${baseName}.${format}`, blob);
        toast.success(`Downloaded ${format.toUpperCase()} from server`);
      } catch {
        toast.error(`Export failed`, { description: `Could not generate ${format.toUpperCase()}.` });
      } finally {
        setBusy(null);
      }
      return;
    }

    // Mock / offline path: build the file client-side.
    if (format === "json") {
      triggerDownload(`${baseName}.json`, JSON.stringify(payload, null, 2), "application/json");
      toast.success("Downloaded config JSON");
    } else if (format === "csv") {
      triggerDownload(`${baseName}.csv`, toCSV(csvRow), "text/csv");
      toast.success("Downloaded parameters CSV");
    } else {
      toast.info("Opening print dialog", {
        description: "Use “Save as PDF” to export the report.",
      });
      setTimeout(() => window.print(), 300);
    }
  }

  const Icon = (f: "json" | "pdf" | "csv") =>
    busy === f ? Loader2 : f === "json" ? FileJson : f === "csv" ? Sheet : FileText;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Download className="size-4" /> Export:
      </span>
      {(["json", "csv", "pdf"] as const).map((f) => {
        const I = Icon(f);
        return (
          <Button
            key={f}
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy !== null}
            onClick={() => handle(f)}
          >
            <I className={`size-4 ${busy === f ? "animate-spin" : ""}`} />
            {f.toUpperCase()}
          </Button>
        );
      })}
    </div>
  );
}
