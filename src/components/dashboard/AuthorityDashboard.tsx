import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  priorityFilter: string | null
  ownerFilter: string | null
  focusFilter: string | null
  sortFilter: string | null
  currentOwnerLabel: string
  searchValue: string
  teamMembers: {
    userId: string
    displayName: string | null
    email: string
    role: string
  }[]
  queuedReports: any[]
  myOwnedReports: any[]
  unassignedReports: any[]
  activeReports: any[]
  resolvedReports: any[]
  highSeverityReports: any[]
  urgentPriorityReports: any[]
  overdueReports: any[]
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
  priorityFilter,
  ownerFilter,
  focusFilter,
  sortFilter,
  currentOwnerLabel,
  searchValue,
  teamMembers,
  queuedReports,
  myOwnedReports,
  unassignedReports,
  activeReports,
  resolvedReports,
  highSeverityReports,
  urgentPriorityReports,
  overdueReports,
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
                <Input
                  defaultValue={authorityCode ?? ""}
                  list="authority-codes"
                  name="authority"
                  type="text"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Search queue</span>
                <Input
                  defaultValue={searchValue}
                  name="q"
                  placeholder="Category, location, reporter"
                  type="text"
                />
              </label>
              <input name="owner" type="hidden" value={ownerFilter ?? "all"} />
              <input name="focus" type="hidden" value={focusFilter ?? "all"} />
              <input name="sort" type="hidden" value={sortFilter ?? "needs-attention"} />
              <input name="status" type="hidden" value={statusFilter ?? "all"} />
              <input
                name="priority"
                type="hidden"
                value={priorityFilter ?? "all"}
              />
              <datalist id="authority-codes">
                {authorityCodes.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-2 lg:col-span-3">
                <Button type="submit">Load queue</Button>
                <a
                  className={buttonVariants({ variant: "secondary" })}
                  href={`/api/authority/exports?authority=${authorityCode ?? ""}&format=csv&status=${statusFilter ?? "all"}&priority=${priorityFilter ?? "all"}&owner=${encodeURIComponent(ownerFilter ?? "all")}&focus=${focusFilter ?? "all"}&sort=${sortFilter ?? "needs-attention"}&q=${encodeURIComponent(searchValue)}`}
                >
                  Export CSV
                </a>
                <a
                  className={buttonVariants({ variant: "secondary" })}
                  href={`/api/authority/exports?authority=${authorityCode ?? ""}&format=json&status=${statusFilter ?? "all"}&priority=${priorityFilter ?? "all"}&owner=${encodeURIComponent(ownerFilter ?? "all")}&focus=${focusFilter ?? "all"}&sort=${sortFilter ?? "needs-attention"}&q=${encodeURIComponent(searchValue)}`}
                >
                  Export JSON
                </a>
                {scope.isAdmin ? (
                  <Button data-run-digests type="button" variant="secondary">
                    Run digest batch
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 lg:col-span-3">
                {[
                  ["all", "All owners"],
                  ["mine", "My queue"],
                  ["unassigned", "Unassigned"],
                ].map(([value, label]) => (
                  <a
                    key={value}
                    className={buttonVariants({
                      variant:
                        (ownerFilter ?? "all") === value ? "default" : "secondary",
                      size: "sm",
                    })}
                    href={`?authority=${authorityCode ?? ""}&status=${statusFilter ?? "all"}&priority=${priorityFilter ?? "all"}&owner=${value}&focus=${focusFilter ?? "all"}&sort=${sortFilter ?? "needs-attention"}&q=${encodeURIComponent(searchValue)}`}
                  >
                    {label}
                  </a>
                ))}
                {teamMembers
                  .filter((member) => member.displayName || member.email)
                  .slice(0, 4)
                  .map((member) => {
                    const ownerValue = (member.displayName?.trim() || member.email).trim()
                    return (
                      <a
                        key={member.userId}
                        className={buttonVariants({
                          variant:
                            (ownerFilter ?? "all").toLowerCase() ===
                            ownerValue.toLowerCase()
                              ? "default"
                              : "secondary",
                          size: "sm",
                        })}
                        href={`?authority=${authorityCode ?? ""}&status=${statusFilter ?? "all"}&priority=${priorityFilter ?? "all"}&owner=${encodeURIComponent(ownerValue)}&focus=${focusFilter ?? "all"}&sort=${sortFilter ?? "needs-attention"}&q=${encodeURIComponent(searchValue)}`}
                      >
                        {member.displayName?.trim() || member.email}
                      </a>
                    )
                  })}
              </div>
              <p
                className="text-sm text-muted-foreground lg:col-span-3"
                data-digest-feedback
              />
              <div className="flex flex-wrap gap-2 lg:col-span-3">
                {[
                  ["all", "All work"],
                  ["overdue", "Overdue"],
                  ["stale", "Stale"],
                  ["urgent", "Urgent"],
                  ["unassigned", "Needs owner"],
                ].map(([value, label]) => (
                  <a
                    key={value}
                    className={buttonVariants({
                      variant:
                        (focusFilter ?? "all") === value ? "default" : "secondary",
                      size: "sm",
                    })}
                    href={`?authority=${authorityCode ?? ""}&status=${statusFilter ?? "all"}&priority=${priorityFilter ?? "all"}&owner=${ownerFilter ?? "all"}&focus=${value}&sort=${sortFilter ?? "needs-attention"}&q=${encodeURIComponent(searchValue)}`}
                  >
                    {label}
                  </a>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 lg:col-span-3">
                {[
                  ["needs-attention", "Needs attention"],
                  ["due", "Due soonest"],
                  ["priority", "Highest priority"],
                  ["severity", "Highest severity"],
                  ["oldest", "Oldest first"],
                  ["newest", "Newest first"],
                ].map(([value, label]) => (
                  <a
                    key={value}
                    className={buttonVariants({
                      variant:
                        (sortFilter ?? "needs-attention") === value
                          ? "default"
                          : "secondary",
                      size: "sm",
                    })}
                    href={`?authority=${authorityCode ?? ""}&status=${statusFilter ?? "all"}&priority=${priorityFilter ?? "all"}&owner=${ownerFilter ?? "all"}&focus=${focusFilter ?? "all"}&sort=${value}&q=${encodeURIComponent(searchValue)}`}
                  >
                    {label}
                  </a>
                ))}
              </div>
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            description="assigned to your current account label."
            title="My queue"
            value={myOwnedReports.length}
          />
          <SummaryCard
            description="reports still awaiting an owner."
            title="Unassigned"
            value={unassignedReports.length}
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
            description="reports marked urgent by triage."
            title="Urgent priority"
            value={urgentPriorityReports.length}
          />
          <SummaryCard
            description="follow-ups already past their due date."
            title="Overdue"
            value={overdueReports.length}
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
                ? `${reports.length} reports shown for ${authorityCode ?? "your assigned authorities"}${statusFilter && statusFilter !== "all" ? ` (${statusFilter.replaceAll("_", " ")})` : ""}${priorityFilter && priorityFilter !== "all" ? ` · ${priorityFilter} priority` : ""}.`
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
                    href={`?authority=${authorityCode ?? ""}&status=${value}&priority=${priorityFilter ?? "all"}&owner=${ownerFilter ?? "all"}&focus=${focusFilter ?? "all"}&sort=${sortFilter ?? "needs-attention"}&q=${encodeURIComponent(searchValue)}`}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All priority"],
                ["urgent", "Urgent"],
                ["high", "High"],
                ["normal", "Normal"],
                ["low", "Low"],
              ].map(([value, label]) => (
                <a
                  key={value}
                  className={buttonVariants({
                    variant:
                      (priorityFilter ?? "all") === value
                        ? "default"
                        : "secondary",
                    size: "sm",
                  })}
                    href={`?authority=${authorityCode ?? ""}&status=${statusFilter ?? "all"}&priority=${value}&owner=${ownerFilter ?? "all"}&focus=${focusFilter ?? "all"}&sort=${sortFilter ?? "needs-attention"}&q=${encodeURIComponent(searchValue)}`}
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
                    <TableHead>Triage</TableHead>
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
                          <div className="space-y-1">
                          <Badge
                              variant={
                                report.priority === "urgent" ? "default" : "secondary"
                              }
                          >
                            {report.priority}
                          </Badge>
                          {!report.ownerLabel?.trim() ? (
                            <Badge variant="outline">Needs owner</Badge>
                          ) : null}
                          {report.dueAt &&
                          new Date(report.dueAt).getTime() < Date.now() &&
                          report.status !== "resolved" ? (
                            <Badge variant="outline">Overdue</Badge>
                          ) : null}
                          {report.ownerLabel ? <div>{report.ownerLabel}</div> : null}
                          {report.dueAt ? (
                            <div>Due {formatPrettyDate(report.dueAt)}</div>
                          ) : null}
                        </div>
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
                      <div>
                        Priority {report.priority}
                        {report.ownerLabel ? ` · ${report.ownerLabel}` : ""}
                        {report.dueAt ? ` · Due ${formatPrettyDate(report.dueAt)}` : ""}
                      </div>
                      {!report.ownerLabel?.trim() ? <div>Needs owner assignment</div> : null}
                      {report.dueAt &&
                      new Date(report.dueAt).getTime() < Date.now() &&
                      report.status !== "resolved" ? (
                        <div>Overdue follow-up</div>
                      ) : null}
                    </div>

                    <form
                      className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3"
                      data-report-id={report.reportId}
                      data-triage-form
                    >
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Owner</span>
                        <Input
                          defaultValue={report.ownerLabel ?? ""}
                          name="ownerLabel"
                          placeholder="Crew, contractor, named owner"
                          type="text"
                          list={`owner-options-${report.reportId}`}
                        />
                        <datalist id={`owner-options-${report.reportId}`}>
                          {teamMembers.map((member) => {
                            const ownerValue = (member.displayName?.trim() || member.email).trim()
                            return <option key={`${report.reportId}-${member.userId}`} value={ownerValue} />
                          })}
                        </datalist>
                      </label>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-2 text-sm">
                          <span className="font-medium">Priority</span>
                          <select
                            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                            defaultValue={report.priority ?? "normal"}
                            name="priority"
                          >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </label>
                        <label className="grid gap-2 text-sm">
                          <span className="font-medium">Due date</span>
                          <input
                            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                            defaultValue={report.dueAt ? report.dueAt.slice(0, 10) : ""}
                            name="dueAt"
                            type="date"
                          />
                        </label>
                      </div>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Triage note</span>
                        <Textarea
                          defaultValue={report.queueNote ?? ""}
                          name="queueNote"
                          placeholder="Owner confirmed, contractor booked, or next operational step."
                          rows={3}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" type="submit" variant="secondary">
                          Save triage
                        </Button>
                        <Button
                          data-assign-self
                          data-owner-label={currentOwnerLabel}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Assign to me
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground" data-triage-feedback />
                    </form>

                    <label className="grid gap-2 text-sm">
                      <span className="font-medium">Queue note</span>
                      <Textarea
                        data-queue-note
                        defaultValue={report.queueNote ?? ""}
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

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Triage board</CardTitle>
              <CardDescription>
                A compact follow-up view for the first queue items currently in scope.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.slice(0, 4).map((report) => (
                <Card key={report.reportId} size="sm">
                  <CardHeader className="gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle>{report.category}</CardTitle>
                        <CardDescription>
                          {report.locationLabel ??
                            `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          report.priority === "urgent" ? "default" : "secondary"
                        }
                      >
                        {report.priority}
                      </Badge>
                      {!report.ownerLabel?.trim() ? (
                        <Badge variant="outline">Needs owner</Badge>
                      ) : null}
                      {report.dueAt &&
                      new Date(report.dueAt).getTime() < Date.now() &&
                      report.status !== "resolved" ? (
                        <Badge variant="outline">Overdue</Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      Owner: {report.ownerLabel || "Unassigned"}
                    </div>
                    <div>
                      Due: {report.dueAt ? formatPrettyDate(report.dueAt) : "No due date"}
                    </div>
                    <div>{report.queueNote || "No triage note recorded yet."}</div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        className={buttonVariants({ size: "sm", variant: "secondary" })}
                        href={`/reports/${report.reportId}`}
                      >
                        Open report
                      </a>
                      {report.ownerLabel?.trim().toLowerCase() === currentOwnerLabel.toLowerCase() ? (
                        <Badge variant="outline">Assigned to you</Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
