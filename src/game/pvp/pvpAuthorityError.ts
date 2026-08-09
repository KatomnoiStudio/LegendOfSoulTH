import { FunctionsHttpError } from '@supabase/supabase-js'

export async function authorityErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    try {
      const payload = (await error.context.clone().json()) as { error?: unknown }
      if (typeof payload.error === 'string' && payload.error.length > 0) return payload.error
    } catch {
      // The generic SDK message below is the safe fallback for non-JSON gateway responses.
    }
  }
  return error instanceof Error ? error.message : 'PvP authority ไม่ตอบกลับ'
}
