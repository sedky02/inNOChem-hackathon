import { Construction } from "lucide-react";

export function Placeholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-muted">
          <Construction className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {description ?? "This screen is coming soon."}
        </p>
      </div>
    </div>
  );
}
