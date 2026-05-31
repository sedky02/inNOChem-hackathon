"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { ModelImprovementCard } from "@/components/model-improvement-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { feedbackSchema, type FeedbackInput } from "@/lib/schemas";
import { adaptModel } from "@/lib/api";
import type { AdaptResponse } from "@/lib/types";

export function AdaptiveFeedbackForm({
  sessionId,
  suggested,
  submitted,
  onSubmitted,
}: {
  sessionId: string;
  suggested: {
    actual_ks: number;
    actual_pressure: number;
    actual_temperature: number;
    actual_flow_rate: number;
  };
  submitted: boolean;
  onSubmitted: (result: AdaptResponse) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: suggested,
  });

  const mutation = useMutation({
    mutationFn: (values: FeedbackInput) =>
      adaptModel({
        session_id: sessionId,
        experimental_feedback: values,
      }),
    onSuccess: (res) => {
      toast.success("Feedback submitted", {
        description: "The digital twin has been recalibrated.",
      });
      onSubmitted(res);
    },
    onError: () =>
      toast.error("Submission failed", { description: "Please try again." }),
  });

  if (submitted && mutation.data) {
    return <ModelImprovementCard confidence={mutation.data.model_confidence} />;
  }

  const fields: {
    name: keyof FeedbackInput;
    label: string;
    step?: string;
  }[] = [
    { name: "actual_ks", label: "Actual K/S", step: "any" },
    { name: "actual_pressure", label: "Pressure (bar)", step: "any" },
    { name: "actual_temperature", label: "Temperature (°C)", step: "any" },
    { name: "actual_flow_rate", label: "Flow rate (kg/min)", step: "any" },
  ];

  return (
    <Accordion type="single" collapsible className="rounded-lg border border-border">
      <AccordionItem value="feedback" className="border-none">
        <AccordionTrigger className="px-4 hover:no-underline">
          <span className="text-sm font-medium">
            Submit real-world outcomes{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4">
          <form
            onSubmit={handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <p className="text-xs text-muted-foreground">
              Log the measured results from the physical batch. This retrains the
              model and improves future confidence scores.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {fields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={f.name} className="text-xs">
                    {f.label}
                  </Label>
                  <Input
                    id={f.name}
                    type="number"
                    step={f.step}
                    {...register(f.name, { valueAsNumber: true })}
                  />
                  {errors[f.name] && (
                    <p className="text-[11px] text-destructive">
                      {errors[f.name]?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fb_notes" className="text-xs">
                Notes / deviations
              </Label>
              <Textarea
                id="fb_notes"
                rows={2}
                placeholder="Observed deviations, anomalies, or remarks…"
                {...register("notes")}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Submit Feedback
            </Button>
          </form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
