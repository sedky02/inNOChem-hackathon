import { z } from "zod";

/**
 * Form validation schemas (React Hook Form + Zod). Kept separate from the API
 * contract types in types.ts: these govern user input, not server responses.
 */

export const fabricTypes = [
  "cotton",
  "polyester",
  "nylon",
  "silk",
  "blend",
] as const;

export const molecularScreeningSchema = z.object({
  fabric_type: z.enum(fabricTypes),
  cotton_pct: z.number().min(0).max(100),
  polyester_pct: z.number().min(0).max(100),
  density: z
    .number({ message: "Enter fabric density" })
    .positive("Density must be positive")
    .max(2000, "Density seems too high"),
  mass_load: z
    .number({ message: "Enter target mass load" })
    .positive("Mass load must be positive")
    .max(1000, "Mass load seems too high"),
  dye_name: z.string().min(1, "Dye name is required").max(120),
  smiles: z
    .string()
    .min(1, "SMILES string is required")
    .max(500, "SMILES string is too long")
    // Permissive SMILES character set — full parsing happens server-side (RDKit).
    .regex(
      /^[A-Za-z0-9@+\-\[\]()=#$:/\\.%*]+$/,
      "Contains characters not valid in a SMILES string",
    ),
});

export type MolecularScreeningInput = z.infer<typeof molecularScreeningSchema>;

export const feedbackSchema = z.object({
  actual_ks: z
    .number({ message: "Enter the measured K/S" })
    .positive("Must be positive"),
  actual_pressure: z
    .number({ message: "Enter the pressure used" })
    .min(50)
    .max(500),
  actual_temperature: z
    .number({ message: "Enter the temperature used" })
    .min(40)
    .max(250),
  actual_flow_rate: z
    .number({ message: "Enter the flow rate used" })
    .min(0.1)
    .max(5),
  notes: z.string().max(1000).optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
