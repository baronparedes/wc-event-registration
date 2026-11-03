import { z } from 'zod';

export const applicantAttestationSchema = z.object({
  accepted: z.boolean().refine(Boolean, 'Please confirm the attestation to submit.'),
});

export type ApplicantAttestationForm = z.infer<typeof applicantAttestationSchema>;
