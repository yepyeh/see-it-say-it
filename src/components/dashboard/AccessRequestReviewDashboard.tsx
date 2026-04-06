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
  applicantEmail: string
  applicantName: string | null
  reviewedByName: string | null
  createdAt: string
  reviewedAt: string | null
}

type ManagedRole = {
  userRoleId: string
  userId: string
  displayName: string | null
  email: string
  role: "warden" | "moderator"
  authorityCode: string | null
  authorityName: string | null
  assignedAt: string
}

type AuthorityOption = {
  authorityCode: string
  authorityName: string
}

type Props = {
  pending: AccessRequest[]
  recent: AccessRequest[]
  activeRoles: ManagedRole[]
  authorities: AuthorityOption[]
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

export function AccessRequestReviewDashboard({ pending, recent, activeRoles, authorities }: Props) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending access requests</CardTitle>
            <CardDescription>
              Review new authority and warden applications before operational roles are granted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.length ? (
              pending.map((request) => (
                <Card key={request.requestId} size="sm">
                  <CardHeader className="gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle>
                          {request.applicantName?.trim() || request.applicantEmail}
                        </CardTitle>
                        <CardDescription>{request.applicantEmail}</CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {requestLabels[request.requestType]}
                        </Badge>
                        <Badge variant="outline">{request.requestedRole}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Authority:</span>{" "}
                        {request.authorityName ?? request.authorityCode ?? "Not provided"}
                      </div>
                      {request.organization ? (
                        <div>
                          <span className="font-medium text-foreground">Organisation:</span>{" "}
                          {request.organization}
                        </div>
                      ) : null}
                      {request.teamName ? (
                        <div>
                          <span className="font-medium text-foreground">Team:</span>{" "}
                          {request.teamName}
                        </div>
                      ) : null}
                      {request.workEmail ? (
                        <div>
                          <span className="font-medium text-foreground">Work email:</span>{" "}
                          {request.workEmail}
                        </div>
                      ) : null}
                      <div>
                        <span className="font-medium text-foreground">Submitted:</span>{" "}
                        {formatPrettyDate(request.createdAt, { includeTime: true })}
                      </div>
                    </div>
                    {request.notes ? (
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        {request.notes}
                      </div>
                    ) : null}
                    <form className="grid gap-3" data-access-review-form data-request-id={request.requestId}>
                      <Textarea
                        data-review-notes
                        name="reviewNotes"
                        placeholder="Decision notes for the applicant or internal admin context."
                        rows={3}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button data-review-status="approved" size="sm" type="button">
                          Approve
                        </Button>
                        <Button
                          data-review-status="rejected"
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          Reject
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground" data-review-feedback />
                    </form>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No pending access requests right now.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active authority access</CardTitle>
            <CardDescription>
              Revoke, downgrade, or re-scope live warden and moderator access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <datalist id="authority-role-codes">
              {authorities.map((authority) => (
                <option key={authority.authorityCode} value={authority.authorityCode}>
                  {authority.authorityName}
                </option>
              ))}
            </datalist>
            {activeRoles.length ? (
              activeRoles.map((managedRole) => (
                <Card key={managedRole.userRoleId} size="sm">
                  <CardHeader className="gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle>
                          {managedRole.displayName?.trim() || managedRole.email}
                        </CardTitle>
                        <CardDescription>{managedRole.email}</CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{managedRole.role}</Badge>
                        <Badge variant="secondary">
                          {managedRole.authorityName ?? managedRole.authorityCode ?? "Authority pending"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Assigned {formatPrettyDate(managedRole.assignedAt, { includeTime: true })}
                    </div>
                    <form
                      className="grid gap-3"
                      data-role-management-form
                      data-user-role-id={managedRole.userRoleId}
                    >
                      <div className="grid gap-3 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                        <label className="grid gap-2 text-sm">
                          <span className="font-medium text-foreground">Role</span>
                          <select
                            className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
                            data-role-name
                            defaultValue={managedRole.role}
                            name="role"
                          >
                            <option value="warden">warden</option>
                            <option value="moderator">moderator</option>
                          </select>
                        </label>
                        <label className="grid gap-2 text-sm">
                          <span className="font-medium text-foreground">Authority</span>
                          <Input
                            data-role-authority
                            defaultValue={managedRole.authorityCode ?? ""}
                            list="authority-role-codes"
                            name="authorityCode"
                            type="text"
                          />
                        </label>
                      </div>
                      <Textarea
                        data-role-notes
                        name="notes"
                        placeholder="Optional note for the user about this access change."
                        rows={2}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button data-role-action="update" size="sm" type="button">
                          Save access
                        </Button>
                        <Button data-role-action="revoke" size="sm" type="button" variant="secondary">
                          Revoke access
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground" data-role-feedback />
                    </form>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No active authority roles beyond admin right now.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent decisions</CardTitle>
            <CardDescription>
              Latest approved and rejected access requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recent.length ? (
              recent.map((request) => (
                <div
                  className="rounded-xl border bg-muted/30 p-4"
                  key={request.requestId}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {request.applicantName?.trim() || request.applicantEmail}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.authorityName ?? request.authorityCode ?? "Authority pending"}
                      </div>
                    </div>
                    <Badge variant={statusTone[request.status]}>{request.status}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <div>{requestLabels[request.requestType]} · {request.requestedRole}</div>
                    {request.reviewNotes ? <div>Note: {request.reviewNotes}</div> : null}
                    {request.reviewedByName ? <div>Reviewed by {request.reviewedByName}</div> : null}
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
                No reviewed access requests yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why review matters</CardTitle>
            <CardDescription>
              Operational roles affect public trust and visible authority actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Applicants should be tied to a real authority or genuine local stewardship context.</p>
            <p>Approvals write directly into the live role model, so the review queue is the control point.</p>
            <a className={buttonVariants({ size: "sm", variant: "secondary" })} href="/authority">
              Back to authority queue
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
