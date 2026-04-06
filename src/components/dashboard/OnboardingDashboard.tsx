"use client"

import * as React from "react"
import {
  Bell,
  Camera,
  CheckCircle2,
  LocateFixed,
  MoonStar,
  Palette,
  ShieldCheck,
  SunMedium,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type NotificationPreferences = {
  emailEnabled: boolean
  inAppEnabled: boolean
  pushEnabled: boolean
  digestMode: "immediate" | "daily_digest"
}

type Props = {
  isSignedIn: boolean
  initialDisplayName?: string | null
  initialProfile?: {
    handle: string | null
    bio: string | null
    profileVisibility: "public" | "community" | "private"
    homeAuthorityCode: string | null
  } | null
  initialPreferences?: NotificationPreferences | null
  next?: string
  vapidPublicKey?: string
}

type Step = {
  id: string
  title: string
  copy: string
}

export default function OnboardingDashboard({
  isSignedIn,
  initialDisplayName,
  initialProfile,
  initialPreferences,
  next = "/report",
  vapidPublicKey = "",
}: Props) {
  const [stepIndex, setStepIndex] = React.useState(0)
  const [displayName, setDisplayName] = React.useState(initialDisplayName ?? "")
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

  const steps = React.useMemo<Step[]>(() => {
    const base: Step[] = [
      {
        id: "intro",
        title: "See an issue. Route it properly.",
        copy: "Keep the first run simple, then tune permissions and preferences for your device.",
      },
      ...(isSignedIn
        ? [
            {
              id: "profile",
              title: "Profile basics",
              copy: "Add the name you want attached to your reports and updates.",
            } satisfies Step,
          ]
        : []),
      {
        id: "permissions",
        title: "Permissions",
        copy: "Location, camera, and notifications keep the reporting flow fast once you need them.",
      },
      {
        id: "appearance",
        title: "Appearance and density",
        copy: "Make the interface readable and predictable before you start using it in the field.",
      },
    ]

    if (isSignedIn) {
      base.push({
        id: "communications",
        title: "Communication preferences",
        copy: "Decide how updates should reach you before the first real report lands in your inbox.",
      })
    }

    base.push({
      id: "ready",
      title: "Ready to go",
      copy: "The live reporting flow is already map-backed and tied to your preferences.",
    })

    return base
  }, [isSignedIn])

  const currentStep = steps[stepIndex]

  React.useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])

  React.useEffect(() => {
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme
    document.documentElement.dataset.theme = resolved
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }, [theme])

  const saveAppearance = (nextTheme: string, nextDensity: string) => {
    window.localStorage.setItem("sis:theme", nextTheme)
    window.localStorage.setItem("sis:density", nextDensity)
    setStatus("Appearance preferences saved.")
  }

  const saveProfile = async () => {
    if (!isSignedIn) return true
    if (!displayName.trim()) {
      setStatus("Add your full name before continuing.")
      return false
    }
    const initialHandle = initialProfile?.handle ?? ""
    const initialBio = initialProfile?.bio ?? ""
    const initialVisibility = initialProfile?.profileVisibility ?? "community"
    const initialHomeAuthorityCode = initialProfile?.homeAuthorityCode ?? ""
    if (
      displayName.trim() === (initialDisplayName ?? "").trim() &&
      handle.trim() === initialHandle &&
      bio.trim() === initialBio &&
      profileVisibility === initialVisibility &&
      homeAuthorityCode.trim() === initialHomeAuthorityCode
    ) {
      return true
    }
    setStatus("Saving your profile...")
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
      setStatus(payload.error ?? "Unable to save your name.")
      return false
    }
    setStatus("Profile saved.")
    return true
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

  const saveCommunicationPreferences = async () => {
    if (!isSignedIn) return
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

  const handleNext = async () => {
    if (currentStep.id === "profile") {
      const ok = await saveProfile()
      if (!ok) return
    }

    if (currentStep.id === "communications") {
      await saveCommunicationPreferences()
    }

    if (stepIndex === steps.length - 1) {
      window.location.href = next
      return
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  return (
    <div className="mx-auto grid w-full max-w-screen-2xl gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="grid gap-6">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  First-run setup
                </div>
                <CardTitle className="text-3xl tracking-tight">
                  {currentStep.title}
                </CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6">
                  {currentStep.copy}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Step {stepIndex + 1} of {steps.length}
                </Badge>
                <a
                  className={buttonVariants({ variant: "secondary" })}
                  href="/"
                >
                  Skip for now
                </a>
              </div>
            </div>
            <Progress value={((stepIndex + 1) / steps.length) * 100} />
          </CardHeader>
        </Card>

        {currentStep.id === "intro" ? (
          <Card>
            <CardContent className="grid gap-6 pt-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">UK-first</Badge>
                <Badge variant="outline">5-step setup</Badge>
                <Badge variant="outline">Report in under a minute</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Map-led routing",
                    copy: "Location stays connected to the correct authority from the first pin placement.",
                  },
                  {
                    title: "One account",
                    copy: "The same session works across reports, inbox, and authority surfaces.",
                  },
                  {
                    title: "Transparent progress",
                    copy: "Roadmap and changelog stay visible for supporters and investors.",
                  },
                ].map((item) => (
                  <div
                    className="rounded-xl border border-border bg-muted/40 p-4"
                    key={item.title}
                  >
                    <div className="text-sm font-medium">{item.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {currentStep.id === "profile" ? (
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <Field>
                <FieldLabel htmlFor="onboarding-display-name">Full name</FieldLabel>
                <Input
                  id="onboarding-display-name"
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Steven Ellis"
                  type="text"
                  value={displayName}
                />
                <FieldDescription>
                  This name appears on your reports and notification summaries.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="onboarding-handle">Public handle</FieldLabel>
                <Input
                  id="onboarding-handle"
                  onChange={(event) =>
                    setHandle(
                      event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  placeholder="steven-ellis"
                  type="text"
                  value={handle}
                />
                <FieldDescription>
                  Used for your public profile URL if you choose a public profile.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="onboarding-visibility">Profile visibility</FieldLabel>
                <Select
                  onValueChange={(value) =>
                    setProfileVisibility(
                      value as "public" | "community" | "private"
                    )
                  }
                  value={profileVisibility}
                >
                  <SelectTrigger id="onboarding-visibility">
                    <SelectValue placeholder="Choose visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public profile</SelectItem>
                    <SelectItem value="community">
                      Show my name on reports
                    </SelectItem>
                    <SelectItem value="private">Keep me private</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="onboarding-home-authority">
                  Home authority code
                </FieldLabel>
                <Input
                  id="onboarding-home-authority"
                  onChange={(event) => setHomeAuthorityCode(event.target.value.trim())}
                  placeholder="bristol-city-council"
                  type="text"
                  value={homeAuthorityCode}
                />
                <FieldDescription>
                  Optional. Helps tie your public profile to the council area you most often contribute to.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="onboarding-bio">Short bio</FieldLabel>
                <Textarea
                  id="onboarding-bio"
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Resident interested in accessibility, street safety, and cleaner public space."
                  rows={4}
                  value={bio}
                />
                <FieldDescription>
                  Optional. Keep it brief and civic-facing.
                </FieldDescription>
              </Field>
            </CardContent>
          </Card>
        ) : null}

        {currentStep.id === "permissions" ? (
          <Card>
            <CardContent className="grid gap-4 pt-6">
              {[
                {
                  title: "Location",
                  copy: "Used to place the pin and route reports to the correct UK authority.",
                  icon: LocateFixed,
                  action: (
                    <Button onClick={requestLocation} type="button" variant="secondary">
                      Enable location
                    </Button>
                  ),
                },
                {
                  title: "Camera",
                  copy: "Used for fast evidence capture before the user enters details.",
                  icon: Camera,
                  action: (
                    <Button type="button" variant="secondary">
                      Camera from browser
                    </Button>
                  ),
                },
                {
                  title: "Notifications",
                  copy: "Reserved for status updates and future watched-area alerts.",
                  icon: Bell,
                  action: (
                    <Button
                      onClick={() => void requestNotifications()}
                      type="button"
                      variant="secondary"
                    >
                      Enable notifications
                    </Button>
                  ),
                },
              ].map((item) => (
                <div
                  className="flex flex-col gap-4 rounded-xl border border-border p-4 md:flex-row md:items-start md:justify-between"
                  key={item.title}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <item.icon className="size-4 text-muted-foreground" />
                      {item.title}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.copy}</p>
                  </div>
                  {item.action}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {currentStep.id === "appearance" ? (
          <Card>
            <CardContent className="grid gap-6 pt-6">
              <Field>
                <FieldLabel>Theme</FieldLabel>
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
                        saveAppearance(value, density)
                      }}
                      type="button"
                      variant={theme === value ? "default" : "secondary"}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </Field>

              <Field>
                <FieldLabel>Density</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["comfy", "Comfy"],
                    ["compact", "Compact"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      onClick={() => {
                        setDensity(value)
                        saveAppearance(theme, value)
                      }}
                      type="button"
                      variant={density === value ? "default" : "secondary"}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </Field>
            </CardContent>
          </Card>
        ) : null}

        {currentStep.id === "communications" ? (
          <Card>
            <CardContent className="grid gap-6 pt-6">
              <div className="grid gap-4">
                <Field className="flex flex-row items-start gap-3">
                  <Checkbox
                    checked={preferences.emailEnabled}
                    onCheckedChange={(checked) =>
                      setPreferences((current) => ({
                        ...current,
                        emailEnabled: Boolean(checked),
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <FieldLabel>Email notifications</FieldLabel>
                    <FieldDescription>
                      OTP codes, report status changes, and support confirmations.
                    </FieldDescription>
                  </div>
                </Field>

                <Field className="flex flex-row items-start gap-3">
                  <Checkbox
                    checked={preferences.inAppEnabled}
                    onCheckedChange={(checked) =>
                      setPreferences((current) => ({
                        ...current,
                        inAppEnabled: Boolean(checked),
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <FieldLabel>In-app inbox</FieldLabel>
                    <FieldDescription>
                      Keep communication events visible inside the product.
                    </FieldDescription>
                  </div>
                </Field>

                <Field className="flex flex-row items-start gap-3">
                  <Checkbox
                    checked={preferences.pushEnabled}
                    onCheckedChange={(checked) =>
                      setPreferences((current) => ({
                        ...current,
                        pushEnabled: Boolean(checked),
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <FieldLabel>Push notifications</FieldLabel>
                    <FieldDescription>
                      Device alerts for status changes and watched-area updates.
                    </FieldDescription>
                  </div>
                </Field>
              </div>

              <Field className="grid gap-2">
                <FieldLabel>Delivery timing</FieldLabel>
                <Select
                  onValueChange={(value: "immediate" | "daily_digest") =>
                    setPreferences((current) => ({
                      ...current,
                      digestMode: value,
                    }))
                  }
                  value={preferences.digestMode}
                >
                  <SelectTrigger className="w-full justify-between">
                    <SelectValue placeholder="Choose timing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily_digest">Daily digest</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>
        ) : null}

        {currentStep.id === "ready" ? (
          <Card>
            <CardContent className="grid gap-4 pt-6">
              {[
                "No ads, no tracking beyond what routing needs.",
                "Roadmap and changelog stay visible for supporters and investors.",
                "The next step is the live report flow with map-backed routing already enabled.",
              ].map((copy) => (
                <div
                  className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4"
                  key={copy}
                >
                  <CheckCircle2 className="mt-0.5 size-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{copy}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">{status}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                type="button"
                variant="secondary"
              >
                Back
              </Button>
              <Button onClick={() => void handleNext()} type="button">
                {stepIndex === steps.length - 1 ? "Start reporting" : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <CardTitle>Setup checklist</CardTitle>
            </div>
            <CardDescription>
              Use the same dashboard rhythm you will see across the rest of the
              product.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {steps.map((step, index) => (
              <div
                className="rounded-xl border border-border p-4"
                key={step.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{step.title}</div>
                  <Badge variant={index <= stepIndex ? "secondary" : "outline"}>
                    {index < stepIndex ? "Done" : index === stepIndex ? "Current" : "Next"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{step.copy}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
