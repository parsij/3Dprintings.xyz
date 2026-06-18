import Drawer from "@mui/material/Drawer";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronRight,
  CreditCard,
  FileText,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Package,
  PackageCheck,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Sun,
  Truck,
  UserRound,
} from "lucide-react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useMenu } from "../MenuContext.jsx";
import { useTheme } from "../ThemeContext.jsx";
import { MARKETPLACE_HOME_URL, SELLER_SITE_ORIGIN } from "../config/api.js";

const cn = (...classes) => classes.filter(Boolean).join(" ");

function buildCustomerMenuItems(isSeller) {
  const items = [
    { label: "Home", to: "/home" },
    { label: "Shop 3D Prints", to: "/products" },
    { label: "Liked Products", to: "/liked-products" },
    { label: "Saved Products", to: "/saved-products" },
    { label: "Orders", to: "/account/orders" },
    { label: "Messages", to: "/messages", notification: true },
    { label: "Your Reviews", to: "/your-reviews" },
  ];

  if (isSeller) {
    items.push({
      label: "Seller Dashboard",
      to: `${SELLER_SITE_ORIGIN}/dashboard`,
      external: true,
    });
  } else {
    items.push({ label: "Become a Seller", to: "/become-seller" });
  }

  items.push({ label: "Terms", to: "/terms" });
  items.push({ label: "Privacy", to: "/privacy" });

  return items;
}

const seller = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Balance", to: "/balance" },
  { label: "Inventory", to: "/inventory" },
  { label: "Shipping Boxes", to: "/boxes" },
  { label: "Orders", to: "/orders" },
  { label: "Messages", to: "/messages", notification: true },
  { label: "Reviews", to: "/reviews" },
  { label: "Preferences", to: "/preferences" },
  { label: "Back To Marketplace", to: MARKETPLACE_HOME_URL, external: true },
];

const iconByLabel = {
  "Back To Marketplace": Store,
  Balance: CreditCard,
  "Become a Seller": Sparkles,
  Dashboard: LayoutDashboard,
  Help: HelpCircle,
  Home,
  Inventory: Package,
  "Liked Products": Heart,
  Messages: MessageSquare,
  Orders: PackageCheck,
  Preferences: Settings,
  Privacy: ShieldCheck,
  Products: ShoppingBag,
  Reports: BarChart3,
  Reviews: Star,
  "Saved Products": Boxes,
  Security: ShieldCheck,
  "Seller Dashboard": LayoutDashboard,
  "Shipping Boxes": Truck,
  "Shop 3D Prints": ShoppingBag,
  Terms: FileText,
  "Your Reviews": Star,
};

const utilityItems = [
  { label: "Account settings", to: "/account", icon: Settings },
  { label: "Help center", to: "/terms", icon: HelpCircle },
  { label: "Privacy & security", to: "/privacy", icon: ShieldCheck },
];

function getInitials(user) {
  const source = user?.name || user?.username || user?.email || "Guest User";
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GU";
}

function getDisplayName(user) {
  return user?.name || user?.username || user?.email?.split("@")[0] || "Guest user";
}

function isActiveRoute(item, pathname) {
  if (item.external || !item.to) return false;
  if (item.to === "/" || item.to === "/home") return pathname === item.to || (item.to === "/home" && pathname === "/");
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function splitMenuItems(items, role) {
  const legalLabels = new Set(["Terms", "Privacy", "Back To Marketplace"]);
  const utilityLabels = new Set(["Preferences"]);

  if (role === "seller") {
    return [
      { label: "Workspace", items: items.filter((item) => !legalLabels.has(item.label) && !utilityLabels.has(item.label)) },
      { label: "Manage", items: items.filter((item) => utilityLabels.has(item.label) || legalLabels.has(item.label)) },
    ].filter((section) => section.items.length > 0);
  }

  return [
    { label: "Marketplace", items: items.filter((item) => !legalLabels.has(item.label) && item.label !== "Become a Seller" && item.label !== "Seller Dashboard") },
    { label: "Business", items: items.filter((item) => item.label === "Become a Seller" || item.label === "Seller Dashboard") },
    { label: "Resources", items: items.filter((item) => legalLabels.has(item.label)) },
  ].filter((section) => section.items.length > 0);
}

function BrandHeader({ title, role }) {
  const subtitle = role === "seller" ? "Seller workspace" : "Your favorite marketplace";

  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 dark:bg-cyan-300 dark:text-slate-950 dark:shadow-cyan-400/20">
        <Store className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-indigo-200/50">
          {subtitle}
        </p>
        <h2 className="truncate text-lg font-black tracking-[-0.03em] text-slate-950 dark:text-white">
          {title}
        </h2>
      </div>
    </div>
  );
}

function StatusCard({ role }) {
  const copy = role === "seller"
    ? "Track orders, inventory, and customer messages from one place."
    : "Your saved prints, orders, and messages stay synced here.";

  return (
    <div className="mt-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-[#252553] dark:via-[#232147] dark:to-[#171630] dark:shadow-black/10">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 dark:bg-cyan-300 dark:text-slate-950 dark:shadow-cyan-300/20">
          <Sparkles className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold tracking-[-0.01em] text-slate-900 dark:text-white">
              Quick actions
            </p>
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-500">
              Live
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-indigo-100/60">
            {copy}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="px-3 pb-2 pt-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-indigo-200/40">
      {children}
    </p>
  );
}

