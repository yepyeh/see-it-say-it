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
                See It Say It is designed so reporting remains free.
                Contributions help cover hosting, email, routing data
                maintenance, and future accessibility work.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Live Stripe links</Badge>
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
              These tiers open the live Stripe Checkout links from the app.
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
              <CardTitle>Live transparency</CardTitle>
              <CardDescription>
                Current operating assumptions from the transparency dataset.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <SignalTile title="Operating model" value={costsData.operatingModel} />
              <SignalTile title="Currency" value={costsData.currency} />
              <SignalTile
                title="Updated"
                value={formatPrettyDate(costsData.updatedAt)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
              <CardDescription>
                Review progress and investor-facing project status.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
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
            </CardContent>
          </Card>
        </div>
      </div>

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
