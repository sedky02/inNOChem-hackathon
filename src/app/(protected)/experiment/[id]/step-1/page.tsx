"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Pencil,
  Shirt,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { ScoreMeter } from "@/components/score-meter";
import { CompatibilityBadge } from "@/components/compatibility-badge";
import { DescriptorGrid } from "@/components/descriptor-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  molecularScreeningSchema,
  type MolecularScreeningInput,
} from "@/lib/schemas";
import { screenChemical, patchSession } from "@/lib/api";
import { MIN_COMPATIBILITY_SCORE, compatibilityLabel } from "@/lib/domain";
import { useExperimentStore } from "@/lib/stores/experiment-store";
import type { FabricType } from "@/lib/types";

const FABRIC_OPTIONS: { value: FabricType; label: string }[] = [
  { value: "polyester", label: "Polyester" },
  { value: "cotton", label: "Cotton" },
  { value: "nylon", label: "Nylon" },
  { value: "silk", label: "Silk" },
  { value: "blend", label: "Cotton / Polyester blend" },
];

const EXAMPLES: { name: string; smiles: string }[] = [
  { name: "Disperse Red 60", smiles: "Nc1ccc(Oc2ccccc2)c2c1C(=O)c1ccccc1C2=O" },
  { name: "Disperse Blue (azo)", smiles: "c1ccc(/N=N/c2ccc(N(CC)CC)cc2)cc1" },
  { name: "Anthraquinone core", smiles: "O=C1c2ccccc2C(=O)c2ccccc21" },
];

