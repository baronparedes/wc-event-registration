import { z } from 'zod';

export const guestInfoSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Valid email is required'),
  phone: z.string().trim().optional(),
});

export type GuestInfoValues = z.infer<typeof guestInfoSchema>;
