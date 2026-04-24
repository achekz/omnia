import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import type { AxiosError } from "axios";
import { Loader2, ShieldCheck } from "lucide-react";
import apiClient from "@/lib/api-client";

const RESET_EMAIL_STORAGE_KEY = "omni_ai_reset_email";
const RESET_VERIFIED_STORAGE_KEY = "omni_ai_reset_verified";

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message || "Invalid or expired code";
}

export default function VerifyResetCodePage() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem(RESET_EMAIL_STORAGE_KEY);
    if (!storedEmail) {
      setLocation("/forgot-password");
      return;
    }
    setEmail(storedEmail);
  }, [setLocation]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await apiClient.post("/auth/verify-reset-code", {
        email,
        code,
      });
      sessionStorage.setItem(RESET_VERIFIED_STORAGE_KEY, "true");
      setSuccess("Code verified successfully.");
      setLocation("/reset-password");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">Verify Reset Code</p>
        <h1 className="mt-3 text-3xl font-display font-bold text-slate-900 dark:text-white">Enter your code</h1>
        <p className="mt-3 text-slate-500 dark:text-gray-400">
          We sent a 6-digit code to <span className="font-semibold text-slate-900 dark:text-white">{email}</span>.
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
            <span className="mb-2 block text-sm font-medium text-slate-800 dark:text-gray-200">Verification Code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-2xl tracking-[0.4em] text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
              placeholder="000000"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            Verify code
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Need a new code?{" "}
          <Link href="/forgot-password" className="font-semibold text-violet-600 hover:text-violet-700">
            Try again
          </Link>
        </p>
      </div>
    </div>
  );
}