export default function Step1Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const screeningResult = useExperimentStore((s) => s.screeningResult);
  const storedFabric = useExperimentStore((s) => s.fabricProfile);
  const storedDye = useExperimentStore((s) => s.dyeName);
  const step1Confirmed = useExperimentStore((s) => s.step1Confirmed);
  const setFabricProfile = useExperimentStore((s) => s.setFabricProfile);
  const setScreeningResult = useExperimentStore((s) => s.setScreeningResult);
  const confirmStep1 = useExperimentStore((s) => s.confirmStep1);

  const [overridden, setOverridden] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<MolecularScreeningInput>({
    resolver: zodResolver(molecularScreeningSchema),
    mode: "onChange",
    defaultValues: {
      fabric_type: storedFabric?.fabric_type ?? "polyester",
      cotton_pct: storedFabric?.cotton_pct ?? 0,
      polyester_pct: storedFabric?.polyester_pct ?? 100,
      density: storedFabric?.density ?? 180,
      mass_load: storedFabric?.mass_load ?? 5,
      dye_name: storedDye || "",
      smiles: "",
    },
  });

  const fabricType = watch("fabric_type");
  const cottonPct = watch("cotton_pct");
  const smiles = watch("smiles");
  const smilesValid =
    smiles.length > 0 &&
    molecularScreeningSchema.shape.smiles.safeParse(smiles).success;

  const mutation = useMutation({
    mutationFn: (vars: { dye_name: string; smiles: string }) =>
      screenChemical(vars, params.id),
    onSuccess: (data, vars) => {
      setScreeningResult(data, vars.dye_name);
      void patchSession(params.id, {
        dye_name: vars.dye_name,
        compatibility_score: data.compatibility_score,
      });
      setOverridden(false);
      if (data.compatibility_score < MIN_COMPATIBILITY_SCORE) {
        toast.warning("Low compatibility", {
          description:
            "This dye scores below the recommended threshold for scCO₂.",
        });
      } else {
        toast.success("Molecule analyzed", {
          description: `${compatibilityLabel(data.compatibility_score)} · score ${data.compatibility_score}/100`,
        });
      }
    },
    onError: () =>
      toast.error("Screening failed", {
        description: "Could not analyze the molecule. Please try again.",
      }),
  });

  function onSubmit(values: MolecularScreeningInput) {
    // Persist fabric profile from the form, then screen the dye.
    setFabricProfile({
      fabric_type: values.fabric_type,
      cotton_pct: values.cotton_pct,
      polyester_pct: values.polyester_pct,
      density: values.density,
      mass_load: values.mass_load,
    });
    mutation.mutate({ dye_name: values.dye_name, smiles: values.smiles });
  }

  function applyExample(ex: (typeof EXAMPLES)[number]) {
    setValue("dye_name", ex.name, { shouldValidate: true });
    setValue("smiles", ex.smiles, { shouldValidate: true });
  }

  // Pure fabric types lock the blend split.
  function onFabricTypeChange(value: FabricType) {
    setValue("fabric_type", value, { shouldValidate: true });
    if (value === "cotton") {
      setValue("cotton_pct", 100);
      setValue("polyester_pct", 0);
    } else if (value === "polyester" || value === "nylon" || value === "silk") {
      setValue("cotton_pct", 0);
      setValue("polyester_pct", 100);
    } else {
      setValue("cotton_pct", 50);
      setValue("polyester_pct", 50);
    }
  }

  const result = screeningResult;
  const lowScore =
    result && result.compatibility_score < MIN_COMPATIBILITY_SCORE;
  const canProceed = result && (!lowScore || overridden);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Molecular Screening
        </h1>
        <p className="text-sm text-muted-foreground">
          Define the fabric and dye, then screen molecular compatibility with
          supercritical CO₂ before optimizing.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* Fabric composition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shirt className="size-4 text-primary" /> Fabric Composition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>Fabric type</Label>
              <Controller
                control={control}
                name="fabric_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => onFabricTypeChange(v as FabricType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FABRIC_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {fabricType === "blend" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cotton</span>
                  <span className="font-mono">
                    {cottonPct}% / {100 - cottonPct}%
                  </span>
                  <span className="text-muted-foreground">Polyester</span>
                </div>
                <Slider
                  value={[cottonPct]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([v]) => {
                    setValue("cotton_pct", v, { shouldValidate: true });
                    setValue("polyester_pct", 100 - v, {
                      shouldValidate: true,
                    });
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="density">Density (g/m²)</Label>
                <Input
                  id="density"
                  type="number"
                  step="any"
                  {...register("density", { valueAsNumber: true })}
                />
                {errors.density && (
                  <p className="text-xs text-destructive">
                    {errors.density.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mass_load">Mass load (kg)</Label>
                <Input
                  id="mass_load"
                  type="number"
                  step="any"
                  {...register("mass_load", { valueAsNumber: true })}
                />
                {errors.mass_load && (
                  <p className="text-xs text-destructive">
                    {errors.mass_load.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dye formulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4 text-primary" /> Dye Formulation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="dye_name">Dye name</Label>
              <Input
                id="dye_name"
                placeholder="e.g. Reactive Blue 19"
                {...register("dye_name")}
              />
              {errors.dye_name && (
                <p className="text-xs text-destructive">
                  {errors.dye_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="smiles">SMILES string</Label>
                {smiles.length > 0 && (
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      smilesValid ? "text-success" : "text-destructive"
                    }`}
                  >
                    {smilesValid ? (
                      <>
                        <CheckCircle2 className="size-3.5" /> Valid format
                      </>
                    ) : (
                      <>
                        <TriangleAlert className="size-3.5" /> Invalid format
                      </>
                    )}
                  </span>
                )}
              </div>
              <Textarea
                id="smiles"
                rows={3}
                spellCheck={false}
                placeholder="Paste the dye's SMILES string…"
                className="font-mono text-sm"
                {...register("smiles")}
              />
              {errors.smiles && (
                <p className="text-xs text-destructive">
                  {errors.smiles.message}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">Examples:</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.name}
                    type="button"
                    onClick={() => applyExample(ex)}
                    className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={!isValid || mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FlaskConical className="size-4" />
            )}
            Analyze Molecule
          </Button>
        </div>
      </form>

      {/* Results */}
      {result && (
        <Card className="border-primary/20 shadow-glow">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Screening Results</CardTitle>
              <CompatibilityBadge score={result.compatibility_score} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center justify-center gap-10 sm:justify-start">
              <ScoreMeter
                score={result.compatibility_score}
                label="Compatibility"
              />
              <ScoreMeter score={result.solubility_score} label="Solubility" />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Molecular descriptors
              </h3>
              <DescriptorGrid descriptors={result.descriptors} />
            </div>

            {lowScore && (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />
                <AlertTitle>Low compatibility score</AlertTitle>
                <AlertDescription>
                  <span>
                    This dye scores below {MIN_COMPATIBILITY_SCORE}/100 for
                    scCO₂ processing. You can revise the SMILES, or override to
                    proceed at your own discretion.
                  </span>
                  {!overridden && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-fit"
                      onClick={() => setOverridden(true)}
                    >
                      Override &amp; proceed anyway
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {step1Confirmed && (
                  <>
                    <CheckCircle2 className="size-4 text-success" /> Profile
                    confirmed
                  </>
                )}
              </p>
              <div className="flex gap-2">
                {step1Confirmed && (
                  <Button variant="ghost" size="sm" className="gap-1.5" disabled>
                    <Pencil className="size-4" /> Edit above
                  </Button>
                )}
                <Button
                  size="lg"
                  className="gap-2"
                  disabled={!canProceed}
                  onClick={() => {
                    confirmStep1();
                    router.push(`/experiment/${params.id}/step-2`);
                  }}
                >
                  Confirm &amp; Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
