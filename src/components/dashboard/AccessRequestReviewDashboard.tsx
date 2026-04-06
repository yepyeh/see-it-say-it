import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

type Props = {
  pending: AccessRequest[]
  recent: AccessRequest[]
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

export function AccessRequestReviewDashboard({ pending, recent }: Props) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)]">
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
