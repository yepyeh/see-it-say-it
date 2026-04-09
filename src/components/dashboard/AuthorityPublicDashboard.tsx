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

type ReportSummary = {
  reportId: string
  category: string
  description: string
  severity: number
  status: string
  locationLabel: string | null
  createdAt: string
}

type Props = {
  authority: {
    authorityCode: string
    authorityName: string
    routingMode: string
    reportUrl: string | null
  }
  participation: {
    state: "claimed" | "unclaimed" | "unknown"
    label: string
    description: string
    isMonitored: boolean
    recentlyClaimed: boolean
  }
  zone: {
    slug: string
    name: string
  } | null
  metrics: {
    totalReports: number
    openReports: number
    resolvedThisMonth: number
    highSeverityThisMonth: number
    averageResolutionHours: number | null
    awaitingAdoptionCount: number
    adoptedHistoricCount: number
  }
  rankings: {
    highSeverityRank: number | null
    highSeverityCount: number
    fixSpeedRank: number | null
  }
  categoryBreakdown: {
    category: string
    count: number
  }[]
  recentReports: ReportSummary[]
}

const statusTone: Record<string, "default" | "secondary" | "outline"> = {
  submitted: "secondary",
  dispatched: "secondary",
  in_progress: "outline",
  resolved: "default",
}

function ordinal(value: number | null) {
  if (!value) return null
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return `${value}st`
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`
  return `${value}th`
}

function StatCard(props: { title: string; value: string | number; description: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{props.title}</CardDescription>
        <CardTitle className="text-3xl tracking-tight">{props.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </CardContent>
    </Card>
  )
}

export function AuthorityPublicDashboard({
  authority,
  participation,
  zone,
  metrics,
  rankings,
  categoryBreakdown,
  recentReports,
}: Props) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Authority overview
              </div>
              <Badge variant={participation.isMonitored ? "secondary" : "outline"}>
                {participation.label}
              </Badge>
              {zone ? <Badge variant="outline">{zone.name} zone</Badge> : null}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">{authority.authorityName}</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {participation.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {zone ? (
              <a
                className={buttonVariants({ size: "sm", variant: "secondary" })}
                href={`/zones/${zone.slug}`}
              >
                Open {zone.name} zone
              </a>
            ) : null}
            {authority.reportUrl ? (
              <a
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={authority.reportUrl}
                rel="noreferrer"
                target="_blank"
              >
                Official destination
              </a>
            ) : null}
            {!participation.isMonitored ? (
              <>
                <a
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href={`/authorities/${authority.authorityCode}/open-letter`}
                >
                  Open letter
                </a>
                <a
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href="/apply/access"
                >
                  Claim this authority
                </a>
              </>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          description="All public reports currently linked to this authority."
          title="All reports"
          value={metrics.totalReports}
        />
        <StatCard
          description="Reports still waiting for a final outcome."
          title="Open now"
          value={metrics.openReports}
        />
        <StatCard
          description="Reports that reached a resolved outcome this month."
          title="Resolved this month"
          value={metrics.resolvedThisMonth}
        />
        <StatCard
          description="High-severity reports opened this month."
          title="High severity"
          value={metrics.highSeverityThisMonth}
        />
        <StatCard
          description="Average time from submission to resolution."
          title="Fix speed"
          value={
            metrics.averageResolutionHours
              ? `${metrics.averageResolutionHours}h`
              : "No data"
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent public reports</CardTitle>
            <CardDescription>
              Latest visible reports currently associated with this authority.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  {recentReports.map((report) => (
                    <TableRow key={report.reportId}>
                      <TableCell className="align-top">
                        <div className="min-w-[16rem] space-y-1 whitespace-normal">
                          <div className="font-medium text-foreground">{report.category}</div>
                          <div className="text-sm text-muted-foreground">{report.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusTone[report.status] ?? "outline"}>
                          {report.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Severity {report.severity}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[16rem] whitespace-normal text-sm text-muted-foreground">
                        {report.locationLabel ?? "Location on file"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatPrettyDate(report.createdAt, { includeTime: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          className={buttonVariants({ size: "sm", variant: "secondary" })}
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
              {recentReports.map((report) => (
                <Card key={report.reportId} size="sm">
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle>{report.category}</CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                      </div>
                      <Badge variant={statusTone[report.status] ?? "outline"}>
                        {report.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {report.locationLabel ?? "Location on file"}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline">Severity {report.severity}</Badge>
                      <div className="text-sm text-muted-foreground">
                        {formatPrettyDate(report.createdAt, { includeTime: true })}
                      </div>
                    </div>
                  </CardContent>
                  <div className="px-3 pb-3">
                    <a
                      className={buttonVariants({ size: "sm", variant: "secondary" })}
                      href={`/reports/${report.reportId}`}
                    >
                      Open report
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>League table snapshot</CardTitle>
              <CardDescription>
                Relative performance and pressure signals for this month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <div className="font-medium text-foreground">High-severity rank</div>
                <p>
                  {rankings.highSeverityRank
                    ? `${authority.authorityName} is ${ordinal(rankings.highSeverityRank)} this month for high-severity reports, with ${rankings.highSeverityCount} opened in the public feed.`
                    : "No high-severity ranking is available yet this month."}
                </p>
              </div>
              <Separator />
              <div>
                <div className="font-medium text-foreground">Fix-speed rank</div>
                <p>
                  {rankings.fixSpeedRank
                    ? `${authority.authorityName} is ${ordinal(rankings.fixSpeedRank)} this month for average fix speed among authorities with resolved public reports.`
                    : "Not enough resolved reports yet this month to rank fix speed."}
                </p>
              </div>
              <Separator />
              <div>
                <div className="font-medium text-foreground">Historic backlog</div>
                <p>
                  {metrics.awaitingAdoptionCount} open reports still sit in the public backlog, and {metrics.adoptedHistoricCount} historic reports have already been adopted into the monitored queue.
                </p>
              </div>
              {participation.recentlyClaimed ? (
                <>
                  <Separator />
                  <div>
                    <div className="font-medium text-foreground">Newly claimed workspace</div>
                    <p>
                      New reports are now visible in the operational queue. Older public-backlog reports may still need manual review and adoption.
                    </p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category mix</CardTitle>
              <CardDescription>
                The issue types currently shaping this authority snapshot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryBreakdown.length ? (
                categoryBreakdown.map((item, index) => (
                  <div className="space-y-3" key={item.category}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{item.category}</div>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                    {index < categoryBreakdown.length - 1 ? <Separator /> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No category distribution is available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
