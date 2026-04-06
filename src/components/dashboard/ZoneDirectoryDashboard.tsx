import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ZoneSnapshot = {
  zone: {
    slug: string
    name: string
  }
  authority: {
    authorityCode: string
    authorityName: string
  }
  metrics: {
    openReports: number
    resolvedThisMonth: number
    highSeverityThisMonth: number
    averageResolutionHours: number | null
  }
  rankings: {
    highSeverityRank: number | null
  }
}

export function ZoneDirectoryDashboard({ zones }: { zones: ZoneSnapshot[] }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Zone directory
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">
                Public activity snapshots by place.
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Browse tracked zones to see open pressure, resolution speed, and recent report activity.
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{zones.length} tracked zones</Badge>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {zones.map((zone) => (
          <Card key={zone.zone.slug}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{zone.zone.name}</Badge>
                {zone.rankings.highSeverityRank ? (
                  <Badge variant="outline">
                    No. {zone.rankings.highSeverityRank} high-severity this month
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-1">
                <CardTitle>{zone.zone.name}</CardTitle>
                <CardDescription>{zone.authority.authorityName}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-muted-foreground">Open now</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">{zone.metrics.openReports}</div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-muted-foreground">Resolved</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">{zone.metrics.resolvedThisMonth}</div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-muted-foreground">High severity</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">{zone.metrics.highSeverityThisMonth}</div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-muted-foreground">Fix speed</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">
                    {zone.metrics.averageResolutionHours ? `${zone.metrics.averageResolutionHours}h` : "No data"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                  href={`/zones/${zone.zone.slug}`}
                >
                  Open zone
                </a>
                <a
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href={`/authorities/${zone.authority.authorityCode}`}
                >
                  Authority page
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
