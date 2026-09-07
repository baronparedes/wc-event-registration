import { z } from 'zod';

export const createServiceLayoutSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(200, 'Description must be 200 characters or less'),
  is_active: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CreateServiceLayoutInput = z.input<typeof createServiceLayoutSchema>;

export const updateServiceLayoutSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(200, 'Description must be 200 characters or less').optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateServiceLayoutInput = z.input<typeof updateServiceLayoutSchema>;

export const createServiceSeatSchema = z.object({
  layout_id: z.string().uuid('Invalid layout ID'),
  table_number: z.string().trim().min(1, 'Table number is required'),
  area: z.string().trim().optional().nullable(),
  seat_number: z.string().trim().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CreateServiceSeatInput = z.input<typeof createServiceSeatSchema>;

export const updateServiceSeatSchema = z.object({
  table_number: z.string().trim().min(1, 'Table number is required').optional(),
  area: z.string().trim().optional().nullable(),
  seat_number: z.string().trim().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateServiceSeatInput = z.input<typeof updateServiceSeatSchema>;

export const createServiceAttendanceSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  rfid: z.string().trim().optional().nullable(),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Service date must be in YYYY-MM-DD format'),
  time_slot: z.string().trim().min(1, 'Time slot is required'),
  checked_in_at: z.string().datetime().optional(),
  is_walk_in: z.boolean().optional().default(false),
  is_override: z.boolean().optional().default(false),
  is_manual_entry: z.boolean().optional().default(false),
  service_seat_id: z.string().uuid('Invalid seat ID').optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CreateServiceAttendanceInput = z.input<typeof createServiceAttendanceSchema>;

export const updateServiceAttendanceSchema = z.object({
  rfid: z.string().trim().optional().nullable(),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Service date must be in YYYY-MM-DD format').optional(),
  time_slot: z.string().trim().min(1, 'Time slot is required').optional(),
  checked_in_at: z.string().datetime().optional(),
  is_walk_in: z.boolean().optional(),
  is_override: z.boolean().optional(),
  is_manual_entry: z.boolean().optional(),
  service_seat_id: z.string().uuid('Invalid seat ID').optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateServiceAttendanceInput = z.input<typeof updateServiceAttendanceSchema>;
