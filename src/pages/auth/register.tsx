import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import type { AxiosError } from "axios";
import { CheckCircle2, ChevronRight, Loader2, Mail, ShieldCheck, UserRound } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import type { RegisterRequest, SendCodeRequest, UserGender, UserRole, VerificationMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

type RegisterStep = "details" | "verification" | "password";

interface StepOneState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  city: string;
  verificationMethod: VerificationMethod;
  role: UserRole | "";
  gender: UserGender | "";
}

interface PasswordState {
  password: string;
  confirmPassword: string;
}

const roleOptions: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "student", label: "Student", description: "Study planning, budget, and learning AI tools" },
  { value: "employee", label: "Employee", description: "Tasks, productivity, and workplace insights" },
  { value: "accountant", label: "Accountant", description: "Financial operations and accounting workflows" },
  { value: "intern", label: "Intern", description: "Training tasks, supervision, and onboarding support" },
];

const genderOptions: Array<{ value: UserGender; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const cityOptions = [
  { value: "Tunisia", label: "Tunisia", hint: "+21612345678" },
  { value: "France", label: "France", hint: "+33123456789" },
];

const verificationMethodOptions: Array<{ value: VerificationMethod; label: string; description: string }> = [
  { value: "email", label: "Email", description: "Receive OTP in your inbox" },
  { value: "sms", label: "SMS", description: "Receive OTP by text message" },
  { value: "whatsapp", label: "WhatsApp", description: "Receive OTP in WhatsApp" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<{ message?: string; details?: string; code?: string }>;
  const status = axiosError.response?.status;
  const data = axiosError.response?.data;

  if (status === 503 && data?.code === "ATLAS_IP_NOT_WHITELISTED") {
    return "MongoDB Atlas blocked this IP. Add your current IP in Atlas Network Access, then restart the backend.";
  }

  if (status === 503 && data?.details) {
    return data.details;
  }

  return data?.message || fallback;
}

export default function Register() {
  const { register } = useAuth();
  const [step, setStep] = useState<RegisterStep>("details");
  const [details, setDetails] = useState<StepOneState>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    city: "Tunisia",
    verificationMethod: "email",
    role: "",
    gender: "",
  });
  const [passwords, setPasswords] = useState<PasswordState>({
    password: "",
    confirmPassword: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      length: passwords.password.length >= 8,
      uppercase: /[A-Z]/.test(passwords.password),
      number: /\d/.test(passwords.password),
      special: /[^A-Za-z0-9]/.test(passwords.password),
      match: passwords.password.length > 0 && passwords.password === passwords.confirmPassword,
    }),
    [passwords],
  );

  const validateStepOne = () => {
    if (!details.firstName.trim() || !details.lastName.trim() || !details.email.trim() || !details.phoneNumber.trim() || !details.city || !details.verificationMethod || !details.role || !details.gender) {
      return "All fields are required.";
    }

    if (!emailPattern.test(details.email)) {
      return "Enter a valid email address.";
    }

    return "";
  };

  const validatePasswordStep = () => {
    if (!passwordPattern.test(passwords.password)) {
      return "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.";
    }

    if (passwords.password !== passwords.confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  };

  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const validationError = validateStepOne();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSendingCode(true);

    try {
      const payload: SendCodeRequest = {
        firstName: details.firstName.trim(),
        lastName: details.lastName.trim(),
        email: details.email.trim().toLowerCase(),
        phoneNumber: details.phoneNumber.trim(),
        city: details.city,
        verificationMethod: details.verificationMethod,
        role: details.role as UserRole,
        gender: details.gender as UserGender,
      };

      await apiClient.post("/auth/send-code", payload);
      setStep("verification");
      setSuccessMessage(`Verification code sent by ${details.verificationMethod}.`);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Failed to send verification code."));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsVerifyingCode(true);

    try {
      await apiClient.post("/auth/verify-code", {
        email: details.email.trim().toLowerCase(),
        phoneNumber: details.phoneNumber.trim(),
        code: verificationCode,
      });
      setStep("password");
      setSuccessMessage("Email verified. Create your password to finish.");
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Verification failed."));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const validationError = validatePasswordStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreatingAccount(true);

    try {
      const payload: RegisterRequest = {
        firstName: details.firstName.trim(),
        lastName: details.lastName.trim(),
        email: details.email.trim().toLowerCase(),
        phoneNumber: details.phoneNumber.trim(),
        city: details.city,
        verificationMethod: details.verificationMethod,
        role: details.role as UserRole,
        gender: details.gender as UserGender,
        password: passwords.password,
        confirmPassword: passwords.confirmPassword,
      };

      await register(payload);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Registration failed."));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8 lg:p-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">Create Account</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white">
              Registration built for real users
            </h1>
            <p className="mt-3 text-slate-500 dark:text-gray-400">
              Complete your details, verify your email, then set a secure password.
            </p>
          </div>

          <div className="mb-8 grid grid-cols-3 gap-3">
            {[
              { id: "details", label: "Step 1", title: "Profile" },
              { id: "verification", label: "Step 2", title: "Verify" },
              { id: "password", label: "Step 3", title: "Password" },
            ].map((item, index) => {
              const isActive = step === item.id;
              const isComplete =
                (step === "verification" && index === 0) ||
                (step === "password" && (index === 0 || index === 1));

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border px-4 py-4 transition-all",
                    isActive
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                      : isComplete
                        ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"
                        : "border-gray-200 bg-gray-50 dark:bg-gray-900",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</span>
                    {isComplete && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          {step === "details" && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name">
                  <input
                    value={details.firstName}
                    onChange={(event) => setDetails((current) => ({ ...current, firstName: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                    placeholder="John"
                  />
                </Field>

                <Field label="Last Name">
                  <input
                    value={details.lastName}
                    onChange={(event) => setDetails((current) => ({ ...current, lastName: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                    placeholder="Doe"
                  />
                </Field>
              </div>

              <Field label="Email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={details.email}
                    onChange={(event) => setDetails((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                    placeholder="example@gmail.com"
                  />
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone Number">
                  <input
                    value={details.phoneNumber}
                    onChange={(event) => setDetails((current) => ({ ...current, phoneNumber: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                    placeholder={details.city === "France" ? "+33123456789" : "+21612345678"}
                  />
                </Field>

                <Field label="City">
                  <select
                    value={details.city}
                    onChange={(event) => setDetails((current) => ({ ...current, city: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  >
                    {cityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.hint})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Verification Method">
                <div className="grid gap-3 sm:grid-cols-3">
                  {verificationMethodOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDetails((current) => ({ ...current, verificationMethod: option.value }))}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        details.verificationMethod === option.value
                          ? "border-violet-500 bg-violet-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-violet-300",
                      )}
                    >
                      <p className="font-semibold text-slate-900">{option.label}</p>
                      <p className="mt-2 text-xs text-slate-500 leading-5">{option.description}</p>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Role">
                <div className="grid gap-3 sm:grid-cols-3">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDetails((current) => ({ ...current, role: option.value }))}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        details.role === option.value
                          ? "border-violet-500 bg-violet-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-violet-300",
                      )}
                    >
                      <p className="font-semibold text-slate-900">{option.label}</p>
                      <p className="mt-2 text-xs text-slate-500 leading-5">{option.description}</p>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Gender">
                <div className="grid gap-3 sm:grid-cols-2">
                  {genderOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDetails((current) => ({ ...current, gender: option.value }))}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left font-medium transition-all",
                        details.gender === option.value
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-gray-200 bg-white text-slate-700 hover:border-violet-300",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>

              <button
                type="submit"
                disabled={isSendingCode}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingCode ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
                Send verification code
              </button>
            </form>
          )}

          {step === "verification" && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm text-slate-600">
                  We sent a 6-digit code by <span className="font-semibold text-slate-900">{details.verificationMethod}</span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900">
                    {details.verificationMethod === "email" ? details.email : details.phoneNumber}
                  </span>.
                </p>
              </div>

              <Field label="Verification Code">
                <input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-2xl tracking-[0.4em] text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  placeholder="000000"
                />
              </Field>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-5 py-3.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingCode}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingCode ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  Verify code
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleCreateAccount} className="space-y-6">
              <Field label="Password">
                <input
                  type="password"
                  value={passwords.password}
                  onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  placeholder="Create a strong password"
                />
              </Field>

              <Field label="Confirm Password">
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  placeholder="Confirm your password"
                />
              </Field>

              <div className="rounded-3xl border border-gray-200 bg-slate-50 p-5">
                <p className="mb-4 text-sm font-semibold text-slate-900">Password requirements</p>
                <div className="grid gap-2 text-sm">
                  <Requirement met={passwordChecks.length} label="At least 8 characters" />
                  <Requirement met={passwordChecks.uppercase} label="One uppercase letter" />
                  <Requirement met={passwordChecks.number} label="One number" />
                  <Requirement met={passwordChecks.special} label="One special character" />
                  <Requirement met={passwordChecks.match} label="Passwords match" />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setStep("verification");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-5 py-3.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAccount}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingAccount ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserRound className="h-5 w-5" />}
                  Create account
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">
              Sign in
            </Link>
          </p>
        </section>

        <aside className="rounded-[32px] overflow-hidden bg-slate-950 text-white p-8 sm:p-10 shadow-xl">
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-300">Secure onboarding</p>
            <h2 className="mt-4 text-3xl sm:text-4xl font-display font-bold">Three steps. One clean flow.</h2>
            <p className="mt-4 text-slate-300 leading-7">
              This registration journey validates identity, enforces strong passwords, and prepares role-aware AI experiences from day one.
            </p>

            <div className="mt-10 space-y-5">
              <FeatureCard
                icon={<UserRound className="h-5 w-5" />}
                title="Role-first setup"
                description="Students, employees, and accountants get tailored onboarding and later role-specific AI."
              />
              <FeatureCard
                icon={<Mail className="h-5 w-5" />}
                title="Email verification"
                description="A 6-digit code with expiration protects the registration process before passwords are stored."
              />
              <FeatureCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Production-ready password rules"
                description="Strong password requirements help keep accounts secure from the moment they are created."
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      {children}
    </label>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={cn("flex items-center gap-3", met ? "text-emerald-700" : "text-slate-500")}>
      <CheckCircle2 className={cn("h-4 w-4", met ? "text-emerald-600" : "text-slate-300")} />
      <span>{label}</span>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