function NavItem({ item, active, onNavigate }) {
  const Icon = item.icon || iconByLabel[item.label] || ChevronRight;
  const commonClass = cn(
    "group relative flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold transition duration-200",
    active
      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 dark:bg-gradient-to-r dark:from-blue-500/25 dark:to-violet-500/20 dark:text-white dark:shadow-lg dark:shadow-blue-950/25 dark:ring-white/10"
      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-indigo-100/65 dark:hover:bg-white/[0.07] dark:hover:text-white",
  );
  const content = (
    <>
      {active && <span className="absolute left-0 h-5 w-1 rounded-r-full bg-blue-500 dark:bg-cyan-300" />}
      <Icon className={cn("h-[18px] w-[18px]", active && "text-blue-600 dark:text-cyan-300")} strokeWidth={2.3} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-indigo-100 dark:ring-white/10">
          {item.badge}
        </span>
      )}
      {item.notification && <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]" />}
    </>
  );

  if (item.external) {
    return (
      <a className={commonClass} href={item.to} onClick={onNavigate}>
        {content}
      </a>
    );
  }

  return (
    <RouterLink className={commonClass} to={item.to} onClick={onNavigate}>
      {content}
    </RouterLink>
  );
}

function NavSection({ section, pathname, onNavigate }) {
  return (
    <div>
      <SectionLabel>{section.label}</SectionLabel>
      <div className="space-y-1.5">
        {section.items.map((item) => (
          <NavItem
            key={`${item.to}-${item.label}`}
            item={item}
            active={isActiveRoute(item, pathname)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function UtilityLinks({ pathname, onNavigate }) {
  return (
    <div className="space-y-1.5 border-t border-slate-100 pt-4 dark:border-white/10">
      {utilityItems.map((item) => (
        <NavItem
          key={item.label}
          item={item}
          active={isActiveRoute(item, pathname)}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function ThemeToggle({ isDarkMode, toggleTheme }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      className="grid h-10 w-full grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-black text-slate-500 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-indigo-100/60 dark:hover:bg-white/[0.08]"
    >
      <span className={cn("flex items-center justify-center gap-1.5 rounded-xl transition", !isDarkMode && "bg-white text-slate-950 shadow-sm dark:bg-white/10 dark:text-white")}>
        <Sun className="h-3.5 w-3.5" />
        Light
      </span>
      <span className={cn("flex items-center justify-center gap-1.5 rounded-xl transition", isDarkMode && "bg-slate-950 text-white shadow-sm dark:bg-cyan-300 dark:text-slate-950")}>
        <Moon className="h-3.5 w-3.5" />
        Dark
      </span>
    </button>
  );
}

function ProfileCard({ user }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner shadow-white transition hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/[0.055] dark:shadow-white/5 dark:hover:bg-white/[0.08]">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 text-sm font-black text-white dark:from-cyan-300 dark:via-blue-400 dark:to-violet-500">
          {getInitials(user)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black tracking-[-0.01em] text-slate-900 dark:text-white">
            {getDisplayName(user)}
          </p>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-indigo-100/55">
            {user?.email || "Sign in for full access"}
          </p>
        </div>
        <UserRound className="h-4 w-4 text-slate-400 dark:text-indigo-100/45" />
      </div>
    </div>
  );
}

const SideMenu = ({ title = "3Dprintings", role = "customer", items }) => {
  const { menuOpen, setMenuOpen } = useMenu();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const isSeller = String(user?.role || "").trim().toLowerCase() === "seller";
  const activeItems = Array.isArray(items) ? items : role === "seller" ? seller : buildCustomerMenuItems(isSeller);
  const sections = splitMenuItems(activeItems, role);
  const closeMenu = () => setMenuOpen(false);

  return (
    <Drawer
      anchor="left"
      open={menuOpen}
      onClose={closeMenu}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        backdrop: {
          className: "bg-slate-950/25 backdrop-blur-sm",
        },
        paper: {
          className: "!border-0 !bg-transparent !shadow-none !overflow-visible p-3",
        },
      }}
    >
      <aside className="flex h-[calc(100vh-1.5rem)] w-[min(22.5rem,calc(100vw-1.5rem))] flex-col rounded-[2rem] border border-slate-200/80 bg-white p-5 text-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#1a1938] dark:text-white dark:shadow-[0_30px_90px_rgba(3,7,18,0.48)]">
        <BrandHeader title={title} role={role} />

        <button
          type="button"
          className="mt-7 flex h-11 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-left text-sm font-semibold text-slate-500 transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-indigo-100/60 dark:hover:bg-white/[0.08]"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1">Search menu</span>
          <span className="rounded-lg border border-current/10 px-1.5 py-0.5 text-[10px] font-bold opacity-70">⌘K</span>
        </button>

        <StatusCard role={role} />

        <nav className="mt-1 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={`${title} navigation`}>
          {sections.map((section) => (
            <NavSection key={section.label} section={section} pathname={pathname} onNavigate={closeMenu} />
          ))}
        </nav>

        <div className="space-y-4 pt-4">
          <UtilityLinks pathname={pathname} onNavigate={closeMenu} />
          <div className="flex items-center justify-between px-1">
            <button type="button" className="relative rounded-2xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-indigo-100/45 dark:hover:bg-white/[0.08] dark:hover:text-white" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#1a1938]" />
            </button>
            <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
            <button type="button" className="rounded-2xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-indigo-100/45 dark:hover:bg-white/[0.08] dark:hover:text-white" aria-label="Close menu" onClick={closeMenu}>
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
          <ProfileCard user={user} />
        </div>
      </aside>
    </Drawer>
  );
};

export default SideMenu;
