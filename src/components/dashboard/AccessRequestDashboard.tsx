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
import { formatPrettyDate } from "@/lib/utils"

type AccessRequest = {
  requestId: string
  requestType: "authority_access" | "warden_application"
  requestedRole: "warden" | "moderator"
  authorityName: string | null
  authorityCode: string | null
  organization: string | null
  teamName: string | null
  workEmail: string | null
  notes: string | null
  status: "pending" | "approved" | "rejected"
  reviewNotes: string | null
  createdAt: string
  reviewedAt: string | null
}

type AuthorityOption = {
  code: string
  name: string
}

type Props = {
  currentUser: {
    email: string
    displayName: string | null
  }
  authorities: AuthorityOption[]
  requests: AccessRequest[]
}

const requestLabels = {
  authority_access: "Authority access",
  warden_application: "Warden application",
} as const

const statusTone = {
  pending: "secondary",
  approved: "default",
  rejected: "outline",
} as const

export function AccessRequestDashboard({
  currentUser,
  authorities,
  requests,
}: Props) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.95fr)]">
      <Card>
        <CardHeader>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Reviewed access
          </div>
          <CardTitle className="text-3xl tracking-tight">
            Apply for authority or warden access.
          </CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-6">
            Resident signup stays open. Operational roles are application-based
            and reviewed by a platform admin before they are added to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-4" data-access-request-form>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Request type</span>
              <select
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                defaultValue="authority_access"
                name="requestType"
              >
                <option value="authority_access">Authority access</option>
                <option value="warden_application">Apply to be a local warden</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium">Requested role</span>
              <select
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                defaultValue="warden"
                name="requestedRole"
              >
                <option value="warden">Warden</option>
                <option value="moderator">Moderator</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium">Authority</span>
              <select
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                defaultValue=""
                name="authorityCode"
              >
                <option value="">Choose an authority</option>
                {authorities.map((authority) => (
                  <option key={authority.code} value={authority.code}>
                    {authority.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Organisation</span>
                <Input
                  defaultValue=""
                  name="organization"
                  placeholder="Bristol City Council"
                  type="text"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Team or department</span>
                <Input
                  defaultValue=""
                  name="teamName"
                  placeholder="Highways, waste, neighbourhood operations"
                  type="text"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium">Work email</span>
              <Input
                defaultValue={currentUser.email}
                name="workEmail"
                placeholder="name@council.gov.uk"
                type="email"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium">Why do you need access?</span>
              <Textarea
                name="notes"
                placeholder="Describe your role, your connection to the authority or area, and what actions you need to take in the platform."
                rows={5}
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit">Submit request</Button>
              <a
                className={buttonVariants({ variant: "secondary" })}
                href="/authority"
              >
                Back to authority page
              </a>
            </div>
            <p
              className="text-sm text-muted-foreground"
              data-access-request-feedback
            />
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your requests</CardTitle>
            <CardDescription>
              Recent access requests linked to your signed-in account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.length ? (
              requests.map((request) => (
                <div
                  className="rounded-xl border bg-muted/30 p-4"
                  key={request.requestId}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {requestLabels[request.requestType]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.authorityName ?? request.authorityCode ?? "Authority pending"}
                      </div>
                    </div>
                    <Badge variant={statusTone[request.status]}>
                      {request.status}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <div>Role requested: {request.requestedRole}</div>
                    {request.organization ? <div>{request.organization}</div> : null}
                    {request.teamName ? <div>{request.teamName}</div> : null}
                    <div>
                      Submitted{" "}
                      {formatPrettyDate(request.createdAt, { includeTime: true })}
                    </div>
                    {request.reviewNotes ? <div>Review note: {request.reviewNotes}</div> : null}
                    {request.reviewedAt ? (
                      <div>
                        Reviewed{" "}
                        {formatPrettyDate(request.reviewedAt, { includeTime: true })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No access requests submitted yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How review works</CardTitle>
            <CardDescription>
              This keeps operational actions trusted instead of self-assigned.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Admins review authority and warden requests manually.</p>
            <p>Work-email and authority context are used to verify credibility.</p>
            <p>Approved roles are added to your existing account, not split into a second login.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
