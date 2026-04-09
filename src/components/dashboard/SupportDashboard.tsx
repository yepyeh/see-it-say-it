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

type Props = {
  supporterState: {
    isSupporter: boolean
    latestContributionAt?: string | null
    firstContributionAt?: string | null
    activeContributionType?: "one_time" | "recurring" | null
    activeTierLabel?: string | null
    badgeLabel?: string | null
    manageLabel?: string | null
    manageUrl?: string | null
    history: {
      supportContributionId: string
      amountMinor: number
      currency: string
      contributionType: "one_time" | "recurring"
      status: string
      createdAt: string
      updatedAt: string
      tierLabel: string
    }[]
  }
  tiers: { id: string; label: string; title: string; copy: string }[]
  costsData: any
}

export default function SupportDashboard({
  supporterState,
  tiers,
  costsData,
}: Props) {
  return (
    <div className="mx-auto grid w-full max-w-screen-2xl gap-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Community-funded
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">
                Support the existence of the platform, not access to it.
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Reporting stays free for residents. Contributions help cover
                hosting, email delivery, routing data maintenance, and the work
                needed to keep the product dependable.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Live Stripe links</Badge>
            {supporterState.badgeLabel ? (
              <Badge variant="outline">{supporterState.badgeLabel}</Badge>
            ) : null}
            {supporterState.isSupporter && supporterState.latestContributionAt ? (
              <Badge variant="outline">
                Supporter since{" "}
                {formatPrettyDate(supporterState.latestContributionAt, {
                  includeTime: true,
                })}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Suggested tiers</CardTitle>
            <CardDescription>
              Pick a simple monthly tier to support the ongoing running cost of the service.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {tiers.map((tier) => (
              <Card key={tier.id}>
                <CardHeader>
                  <Badge variant="secondary">{tier.label}</Badge>
                  <CardTitle>{tier.title}</CardTitle>
                  <CardDescription>{tier.copy}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-4" />
                  <button
                    className={buttonVariants()}
                    data-support-tier={tier.id}
                    type="button"
                  >
                    Choose {tier.label}
                  </button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Support status</CardTitle>
            <CardDescription>
              Your current support state and supporter recognition for this account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <SignalTile
              title="Current badge"
              value={supporterState.badgeLabel ?? "No active supporter badge"}
            />
            <SignalTile
              title="Active support"
              value={supporterState.activeTierLabel ?? "No active support on this account"}
            />
            <SignalTile
              title="History"
              value={`${supporterState.history.length} contribution records on this account`}
            />
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
            <CardTitle>Manage support</CardTitle>
            <CardDescription>
              Contribution history is live. Self-serve recurring management still needs the Stripe customer portal.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {supporterState.manageUrl
                  ? "Open Stripe to update, change, or cancel your recurring support."
                  : supporterState.activeContributionType === "recurring"
                    ? "Recurring support is active, but direct update and cancellation links are not available in-app yet."
                    : "One-time support does not need a management link."}
              </p>
              <div className="flex flex-wrap gap-2">
                {supporterState.manageUrl ? (
                  <a
                    className={buttonVariants({ variant: "default" })}
                    href={supporterState.manageUrl}
                  >
                    {supporterState.manageLabel ?? "Manage support"}
                  </a>
                ) : null}
                <a
                  className={buttonVariants({ variant: "secondary" })}
                  href="/inside/changelog"
                >
                  Changelog
                </a>
                <a
                  className={buttonVariants({ variant: "secondary" })}
                  href="/inside/roadmap"
                >
                  Roadmap
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contribution history</CardTitle>
          <CardDescription>
            Recent supporter activity and current status on this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {supporterState.history.length ? (
            supporterState.history.map((item) => (
              <div
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4"
                key={item.supportContributionId}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{item.tierLabel}</div>
                    <Badge variant="outline">
                      {item.status.replaceAll("_", " ")}
                    </Badge>
                    <Badge variant="secondary">
                      {item.contributionType === "recurring"
                        ? "Recurring"
                        : "One-time"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    £{(item.amountMinor / 100).toFixed(2)} {item.currency}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatPrettyDate(item.createdAt, { includeTime: true })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No support history has been recorded on this account yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost baseline</CardTitle>
          <CardDescription>
            Live infrastructure assumptions from the transparency dataset.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {costsData.costs.map((item: any) => (
            <Card key={`${item.category}-${item.provider}`} size="sm">
              <CardHeader>
                <CardTitle>{item.category}</CardTitle>
                <CardDescription>{item.provider}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.notes}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">£{item.monthlyCost}/month</Badge>
                  <Badge variant="secondary">
                    {item.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SignalTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{value}</div>
    </div>
  )
}
