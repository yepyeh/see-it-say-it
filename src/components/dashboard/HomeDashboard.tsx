import {
  Bell,
  Compass,
  Folder,
  MapPinned,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn, formatPrettyDate } from "@/lib/utils"

type ReportItem = {
  reportId: string
  category: string
  description: string
  status: string
  severity: number
  createdAt: string
}

type NotificationItem = {
  notificationId: string
  title: string
  body: string
  ctaPath?: string | null
  createdAt: string
  readAt?: string | null
}

type Props = {
  reports: ReportItem[]
  notifications: NotificationItem[]
  followedCount: number
  totalConfirmations: number
}

function getStatusLabel(status: string) {
  return status.replaceAll("_", " ")
}

function getSeverityLabel(severity: number) {
  if (severity >= 5) return "Critical"
  if (severity >= 4) return "High"
  if (severity === 3) return "Medium"
  return "Low"
}

function getMetricTone(value: number) {
  if (value > 0) return "secondary"
  return "outline"
}

export function HomeDashboard({
  reports,
  notifications,
  followedCount,
  totalConfirmations,
}: Props) {
  const hasActivity = reports.length > 0 || notifications.length > 0 || followedCount > 0
  const openReports = reports.filter((report) => report.status !== "resolved")
  const resolvedReports = reports.filter((report) => report.status === "resolved")

  if (!hasActivity) {
    return (
      <div className="grid gap-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <Folder className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                No reports yet
              </h1>
              <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
                You haven&apos;t created any reports yet. Start with your first
                issue, or back the platform before you submit one.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a className={buttonVariants({ variant: "default" })} href="/report">
                Make a report
              </a>
              <a className={buttonVariants({ variant: "outline" })} href="/support">
                Support us
              </a>
            </div>
            <a
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              href="/brief"
            >
              Learn more
              <Compass className="size-4" />
            </a>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <ValueCard
            description="File a real issue with photos, location, severity, and public evidence."
            icon={MapPinned}
            title="Capture"
          />
          <ValueCard
            description="Use the public map to inspect live reports, pressure points, and local activity."
            icon={Compass}
            title="Browse"
          />
          <ValueCard
            description="Send reports into the right authority context with clearer participation states."
            icon={ShieldCheck}
            title="Route"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back!</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          A snapshot of your contribution and the latest activity on your account.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          description="Reports linked to your signed-in account."
          title="Your reports"
          tone={getMetricTone(reports.length)}
          value={reports.length}
        />
        <MetricCard
          description="Reports you are still tracking for an outcome."
          title="Open reports"
          tone={getMetricTone(openReports.length)}
          value={openReports.length}
        />
        <MetricCard
          description="Community confirmations across your submitted reports."
          title="Confirmations"
          tone={getMetricTone(totalConfirmations)}
          value={totalConfirmations}
        />
        <MetricCard
          description="Reports you follow even when you did not submit them."
          title="Following"
          tone={getMetricTone(followedCount)}
          value={followedCount}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Your reports</CardTitle>
            <CardDescription>View and manage your latest reports.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {reports.slice(0, 4).map((report) => (
              <a
                className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"
                href={`/reports/${report.reportId}`}
                key={report.reportId}
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                  <TriangleAlert className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{report.category}</Badge>
                    <Badge variant="secondary">{getStatusLabel(report.status)}</Badge>
                  </div>
                  <div className="truncate text-sm font-medium">
                    {report.description}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatPrettyDate(report.createdAt)}</span>
                    <span>Severity {report.severity}</span>
                  </div>
                </div>
              </a>
            ))}
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-muted-foreground">
                {resolvedReports.length} resolved so far
              </div>
              <a className={buttonVariants({ variant: "secondary" })} href="/my-reports">
                View all
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Stay up to date with your account updates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {notifications.length ? (
              notifications.slice(0, 4).map((notification) => (
                <a
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40",
                    !notification.readAt && "bg-muted/20"
                  )}
                  href={notification.ctaPath ?? "/notifications"}
                  key={notification.notificationId}
                >
                  <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                    <Bell className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-sm font-medium">{notification.title}</div>
                    <div className="line-clamp-2 text-sm text-muted-foreground">
                      {notification.body}
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                No updates yet. Notifications will appear here once your reports start moving.
              </div>
            )}
            <div className="flex justify-start pt-1">
              <a className={buttonVariants({ variant: "secondary" })} href="/notifications">
                View all
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  tone,
}: {
  title: string
  value: number
  description: string
  tone: "secondary" | "outline"
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{title}</CardDescription>
          <Badge variant={tone}>{value > 0 ? `+${value}` : "0"}</Badge>
        </div>
        <CardTitle className="text-4xl tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  )
}

function ValueCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof MapPinned
  title: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex size-10 items-center justify-center rounded-xl border bg-muted/50">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <div className="font-medium">{title}</div>
          <div className="text-sm leading-6 text-muted-foreground">{description}</div>
        </div>
      </CardContent>
    </Card>
  )
}
