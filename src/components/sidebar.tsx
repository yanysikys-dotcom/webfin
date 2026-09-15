"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NAV_ITEMS } from "@/lib/routes";

const ICONS: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/transactions": ReceiptText,
  "/assistant": Bot,
  "/settings": Settings,
};

export function Sidebar({ isPremium = false }: { isPremium?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden px-4 py-5">
        <Wallet className="h-7 w-7 shrink-0 text-emerald-600" />
        {!collapsed && (
          <>
            <span className="whitespace-nowrap text-lg font-semibold text-slate-900">
              WebFin
            </span>
            {isPremium && (
              <span
                title="Активний Преміум"
                className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
              >
                <Sparkles className="h-3 w-3" />
                Преміум
              </span>
            )}
          </>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.href] ?? LayoutDashboard;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-200 p-2">
        <button
          onClick={handleLogout}
          title="Вийти"
          className="flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Вийти</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Розгорнути меню" : "Згорнути меню"}
          className="flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5 shrink-0" />
          ) : (
            <ChevronsLeft className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span className="whitespace-nowrap">Згорнути</span>}
        </button>
      </div>
    </aside>
  );
}
