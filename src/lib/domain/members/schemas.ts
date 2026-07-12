import { z } from 'zod';

import { VALIDATION_PATTERNS } from '@/config/constants';

const emailPattern = VALIDATION_PATTERNS.email;
const datePattern = VALIDATION_PATTERNS.dateYyyyMmDd;

function optionalText(maxLength: number, message: string) {
  return z.string().trim().max(maxLength, message);
}

function requiredText(maxLength: number, requiredMessage: string, maxLengthMessage: string) {
  return z.string().trim().min(1, requiredMessage).max(maxLength, maxLengthMessage);
}

function buildFullName(firstName: string, lastName: string) {
  return [firstName, lastName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
}

function optionalEmail() {
  return z
    .string()
    .trim()
    .max(320, 'Email must be 320 characters or less')
    .refine((value) => value === '' || emailPattern.test(value), 'Enter a valid email address');
}

function optionalDate() {
  return z
    .string()
    .trim()
    .max(10, 'Date of birth must use YYYY-MM-DD format')
    .refine(
      (value) => value === '' || datePattern.test(value),
      'Date of birth must use YYYY-MM-DD format',
    );
}

export const updateMemberSchema = z
  .object({
    full_name: z.string().trim().max(200, 'Full name must be 200 characters or less'),
    first_name: requiredText(
      100,
      'First name is required',
      'First name must be 100 characters or less',
    ),
    last_name: requiredText(
      100,
      'Last name is required',
      'Last name must be 100 characters or less',
    ),
    nickname: requiredText(100, 'Nickname is required', 'Nickname must be 100 characters or less'),
    email: optionalEmail(),
    phone: optionalText(50, 'Phone must be 50 characters or less'),
    date_of_birth: optionalDate(),
    role: requiredText(100, 'Role is required', 'Role must be 100 characters or less'),
    category: requiredText(100, 'Category is required', 'Category must be 100 characters or less'),
    metadata_entries: z.array(
      z.object({
        key: z
          .string()
          .trim()
          .min(1, 'Key is required')
          .max(100, 'Key must be 100 characters or less'),
        value: z.string().trim().max(500, 'Value must be 500 characters or less'),
      }),
    ),
  })
  .superRefine((value, context) => {
    if (buildFullName(value.first_name, value.last_name).length > 200) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['full_name'],
        message: 'Full name must be 200 characters or less',
      });
    }
  })
  .transform((value) => ({
    ...value,
    full_name: buildFullName(value.first_name, value.last_name),
  }));

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const createMemberSchema = z.object({
  member_id: z
    .string()
    .trim()
    .min(1, 'Member ID is required')
    .max(100, 'Member ID must be 100 characters or less'),
  first_name: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or less'),
  last_name: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or less'),
  nickname: z
    .string()
    .trim()
    .min(1, 'Nickname is required')
    .max(100, 'Nickname must be 100 characters or less'),
  email: optionalEmail(),
  phone: optionalText(50, 'Phone must be 50 characters or less'),
  date_of_birth: optionalDate(),
  role: z
    .string()
    .trim()
    .min(1, 'Role is required')
    .max(100, 'Role must be 100 characters or less'),
  category: z
    .string()
    .trim()
    .min(1, 'Category is required')
    .max(100, 'Category must be 100 characters or less'),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
