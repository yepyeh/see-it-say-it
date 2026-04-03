import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPrettyDate } from "@/lib/utils"

type Props = {
  queued: boolean
  userEmail: string
  reports: any[]
  supporterState: {
    isSupporter: boolean
    latestContributionAt?: string | null
  }
  recentNotifications: any[]
  totalConfirmations: number
  highestSeverity: number
}

const statusTone: Record<string, "default" | "secondary" | "outline"> = {
  submitted: "secondary",
  dispatched: "secondary",
  in_progress: "outline",
  resolved: "default",
}

export function MyReportsDashboard({
  queued,
  userEmail,
  reports,
  supporterState,
  recentNotifications,
  totalConfirmations,
  highestSeverity,
}: Props) {
  const openReports = reports.filter((report) => report.status !== "resolved")
  const resolvedReports = reports.filter((report) => report.status === "resolved")

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              My reports
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">
                {reports.length
                  ? "Track your submitted and queued issues."
                  : "Start your reporting history."}
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Signed in as {userEmail}. Your reports and confirmations are
                scoped from the active session rather than an email query
                string.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{reports.length} linked reports</Badge>
            {supporterState.isSupporter ? (
              <Badge variant="outline">Supporter</Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {queued ? (
        <Alert>
          <AlertTitle>Queued offline</AlertTitle>
          <AlertDescription>
            Your report was queued offline and will submit when connectivity
            returns.
          </AlertDescription>
        </Alert>
      ) : null}

      {supporterState.isSupporter && supporterState.latestContributionAt ? (
        <Alert>
          <AlertTitle>Supporter status active</AlertTitle>
          <AlertDescription>
            Backing the platform since{" "}
            {formatPrettyDate(supporterState.latestContributionAt, {
              includeTime: true,
            })}
            .
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Open issues"
          description={`${openReports.length} still awaiting a final outcome.`}
          value={openReports.length}
        />
        <StatCard
          title="Resolved"
          description={`${resolvedReports.length} closed reports on this account.`}
          value={resolvedReports.length}
        />
        <StatCard
          title="Community confirmations"
          description={`${totalConfirmations} confirmations across your tracked issues.`}
          value={totalConfirmations}
        />
        <StatCard
          title="Highest severity"
          description={
            highestSeverity ? `Severity ${highestSeverity}` : "No reports yet"
          }
          value={highestSeverity || 0}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {reports.length} reports linked to your signed-in account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reports.length ? (
              <>
                <div className="hidden xl:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issue</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.reportId}>
                          <TableCell className="align-top">
                            <div className="min-w-[18rem] space-y-1 whitespace-normal">
                              <div className="font-medium text-foreground">
                                {report.category}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {report.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusTone[report.status] ?? "outline"}
                            >
                              {report.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              Severity {report.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[16rem] whitespace-normal text-sm text-muted-foreground">
                            {report.locationLabel ??
                              `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatPrettyDate(report.createdAt, {
                              includeTime: true,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <a
                              className={buttonVariants({
                                variant: "secondary",
                                size: "sm",
                              })}
                              href={`/reports/${report.reportId}`}
                            >
                              Open
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 xl:hidden">
                  {reports.map((report) => (
                    <Card key={report.reportId} size="sm">
                      <CardHeader className="gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <CardTitle>{report.category}</CardTitle>
                            <CardDescription className="max-w-xl">
                              {report.description}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={statusTone[report.status] ?? "outline"}
                          >
                            {report.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <div>
                            <div className="font-medium text-foreground">
                              Severity
                            </div>
                            <div>Severity {report.severity}</div>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              Created
                            </div>
                            <div>
                              {formatPrettyDate(report.createdAt, {
                                includeTime: true,
                              })}
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="font-medium text-foreground">
                              Location
                            </div>
                            <div>
                              {report.locationLabel ??
                                `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <a
                          className={buttonVariants({
                            variant: "secondary",
                            size: "sm",
                          })}
                          href={`/reports/${report.reportId}`}
                        >
                          Open
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Report your first issue</CardTitle>
                    <CardDescription>
                      This account has no linked reports yet. The fastest way to
                      populate this timeline is to open the live map-led
                      reporting flow.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <a className={buttonVariants()} href="/report">
                      Open report flow
                    </a>
                    <a
                      className={buttonVariants({ variant: "secondary" })}
                      href="/reports"
                    >
                      Browse public reports
                    </a>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Keep the loop closed</CardTitle>
                    <CardDescription>
                      Enable notifications on this device and keep your
                      preferences current so authority updates are harder to
                      miss.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={buttonVariants({ variant: "secondary" })}
                        data-enable-notifications
                        type="button"
                      >
                        Enable notifications
                      </button>
                      <a
                        className={buttonVariants({ variant: "secondary" })}
                        href="/onboarding?mode=settings"
                      >
                        Open preferences
                      </a>
                      {!supporterState.isSupporter ? (
                        <a
                          className={buttonVariants({ variant: "secondary" })}
                          href="/support"
                        >
                          Support the platform
                        </a>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground" data-notification-status />
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent updates</CardTitle>
            <CardDescription>
              The newest communication events tied to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentNotifications.length ? (
              recentNotifications.map((notification) => (
                <Card key={notification.notificationId} size="sm">
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle>{notification.title}</CardTitle>
                        <CardDescription>
                          {formatPrettyDate(notification.createdAt, {
                            includeTime: true,
                          })}
                        </CardDescription>
                      </div>
                      {!notification.readAt ? (
                        <Badge variant="secondary">Unread</Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {notification.notificationType.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {notification.ctaPath ? (
                        <a
                          className={buttonVariants({
                            variant: "secondary",
                            size: "sm",
                          })}
                          href={notification.ctaPath}
                        >
                          Open
                        </a>
                      ) : null}
                      <a
                        className={buttonVariants({
                          variant: "secondary",
                          size: "sm",
                        })}
                        href="/notifications"
                      >
                        Open inbox
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Everything is quiet right now. Once reports move, support
                activates, or authority actions happen, they will appear here
                and in the inbox.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title,
  description,
  value,
}: {
  title: string
  description: string
  value: number
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
