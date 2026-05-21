import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import {
  Stethoscope,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Activity,
  Users,
  User,
  Phone,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  api,
  readField,
  readRole,
  readToken,
  readUser,
  setAuthToken,
  setAuthUser,
  hasAuthSession,
} from "@/lib/api";
import {
  alphaNumericOnly,
  cleanEmail,
  digitsOnly,
  EMAIL_INPUT_PATTERN,
  lettersOnly,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from "@/lib/form-validation";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    if (typeof window === "undefined") return;
    if (hasAuthSession() && !search?.redirect) {
      const rawUser =
        window.localStorage.getItem("clinic_command_center_user") ??
        window.sessionStorage.getItem("clinic_command_center_user");
      let role = "";
      try {
        role = JSON.parse(rawUser)?.role ?? "";
      } catch {
        role = "";
      }
      const homePath = getRoleHomePath(role);
      if (homePath) {
        throw redirect({ to: homePath });
      }
    }
  },
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in - Medisuite Admin" }] }),
});

const roles = [
  { label: "Admin", value: "admin" },
  { label: "Doctor", value: "doctor" },
  { label: "Receptionist", value: "receptionist" },
  { label: "Patient", value: "patient" },
];

const SUPER_ADMIN_EMAIL = "superadmin@gmail.com";
const SUPER_ADMIN_FALLBACK_NAME = "DP";

function getRoleHomePath(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "receptionist") return "/reception";
  if (normalizedRole === "admin") return "/dashboard";
  if (normalizedRole === "superadmin") return "/dashboard";
  return "";
}

