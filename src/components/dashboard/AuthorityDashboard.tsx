import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  scope: {
    isAdmin: boolean
    isAuthorized: boolean
  }
  authorityCode: string | null
  authorityCodes: string[]
  reports: any[]
  allReports: any[]
  operationalNotifications: any[]
  statusFilter: string | null
  searchValue: string
  queuedReports: any[]
  activeReports: any[]
  resolvedReports: any[]
  highSeverityReports: any[]
  staleReports: any[]
  oldestOpenReport: any | null
}

export function AuthorityDashboard({
  scope,
  authorityCode,
  authorityCodes,
  reports,
  allReports,
  operationalNotifications,
  statusFilter,
  searchValue,
  queuedReports,
  activeReports,
  resolvedReports,
  highSeverityReports,
  staleReports,
  oldestOpenReport,
}: Props) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Authority dashboard
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">
                Jurisdiction-scoped operational queue.
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Authority access is session-gated. Queue visibility is scoped to
                your assigned authority roles.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {scope.isAdmin ? "Admin" : "Scoped access"}
            </Badge>
            {authorityCode ? <Badge variant="outline">{authorityCode}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent>
          {scope.isAuthorized ? (
            <form className="grid gap-4 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] lg:items-end">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Authority code</span>
                <input
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                  defaultValue={authorityCode ?? ""}
                  list="authority-codes"
                  name="authority"
                  type="text"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Search queue</span>
                <input
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                  defaultValue={searchValue}
                  name="q"
                  placeholder="Category, location, reporter"
                  type="text"
                />
              </label>
              <input name="status" type="hidden" value={statusFilter ?? "all"} />
              <datalist id="authority-codes">
                {authorityCodes.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-2 lg:col-span-3">
                <Button type="submit">Load queue</Button>
                <a
                  className={buttonVariants({ variant: "secondary" })}
                  href={`/api/authority/exports?authority=${authorityCode ?? ""}&format=csv`}
                >
                  Export CSV
                </a>
                <a
                  className={buttonVariants({ variant: "secondary" })}
                  href={`/api/authority/exports?authority=${authorityCode ?? ""}&format=json`}
                >
                  Export JSON
                </a>
                {scope.isAdmin ? (
                  <Button data-run-digests type="button" variant="secondary">
                    Run digest batch
                  </Button>
                ) : null}
              </div>
              <p
                className="text-sm text-muted-foreground lg:col-span-3"
                data-digest-feedback
              />
            </form>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Your account does not yet have authority, warden, moderator, or
              admin access. Role assignment is required before this queue can be
              opened.
            </div>
          )}
        </CardContent>
      </Card>

      {scope.isAuthorized ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            description="reports need dispatch or active ownership."
            title="Queue waiting"
            value={queuedReports.length}
          />
          <SummaryCard
            description="reports currently being worked."
            title="In progress"
            value={activeReports.length}
          />
          <SummaryCard
            description="completed items in the current slice."
            title="Resolved"
            value={resolvedReports.length}
          />
          <SummaryCard
            description="reports rated severity 4 or 5."
            title="High severity"
            value={highSeverityReports.length}
          />
          <SummaryCard
            description="open for more than 48 hours."
            title="Needs attention"
            value={staleReports.length}
          />
          <SummaryCard
            description={
              oldestOpenReport
                ? `${oldestOpenReport.category} from ${formatPrettyDate(
                    oldestOpenReport.createdAt,
                    { includeTime: true }
                  )}`
                : "No open reports right now."
            }
            title="Oldest open"
            value={oldestOpenReport ? 1 : 0}
          />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Authority queue</CardTitle>
            <CardDescription>
              {scope.isAuthorized
                ? `${reports.length} reports shown for ${authorityCode ?? "your assigned authorities"}${statusFilter && statusFilter !== "all" ? ` (${statusFilter.replaceAll("_", " ")})` : ""}.`
                : "No queue available for this account yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                ["submitted", "Submitted"],
                ["dispatched", "Dispatched"],
                ["in_progress", "In progress"],
                ["resolved", "Resolved"],
                ["all", "All"],
              ].map(([value, label]) => (
                <a
                  key={value}
                  className={buttonVariants({
                    variant:
                      (statusFilter ?? "all") === value ? "default" : "secondary",
                    size: "sm",
                  })}
                  href={`?authority=${authorityCode ?? ""}&status=${value}&q=${encodeURIComponent(searchValue)}`}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.reportId}>
                      <TableCell className="align-top">
                        <div className="min-w-[20rem] space-y-1 whitespace-normal">
                          <div className="font-medium text-foreground">
                            {report.category}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {report.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {report.locationLabel ??
                              `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {report.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Severity {report.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {report.confirmationCount} confirmations ·{" "}
                        {report.duplicateCount} duplicates
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
                          Review
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
                        <CardDescription>{report.description}</CardDescription>
                      </div>
                      <Badge variant="outline">
                        {report.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div>
                        {report.locationLabel ??
                          `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                      </div>
                      <div>
                        Severity {report.severity} · {report.confirmationCount} confirmations ·{" "}
                        {report.duplicateCount} duplicates
                      </div>
                    </div>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium">Queue note</span>
                      <textarea
                        className="min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        data-queue-note
                        placeholder="Crew booked, duplicate confirmed, waiting on asset owner, or similar context."
                        rows={3}
                      />
                    </label>
                    <div
                      className="flex flex-wrap gap-2"
                      data-quick-actions
                      data-report-id={report.reportId}
                    >
                      <Button data-status="dispatched" size="sm" type="button" variant="secondary">
                        Dispatch
                      </Button>
                      <Button data-status="in_progress" size="sm" type="button" variant="secondary">
                        Start work
                      </Button>
                      <Button data-status="resolved" size="sm" type="button">
                        Resolve
                      </Button>
                    </div>
                    <p
                      className="text-sm text-muted-foreground"
                      data-status-feedback={report.reportId}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational alerts</CardTitle>
            <CardDescription>
              Recent routing feedback and queue notifications for this account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {operationalNotifications.length ? (
              operationalNotifications.map((notification) => (
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
                New queue arrivals and routing-help suggestions will appear here
                once they come in.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({
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
