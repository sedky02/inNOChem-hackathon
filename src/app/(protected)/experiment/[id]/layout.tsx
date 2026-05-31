import { WizardShell } from "@/components/layout/wizard-shell";

export default function ExperimentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WizardShell>{children}</WizardShell>;
}
