type PremiumFields = { is_premium: boolean; premium_until: string | null };

export const FREE_HISTORY_DAYS = 30;

export function isPremiumActive(profile: PremiumFields, now = new Date()): boolean {
  if (!profile.is_premium || !profile.premium_until) return false;
  return new Date(profile.premium_until) > now;
}

export function historyDaysFor(
  profile: PremiumFields,
  now = new Date(),
): number | undefined {
  return isPremiumActive(profile, now) ? undefined : FREE_HISTORY_DAYS;
}

export function premiumDaysLeft(profile: PremiumFields, now = new Date()): number {
  if (!isPremiumActive(profile, now)) return 0;
  const ms = new Date(profile.premium_until!).getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
