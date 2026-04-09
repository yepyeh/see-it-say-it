"use client"

import * as React from "react"
import { RefreshCwIcon, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

type Props = {
  next: string
  turnstileSiteKey?: string
}

type AuthStep = "request" | "verify"

declare global {
  interface Window {
    turnstile?: {
      render: (target: HTMLElement, options: Record<string, unknown>) => string
      getResponse: (widgetId?: string) => string
      reset: (widgetId?: string) => void
      remove?: (widgetId?: string) => void
    }
  }
}

const OTP_LENGTH = 6

export default function AuthDashboard({
  next,
  turnstileSiteKey = "",
}: Props) {
  const [step, setStep] = React.useState<AuthStep>("request")
  const [email, setEmail] = React.useState("")
  const [otp, setOtp] = React.useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [requestStatus, setRequestStatus] = React.useState("")
  const [verifyStatus, setVerifyStatus] = React.useState("")
  const [requestLoading, setRequestLoading] = React.useState(false)
  const [verifyLoading, setVerifyLoading] = React.useState(false)
  const requestTurnstileRef = React.useRef<HTMLDivElement | null>(null)
  const verifyTurnstileRef = React.useRef<HTMLDivElement | null>(null)
  const requestWidgetIdRef = React.useRef<string | null>(null)
  const verifyWidgetIdRef = React.useRef<string | null>(null)
  const otpRefs = React.useRef<Array<HTMLInputElement | null>>([])
  const emailInputRef = React.useRef<HTMLInputElement | null>(null)

  const resolvedOtp = otp.join("")

  const mountTurnstile = React.useCallback(
    (
      container: HTMLDivElement | null,
      widgetIdRef: React.MutableRefObject<string | null>
    ) => {
      if (!turnstileSiteKey || !container) return

      let cancelled = false

      const renderWidget = () => {
        if (
          cancelled ||
          widgetIdRef.current ||
          !window.turnstile ||
          !container
        ) {
          return
        }

        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: turnstileSiteKey,
          theme: "auto",
        })
      }

      renderWidget()
      const timer = window.setInterval(() => {
        if (widgetIdRef.current) {
          window.clearInterval(timer)
          return
        }
        renderWidget()
      }, 250)

      return () => {
        cancelled = true
        window.clearInterval(timer)
        if (widgetIdRef.current && window.turnstile) {
          if (typeof window.turnstile.remove === "function") {
            window.turnstile.remove(widgetIdRef.current)
          } else {
            window.turnstile.reset(widgetIdRef.current)
          }
          widgetIdRef.current = null
        }
      }
    },
    [turnstileSiteKey]
  )

  React.useEffect(() => {
    if (step !== "request") return
    return mountTurnstile(requestTurnstileRef.current, requestWidgetIdRef)
  }, [mountTurnstile, step])

  React.useEffect(() => {
    if (step !== "verify") return
    return mountTurnstile(verifyTurnstileRef.current, verifyWidgetIdRef)
  }, [mountTurnstile, step])

  React.useEffect(() => {
    if (step !== "request") return
    window.setTimeout(() => emailInputRef.current?.focus(), 0)
  }, [step])

  const getTurnstileToken = (widgetIdRef: React.MutableRefObject<string | null>) => {
    if (!turnstileSiteKey || !widgetIdRef.current || !window.turnstile) return ""
    return window.turnstile.getResponse(widgetIdRef.current) ?? ""
  }

  const resetTurnstile = (widgetIdRef: React.MutableRefObject<string | null>) => {
    if (!turnstileSiteKey || !widgetIdRef.current || !window.turnstile) return
    window.turnstile.reset(widgetIdRef.current)
  }

  const sendOtpRequest = async ({
    resend = false,
  }: {
    resend?: boolean
  } = {}) => {
    if (!email) {
      setRequestStatus("Enter an email address first.")
      return
    }

    setRequestLoading(true)
    setRequestStatus(resend ? "" : "Sending sign-in code...")
    setVerifyStatus(resend ? "Sending a fresh code..." : "")

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          turnstileToken: getTurnstileToken(requestWidgetIdRef),
        }),
      })
      const payload = await response.json().catch(() => ({
        error: "The server returned an unreadable response while sending your sign-in code.",
      }))

      if (!response.ok) {
        const message = payload.error ?? "Unable to send sign-in code."
        if (step === "verify") {
          setVerifyStatus(message)
        } else {
          setRequestStatus(message)
        }
        resetTurnstile(requestWidgetIdRef)
        return
      }

      setEmail(payload.email)
      setOtp(Array(OTP_LENGTH).fill(""))
      setStep("verify")
      setRequestStatus("")
      setVerifyStatus(
        resend
          ? `A fresh sign-in code was sent to ${payload.email}.`
          : `A sign-in code was sent to ${payload.email}.`
      )
      resetTurnstile(requestWidgetIdRef)
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0)
    } catch (error) {
      console.error("Auth request failed", error)
      const message =
        "Unable to reach the sign-in service right now. Please try again."
      if (step === "verify") {
        setVerifyStatus(message)
      } else {
        setRequestStatus(message)
      }
    } finally {
      setRequestLoading(false)
    }
  }

  const handleVerify = async () => {
    if (resolvedOtp.length !== OTP_LENGTH) {
      setVerifyStatus("Enter the full 6-digit code before continuing.")
      return
    }

    setVerifyLoading(true)
    setVerifyStatus("Verifying sign-in code...")

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          code: resolvedOtp,
          next,
          turnstileToken: getTurnstileToken(verifyWidgetIdRef),
        }),
      })
      const payload = await response.json().catch(() => ({
        error: "The server returned an unreadable verification response.",
      }))

      if (!response.ok) {
        setVerifyStatus(payload.error ?? "Unable to verify sign-in code.")
        resetTurnstile(verifyWidgetIdRef)
        return
      }

      window.location.href = payload.next ?? "/my-reports"
    } catch (error) {
      console.error("Auth verify failed", error)
      setVerifyStatus(
        "Unable to reach the verification service right now. Please try again."
      )
    } finally {
      setVerifyLoading(false)
    }
  }

  const updateOtpAt = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1)
    setOtp((current) => {
      const nextOtp = [...current]
      nextOtp[index] = digit
      return nextOtp
    })
    if (digit && index < OTP_LENGTH - 1) {
      window.setTimeout(() => otpRefs.current[index + 1]?.focus(), 0)
    }
  }

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH)
    if (!pasted) return

    const nextOtp = Array(OTP_LENGTH)
      .fill("")
      .map((_, index) => pasted[index] ?? "")
    setOtp(nextOtp)
    const focusIndex =
      nextOtp.findIndex((value) => value === "") === -1
        ? OTP_LENGTH - 1
        : nextOtp.findIndex((value) => value === "")
    window.setTimeout(() => otpRefs.current[Math.max(focusIndex, 0)]?.focus(), 0)
  }

  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleEmailKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      void sendOtpRequest()
    }
  }

  const handleOtpContainerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      void handleVerify()
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[34rem] gap-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              One-time sign-in
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl tracking-tight">
                Sign in with your email.
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                Use one six-digit code to unlock your reports, updates, and any
                authority access tied to this account.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Passwordless</Badge>
            <Badge variant="outline">Secure code</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6">
        {step === "request" ? (
          <Card>
            <CardHeader>
              <CardTitle>Continue with email</CardTitle>
              <CardDescription>
                Enter your email to receive a one-time sign-in code. Your name
                is collected later during onboarding, not here.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="auth-email">Email address</FieldLabel>
                  <Input
                    id="auth-email"
                    onKeyDown={handleEmailKeyDown}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    ref={emailInputRef}
                    type="email"
                    value={email}
                  />
                  <FieldDescription>
                    We only use this for sign-in codes and report updates.
                  </FieldDescription>
                </Field>
                {turnstileSiteKey ? <div ref={requestTurnstileRef} /> : null}
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3">
              <Button
                disabled={requestLoading}
                onClick={() => void sendOtpRequest()}
                type="button"
              >
                {requestLoading ? "Sending sign-in code..." : "Send sign-in code"}
              </Button>
              <FieldDescription>
                The same session will follow you through reports, notifications,
                and any approved authority workspace.
              </FieldDescription>
              {requestStatus ? (
                <p className="text-sm text-muted-foreground">{requestStatus}</p>
              ) : null}
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Verify your login</CardTitle>
              <CardDescription>
                Enter the verification code we sent to your email address:{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="otp-slot-1">Verification code</FieldLabel>
                  <Button
                    disabled={requestLoading}
                    onClick={() => void sendOtpRequest({ resend: true })}
                    size="xs"
                    type="button"
                    variant="outline"
                  >
                    <RefreshCwIcon />
                    Resend code
                  </Button>
                </div>
                <InputOTP id="otp-slot-1" maxLength={OTP_LENGTH} onKeyDown={handleOtpContainerKeyDown}>
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                    {[0, 1, 2].map((index) => (
                      <InputOTPSlot
                        index={index}
                        key={index}
                        onChange={(event) => updateOtpAt(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        onPaste={handleOtpPaste}
                        ref={(node) => {
                          otpRefs.current[index] = node
                        }}
                        value={otp[index]}
                      />
                    ))}
                  </InputOTPGroup>
                  <InputOTPSeparator className="mx-2" />
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                    {[3, 4, 5].map((index) => (
                      <InputOTPSlot
                        index={index}
                        key={index}
                        onChange={(event) => updateOtpAt(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        onPaste={handleOtpPaste}
                        ref={(node) => {
                          otpRefs.current[index] = node
                        }}
                        value={otp[index]}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <FieldDescription>
                  <a className="text-primary underline-offset-4 hover:underline" href="/support">
                    I no longer have access to this email address.
                  </a>
                </FieldDescription>
              </Field>
              {turnstileSiteKey ? <div ref={verifyTurnstileRef} /> : null}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3">
              <Button
                disabled={verifyLoading}
                onClick={() => void handleVerify()}
                type="button"
              >
                {verifyLoading ? "Verifying sign-in code..." : "Verify and continue"}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <Button
                  onClick={() => {
                    setStep("request")
                    setOtp(Array(OTP_LENGTH).fill(""))
                    setRequestStatus("")
                    setVerifyStatus("")
                  }}
                  type="button"
                  variant="ghost"
                >
                  Use another email
                </Button>
                <span>Code expires after 15 minutes.</span>
              </div>
              {verifyStatus ? (
                <p className="text-sm text-muted-foreground">{verifyStatus}</p>
              ) : null}
            </CardFooter>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <CardTitle>What this unlocks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              {
                title: "My reports",
                copy: "Your report history and confirmations stay tied to one account.",
              },
              {
                title: "Notifications",
                copy: "Status updates, support confirmations, and feed items stay in one place.",
              },
              {
                title: "Authority access",
                copy: "If you are approved for a role, the same session opens the operational workspace.",
              },
            ].map((item) => (
              <div
                className="rounded-xl border border-border bg-muted/40 p-4"
                key={item.title}
              >
                <div className="text-sm font-medium">{item.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
