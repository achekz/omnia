import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { AxiosError } from "axios";
import apiClient from "../lib/api-client";
import type { AuthResponse, LoginRequest, RegisterRequest, User, UserRole } from "../lib/types";
import { useToast } from "./use-toast";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearAllUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  employee: "/employee/dashboard",
  stagiaire: "/student/dashboard",
  comptable: "/comptable/dashboard",
};

function normalizeRole(value: unknown, fallback: UserRole = "employee"): UserRole {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "admin" || normalized === "company_admin" || normalized === "cabinet_admin" || normalized === "manager" || normalized === "entreprise") {
    return "admin";
  }

  if (normalized === "employee" || normalized === "employe" || normalized === "employé" || normalized === "rh" || normalized === "hr") {
    return "employee";
  }

  if (normalized === "stagiaire" || normalized === "intern" || normalized === "student" || normalized === "etudiant" || normalized === "étudiant") {
    return "stagiaire";
  }

  if (normalized === "comptable" || normalized === "accountant") {
    return "comptable";
  }

  return fallback;
}

function normalizeUser(rawUser: Partial<User> | Record<string, unknown>): User {
  const source = rawUser as Partial<User> & Record<string, unknown>;
  const role = normalizeRole(source.role || source.profileType, "employee");
  const profileType = normalizeRole(source.profileType || source.role, role);
  const fullName = String(source.name || "").trim();
  const firstName = String(source.firstName || fullName.split(" ")[0] || "User").trim();
  const lastName = String(source.lastName || fullName.split(" ").slice(1).join(" ")).trim();
  const name = fullName || `${firstName} ${lastName}`.trim();

  return {
    _id: source._id,
    id: source.id,
    firstName,
    lastName,
    name,
    email: String(source.email || ""),
    phoneNumber: source.phoneNumber,
    city: source.city,
    role,
    profileType,
    verificationMethod: source.verificationMethod || "email",
    gender: source.gender || "male",
    tenantId: source.tenantId,
    avatar: source.avatar,
    isVerified: source.isVerified ?? true,
    isPublic: source.isPublic,
    createdAt: source.createdAt,
    preferences: source.preferences,
  } as User;
}

function getRedirectPath(user: User) {
  return ROLE_REDIRECTS[user.profileType] || ROLE_REDIRECTS[user.role] || "/employee/dashboard";
}

function getErrorMessage(error: unknown, fallback: string) {
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

function clearStoredAuth() {
  localStorage.removeItem("omni_ai_token");
  localStorage.removeItem("omni_ai_refreshToken");
  localStorage.removeItem("omni_ai_user");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("omni_ai_token");
      const storedUser = localStorage.getItem("omni_ai_user");

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        setToken(storedToken);
        if (storedUser) {
          setUser(normalizeUser(JSON.parse(storedUser)));
        }

        const response = await apiClient.get("/auth/me");
        const normalizedUser = normalizeUser(response.data?.data?.user || response.data?.user || {});
        localStorage.setItem("omni_ai_user", JSON.stringify(normalizedUser));
        setUser(normalizedUser);
      } catch {
        clearStoredAuth();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await apiClient.post("/auth/login", data);
      const authData = response.data.data as AuthResponse;
      const normalizedUser = normalizeUser(authData.user);

      localStorage.setItem("omni_ai_token", authData.accessToken);
      localStorage.setItem("omni_ai_refreshToken", authData.refreshToken);
      localStorage.setItem("omni_ai_user", JSON.stringify(normalizedUser));

      setToken(authData.accessToken);
      setUser(normalizedUser);

      toast({ title: "Welcome back!", description: "Successfully logged in." });
      setLocation(getRedirectPath(normalizedUser));
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: getErrorMessage(error, "Invalid credentials."),
      });
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await apiClient.post("/auth/register", data);
      const authData = response.data.data as AuthResponse;
      const normalizedUser = normalizeUser(authData.user);

      localStorage.setItem("omni_ai_token", authData.accessToken);
      localStorage.setItem("omni_ai_refreshToken", authData.refreshToken);
      localStorage.setItem("omni_ai_user", JSON.stringify(normalizedUser));

      setToken(authData.accessToken);
      setUser(normalizedUser);

      toast({ title: "Account created!", description: "Your account is ready." });
      setLocation(getRedirectPath(normalizedUser));
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: getErrorMessage(error, "Could not create account."),
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      const currentToken = localStorage.getItem("omni_ai_token");
      if (currentToken) {
        await apiClient.post("/auth/logout");
      }
    } catch {
      // Local logout still succeeds when the access token is expired or already revoked.
    } finally {
      clearStoredAuth();
      setToken(null);
      setUser(null);
      setLocation("/login");
    }
  };

  const clearAllUsers = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        clearAllUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
