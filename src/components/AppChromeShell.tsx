import * as React from "react"
import {
  Bell,
  BellRing,
  ChevronRight,
  Flag,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MoonStar,
  Settings2,
  Shield,
  SunMedium,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  badgeCount?: number
}

type BreadcrumbItem = {
  href?: string
  label: string
  icon?: string
}

type Props = {
  currentPath?: string
  title?: string
  subtitle?: string
  actions?: NavItem[]
  breadcrumbs?: BreadcrumbItem[]
  navItems: NavItem[]
  currentUserEmail?: string | null
  currentUserLabel: string
  immersiveMobile?: boolean
  unreadNotificationCount?: number
  children?: React.ReactNode
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "/": Home,
  "/reports": Map,
  "/report": Flag,
  "/my-reports": LayoutDashboard,
  "/notifications": Bell,
  "/authority": Shield,
}

function isActive(currentPath: string, path: string) {
  return currentPath === path || (path !== "/" && currentPath.startsWith(path))
}

export default function AppChromeShell({
  currentPath = "/",
  title,
  subtitle,
  actions = [],
  breadcrumbs = [],
  navItems,
  currentUserEmail,
  currentUserLabel,
  immersiveMobile = false,
  unreadNotificationCount = 0,
  children,
}: Props) {
  const accountMenuRef = React.useRef<HTMLDivElement | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false)
  const [themeMode, setThemeMode] = React.useState<"light" | "dark">("dark")

  React.useEffect(() => {
    if (typeof document === "undefined") return
    const resolved =
      document.documentElement.dataset.theme === "light" ? "light" : "dark"
    setThemeMode(resolved)
  }, [])

  React.useEffect(() => {
    if (!accountMenuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    window.addEventListener("pointerdown", handlePointerDown)
    return () => window.removeEventListener("pointerdown", handlePointerDown)
  }, [accountMenuOpen])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/auth?fresh=1"
  }

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark"
    setThemeMode(next)
    document.documentElement.dataset.theme = next
    document.documentElement.classList.toggle("dark", next === "dark")
    window.localStorage.setItem("sis:theme", next)
  }

  const workspaceItems = navItems.slice(0, 4)
  const operationsItems = navItems.slice(4)
  const breadcrumbIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    home: Home,
    reports: Map,
    report: Flag,
    authorities: Shield,
    authority: Shield,
    zones: Map,
    profile: UserRound,
    notifications: Bell,
    myreports: LayoutDashboard,
  }

  const autoBreadcrumbs = React.useMemo(() => {
    const segments = currentPath.split("/").filter(Boolean)
    const items: BreadcrumbItem[] = [{ href: "/", label: "Home", icon: "home" }]

    if (segments.length === 0) {
      return items
    }

    let runningPath = ""
    segments.forEach((segment, index) => {
      runningPath += `/${segment}`
      const isLast = index === segments.length - 1
      const normalized = segment.replace(/-/g, " ")
      const defaultLabel =
        normalized === "my reports"
          ? "My reports"
          : normalized === "inside"
            ? "Inside"
            : normalized.charAt(0).toUpperCase() + normalized.slice(1)
      const label = isLast && title ? title : defaultLabel
      items.push({
        href: isLast ? undefined : runningPath,
        label,
        icon:
          segment === "reports"
            ? "reports"
            : segment === "report"
              ? "report"
              : segment === "authorities" || segment === "authority"
                ? "authority"
                : segment === "zones"
                  ? "zones"
                  : segment === "notifications"
                    ? "notifications"
                    : segment === "my-reports"
                      ? "myreports"
                      : undefined,
      })
    })

    return items
  }, [currentPath, title])

  const resolvedBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : autoBreadcrumbs

  return (
    <TooltipProvider delayDuration={100}>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="offcanvas" variant="inset">
          <SidebarHeader className="gap-4">
            <a className="inline-flex items-center gap-3 px-2 py-1" href="/">
              <img
                alt="See It Say It"
                className="h-8 w-auto dark:hidden"
                height="54"
                loading="eager"
                src="/brand/new/sisi-logo-icon-text-lightmode.svg"
                width="155"
              />
              <img
                alt="See It Say It"
                className="hidden h-8 w-auto dark:block"
                height="54"
                loading="eager"
                src="/brand/new/sisi-logo-icon-text-darkmode.svg"
                width="155"
              />
            </a>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                  {currentUserLabel
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join("") || "SI"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {currentUserEmail ? currentUserLabel : "See It Say It"}
                  </div>
                  <div className="truncate text-xs text-sidebar-foreground/70">
                    {currentUserEmail
                      ? currentUserEmail
                      : "Civic reporting, routed properly."}
                  </div>
                </div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {workspaceItems.map((item) => {
                    const Icon = iconMap[item.href] ?? Home
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(currentPath, item.href)}
                          size="lg"
                        >
                          <a href={item.href}>
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </a>
                        </SidebarMenuButton>
                        {item.badgeCount ? (
                          <SidebarMenuBadge>{item.badgeCount}</SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Operations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {operationsItems.map((item) => {
                    const Icon = iconMap[item.href] ?? Bell
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(currentPath, item.href)}
                        >
                          <a href={item.href}>
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </a>
                        </SidebarMenuButton>
                        {item.badgeCount ? (
                          <SidebarMenuBadge>{item.badgeCount}</SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarSeparator />

          <SidebarFooter className="gap-3">
            <div className="flex flex-wrap gap-2 px-2">
              <Badge variant="outline">UK-first</Badge>
              <Badge variant="secondary">
                {currentUserEmail ? "Signed in" : "Guest"}
              </Badge>
            </div>
            <a
              className={buttonVariants({ variant: "ghost" })}
              href="/inside/roadmap"
            >
              Roadmap
            </a>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          {!immersiveMobile ? (
            <header
              className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
              style={{
                paddingTop: "max(env(safe-area-inset-top), 0px)",
              }}
            >
              <div className="flex items-start justify-between gap-4 px-4 py-3 md:px-6">
              <div className="flex min-w-0 items-start gap-3">
                  <SidebarTrigger className="md:hidden">
                    <Menu />
                  </SidebarTrigger>
                  <div className="min-w-0">
                    <nav
                      aria-label="Breadcrumb"
                      className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
                    >
                      {resolvedBreadcrumbs.map((item, index) => {
                        const Icon = item.icon
                          ? breadcrumbIconMap[item.icon]
                          : undefined
                        const isLast = index === resolvedBreadcrumbs.length - 1
                        const crumb = item.href && !isLast ? (
                          <a
                            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-muted hover:text-foreground"
                            href={item.href}
                          >
                            {Icon ? <Icon className="size-4" /> : null}
                            <span className="truncate">{item.label}</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-foreground">
                            {Icon ? <Icon className="size-4" /> : null}
                            <span className="truncate">{item.label}</span>
                          </span>
                        )

                        return (
                          <React.Fragment key={`${item.label}-${index}`}>
                            {index > 0 ? <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" /> : null}
                            {crumb}
                          </React.Fragment>
                        )
                      })}
                    </nav>
                  </div>
                </div>
                <div className="hidden flex-wrap items-center gap-2 md:flex">
                  <a
                    className={buttonVariants({
                      variant:
                        currentPath.startsWith("/notifications") ||
                        unreadNotificationCount > 0
                          ? "secondary"
                          : "outline",
                    })}
                    href="/notifications"
                  >
                    {unreadNotificationCount > 0 ? (
                      <BellRing className="size-4" />
                    ) : (
                      <Bell className="size-4" />
                    )}
                    Notifications
                    {unreadNotificationCount > 0 ? (
                      <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                        {unreadNotificationCount}
                      </span>
                    ) : null}
                  </a>
                  <div className="relative" ref={accountMenuRef}>
                    <button
                      aria-expanded={accountMenuOpen}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "inline-flex items-center gap-2"
                      )}
                      onClick={() => setAccountMenuOpen((open) => !open)}
                      type="button"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                        {currentUserLabel
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase() ?? "")
                          .join("") || "SI"}
                      </span>
                      <span className="max-w-28 truncate">
                        {currentUserEmail ? currentUserLabel : "Account"}
                      </span>
                    </button>
                    {accountMenuOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 grid min-w-56 gap-1 rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl">
                        {currentUserEmail ? (
                          <>
                            <a
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                              href="/onboarding?mode=settings#profile"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <UserRound className="size-4" />
                              Profile
                            </a>
                            <a
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                              href="/onboarding?mode=settings"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <Settings2 className="size-4" />
                              Preferences
                            </a>
                            <button
                              className="inline-flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                              onClick={toggleTheme}
                              type="button"
                            >
                              <span className="inline-flex items-center gap-2">
                                {themeMode === "dark" ? (
                                  <SunMedium className="size-4" />
                                ) : (
                                  <MoonStar className="size-4" />
                                )}
                                {themeMode === "dark" ? "Light mode" : "Dark mode"}
                              </span>
                            </button>
                            <button
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                              onClick={handleLogout}
                              type="button"
                            >
                              <LogOut className="size-4" />
                              Logout
                            </button>
                          </>
                        ) : (
                          <>
                            <a
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                              href="/auth?fresh=1"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <UserRound className="size-4" />
                              Sign in
                            </a>
                            <button
                              className="inline-flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                              onClick={toggleTheme}
                              type="button"
                            >
                              <span className="inline-flex items-center gap-2">
                                {themeMode === "dark" ? (
                                  <SunMedium className="size-4" />
                                ) : (
                                  <MoonStar className="size-4" />
                                )}
                                {themeMode === "dark" ? "Light mode" : "Dark mode"}
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {actions.map((action) => (
                    <a
                      className={buttonVariants({ variant: "secondary" })}
                      href={action.href}
                      key={action.href}
                    >
                      {action.label}
                    </a>
                  ))}
                </div>
              </div>
            </header>
          ) : null}

          <div
            className={cn(
              "flex-1 px-4 pb-6 pt-4 md:px-6 md:pb-8",
              immersiveMobile && "p-0"
            )}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
