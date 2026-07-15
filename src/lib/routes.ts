export type NavItem = { href: string; label: string };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Дашборд" },
  { href: "/transactions", label: "Транзакції" },
  { href: "/assistant", label: "AI-помічник" },
  { href: "/settings", label: "Налаштування" },
];

export const AUTH_PATHS = ["/login", "/register"];

export function isProtectedPath(pathname: string): boolean {
  return NAV_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.includes(pathname);
}
