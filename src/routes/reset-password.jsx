import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Stethoscope,
  Users,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cleanEmail } from "@/lib/form-validation";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password - Medisuite" }] }),
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const search = useSearch({ strict: false });
  const [otp, setOtp] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const score = [
    pwd.length >= 8,
    /[A-Z]/.test(pwd),
    /[0-9]/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ].filter(Boolean).length;

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error("Please enter the OTP");
    setLoading(true);
    try {
      const payload = {
        otp: otp.trim(),
        token: search.token ?? search.resetToken ?? "",
        email: search.email ? cleanEmail(String(search.email)) : undefined,
      };
      console.log("Verifying OTP with payload:", {
        otp: payload.otp,
        token: payload.token ? "***" : "missing",
        email: payload.email ? payload.email : "missing",
      });
      await api.auth.verifyOtp(payload);
      setOtpVerified(true);
      toast.success("OTP verified successfully");
    } catch (err) {
      console.error("OTP verification error:", err);
      const errorMsg = err?.data?.message || err?.message || "Invalid or expired OTP";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!otpVerified) return toast.error("Please verify OTP first");
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      const payload = {
        otp: otp.trim(),
        token: search.token ?? search.resetToken ?? "",
        email: search.email ? cleanEmail(String(search.email)) : undefined,
        password: pwd,
        password_confirmation: confirm,
      };
      console.log("Resetting password with payload:", {
        otp: payload.otp,
        token: payload.token ? "***" : "missing",
        email: payload.email ? payload.email : "missing",
      });
      await api.auth.resetPassword(payload);
      toast.success("Password updated successfully");
      setTimeout(() => nav({ to: "/login" }), 800);
    } catch (err) {
      console.error("Password reset error:", err);
      const errorMsg = err?.data?.message || err?.message || "Unable to reset password";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthPanel />

      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md animate-slide-up">
          <MobileBrand />

          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter the OTP sent to your email, then create a strong password.
          </p>

          <form onSubmit={otpVerified ? submit : verifyOtp} className="mt-8 space-y-5">
            {!otpVerified ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Enter OTP</label>
                <div className="relative">
                  <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength="6"
                    className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm tracking-widest focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Check your registered email for the 6-digit code
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-success/10 p-3">
                  <p className="text-sm font-medium text-success">✓ OTP verified successfully</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">New password</label>
                  <PasswordField
                    value={pwd}
                    onChange={setPwd}
                    showPassword={showPwd}
                    onToggle={() => setShowPwd((s) => !s)}
                    placeholder="Create password"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Confirm password</label>
                  <PasswordField
                    value={confirm}
                    onChange={setConfirm}
                    showPassword={showConfirm}
                    onToggle={() => setShowConfirm((s) => !s)}
                    placeholder="Confirm password"
                  />
                </div>

                <div>
                  <div className="mb-2 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < score
                            ? score < 2
                              ? "bg-destructive"
                              : score < 3
                                ? "bg-warning"
                                : "bg-success"
                            : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {[
                      ["At least 8 characters", pwd.length >= 8],
                      ["One uppercase letter", /[A-Z]/.test(pwd)],
                      ["One number", /[0-9]/.test(pwd)],
                      ["One symbol", /[^A-Za-z0-9]/.test(pwd)],
                    ].map(([text, ok]) => (
                      <li key={String(text)} className="flex items-center gap-1.5">
                        <Check
                          className={`h-3 w-3 ${ok ? "text-success" : "text-muted-foreground/50"}`}
                        />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-elev hover:opacity-95"
            >
              {loading ? (
                otpVerified ? "Updating..." : "Verifying..."
              ) : (
                <>
                  {otpVerified ? "Update password" : "Verify OTP"}{" "}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>

            {otpVerified && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOtpVerified(false);
                  setOtp("");
                }}
                className="h-11 w-full"
              >
                Use different OTP
              </Button>
            )}
          </form>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function PasswordField({ value, onChange, showPassword, onToggle, placeholder }) {
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AuthPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-primary lg:block">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
        <Brand inverse />
        <div className="space-y-6">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            The all-in-one platform for modern clinic operations.
          </h2>
          <p className="max-w-md text-base text-white/80">
            Manage 200+ clinics, oversee staff, monitor revenue and stay HIPAA-aligned - from one
            elegant console.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { icon: ShieldCheck, label: "HIPAA Ready" },
              { icon: Activity, label: "99.99% Uptime" },
              { icon: Users, label: "32k+ Users" },
            ].map((b) => (
              <div key={b.label} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <b.icon className="h-5 w-5" />
                <div className="mt-2 text-xs font-medium text-white/90">{b.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/60">(c) 2026 Medisuite Health Systems</div>
      </div>
    </div>
  );
}

function MobileBrand() {
  return (
    <div className="mb-8 flex items-center gap-2.5 lg:hidden">
      <Brand />
    </div>
  );
}

function Brand({ inverse = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${
          inverse ? "bg-white/15 backdrop-blur" : "bg-gradient-primary text-primary-foreground"
        }`}
      >
        <Stethoscope className="h-5 w-5" />
      </div>
      <span className="text-lg font-semibold">Medisuite</span>
    </div>
  );
}
