import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import type { AxiosError } from "axios";
import { ArrowRight, Loader2, Mail, Phone } from "lucide-react";
import apiClient from "@/lib/api-client";

const RESET_EMAIL_STORAGE_KEY = "omni_ai_reset_email";
const RESET_VERIFIED_STORAGE_KEY = "omni_ai_reset_verified";

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message || "Failed to send reset code";
}

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await apiClient.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      sessionStorage.setItem(RESET_EMAIL_STORAGE_KEY, email.trim().toLowerCase());
      sessionStorage.removeItem(RESET_VERIFIED_STORAGE_KEY);
      setSuccess("Reset code sent. Check your inbox.");
      setLocation("/verify-code");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">Forgot Password</p>
        <h1 className="mt-3 text-3xl font-display font-bold text-slate-900 dark:text-white">Recover your account</h1>
        <p className="mt-3 text-slate-500 dark:text-gray-400">
          Enter the email address linked to your account and we&apos;ll send a 6-digit reset code by email only.
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
            <span className="mb-2 block text-sm font-medium text-slate-800 dark:text-gray-200">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                placeholder="example@gmail.com"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800 dark:text-gray-200">Phone number (optional)</span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                placeholder="+216 ..."
              />
            </div>
            <span className="mt-2 block text-xs text-slate-500">This field is not used for verification. The reset code is sent by email.</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            Send reset code
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
