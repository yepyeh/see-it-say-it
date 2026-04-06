import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AuthoritySnapshot = {
  authority: {
    authorityCode: string
    authorityName: string
    routingMode: string
    reportUrl: string | null
  }
  zone: {
    slug: string
    name: string
  } | null
  metrics: {
    totalReports: number
    openReports: number
    resolvedThisMonth: number
    averageResolutionHours: number | null
  }
}

export function AuthorityDirectoryDashboard({
  authorities,
}: {
  authorities: AuthoritySnapshot[]
}) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Authority directory
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">
                Public authority snapshots.
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Browse public authority performance, recent activity, and route context without entering the internal operations queue.
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{authorities.length} tracked authorities</Badge>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {authorities.map((entry) => (
          <Card key={entry.authority.authorityCode}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {entry.authority.routingMode === "webform" ? "Official form" : "Email route"}
                </Badge>
                {entry.zone ? <Badge variant="outline">{entry.zone.name}</Badge> : null}
              </div>
              <div className="space-y-1">
                <CardTitle>{entry.authority.authorityName}</CardTitle>
                <CardDescription>
                  {entry.metrics.totalReports} total reports tracked publicly.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-muted-foreground">Open</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">{entry.metrics.openReports}</div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-muted-foreground">Resolved</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">{entry.metrics.resolvedThisMonth}</div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-muted-foreground">Fix speed</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">
                    {entry.metrics.averageResolutionHours ? `${entry.metrics.averageResolutionHours}h` : "No data"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                  href={`/authorities/${entry.authority.authorityCode}`}
                >
                  Open authority
                </a>
                {entry.zone ? (
                  <a
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                    href={`/zones/${entry.zone.slug}`}
                  >
                    Zone page
                  </a>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
