import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

/**
 * Account setup form for demo invitees.
 * When an invitee clicks a demo link but isn't authenticated, they create
 * a password-based account here (email comes from the invite). After OTP
 * verification the page reloads — the user is now logged in and the tour
 * runs live with a real club.
 */
export default function DemoAccountSetup({ email: inviteEmail, name: inviteName }) {
  const [email] = useState(inviteEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [mode, setMode] = useState(null); // null = choice screen, "create" = create form

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      const msg = (err?.message || "Registration failed").toLowerCase();
      if (msg.includes("already") || msg.includes("exists")) {
        setError("An account with this email already exists. Log in to continue your demo.");
      } else {
        setError(err?.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      // Reload the tour page — user is now authenticated, tour runs live
      window.location.href = "/demo";
    } catch (err) {
      setError(err?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
    } catch (err) {
      setError(err?.message || "Failed to resend code");
    }
  };

  if (showOtp) {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: p(0.12) }}>
            <Mail className="w-7 h-7" style={{ color: p() }} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Verify your email</h2>
          <p className="text-slate-600 text-sm">We sent a 6-digit code to <strong>{email}</strong></p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          className="w-full text-white font-bold h-12"
          style={{ background: p() }}
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify & start tour <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-slate-500">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="font-bold hover:underline" style={{ color: p() }}>
            Resend
          </button>
        </p>
      </div>
    );
  }

  // Choice screen — log in or create account
  if (!mode) {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: p(0.12) }}>
            <CheckCircle2 className="w-7 h-7" style={{ color: p() }} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {inviteName ? `Welcome, ${inviteName.split(" ")[0]}!` : "Welcome!"}
          </h2>
          <p className="text-slate-600 text-sm">
            You've been invited to try the Club Rudder demo. Log in or create an account to get started.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to={`/login?returnTo=${encodeURIComponent("/demo")}`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-lg font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: p() }}
          >
            <Lock className="w-4 h-4" />
            I already have an account
          </Link>
          <Button
            variant="outline"
            className="w-full h-12 font-bold"
            onClick={() => setMode("create")}
          >
            <ArrowRight className="w-4 h-4 mr-1" />
            Create a new account
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Your invite email: <strong>{email}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: p(0.12) }}>
          <CheckCircle2 className="w-7 h-7" style={{ color: p() }} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">
          {inviteName ? `Welcome, ${inviteName.split(" ")[0]}!` : "Welcome!"}
        </h2>
        <p className="text-slate-600 text-sm">
          Create a password to set up your demo club. Your email <strong>{email}</strong> was pre-approved.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
          {error.includes("already exists") && (
            <Link to="/login" className="font-bold underline ml-auto shrink-0" style={{ color: p() }}>
              Log in
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-slate-800 font-semibold text-sm">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="email"
              value={email}
              readOnly
              className="pl-10 h-12 bg-slate-50 text-slate-600"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-800 font-semibold text-sm">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
              autoFocus
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-800 font-semibold text-sm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full text-white font-bold h-12"
          style={{ background: p() }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create account & start tour <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="font-bold hover:underline" style={{ color: p() }}>
          Log in
        </Link>
      </p>
    </div>
  );
}