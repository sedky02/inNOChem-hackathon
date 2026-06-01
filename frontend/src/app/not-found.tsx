import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="font-display text-6xl font-bold text-primary">404</p>
        <p className="text-muted-foreground">
          This page drifted out of the chamber.
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
