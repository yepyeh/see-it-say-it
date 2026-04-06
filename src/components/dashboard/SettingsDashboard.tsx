import * as React from "react"
import { Bell, LocateFixed, MoonStar, Palette, SunMedium } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type NotificationPreferences = {
  emailEnabled: boolean
  inAppEnabled: boolean
  pushEnabled: boolean
  digestMode: "immediate" | "daily_digest"
}

type Props = {
  isSignedIn: boolean
  userEmail?: string | null
  initialProfile?: {
    displayName: string | null
    handle: string | null
    bio: string | null
    profileVisibility: "public" | "community" | "private"
    homeAuthorityCode: string | null
  } | null
  initialPreferences?: NotificationPreferences | null
  vapidPublicKey?: string
}

export default function SettingsDashboard({
  isSignedIn,
  userEmail,
  initialProfile,
  initialPreferences,
  vapidPublicKey = "",
}: Props) {
  const [displayName, setDisplayName] = React.useState(initialProfile?.displayName ?? "")
  const [handle, setHandle] = React.useState(initialProfile?.handle ?? "")
  const [bio, setBio] = React.useState(initialProfile?.bio ?? "")
  const [profileVisibility, setProfileVisibility] = React.useState<
    "public" | "community" | "private"
  >(initialProfile?.profileVisibility ?? "community")
  const [homeAuthorityCode, setHomeAuthorityCode] = React.useState(
    initialProfile?.homeAuthorityCode ?? ""
  )
  const [theme, setTheme] = React.useState(() => {
    if (typeof window === "undefined") return "system"
    return window.localStorage.getItem("sis:theme") ?? "system"
  })
  const [density, setDensity] = React.useState(() => {
    if (typeof window === "undefined") return "comfy"
    return window.localStorage.getItem("sis:density") ?? "comfy"
  })
  const [status, setStatus] = React.useState("")
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(
    initialPreferences ?? {
      emailEnabled: true,
      inAppEnabled: true,
      pushEnabled: false,
      digestMode: "immediate",
    }
  )

  const applyTheme = React.useCallback((value: string) => {
    const resolved =
      value === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : value
    document.documentElement.dataset.theme = resolved
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }, [])

  React.useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])

  React.useEffect(() => {
    applyTheme(theme)
  }, [applyTheme, theme])

  const saveLocalPreferences = (nextTheme: string, nextDensity: string) => {
    window.localStorage.setItem("sis:theme", nextTheme)
    window.localStorage.setItem("sis:density", nextDensity)
    setStatus("Appearance preferences saved.")
  }

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Location is not available on this device.")
      return
    }
    setStatus("Requesting location permission...")
    navigator.geolocation.getCurrentPosition(
      () => setStatus("Location enabled."),
      () => setStatus("Location permission was not granted."),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const toUint8Array = (base64: string) => {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4)
    const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
    const binary = atob(normalized)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  }

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setStatus("Notifications are not supported on this device.")
      return
    }
    const result = await Notification.requestPermission()
    if (result !== "granted") {
      setStatus("Notifications permission was not granted.")
      return
    }
    window.localStorage.setItem("sis:notifications-opted-in", "1")
    if (!vapidPublicKey) {
      setStatus(
        "Notifications enabled. Push delivery will activate once the VAPID public key is configured."
      )
      return
    }
    if (!("serviceWorker" in navigator)) {
      setStatus("Service workers are not supported on this device.")
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toUint8Array(vapidPublicKey),
        }))

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription),
      })
      const payload = await response.json()
      if (!response.ok) {
        setStatus(payload.error ?? "Unable to register push notifications.")
        return
      }
      setPreferences((current) => ({ ...current, pushEnabled: true }))
      setStatus("Notifications enabled for this device.")
    } catch {
      setStatus(
        "Notifications permission is granted, but device subscription could not be completed."
      )
    }
  }

  const saveNotificationPreferences = async () => {
    if (!isSignedIn) {
      setStatus("Sign in first to save communication preferences.")
      return
    }
    setStatus("Saving communication preferences...")
    const response = await fetch("/api/notifications/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(preferences),
    })
    const payload = await response.json()
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to save preferences.")
      return
    }
    setStatus("Communication preferences saved.")
  }

  const saveProfile = async () => {
    if (!isSignedIn) {
      setStatus("Sign in first to save your profile.")
      return
    }
    setStatus("Saving profile...")
    const response = await fetch("/api/account/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName,
        handle,
        bio,
        profileVisibility,
        homeAuthorityCode,
      }),
    })
    const payload = await response.json()
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to save profile.")
      return
    }
    setStatus("Profile saved.")
  }

  return (
    <div className="mx-auto grid w-full max-w-screen-2xl gap-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Preferences
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">
                Tune the app once, then keep reporting fast.
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {isSignedIn && userEmail
                  ? `Settings for ${userEmail}. Appearance saves to this device, and communication preferences save to your account.`
                  : "Appearance saves to this device. Sign in if you also want to save communication preferences to your account."}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Shadcn settings</Badge>
            <Badge variant="outline">
              {isSignedIn ? "Account-linked" : "Device-only"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Public profile</CardTitle>
              <CardDescription>
                Control how your contributions appear to residents and to authority teams.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field>
                <FieldLabel htmlFor="settings-display-name">Full name</FieldLabel>
                <Input
                  id="settings-display-name"
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Steven Ellis"
                  value={displayName}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-handle">Public handle</FieldLabel>
                <Input
                  id="settings-handle"
                  onChange={(event) =>
                    setHandle(
                      event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  placeholder="steven-ellis"
                  value={handle}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-visibility">
                  Profile visibility
                </FieldLabel>
                <select
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  id="settings-visibility"
                  onChange={(event) =>
                    setProfileVisibility(
                      event.target.value as "public" | "community" | "private"
                    )
                  }
                  value={profileVisibility}
                >
                  <option value="public">Public profile</option>
                  <option value="community">Show my name on reports</option>
                  <option value="private">Keep me private</option>
                </select>
                <FieldDescription>
                  Public profiles get a shareable contribution page. Community visibility keeps your name on reports without a public profile page.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-home-authority">
                  Home authority code
                </FieldLabel>
                <Input
                  id="settings-home-authority"
                  onChange={(event) => setHomeAuthorityCode(event.target.value.trim())}
                  placeholder="bristol-city-council"
                  value={homeAuthorityCode}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-bio">Short bio</FieldLabel>
                <Textarea
                  id="settings-bio"
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Resident interested in safer streets, cleaner parks, and useful public reporting."
                  rows={4}
                  value={bio}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveProfile} type="button">
                  Save profile
                </Button>
                {handle && profileVisibility === "public" ? (
                  <a
                    className={buttonVariants({ variant: "secondary" })}
                    href={`/people/${handle}`}
                  >
                    View public profile
                  </a>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="size-4 text-muted-foreground" />
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>
                Keep the interface readable and predictable across the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                <div className="text-sm font-medium">Theme</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["system", "System", Palette],
                    ["light", "Light", SunMedium],
                    ["dark", "Dark", MoonStar],
                  ].map(([value, label, Icon]) => (
                    <Button
                      key={value}
                      onClick={() => {
                        setTheme(value)
                        saveLocalPreferences(value, density)
                      }}
                      type="button"
                      variant={theme === value ? "default" : "secondary"}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="text-sm font-medium">Density</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["comfy", "Comfy"],
                    ["compact", "Compact"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      onClick={() => {
                        setDensity(value)
                        saveLocalPreferences(theme, value)
                      }}
                      type="button"
                      variant={density === value ? "default" : "secondary"}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-muted-foreground" />
                <CardTitle>Communication preferences</CardTitle>
              </div>
              <CardDescription>
                Choose what reaches you by email, inbox, and later push.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <PreferenceRow
                checked={preferences.emailEnabled}
                description="Receive OTP, report, resolution, and support updates by email."
                label="Email notifications"
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    emailEnabled: checked,
                  }))
                }
              />
              <PreferenceRow
                checked={preferences.inAppEnabled}
                description="Keep a persistent inbox inside the product."
                label="In-app inbox"
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    inAppEnabled: checked,
                  }))
                }
              />
              <PreferenceRow
                checked={preferences.pushEnabled}
                description="Reserve this for device notifications once delivery keys are active."
                label="Push notifications"
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    pushEnabled: checked,
                  }))
                }
              />

              <div className="grid gap-2">
                <div className="text-sm font-medium">Delivery timing</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      setPreferences((current) => ({
                        ...current,
                        digestMode: "immediate",
                      }))
                    }
                    type="button"
                    variant={
                      preferences.digestMode === "immediate"
                        ? "default"
                        : "secondary"
                    }
                  >
                    Immediate
                  </Button>
                  <Button
                    onClick={() =>
                      setPreferences((current) => ({
                        ...current,
                        digestMode: "daily_digest",
                      }))
                    }
                    type="button"
                    variant={
                      preferences.digestMode === "daily_digest"
                        ? "default"
                        : "secondary"
                    }
                  >
                    Daily digest
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={saveNotificationPreferences} type="button">
                  Save communication preferences
                </Button>
                <Button
                  onClick={requestNotifications}
                  type="button"
                  variant="secondary"
                >
                  Enable notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LocateFixed className="size-4 text-muted-foreground" />
                <CardTitle>Permissions</CardTitle>
              </div>
              <CardDescription>
                Grant the device features the reporting flow actually uses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="font-medium">Location</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Used to place the pin and route reports to the right authority.
                </p>
                <div className="mt-3">
                  <Button onClick={requestLocation} type="button" variant="secondary">
                    Enable location
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="font-medium">Notifications</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Used for status updates and watched-area alerts once push is fully enabled.
                </p>
                <div className="mt-3">
                  <Button
                    onClick={requestNotifications}
                    type="button"
                    variant="secondary"
                  >
                    Enable notifications
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
              <CardDescription>
                Jump back into the product after changing settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <a className={buttonVariants()} href="/report">
                Open report flow
              </a>
              <a
                className={buttonVariants({ variant: "secondary" })}
                href="/my-reports"
              >
                My reports
              </a>
              <a
                className={buttonVariants({ variant: "secondary" })}
                href="/notifications"
              >
                Inbox
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  )
}

function PreferenceRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <input
        checked={checked}
        className="mt-0.5 size-4 accent-current"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <div className="space-y-1">
        <div className="text-sm font-medium">{label}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </label>
  )
}
