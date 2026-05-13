// Role du fichier: affiche une page reservee au compte admin.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, Key, Mail, Power, Save, ShieldCheck, UserRound } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGetAdminUserTaskDetails, useSendAdminUserEmailCode, useSendAdminUserPasswordCode, useUpdateAdminUser } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

interface AccountFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordCode: string;
  emailCode: string;
  adminPassword: string;
  isActive: boolean;
}

const emptyForm: AccountFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  passwordCode: "",
  emailCode: "",
  adminPassword: "",
  isActive: true,
};

// Role: Affiche et organise cet ecran.
export default function AdminUserTaskDetailsPage() {
  const [, params] = useRoute("/admin/users/:id");
  const [, legacyParams] = useRoute("/admin/users/:id/tasks");
  const [, setLocation] = useLocation();
  const userId = params?.id || legacyParams?.id;
  const { data, isLoading } = useGetAdminUserTaskDetails(userId);
  const updateUser = useUpdateAdminUser();
  const sendPasswordCode = useSendAdminUserPasswordCode();
  const sendEmailCode = useSendAdminUserEmailCode();
  const { toast } = useToast();
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const user = data.user;
  const fullName = useMemo(
    () => `${form.firstName} ${form.lastName}`.trim() || user?.name || user?.email || "Compte utilisateur",
    [form.firstName, form.lastName, user?.email, user?.name],
  );

  useEffect(() => {
    if (!user) return;

    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      password: "",
      passwordCode: "",
      emailCode: "",
      adminPassword: "",
      isActive: user.isActive !== false,
    });
  }, [user]);

  const updateField = <K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    try {
      await updateUser.mutateAsync({
        id: userId,
        data: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          isActive: form.isActive,
          ...(form.password.trim() ? { password: form.password.trim(), passwordCode: form.passwordCode.trim() } : {}),
          ...(form.email.trim().toLowerCase() !== user?.email
            ? { emailCode: form.emailCode.trim(), adminPassword: form.adminPassword.trim() }
            : {}),
        },
      });

      setForm((current) => ({ ...current, password: "", passwordCode: "", emailCode: "", adminPassword: "" }));
      toast({ title: "Compte modifié", description: "Les informations du compte ont été enregistrées." });
    } catch (error: any) {
      toast({
        title: "Modification échouée",
        description: error?.response?.data?.message || "Impossible de modifier ce compte.",
        variant: "destructive",
      });
    }
  };

  const requestPasswordCode = async () => {
    if (!userId || !form.password.trim()) {
      toast({ title: "Mot de passe requis", description: "Tape le nouveau mot de passe avant d'envoyer le code.", variant: "destructive" });
      return;
    }

    try {
      const result = await sendPasswordCode.mutateAsync(userId);
      if (result.devCode) updateField("passwordCode", result.devCode);
      toast({ title: "Code envoyé", description: `Code envoyé à ${user?.email}.` });
    } catch (error: any) {
      toast({ title: "Envoi échoué", description: error?.response?.data?.message || "Impossible d'envoyer le code.", variant: "destructive" });
    }
  };

  const requestEmailCode = async () => {
    if (!userId || !form.email.trim()) return;
    if (!form.adminPassword.trim()) {
      toast({ title: "Mot de passe admin requis", description: "Tape ton mot de passe admin avant d'envoyer le code.", variant: "destructive" });
      return;
    }

    try {
      const result = await sendEmailCode.mutateAsync({ id: userId, newEmail: form.email.trim().toLowerCase() });
      if (result.devCode) updateField("emailCode", result.devCode);
      toast({ title: "Code envoyé", description: `Code envoyé au nouvel email ${form.email}.` });
    } catch (error: any) {
      toast({ title: "Envoi échoué", description: error?.response?.data?.message || "Impossible d'envoyer le code.", variant: "destructive" });
    }
  };

  return (
    <ModuleLayout activeItem="users">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-950 dark:text-gray-100">
                {isLoading ? "Chargement du compte..." : fullName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Modifier les informations et l'accès du compte.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocation("/admin/users")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux utilisateurs
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900">
            Chargement des informations...
          </div>
        ) : user ? (
          <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-2">
                <UserRound className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-950 dark:text-gray-100">Informations du compte</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Prénom">
                  <input
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950"
                    required
                    minLength={2}
                  />
                </Field>

                <Field label="Nom">
                  <input
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950"
                    required
                    minLength={2}
                  />
                </Field>

                <Field label="Email">
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950"
                        required
                      />
                    </div>
                    {form.email.trim().toLowerCase() !== user.email && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-400/30 dark:bg-blue-500/10">
                        <p className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-200">
                          Changement email: mot de passe admin + code envoyé au nouvel email.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <PasswordInput
                            value={form.adminPassword}
                            onChange={(value) => updateField("adminPassword", value)}
                            visible={showAdminPassword}
                            onToggle={() => setShowAdminPassword((current) => !current)}
                            placeholder="Mot de passe admin"
                          />
                          <button type="button" onClick={requestEmailCode} disabled={sendEmailCode.isPending} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
                            Envoyer code
                          </button>
                        </div>
                        <input
                          value={form.emailCode}
                          onChange={(event) => updateField("emailCode", event.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Code reçu sur le nouvel email"
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-center text-sm font-bold tracking-[0.35em] outline-none dark:border-gray-700 dark:bg-gray-950"
                        />
                      </div>
                    )}
                  </div>
                </Field>

                <Field label="Nouveau mot de passe">
                  <div className="space-y-3">
                    <PasswordInput
                      value={form.password}
                      onChange={(value) => updateField("password", value)}
                      visible={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                      placeholder="Laisser vide pour garder l'ancien"
                    />
                    {form.password.trim() && (
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-500/10">
                        <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-200">
                          Un code sera envoyé à l'email actuel du compte: {user.email}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            value={form.passwordCode}
                            onChange={(event) => updateField("passwordCode", event.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="Code"
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-center text-sm font-bold tracking-[0.35em] outline-none dark:border-gray-700 dark:bg-gray-950"
                          />
                          <button type="button" onClick={requestPasswordCode} disabled={sendPasswordCode.isPending} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
                            Envoyer code
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Field>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <p className="text-xs font-bold uppercase text-gray-400">Rôle</p>
                <p className="mt-1 text-sm font-semibold capitalize text-gray-950 dark:text-gray-100">{user.role}</p>
              </div>
            </section>

            <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-950 dark:text-gray-100">Accès</h2>
              </div>

              <button
                type="button"
                onClick={() => updateField("isActive", !form.isActive)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                  form.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">{form.isActive ? "Compte activé" : "Compte désactivé"}</span>
                  <span className="mt-1 block text-xs opacity-80">
                    {form.isActive ? "L'utilisateur peut accéder à la plateforme." : "L'utilisateur ne doit plus accéder à la plateforme."}
                  </span>
                </span>
                <Power className="h-5 w-5" />
              </button>

              <div className="mt-5 space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-950">
                <Info label="Compte créé" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"} />
                <Info label="Profil" value={user.profileType || user.role} />
              </div>

              <button
                type="submit"
                disabled={updateUser.isPending}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {updateUser.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </aside>
          </form>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900">
            Compte introuvable.
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}

// Role: Affiche et organise cet ecran.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

// Role: Affiche et organise cet ecran.
function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-gray-400">{label}</p>
      <p className="mt-1 font-semibold capitalize text-gray-900 dark:text-gray-100">{value || "-"}</p>
    </div>
  );
}

// Role: Affiche et organise cet ecran.
function PasswordInput({
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Key className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        title={visible ? "Masquer" : "Afficher"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
