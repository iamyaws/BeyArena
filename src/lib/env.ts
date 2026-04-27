function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const env = {
  SUPABASE_URL: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  SUPABASE_ANON_KEY: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  ADMIN_EMAIL: required('VITE_ADMIN_EMAIL', import.meta.env.VITE_ADMIN_EMAIL),
};
