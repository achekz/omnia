import { Briefcase, Building2, ClipboardList, LineChart, Target, UserPlus, Users } from "lucide-react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useAuth } from "@/hooks/useAuth";

const SECTION_CONTENT = {
  "/employee/organization": {
    activeItem: "organisation",
    title: "Organization",
    description: "View your team structure, reporting lines, and workspace responsibilities.",
    icon: Building2,
    bullets: [
      "Team directory and reporting visibility",
      "Department structure and collaboration mapping",
      "Current role responsibilities and ownership",
    ],
  },
  "/employee/analytics-engagement": {
    activeItem: "analytics-eng",
    title: "Engagement Analytics",
    description: "Follow employee engagement trends, feedback signals, and collaboration quality.",
    icon: LineChart,
    bullets: [
      "Engagement trend overview",
      "Participation and feedback indicators",
      "AI-driven collaboration observations",
    ],
  },
  "/employee/analytics": {
    activeItem: "analytics-rh",
    title: "Employee Analytics",
    description: "Track workplace performance analytics and monitor progress indicators.",
    icon: ClipboardList,
    bullets: [
      "Performance metrics and work rhythm",
      "Task completion and focus indicators",
      "Recent productivity insights",
    ],
  },
  "/employee/strategy": {
    activeItem: "vision",
    title: "Vision & Strategy",
    description: "Understand team priorities, current objectives, and strategic focus areas.",
    icon: Target,
    bullets: [
      "Quarter priorities and current goals",
      "Execution roadmap for your workspace",
      "Alignment with AI recommendations",
    ],
  },
  "/employee/recruitment": {
    activeItem: "recruitment",
    title: "Recruitment",
    description: "Review hiring progress, open roles, and onboarding-related updates.",
    icon: UserPlus,
    bullets: [
      "Open positions and hiring pipeline",
      "Interview and onboarding updates",
      "Upcoming recruitment actions",
    ],
  },
  "/employee/employees": {
    activeItem: "employes",
    title: "Employees",
    description: "Browse employee records, people data, and team-related resources.",
    icon: Users,
    bullets: [
      "Employee records and people information",
      "Contracts, leave, and attendance references",
      "Training and offboarding resources",
    ],
  },
  "/employee/projects": {
    activeItem: "projets",
    title: "Projects",
    description: "See current projects, ownership, and your active workstreams.",
    icon: Briefcase,
    bullets: [
      "Assigned project workstreams",
      "Project status and milestones",
      "Execution priorities for the current cycle",
    ],
  },
} as const;

export default function EmployeeSectionPage() {
  const { user } = useAuth();
  const [pathname] = useLocation();
  const section = SECTION_CONTENT[pathname as keyof typeof SECTION_CONTENT];

  if (!user || (user.profileType !== "employee" && user.role !== "employee")) {
    return (
      <ModuleLayout activeItem="dashboard">
        <div className="p-8 text-center text-gray-500">Access Restricted</div>
      </ModuleLayout>
    );
  }

  if (!section) {
    return (
      <ModuleLayout activeItem="dashboard">
        <div className="p-8 text-center text-gray-500">Section not found</div>
      </ModuleLayout>
    );
  }

  const Icon = section.icon;

  return (
    <ModuleLayout activeItem={section.activeItem}>
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">{section.title}</h1>
            <p className="text-gray-500 mt-2">{section.description}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {section.bullets.map((item) => (
            <div key={item} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-600">Employee</p>
              <p className="mt-3 text-lg font-semibold text-gray-900">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </ModuleLayout>
  );
}
