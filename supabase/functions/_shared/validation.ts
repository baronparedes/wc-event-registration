import { z } from 'https://esm.sh/zod@3.25.76'

export { z }

const functionEnvironmentSchema = z.object({
  SUPABASE_URL: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
})

export type FunctionEnvironment = {
  supabaseUrl: string
  supabaseServiceKey: string
}

export function parseFunctionEnvironment(): FunctionEnvironment | null {
  const parsed = functionEnvironmentSchema.safeParse({
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  })

  if (!parsed.success) {
    return null
  }

  return {
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseServiceKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  }
}

export async function parseRequestBody<TSchema extends z.ZodTypeAny>(
  req: Request,
  schema: TSchema,
): Promise<
  { success: true; data: z.infer<TSchema> } | { success: false; error: string; details?: string }
> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return {
      success: false,
      error: 'Invalid JSON payload',
    }
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid request payload',
      details: parsed.error.issues
        .map((issue) => {
          const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
          return `${path}${issue.message}`
        })
        .join('; '),
    }
  }

  return { success: true, data: parsed.data }
}
