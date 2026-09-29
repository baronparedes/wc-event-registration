import { z } from 'zod';

export const emailTemplateSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  resend_template_id: z.string(),
  required_variables: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const emailTemplateListSchema = z.array(emailTemplateSchema);
