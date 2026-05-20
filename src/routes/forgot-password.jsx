import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Mail,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cleanEmail, EMAIL_INPUT_PATTERN, validateEmail } from "@/lib/form-validation";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Forgot password - Medisuite" }] }),
});

function ForgotPasswordPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const normalizedEmail = cleanEmail(email);
    if (normalizedEmail !== email) setEmail(normalizedEmail);
    const emailError = validateEmail(normalizedEmail);
    if (emailError) return toast.error(emailError);
    setLoading(true);
    try {
      const payload = { email: normalizedEmail };
      console.log("Sending forgot password request with payload:", payload);
      const response = await api.auth.forgotPassword(payload);
      const resetToken =
        response?.token ||
        response?.resetToken ||
        response?.reset_token ||
        response?.data?.token ||
        response?.data?.resetToken ||
        response?.data?.reset_token ||
        "";
      toast.success("OTP sent to your email");
      const query = resetToken
        ? `?token=${encodeURIComponent(resetToken)}`
        : `?email=${encodeURIComponent(normalizedEmail)}`;
      setTimeout(() => nav({ to: `/reset-password${query}` }), 1200);
    } catch (err) {
      console.error("Forgot password error:", err);
      const errorMsg = err?.data?.message || err?.message || "Unable to send OTP";
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

          <h1 className="text-2xl font-semibold tracking-tight">Forgot Password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your registered email to receive OTP.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(cleanEmail(e.target.value))}
                  pattern={EMAIL_INPUT_PATTERN}
                  title="Use a professional email such as name@clinicname.com"
                  className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  placeholder="you@clinic.com"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-elev hover:opacity-95"
            >
              {loading ? (
                "Sending..."
              ) : (
                <>
                  Send OTP <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">Remembered your password? </span>
            <Link
              to="/login"
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
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
