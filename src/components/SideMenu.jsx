import { useEffect, useRef, useState } from "react";
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
  Settings,
  ShieldCheck,
  ShoppingBag,
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
    { label: "Shop 3D stuff", to: "/products" },
    {
      label: "Saved & Liked",
      children: [
        { label: "Liked Products", to: "/liked-products", icon: Heart },
        { label: "Saved Products", to: "/saved-products", icon: Boxes },
      ],
    },
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

  items.push({
    label: "Terms & Privacy",
    children: [
      { label: "Terms", to: "/terms", icon: FileText },
      { label: "Privacy", to: "/privacy", icon: ShieldCheck },
    ],
  });

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
  "Become a Seller": Store,
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
  "Saved & Liked": Heart,
  Security: ShieldCheck,
  "Seller Dashboard": LayoutDashboard,
  "Shipping Boxes": Truck,
  "Shop 3D stuff": ShoppingBag,
  Terms: FileText,
  "Terms & Privacy": FileText,
  "Your Reviews": Star,
};

const utilityItems = [
  { label: "Account settings", to: "/account", icon: Settings, exact: true },
  { label: "Help center", to: "/terms", icon: HelpCircle, highlight: false },
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
  if (item.exact) return pathname === item.to;
  if (item.to === "/" || item.to === "/home") return pathname === item.to || (item.to === "/home" && pathname === "/");
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function hasActiveChild(item, pathname) {
  return Array.isArray(item.children) && item.children.some((child) => isActiveRoute(child, pathname));
}

function splitMenuItems(items, role) {
  const legalLabels = new Set(["Terms", "Privacy", "Terms & Privacy", "Back To Marketplace"]);
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

function SectionLabel({ children }) {
  return (
    <p className="px-3 pb-2 pt-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-indigo-200/40">
      {children}
    </p>
  );
}

function NavItem({ item, active, onNavigate, pathname }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownEndRef = useRef(null);
  const Icon = item.icon || iconByLabel[item.label] || ChevronRight;
  const childActive = hasActiveChild(item, pathname);
  const isExpanded = item.children && (childActive || isDropdownOpen);

  useEffect(() => {
    if (!isExpanded || !dropdownEndRef.current) return undefined;

    const timeoutId = window.setTimeout(() => {
      dropdownEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [isExpanded]);

  const commonClass = cn(
    "group relative flex h-11 w-full min-w-0 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition duration-200",
    active
      ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20 hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:shadow-lg dark:shadow-cyan-950/20 dark:ring-cyan-200/30 dark:hover:bg-cyan-200"
      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-indigo-100/65 dark:hover:bg-white/[0.07] dark:hover:text-white",
  );
  const content = (
    <>
      {active && <span className="absolute left-0 h-5 w-1 rounded-r-full bg-white/85 dark:bg-slate-950/85" />}
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-white dark:text-slate-950")} strokeWidth={2.3} />
      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-indigo-100 dark:ring-white/10">
          {item.badge}
        </span>
      )}
      {item.notification && <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]" />}
    </>
  );

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsDropdownOpen((previous) => !previous)}
          className={commonClass}
        >
          {content}
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-300 ease-in-out",
              isExpanded && "rotate-90",
              active && "text-white dark:text-slate-950",
            )}
            strokeWidth={2.5}
          />
        </button>
        <div
          aria-hidden={!isExpanded}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-1.5 space-y-1 pl-7">
              {item.children.map((child) => (
                <NavItem
                  key={`${child.to}-${child.label}`}
                  item={child}
                  active={isActiveRoute(child, pathname)}
                  onNavigate={onNavigate}
                  pathname={pathname}
                />
              ))}
              <span ref={dropdownEndRef} aria-hidden="true" className="block h-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              active={!item.children && isActiveRoute(item, pathname)}
              onNavigate={onNavigate}
              pathname={pathname}
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
          active={item.highlight !== false && isActiveRoute(item, pathname)}
          onNavigate={onNavigate}
          pathname={pathname}
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
      className="grid h-10 min-w-0 flex-1 grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-black text-slate-500 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-indigo-100/60 dark:hover:bg-white/[0.08]"
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
          className: "!border-0 !bg-transparent !shadow-none !overflow-hidden max-w-full p-2 sm:p-3",
        },
      }}
    >
      <aside className="flex h-[calc(100dvh-1rem)] w-[min(22rem,calc(100vw-1rem))] max-w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-4 text-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#1a1938] dark:text-white dark:shadow-[0_30px_90px_rgba(3,7,18,0.48)] sm:h-[calc(100dvh-1.5rem)] sm:w-[min(22.5rem,calc(100vw-1.5rem))] sm:p-5">
        <BrandHeader title={title} role={role} />

        <nav className="mt-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={`${title} navigation`}>
          {sections.map((section) => (
            <NavSection key={section.label} section={section} pathname={pathname} onNavigate={closeMenu} />
          ))}
        </nav>

        <div className="space-y-4 pt-4">
          <UtilityLinks pathname={pathname} onNavigate={closeMenu} />
          <div className="flex min-w-0 items-center justify-between gap-2 px-1">
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
