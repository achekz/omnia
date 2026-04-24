import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import type { AxiosError } from "axios";
import { CheckCircle2, Loader2, Lock, ShieldCheck } from "lucide-react";
import apiClient from "@/lib/api-client";
import { cn } from "@/lib/utils";

const RESET_EMAIL_STORAGE_KEY = "omni_ai_reset_email";
const RESET_VERIFIED_STORAGE_KEY = "omni_ai_reset_verified";
const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message || "Failed to reset password";
}

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem(RESET_EMAIL_STORAGE_KEY);
    const isVerified = sessionStorage.getItem(RESET_VERIFIED_STORAGE_KEY) === "true";

    if (!storedEmail || !isVerified) {
      setLocation("/forgot-password");
      return;
    }

    setEmail(storedEmail);
  }, [setLocation]);

  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      match: password.length > 0 && password === confirmPassword,
    }),
    [password, confirmPassword],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!passwordPattern.test(password)) {
      setError("Password must be at least 8 characters and include an uppercase letter, a number, and a special character.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/auth/reset-password", {
        email,
        password,
        confirmPassword,
      });
      sessionStorage.removeItem(RESET_EMAIL_STORAGE_KEY);
      sessionStorage.removeItem(RESET_VERIFIED_STORAGE_KEY);
      setSuccess("Password reset successful. You can sign in now.");
      setTimeout(() => {
        setLocation("/login");
      }, 1200);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">Reset Password</p>
        <h1 className="mt-3 text-3xl font-display font-bold text-slate-900 dark:text-white">Create a new password</h1>
        <p className="mt-3 text-slate-500 dark:text-gray-400">
          Choose a strong password for <span className="font-semibold text-slate-900 dark:text-white">{email}</span>.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800 dark:text-gray-200">New Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                placeholder="Create a strong password"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800 dark:text-gray-200">Confirm Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                placeholder="Confirm your password"
                required
              />
            </div>
          </label>

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

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            Reset password
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Back to{" "}
          <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
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
