import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  markUserActive,
  recordLoginHistory,
  recordSystemLog,
  rememberUserDirectoryEntry,
  setAuthToken,
  setAuthUser,
  hasAuthSession,
} from "@/lib/api";
import {
  cleanEmail,
  digitsOnly,
  EMAIL_INPUT_PATTERN,
  lettersOnly,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from "@/lib/form-validation";
import { getRoleHomePath, normalizeRole, SUPER_ADMIN_EMAIL } from "@/lib/auth-routing";
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

const SUPER_ADMIN_FALLBACK_NAME = "DP";
const LOGIN_DRAFT_STORAGE_KEY = "clinic_login_draft";

function LoginPage() {
  const nav = useNavigate();
  const search = useSearch({ strict: false });
  const [mode, setMode] = useState("login");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    role: "",
    phone: "",
    confirmPassword: "",
    hospitalName: "",
    hospitalAddress: "",
    hospitalPhone: "",
    hospitalEmail: "",
    terms: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const isRegister = mode === "register";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = readLoginDraft();
    if (!draft) return;
    setEmail(draft.email ?? "");
    setPassword(draft.password ?? "");
    if (typeof draft.rememberMe === "boolean") {
      setRememberMe(draft.rememberMe);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isRegister) return;
    if (!rememberMe) {
      clearLoginDraft();
      return;
    }
    writeLoginDraft({ email, password, rememberMe });
  }, [email, password, rememberMe, isRegister]);

  const updateAccount = (field, value) => {
    setRegisterForm((current) => ({ ...current, [field]: value }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErrors({});
    setPassword("");
    setShowPwd(false);
    setShowConfirmPwd(false);
    setRegisterForm({
      firstName: "",
      lastName: "",
      username: "",
      role: "",
      phone: "",
      confirmPassword: "",
      hospitalName: "",
      hospitalAddress: "",
      hospitalPhone: "",
      hospitalEmail: "",
      terms: false,
    });
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
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setErrors({});
    try {
      const localUser = isSuperAdminLogin ? null : getRegisteredUser(normalizedEmail);
      let response;
      try {
        response = isSuperAdminLogin
          ? await api.auth.superAdminLogin({ email: normalizedEmail, password })
          : await api.auth.login({ email: normalizedEmail, password });
      } catch (err) {
        const canUseLocalFallback =
          localUser &&
          (isMissingAuthEndpoint(err) || err?.status === 401 || err?.status === 403);
        if (canUseLocalFallback) {
          if (localUser.password && localUser.password !== password) {
            setErrors({ password: "Incorrect password. Please try again." });
            toast.error("Incorrect password. Please try again.");
            return;
          }
          if (!localUser.password) {
            rememberRegisteredUser({ ...localUser, email: normalizedEmail, password });
          }
          const authUser = {
            email: normalizedEmail,
            role: normalizeRole(localUser.role, normalizedEmail) || "admin",
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
          markUserActive(authUser);
          recordLoginHistory(authUser);
          toast.success("Welcome back!");
          nav({ to: resolvePostLoginPath(search.redirect, authUser.role) });
          return;
        }
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
        normalizeRole(readRole(response, token), normalizedEmail) ||
        (isSuperAdminLogin ? "superadmin" : "admin");
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
      markUserActive(authUser);
      recordLoginHistory(authUser, {
        ip:
          response?.ip ??
          response?.ipAddress ??
          response?.ip_address ??
          response?.data?.ip ??
          response?.data?.ipAddress ??
          "",
      });
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
    const normalizedPhone = digitsOnly(registerForm.phone);
    const normalizedHospitalPhone = digitsOnly(registerForm.hospitalPhone);
    const normalizedHospitalEmail = cleanEmail(registerForm.hospitalEmail);
    if (normalizedEmail !== email) setEmail(normalizedEmail);
    if (normalizedPhone !== registerForm.phone) updateAccount("phone", normalizedPhone);
    if (normalizedHospitalPhone !== registerForm.hospitalPhone) updateAccount("hospitalPhone", normalizedHospitalPhone);
    if (normalizedHospitalEmail !== registerForm.hospitalEmail) updateAccount("hospitalEmail", normalizedHospitalEmail);

    const firstNameError = validateName(registerForm.firstName, "First name");
    const lastNameError = validateName(registerForm.lastName, "Last name");
    if (firstNameError) errs.firstName = firstNameError;
    if (lastNameError) errs.lastName = lastNameError;
    if (!registerForm.username.trim()) errs.username = "Username is required";
    if (!registerForm.role) errs.role = "Select a role";
    const phoneError = validatePhone(normalizedPhone, "Phone");
    if (phoneError) errs.phone = phoneError;
    const emailError = validateEmail(normalizedEmail);
    if (emailError) errs.email = emailError;
    if (normalizedEmail === SUPER_ADMIN_EMAIL) {
      errs.email = "Super admin already exists. Please sign in with the backend credentials.";
    }
    const isAdminRole = normalizeRole(registerForm.role) === "admin";
    if (isAdminRole) {
      const hospitalNameError = validateName(registerForm.hospitalName, "Hospital name");
      if (hospitalNameError) errs.hospitalName = hospitalNameError;
      if (!registerForm.hospitalAddress.trim()) errs.hospitalAddress = "Hospital address is required";
      const hospitalPhoneError = validatePhone(normalizedHospitalPhone, "Hospital phone");
      if (hospitalPhoneError) errs.hospitalPhone = hospitalPhoneError;
      const hospitalEmailError = validateEmail(normalizedHospitalEmail, "Hospital email");
      if (hospitalEmailError) errs.hospitalEmail = hospitalEmailError;
    }
    if (getRegisteredUser(normalizedEmail)) {
      errs.email = "Email address already exists";
    }
    const passwordError = validatePassword(password, "Password");
    if (passwordError) errs.password = passwordError;
    if (registerForm.confirmPassword !== password) errs.confirmPassword = "Passwords do not match";
    if (!registerForm.terms) errs.terms = "Please agree to terms and conditions";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const registeredRole = normalizeRole(registerForm.role) || registerForm.role.toLowerCase();
      if (isAdminRole) {
        const payload = {
          name: `${registerForm.firstName.trim()} ${registerForm.lastName.trim()}`.trim(),
          mobileNumber: normalizedPhone,
          email: normalizedEmail,
          password,
          role: "Admin",
          hospitalName: registerForm.hospitalName.trim(),
          hospitalAddress: registerForm.hospitalAddress.trim(),
          hospitalPhone: normalizedHospitalPhone,
          hospitalEmail: normalizedHospitalEmail,
        };
        const response = await api.auth.register(payload);
        const token = readToken(response);
        const savedUser = readUser(response);
        if (token) {
          const authUser = {
            ...(savedUser && typeof savedUser === "object" ? savedUser : {}),
            email: readField(savedUser, ["email", "Email", "username", "Username"], normalizedEmail),
            role: normalizeRole(readRole(response, token), normalizedEmail) || "admin",
            name: readField(
              savedUser,
              ["name", "Name", "fullName", "FullName", "displayName"],
              `${registerForm.firstName.trim()} ${registerForm.lastName.trim()}`.trim(),
            ),
            mobileNumber: normalizedPhone,
            username: registerForm.username.trim(),
            hospitalName: registerForm.hospitalName.trim(),
            hospitalAddress: registerForm.hospitalAddress.trim(),
            hospitalPhone: normalizedHospitalPhone,
            hospitalEmail: normalizedHospitalEmail,
          };
          setAuthToken(token, rememberMe);
          setAuthUser(authUser, rememberMe);
          markUserActive(authUser);
          recordLoginHistory(authUser);
          toast.success("Account created. Redirecting to dashboard...");
          nav({ to: resolvePostLoginPath(search.redirect, authUser.role) });
          return;
        }
      }

      const registeredUser = {
        email: normalizedEmail,
        username: registerForm.username.trim(),
        role: registeredRole,
        name: `${registerForm.firstName.trim()} ${registerForm.lastName.trim()}`.trim(),
        phone: normalizedPhone,
        password,
      };
      rememberRegisteredUser(registeredUser);
      rememberUserDirectoryEntry(registeredUser, "registration");
      recordSystemLog({
        user: registeredUser.name || registeredUser.username,
        email: registeredUser.email,
        role: registeredUser.role,
        action: isAdminRole ? "Registered admin account" : "Registered account",
        module: "Auth",
      });
      toast.success("Account created. Please sign in.");
      setMode("login");
      setPassword("");
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
              ? "Create your account and reveal the hospital fields when Admin is selected."
              : "Welcome back. Enter your credentials to continue."}
          </p>

          <form onSubmit={submit} className={isRegister ? "mt-5 space-y-4" : "mt-8 space-y-5"}>
            {isRegister && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="First Name"
                  icon={User}
                  value={registerForm.firstName}
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
                  value={registerForm.lastName}
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
                  value={registerForm.username}
                  onChange={(value) => {
                    updateAccount("username", value);
                    clearFieldError(setErrors, "username");
                  }}
                  placeholder="johndoe"
                  error={errors.username}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Role</label>
                  <Select
                    value={registerForm.role}
                    onValueChange={(value) => {
                      updateAccount("role", value);
                      clearFieldError(setErrors, "role");
                    }}
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
                  value={registerForm.phone}
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
                {registerForm.role === "admin" && (
                  <>
                    <TextField
                      label="Hospital Name"
                      icon={ShieldCheck}
                      value={registerForm.hospitalName}
                      onChange={(value) => {
                        updateAccount("hospitalName", value);
                        clearFieldError(setErrors, "hospitalName");
                      }}
                      placeholder="kimes"
                      error={errors.hospitalName}
                    />
                    <TextField
                      label="Hospital Phone"
                      icon={Phone}
                      type="tel"
                      value={registerForm.hospitalPhone}
                      onChange={(value) => {
                        updateAccount("hospitalPhone", digitsOnly(value));
                        clearFieldError(setErrors, "hospitalPhone");
                      }}
                      placeholder="1234567893"
                      error={errors.hospitalPhone}
                      inputMode="numeric"
                      maxLength={10}
                    />
                    <TextField
                      label="Hospital Email"
                      icon={Mail}
                      type="email"
                      value={registerForm.hospitalEmail}
                      onChange={(value) => {
                        updateAccount("hospitalEmail", cleanEmail(value));
                        clearFieldError(setErrors, "hospitalEmail");
                      }}
                      placeholder="kimes@gmail.com"
                      error={errors.hospitalEmail}
                      pattern={EMAIL_INPUT_PATTERN}
                      title="Use a professional email such as hospital@clinicname.com"
                    />
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium">Hospital Address</label>
                      <textarea
                        value={registerForm.hospitalAddress}
                        onChange={(event) => {
                          updateAccount("hospitalAddress", event.target.value);
                          clearFieldError(setErrors, "hospitalAddress");
                        }}
                        placeholder="12"
                        className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                      {errors.hospitalAddress && (
                        <p className="mt-1.5 text-xs text-destructive">{errors.hospitalAddress}</p>
                      )}
                    </div>
                  </>
                )}
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
                      setPassword(value.replace(/\s/g, ""));
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
                    value={registerForm.confirmPassword}
                    onChange={(value) => {
                      updateAccount("confirmPassword", value.replace(/\s/g, ""));
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
                    setPassword(value.replace(/\s/g, ""));
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
                    checked={registerForm.terms}
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

function getRegisteredUser(email) {
  if (typeof window === "undefined") return null;
  try {
    const users = JSON.parse(window.localStorage.getItem("clinic_registered_users") ?? "{}");
    return users[email.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

function readLoginDraft() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(LOGIN_DRAFT_STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writeLoginDraft(draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOGIN_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore restricted storage environments.
  }
}

function clearLoginDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOGIN_DRAFT_STORAGE_KEY);
  } catch {
    // Ignore restricted storage environments.
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
  const normalizedRole = normalizeRole(role);

  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      path = new URL(path).pathname + new URL(path).search;
    } catch {
      path = "";
    }
  }

  if (path.startsWith("/") && !path.startsWith("/login")) {
    if (path.startsWith("/profile") || path.startsWith("/notifications") || path.startsWith("/help")) {
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
