/** Admins are the emails listed in ADMIN_EMAILS (comma-separated). Safe to use in middleware. */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
