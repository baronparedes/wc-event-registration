import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types.ts';
import type { FieldValidationError } from './validation.ts';

export type { FieldValidationError };

export type SupabaseClient = ReturnType<typeof createClient<Database>>;

export type HandlerResult<T, E extends string = string> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorCode: E;
      message: string;
      httpStatus: number;
      errors?: FieldValidationError[];
    };
