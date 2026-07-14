import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import type { FieldValidationError } from './validation.ts';

export type { FieldValidationError };

export type SupabaseClient = ReturnType<typeof createClient>;

export type HandlerResult<T, E extends string = string> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorCode: E;
      message: string;
      httpStatus: number;
      errors?: FieldValidationError[];
    };
