import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
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
  userEmail: string
  notifications: any[]
  unreadCount: number
  preferences: {
    emailEnabled: boolean
    inAppEnabled: boolean
    pushEnabled: boolean
    digestMode: string
  }
  filteredNotifications: any[]
  latestUnread: any[]
  typeFilter: string | null
  unreadOnly: boolean
  typeCounts: Record<string, number>
}

const toneMap: Record<string, "default" | "secondary" | "outline"> = {
  status_changed: "secondary",
  resolution_published: "default",
  support_confirmed: "outline",
  authority_action: "secondary",
  routing_feedback: "outline",
  report_submitted: "outline",
}

export function NotificationsDashboard({
  userEmail,
  notifications,
  unreadCount,
  preferences,
  filteredNotifications,
  latestUnread,
  typeFilter,
  unreadOnly,
  typeCounts,
}: Props) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Communications
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">
                One inbox for report, authority, and support updates.
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Inbox and delivery preferences for {userEmail}.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{notifications.length} total</Badge>
            <Badge variant="outline">{unreadCount} unread</Badge>
            <Badge variant="secondary">
              {preferences.digestMode === "immediate"
                ? "Immediate delivery"
                : "Daily digest"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <a
            className={buttonVariants({ variant: "secondary" })}
            href="/notifications/digest-preview"
          >
            Preview digest
          </a>
          <Button data-email-digest type="button" variant="secondary">
            Email me this digest
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>
              Newest first, aligned with reports, support, and authority
              actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <a
                className={buttonVariants({
                  variant: !typeFilter && !unreadOnly ? "default" : "secondary",
                  size: "sm",
                })}
                href="/notifications"
              >
                All
              </a>
              <a
                className={buttonVariants({
                  variant: unreadOnly ? "default" : "secondary",
                  size: "sm",
                })}
                href={`/notifications?unread=1${typeFilter ? `&type=${typeFilter}` : ""}`}
              >
                Unread only
              </a>
              <a
                className={buttonVariants({
                  variant:
                    typeFilter === "status_changed" ? "default" : "secondary",
                  size: "sm",
                })}
                href="/notifications?type=status_changed"
              >
                Status ({typeCounts.status_changed})
              </a>
              <a
                className={buttonVariants({
                  variant:
                    typeFilter === "resolution_published"
                      ? "default"
                      : "secondary",
                  size: "sm",
                })}
                href="/notifications?type=resolution_published"
              >
                Resolution ({typeCounts.resolution_published})
              </a>
              <a
                className={buttonVariants({
                  variant:
                    typeFilter === "authority_action"
                      ? "default"
                      : "secondary",
                  size: "sm",
                })}
                href="/notifications?type=authority_action"
              >
                Authority ({typeCounts.authority_action})
              </a>
              <a
                className={buttonVariants({
                  variant:
                    typeFilter === "support_confirmed"
                      ? "default"
                      : "secondary",
                  size: "sm",
                })}
                href="/notifications?type=support_confirmed"
              >
                Support ({typeCounts.support_confirmed})
              </a>
            </div>

            {filteredNotifications.length ? (
              <div className="grid gap-3">
                {filteredNotifications.map((notification) => (
                  <Card key={notification.notificationId} size="sm">
                    <CardHeader className="gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle>{notification.title}</CardTitle>
                          <CardDescription>
                            {formatPrettyDate(notification.createdAt, {
                              includeTime: true,
                            })}
                          </CardDescription>
                        </div>
                        {!notification.readAt ? (
                          <Badge variant="secondary">Unread</Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={
                            toneMap[notification.notificationType] ?? "outline"
                          }
                        >
                          {notification.notificationType.replaceAll("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {notification.ctaPath ? (
                          <a
                            className={buttonVariants({
                              variant: "secondary",
                              size: "sm",
                            })}
                            href={notification.ctaPath}
                          >
                            Open
                          </a>
                        ) : null}
                        {!notification.readAt ? (
                          <Button
                            data-notification-read={notification.notificationId}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Mark read
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No notifications match the current filter. Report, support, and
                authority updates will appear here.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery mode</CardTitle>
              <CardDescription>
                Current preference state for this account.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <StatusTile title="Email" value={preferences.emailEnabled ? "Enabled" : "Off"} />
              <StatusTile
                title="In-app inbox"
                value={preferences.inAppEnabled ? "Enabled" : "Off"}
              />
              <StatusTile
                title="Push"
                value={
                  preferences.pushEnabled
                    ? "Enabled when delivery keys are configured"
                    : "Off"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Choose how fast updates should reach you and where they should
                appear.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" data-notification-preferences>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    className="size-4 accent-current"
                    name="emailEnabled"
                    type="checkbox"
                    defaultChecked={preferences.emailEnabled}
                  />
                  <span>Email notifications</span>
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    className="size-4 accent-current"
                    name="inAppEnabled"
                    type="checkbox"
                    defaultChecked={preferences.inAppEnabled}
                  />
                  <span>In-app inbox notifications</span>
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    className="size-4 accent-current"
                    name="pushEnabled"
                    type="checkbox"
                    defaultChecked={preferences.pushEnabled}
                  />
                  <span>Push notifications</span>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Delivery timing</span>
                  <select
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                    defaultValue={preferences.digestMode}
                    name="digestMode"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily_digest">Daily digest</option>
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Save preferences</Button>
                  <Button data-mark-all-read type="button" variant="secondary">
                    Mark all read
                  </Button>
                </div>
                <p
                  className="text-sm text-muted-foreground"
                  data-notification-feedback
                />
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest unread</CardTitle>
              <CardDescription>
                The next few items competing for attention right now.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestUnread.length ? (
                latestUnread.map((notification) => (
                  <div
                    className="rounded-xl border border-border bg-muted/40 p-4"
                    key={notification.notificationId}
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{notification.title}</div>
                      <p className="text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {formatPrettyDate(notification.createdAt, {
                          includeTime: true,
                        })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Everything is read. New report, authority, and support events
                  will appear here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatusTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{value}</div>
    </div>
  )
}
