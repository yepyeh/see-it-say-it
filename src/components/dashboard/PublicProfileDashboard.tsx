import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { formatPrettyDate } from "@/lib/utils"

type PublicProfile = {
  handle: string
  displayName: string | null
  bio: string | null
  homeAuthorityCode: string | null
  homeAuthorityName: string | null
  createdAt: string
  reportCount: number
  resolvedCount: number
  confirmationsMade: number
  duplicateReports: number
  recentReports: {
    reportId: string
    category: string
    description: string
    status: string
    locationLabel: string | null
    createdAt: string
  }[]
}

type Props = {
  profile: PublicProfile
  isOwnProfile?: boolean
  supporterBadgeLabel?: string | null
  supporterSince?: string | null
}

const statusTone: Record<string, "default" | "secondary" | "outline"> = {
  submitted: "secondary",
  dispatched: "secondary",
  in_progress: "outline",
  resolved: "default",
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function StatCard(props: { title: string; value: number; description: string }) {
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

export function PublicProfileDashboard({
  profile,
  isOwnProfile = false,
  supporterBadgeLabel = null,
  supporterSince = null,
}: Props) {
  const displayName = profile.displayName?.trim() || profile.handle
  const initials = getInitials(displayName)

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="size-14 rounded-xl">
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Community profile
                </div>
                {isOwnProfile ? <Badge variant="secondary">Your profile</Badge> : null}
                {supporterBadgeLabel ? (
                  <Badge variant="outline">{supporterBadgeLabel}</Badge>
                ) : null}
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl tracking-tight">{displayName}</CardTitle>
                <CardDescription className="text-base">@{profile.handle}</CardDescription>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {profile.bio?.trim() ||
                  "This resident has chosen to make their civic reporting activity visible to the community."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile.homeAuthorityName ? (
              <Badge variant="outline">{profile.homeAuthorityName}</Badge>
            ) : null}
            <Badge variant="secondary">
              Joined {formatPrettyDate(profile.createdAt)}
            </Badge>
            {supporterSince ? (
              <Badge variant="outline">
                Supporting since {formatPrettyDate(supporterSince)}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Public reports submitted from this account."
          title="Reports"
          value={profile.reportCount}
        />
        <StatCard
          description="Reports that reached a resolved outcome."
          title="Resolved"
          value={profile.resolvedCount}
        />
        <StatCard
          description="Community confirmations made on other reports."
          title="Confirmations"
          value={profile.confirmationsMade}
        />
        <StatCard
          description="Reports later marked as duplicates."
          title="Duplicates"
          value={profile.duplicateReports}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent public reports</CardTitle>
            <CardDescription>
              The latest public reports linked to this contribution profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.recentReports.length ? (
              profile.recentReports.map((report, index) => (
                <div className="space-y-4" key={report.reportId}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-foreground">{report.category}</div>
                        <Badge variant={statusTone[report.status] ?? "outline"}>
                          {report.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                      <div className="text-sm text-muted-foreground">
                        {report.locationLabel || "Location on file"}
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <div className="text-sm text-muted-foreground">
                        {formatPrettyDate(report.createdAt, { includeTime: true })}
                      </div>
                      <a
                        className={buttonVariants({ size: "sm", variant: "secondary" })}
                        href={`/reports/${report.reportId}`}
                      >
                        Open report
                      </a>
                    </div>
                  </div>
                  {index < profile.recentReports.length - 1 ? <Separator /> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No public reports are available on this profile yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Why this profile exists</CardTitle>
              <CardDescription>
                Public profiles make civic contribution visible without exposing private account data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Residents can build a visible contribution history around the issues they report.
              </p>
              <p>
                Authorities still get richer trust and moderation signals internally than the public sees here.
              </p>
              <p>
                Email, internal roles, and private account details remain hidden.
              </p>
            </CardContent>
          </Card>

          {isOwnProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>Manage this profile</CardTitle>
                <CardDescription>
                  Update your handle, visibility, or home authority from preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <a
                  className={buttonVariants({ variant: "default" })}
                  href="/onboarding?mode=settings"
                >
                  Open preferences
                </a>
                <a
                  className={buttonVariants({ variant: "secondary" })}
                  href="/my-reports"
                >
                  My reports
                </a>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
