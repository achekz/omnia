import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api-client";
import type { User, LoginRequest, RegisterRequest } from "@/lib/types";
import { useToast } from "./use-toast";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("omniAI_token");
      if (storedToken) {
        try {
          // Verify token by fetching user profile
          const { data } = await api.get('/auth/me');
          setToken(storedToken);
          setUser(data.data.user);
        } catch (e) {
          localStorage.removeItem("omniAI_token");
          localStorage.removeItem("omniAI_user");
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const res = await api.post('/auth/login', data);
      const { user: userData, accessToken, refreshToken } = res.data.data;
      
      localStorage.setItem("omniAI_token", accessToken);
      localStorage.setItem("omniAI_refreshToken", refreshToken);
      localStorage.setItem("omniAI_user", JSON.stringify(userData));
      
      setToken(accessToken);
      setUser(userData);
      
      toast({ title: "Welcome back!", description: "Successfully logged in." });

      // Route to appropriate dashboard based on user type
      if (userData.profileType === "student") setLocation("/dashboard/student");
      else if (userData.profileType === "employee") setLocation("/dashboard/employee");
      else if (userData.profileType === "cabinet") setLocation("/dashboard/cabinet");
      else if (userData.profileType === "company") setLocation("/dashboard/company");
      else setLocation("/dashboard");
      
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.response?.data?.message || "Invalid credentials."
      });
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const res = await api.post('/auth/register', data);
      const { user: userData, accessToken, refreshToken } = res.data.data;
      
      localStorage.setItem("omniAI_token", accessToken);
      localStorage.setItem("omniAI_refreshToken", refreshToken);
      localStorage.setItem("omniAI_user", JSON.stringify(userData));
      
      setToken(accessToken);
      setUser(userData);
      
      toast({ title: "Account created!", description: "Welcome to OmniAI." });
      
      // Route based on profile type
      if (userData.profileType === "student") setLocation("/dashboard/student");
      else if (userData.profileType === "employee") setLocation("/dashboard/employee");
      else if (userData.profileType === "cabinet") setLocation("/dashboard/cabinet");
      else if (userData.profileType === "company") setLocation("/dashboard/company");
      else setLocation("/dashboard");

    } catch (error: any) {
      console.error("[Auth] Register error:", error);
       toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.response?.data?.message || "Could not create account."
      });
      throw error;
    }
  };

  const logout = () => {
    try { api.post('/auth/logout'); } catch (_) {}
    localStorage.removeItem("omniAI_token");
    localStorage.removeItem("omniAI_refreshToken");
    localStorage.removeItem("omniAI_user");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
