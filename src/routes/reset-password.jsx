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
import { cleanEmail, validatePassword } from "@/lib/form-validation";
import { toast } from "sonner";

function updateRegisteredUserPassword(email, password) {
  if (typeof window === "undefined" || !email) return;
  try {
    const users = JSON.parse(window.localStorage.getItem("clinic_registered_users") ?? "{}");
    const key = email.toLowerCase();
    if (!users[key]) return;
    users[key] = { ...users[key], password };
    window.localStorage.setItem("clinic_registered_users", JSON.stringify(users));
  } catch {
    return;
  }
}

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");

  const score = [
    pwd.length >= 8,
    /[A-Z]/.test(pwd),
    /[0-9]/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ].filter(Boolean).length;

  const emailValue = search.email ? cleanEmail(String(search.email)) : "";

  const validateForm = () => {
    const errors = {};
    if (!otp.trim()) errors.otp = "OTP is required";
    const passwordError = validatePassword(pwd, "New password");
    if (passwordError) errors.newPassword = passwordError;
    if (!confirm.trim()) errors.confirmPassword = "Confirm password is required";
    if (pwd && confirm && pwd !== confirm) {
      errors.confirmPassword = "Passwords do not match";
    }
    if (!emailValue) errors.email = "Email is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the highlighted errors");
      return;
    }
    if (!emailValue) {
      toast.error("Missing email for password reset.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        email: emailValue,
        otp: otp.trim(),
        newPassword: pwd,
        confirmPassword: confirm,
      };
      console.log("Resetting password with payload:", payload);
      const response = await api.auth.resetPassword(payload);
      updateRegisteredUserPassword(emailValue, payload.newPassword);
      setSuccess(response?.message || "Password reset successful! Redirecting...");
      toast.success(response?.message || "Password reset successful!");
      setTimeout(() => nav({ to: "/login" }), 2000);
    } catch (err) {
      console.error("Password reset error:", err);
      const errorMsg = err?.data?.message || err?.message || "Reset failed. Try again.";
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

          <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter the OTP sent to your email and set your new password.
          </p>
          {search.email && (
            <div className="mt-3 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
              OTP is sent to <strong>{cleanEmail(String(search.email))}</strong>
            </div>
          )}

          <form onSubmit={submit} className="mt-8 space-y-5">
            {success && (
              <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                {success}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">OTP</label>
              <div className="relative">
                <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setFieldErrors((prev) => ({ ...prev, otp: "" }));
                  }}
                  placeholder="Enter OTP"
                  maxLength="6"
                  className={`h-11 w-full rounded-lg border ${fieldErrors.otp ? "border-destructive" : "border-input"} bg-card pl-10 pr-3 text-sm tracking-widest focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20`}
                />
              </div>
              {fieldErrors.otp && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.otp}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">New password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => {
                    setPwd(e.target.value.replace(/\s/g, ""));
                    setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
                  }}
                  placeholder="Enter new password"
                  className={`h-11 w-full rounded-lg border ${fieldErrors.newPassword ? "border-destructive" : "border-input"} bg-card pl-10 pr-10 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.newPassword && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.newPassword}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Confirm password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value.replace(/\s/g, ""));
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  placeholder="Confirm new password"
                  className={`h-11 w-full rounded-lg border ${fieldErrors.confirmPassword ? "border-destructive" : "border-input"} bg-card pl-10 pr-10 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
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

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-elev hover:opacity-95"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
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
