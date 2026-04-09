import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ComponentType } from "react"
import { Activity, AlertTriangle, Clock3, MapPin, ShieldCheck } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import PublicReportsMap from "@/components/reporting/PublicReportsMap"

type ReportSummary = {
  reportId: string
  category: string
  description: string
  severity: number
  status: string
  latitude: number
  longitude: number
  locationLabel: string | null
  authorityName: string | null
  confirmationCount: number
  duplicateCount: number
}

type Props = {
  zone: {
    slug: string
    name: string
  }
  authority: {
    authorityCode: string
    authorityName: string
  }
  participation: {
    label: string
    description: string
    isMonitored: boolean
    recentlyClaimed: boolean
  }
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
  }
  categoryBreakdown: {
    category: string
    count: number
  }[]
  recentReports: ReportSummary[]
}

function StatCard(props: { title: string; value: string | number; description: string; icon: ComponentType<{ className?: string }> }) {
  const Icon = props.icon
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4" />
          <span>{props.title}</span>
        </CardDescription>
        <CardTitle className="text-3xl tracking-tight">{props.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </CardContent>
    </Card>
  )
}

export function ZoneDashboard({
  zone,
  authority,
  participation,
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
                Zone snapshot
              </div>
              <Badge variant="secondary">{zone.name}</Badge>
              <Badge variant={participation.isMonitored ? "secondary" : "outline"}>
                {participation.label}
              </Badge>
              {rankings.highSeverityRank ? (
                <Badge variant="outline">
                  No. {rankings.highSeverityRank} this month for high-severity reports
                </Badge>
              ) : null}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">
                What is happening in {zone.name} right now.
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                A public, data-driven snapshot of report activity, fix speed, and issue pressure in this zone.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              className={buttonVariants({ size: "sm", variant: "secondary" })}
              href={`/authorities/${authority.authorityCode}`}
            >
              {authority.authorityName}
            </a>
            <a
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href="/reports"
            >
              Public reports map
            </a>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          description="Reports currently waiting for a final outcome."
          icon={Activity}
          title="Open now"
          value={metrics.openReports}
        />
        <StatCard
          description="Reports resolved in this zone this month."
          icon={ShieldCheck}
          title="Resolved this month"
          value={metrics.resolvedThisMonth}
        />
        <StatCard
          description="Typical time from submission to resolution."
          icon={Clock3}
          title="Fix speed"
          value={
            metrics.averageResolutionHours
              ? `${metrics.averageResolutionHours}h`
              : "No data"
          }
        />
        <StatCard
          description="High-severity reports opened this month."
          icon={AlertTriangle}
          title="High severity"
          value={metrics.highSeverityThisMonth}
        />
        <StatCard
          description="All public reports linked to this zone snapshot."
          icon={MapPin}
          title="Total reports"
          value={metrics.totalReports}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Live map and report activity</CardTitle>
            <CardDescription>
              Browse live reports on the map and open any one for the full public timeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PublicReportsMap reports={recentReports} />
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
          <CardHeader>
            <CardTitle>Authority context</CardTitle>
            <CardDescription>
                The authority currently responsible for this zone.
              </CardDescription>
          </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-start gap-2 font-medium text-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{authority.authorityName}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {participation.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                  href={`/authorities/${authority.authorityCode}`}
                >
                  Open authority page
                </a>
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
                      Claim authority access
                    </a>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Issue mix</CardTitle>
              <CardDescription>
                The categories driving activity in this zone.
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
                  Not enough reports yet to show a category mix.
                </p>
              )}
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Historic backlog</div>
                <p>
                  {metrics.awaitingAdoptionCount} open reports in this zone still sit in the public backlog.
                </p>
                {participation.recentlyClaimed ? (
                  <p>{metrics.adoptedHistoricCount} historic reports have already been adopted since the authority claimed its workspace.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