function LoginPage() {
  const nav = useNavigate();
  const search = useSearch({ strict: false });
  const [mode, setMode] = useState("login");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState({
    firstName: "",
    lastName: "",
    username: "",
    role: "",
    phone: "",
    confirmPassword: "",
    terms: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const isRegister = mode === "register";

  const updateAccount = (field, value) => {
    setAccount((current) => ({ ...current, [field]: value }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErrors({});
    setPassword("");
    setShowPwd(false);
    setShowConfirmPwd(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isRegister) {
      await register();
      return;
    }

    const errs = {};
    const normalizedEmail = cleanEmail(email);
    const isSuperAdminLogin = normalizedEmail === SUPER_ADMIN_EMAIL;
    if (normalizedEmail !== email) setEmail(normalizedEmail);
    const emailError = validateEmail(normalizedEmail);
    if (emailError) errs.email = emailError;
    const passwordError = validatePassword(password);
    if (passwordError) errs.password = passwordError;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setErrors({});
    try {
      const localUser = isSuperAdminLogin ? null : getRegisteredUser(normalizedEmail);
      if (localUser) {
        if (localUser.password && localUser.password !== password) {
          setErrors({ form: "Invalid email or password" });
          toast.error("Invalid email or password");
          return;
        }
        if (!localUser.password) {
          rememberRegisteredUser({ ...localUser, email: normalizedEmail, password });
        }
        const authUser = {
          email: normalizedEmail,
          role: normalizeRole(localUser.role) || "admin",
          name: localUser.name || localUser.username || normalizedEmail.split("@")[0],
        };
        const homePath = getRoleHomePath(authUser.role);
        if (!homePath) {
          setErrors({ form: "No dashboard available for this role." });
          toast.error("No dashboard available for this role.");
          return;
        }
        setAuthToken(`static-${Date.now()}`, rememberMe);
        setAuthUser(authUser, rememberMe);
        toast.success("Welcome back!");
        nav({ to: resolvePostLoginPath(search.redirect, authUser.role) });
        return;
      }

      let response;
      try {
        response = isSuperAdminLogin
          ? await api.auth.superAdminLogin({ email: normalizedEmail, password })
          : await api.auth.login({ email: normalizedEmail, password });
      } catch (err) {
        if (!isMissingAuthEndpoint(err)) throw err;
        if (isSuperAdminLogin) {
          response = await api.auth.login({ email: normalizedEmail, password });
        } else {
          throw err;
        }
      }
      const token = readToken(response);
      const savedUser = readUser(response);
      if (!token) {
        throw new Error("Invalid email or password");
      }
      const safeSavedUser = savedUser && typeof savedUser === "object" ? { ...savedUser } : {};
      delete safeSavedUser.password;
      delete safeSavedUser.Password;
      const detectedRole =
        readRole(response, token) || (isSuperAdminLogin ? "superadmin" : "admin");
      const savedName = [
        safeSavedUser.firstName ?? safeSavedUser.first_name,
        safeSavedUser.lastName ?? safeSavedUser.last_name,
      ]
        .filter(Boolean)
        .join(" ");
      const backendName =
        safeSavedUser.name ??
        safeSavedUser.Name ??
        safeSavedUser.fullName ??
        safeSavedUser.FullName ??
        safeSavedUser.displayName ??
        safeSavedUser.DisplayName ??
        safeSavedUser.username ??
        safeSavedUser.Username ??
        savedName;
      const authUser = {
        ...safeSavedUser,
        email: readField(
          safeSavedUser,
          ["email", "Email", "username", "Username"],
          normalizedEmail,
        ),
        role: detectedRole,
        name:
          backendName ||
          (isSuperAdminLogin ? SUPER_ADMIN_FALLBACK_NAME : normalizedEmail.split("@")[0]),
      };
      const homePath = getRoleHomePath(authUser.role);
      if (!homePath) {
        setErrors({ form: "No dashboard available for this role." });
        toast.error("No dashboard available for this role.");
        return;
      }
      setAuthToken(token, rememberMe);
      setAuthUser(authUser, rememberMe);
      toast.success("Welcome back!");
      nav({ to: resolvePostLoginPath(search.redirect, authUser.role) });
    } catch (err) {
      const message = normalizeAuthError(err);
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    const errs = {};
    const normalizedEmail = cleanEmail(email);
    const normalizedPhone = digitsOnly(account.phone);
    if (normalizedEmail !== email) setEmail(normalizedEmail);
    if (normalizedPhone !== account.phone) updateAccount("phone", normalizedPhone);
    const firstNameError = validateName(account.firstName, "First name");
    const lastNameError = validateName(account.lastName, "Last name");
    if (firstNameError) errs.firstName = firstNameError;
    if (lastNameError) errs.lastName = lastNameError;
    if (!account.username.trim()) errs.username = "Username is required";
    if (!account.role) errs.role = "Select a role";
    const phoneError = validatePhone(normalizedPhone);
    if (phoneError) errs.phone = phoneError;
    const emailError = validateEmail(normalizedEmail);
    if (emailError) errs.email = emailError;
    if (normalizedEmail === SUPER_ADMIN_EMAIL) {
      errs.email = "Super admin already exists. Please sign in with the backend credentials.";
    }
    if (normalizeRole(account.role) === "superadmin") {
      errs.role = "Super admin accounts cannot be created from public registration";
    }
    if (getRegisteredUser(normalizedEmail)) {
      errs.email = "Email address already exists";
    }
    const passwordError = validatePassword(password);
    if (passwordError) errs.password = passwordError;
    if (account.confirmPassword !== password) errs.confirmPassword = "Passwords do not match";
    if (!account.terms) errs.terms = "Please agree to terms and conditions";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      rememberRegisteredUser({
        email: normalizedEmail,
        username: account.username,
        role: account.role.toLowerCase(),
        name: `${account.firstName} ${account.lastName}`.trim(),
        phone: normalizedPhone,
        password,
      });
      toast.success("Account created. Please sign in.");
      setMode("login");
      setPassword("");
      setAccount({
        firstName: "",
        lastName: "",
        username: "",
        role: "",
        phone: "",
        confirmPassword: "",
        terms: false,
      });
    } catch (err) {
      toast.error(err?.message ?? "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-primary lg:block">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Medisuite</span>
          </div>
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

      <div
        className={`flex items-center justify-center px-6 sm:px-12 ${
          isRegister ? "py-5 lg:py-6" : "py-12"
        }`}
      >
        <div className={`w-full animate-slide-up ${isRegister ? "max-w-2xl" : "max-w-md"}`}>
          <div className={`${isRegister ? "mb-4" : "mb-8"} flex items-center gap-2.5 lg:hidden`}>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Medisuite</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isRegister ? "Create account" : "Sign in to your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isRegister
              ? "Create a new account to access the dashboard and manage your workspace."
              : "Welcome back. Enter your credentials to continue."}
          </p>

          <form onSubmit={submit} className={isRegister ? "mt-5 space-y-4" : "mt-8 space-y-5"}>
            {isRegister && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="First Name"
                  icon={User}
                  value={account.firstName}
                  onChange={(value) => {
                    updateAccount("firstName", lettersOnly(value));
                    clearFieldError(setErrors, "firstName");
                  }}
                  placeholder="John"
                  error={errors.firstName}
                />
                <TextField
                  label="Last Name"
                  icon={User}
                  value={account.lastName}
                  onChange={(value) => {
                    updateAccount("lastName", lettersOnly(value));
                    clearFieldError(setErrors, "lastName");
                  }}
                  placeholder="Doe"
                  error={errors.lastName}
                />
                <TextField
                  label="Username"
                  icon={User}
                  value={account.username}
                  onChange={(value) => {
                    updateAccount("username", alphaNumericOnly(value));
                    clearFieldError(setErrors, "username");
                  }}
                  placeholder="johndoe"
                  error={errors.username}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Role</label>
                  <Select
                    value={account.role}
                    onValueChange={(value) => updateAccount("role", value)}
                  >
                    <SelectTrigger className="h-11 rounded-lg border-input bg-card text-sm shadow-none focus:ring-2 focus:ring-ring/20">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.role && <p className="mt-1.5 text-xs text-destructive">{errors.role}</p>}
                </div>
                <TextField
                  label="Phone"
                  icon={Phone}
                  type="tel"
                  value={account.phone}
                  onChange={(value) => {
                    updateAccount("phone", digitsOnly(value));
                    clearFieldError(setErrors, "phone");
                  }}
                  placeholder="Phone number"
                  error={errors.phone}
                  inputMode="numeric"
                  maxLength={10}
                />
                <TextField
                  label="Email"
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={(value) => {
                    setEmail(cleanEmail(value));
                    clearFieldError(setErrors, "email");
                  }}
                  placeholder="Enter your email"
                  error={errors.email}
                  pattern={EMAIL_INPUT_PATTERN}
                  title="Use a professional email such as name@clinicname.com"
                />
              </div>
            )}

            {!isRegister && (
              <TextField
                label="Email address"
                icon={Mail}
                type="email"
                value={email}
                onChange={(value) => {
                  setEmail(cleanEmail(value));
                  clearFieldError(setErrors, "email");
                }}
                placeholder="you@clinic.com"
                error={errors.email}
                pattern={EMAIL_INPUT_PATTERN}
                title="Use a professional email such as name@clinicname.com"
              />
            )}

            {isRegister ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Password</label>
                  <PasswordField
                    value={password}
                    onChange={(value) => {
                      setPassword(value);
                      clearFieldError(setErrors, "password");
                    }}
                    showPassword={showPwd}
                    onToggle={() => setShowPwd((s) => !s)}
                    placeholder="Create password"
                  />
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Confirm Password</label>
                  <PasswordField
                    value={account.confirmPassword}
                    onChange={(value) => {
                      updateAccount("confirmPassword", value);
                      clearFieldError(setErrors, "confirmPassword");
                    }}
                    showPassword={showConfirmPwd}
                    onToggle={() => setShowConfirmPwd((s) => !s)}
                    placeholder="Confirm password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordField
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    clearFieldError(setErrors, "password");
                  }}
                  showPassword={showPwd}
                  onToggle={() => setShowPwd((s) => !s)}
                />
                {errors.password && (
                  <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            {isRegister ? (
              <div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={account.terms}
                    onCheckedChange={(checked) => updateAccount("terms", checked === true)}
                  />
                  I agree terms & conditions
                </label>
                {errors.terms && <p className="mt-1.5 text-xs text-destructive">{errors.terms}</p>}
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                Keep me signed in for 30 days
              </label>
            )}

            {errors.form && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {errors.form}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-elev hover:opacity-95"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRegister ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                <>
                  {isRegister ? "Register" : "Sign in"} <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p
            className={`${isRegister ? "mt-4" : "mt-6"} text-center text-xs text-muted-foreground`}
          >
            {isRegister ? "Already have account?" : "New to Medisuite?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? "login" : "register")}
              className="font-medium text-primary hover:underline"
            >
              {isRegister ? "Login" : "Create account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function normalizeRole(value) {
  const role = String(value ?? "")
    .toLowerCase()
    .trim();
  if (role.includes("superadmin") || role.includes("super admin") || role.includes("super_admin")) {
    return "superadmin";
  }
  if (role.includes("reception")) return "receptionist";
  if (role.includes("doctor")) return "doctor";
  if (role.includes("patient")) return "patient";
  if (role.includes("admin")) return "admin";
  return "";
}

function getRegisteredUser(email) {
  if (typeof window === "undefined") return null;
  try {
    const users = JSON.parse(window.localStorage.getItem("clinic_registered_users") ?? "{}");
    return users[email.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

function rememberRegisteredUser(user) {
  if (typeof window === "undefined") return;
  try {
    const users = JSON.parse(window.localStorage.getItem("clinic_registered_users") ?? "{}");
    users[user.email.toLowerCase()] = user;
    window.localStorage.setItem("clinic_registered_users", JSON.stringify(users));
  } catch {
    window.localStorage.setItem(
      "clinic_registered_users",
      JSON.stringify({ [user.email.toLowerCase()]: user }),
    );
  }
}

function normalizeAuthError(err) {
  const message = String(err?.message ?? "").trim();
  if (!message) return "Invalid email or password";
  if (/401|403|unauthori[sz]ed|invalid|incorrect|credential|password/i.test(message)) {
    return "Invalid email or password";
  }
  return message;
}

function isMissingAuthEndpoint(err) {
  return err?.status === 404 || err?.status === 405;
}

function clearFieldError(setErrors, field) {
  setErrors((current) => {
    if (!current[field] && !current.form) return current;
    const next = { ...current };
    delete next[field];
    delete next.form;
    return next;
  });
}

function resolvePostLoginPath(redirect, role) {
  let path = String(redirect ?? "").trim();
  const homePath = getRoleHomePath(role);

  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      path = new URL(path).pathname + new URL(path).search;
    } catch {
      path = "";
    }
  }

  if (path.startsWith("/") && !path.startsWith("/login")) {
    if (path.startsWith("/profile") || path.startsWith("/notifications")) {
      return path;
    }
    if (homePath === "/reception" && path.startsWith("/reception")) {
      return path;
    }
    if (homePath === "/dashboard" && !path.startsWith("/reception")) {
      return path;
    }
    return homePath;
  }

  return homePath || "/login";
}

function redirectToStoredHome() {
  const rawUser =
    window.localStorage.getItem("clinic_command_center_user") ??
    window.sessionStorage.getItem("clinic_command_center_user");
  let role = "";
  try {
    role = JSON.parse(rawUser)?.role ?? "";
  } catch {
    role = "";
  }
  const homePath = getRoleHomePath(role);
  return redirect({ to: homePath || "/login" });
}

function TextField({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  ...inputProps
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...inputProps}
          className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          placeholder={placeholder}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
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
