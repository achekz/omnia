import { useState } from "react";
import { ModuleLayout } from "@/components/layout/module-layout";
import {
  HelpCircle,
  MessageSquare,
  Book,
  Zap,
  Bug,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I create an account?",
    answer:
      "Click on the 'Sign Up' button on the landing page. Choose your profile type (Student, Employee, Company, or Cabinet), fill in your details, and verify your email. You'll be ready to use Omni AI in minutes!",
  },
  {
    category: "Getting Started",
    question: "What are the different profile types?",
    answer:
      "Student: For academic planning and budget tracking. Employee: For performance tracking and task management. Company: For team management and financial oversight. Cabinet: For professional service providers.",
  },
  {
    category: "Features",
    question: "What is AI Insight?",
    answer:
      "AI Insight is our machine learning feature that analyzes your data to provide predictive insights, anomaly detection in finances, and personalized recommendations to help you make better decisions.",
  },
  {
    category: "Features",
    question: "Can I track my budget?",
    answer:
      "Yes! The Budget Tracker feature (available for students) lets you set budgets, track spending, and receive alerts when you're approaching limits. It uses AI to suggest savings opportunities.",
  },
  {
    category: "Security",
    question: "How is my data protected?",
    answer:
      "We use industry-standard encryption (SSL/TLS) for data in transit and bcrypt hashing for passwords. All data is stored securely on MongoDB with multi-tenant isolation to ensure your information stays private.",
  },
  {
    category: "Security",
    question: "Can I delete my account?",
    answer:
      "Yes, you can delete your account under Settings > Account Settings. This will permanently remove all your data from our servers. Note: This action cannot be undone.",
  },
  {
    category: "Privacy",
    question: "What is a private account?",
    answer:
      "A private account means only people you approve can see your profile and activity. Public accounts can be viewed by anyone. You can toggle this in Settings > Privacy.",
  },
  {
    category: "Privacy",
    question: "Who can see my financial information?",
    answer:
      "Only you can see your financial data by default. If you're part of a company, managers can see relevant financial data based on your role and permissions set by your administrator.",
  },
  {
    category: "Troubleshooting",
    question: "Why can't I log in?",
    answer:
      "First, make sure you're using the correct email and password. If you forgot your password, click 'Forgot Password' on the login page. If you're still having issues, please contact our support team.",
  },
  {
    category: "Troubleshooting",
    question: "How do I report a bug?",
    answer:
      "Go to Help Center > Report a Bug, describe the issue in detail, and include steps to reproduce it. Our team will investigate and get back to you within 24 hours.",
  },
];

interface FAQCategory {
  name: string;
  items: FAQItem[];
  icon: React.ReactNode;
}

export default function HelpCenterPage() {
  // const [, setLocation] = useLocation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories: FAQCategory[] = [
    {
      name: "Getting Started",
      icon: <Zap className="w-5 h-5" />,
      items: faqItems.filter((item) => item.category === "Getting Started"),
    },
    {
      name: "Features",
      icon: <Book className="w-5 h-5" />,
      items: faqItems.filter((item) => item.category === "Features"),
    },
    {
      name: "Troubleshooting",
      icon: <Bug className="w-5 h-5" />,
      items: faqItems.filter((item) => item.category === "Troubleshooting"),
    },
  ];

  const filteredItems = selectedCategory
    ? faqItems.filter((item) => item.category === selectedCategory)
    : faqItems;

  return (
    <ModuleLayout activeItem="help">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <HelpCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-gray-100">Help Center</h1>
          </div>
        </div>

        {/* Quick Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <button className="p-6 bg-gradient-to-br from-purple-50 dark:from-purple-950/20 to-purple-100 dark:to-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all text-left group">
            <div className="flex items-start justify-between mb-2">
              <MessageSquare className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Contact Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get help from our support team</p>
            <p className="text-xs text-purple-600 font-medium mt-3">
              support@omniai.com →
            </p>
          </button>

          <button className="p-6 bg-gradient-to-br from-blue-50 dark:from-blue-950/20 to-blue-100 dark:to-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left group">
            <div className="flex items-start justify-between mb-2">
              <Mail className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Report a Bug</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Help us improve by reporting issues</p>
            <p className="text-xs text-blue-600 font-medium mt-3">
              bugs@omniai.com →
            </p>
          </button>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedCategory === null
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <p className={`font-semibold ${selectedCategory === null ? "text-purple-900 dark:text-purple-200" : "text-gray-900 dark:text-gray-100"}`}>
                All Topics
              </p>
            </button>
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedCategory === category.name
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className={`mb-2 ${selectedCategory === category.name ? "text-purple-600 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"}`}>
                  {category.icon}
                </div>
                <p className={`font-semibold ${selectedCategory === category.name ? "text-purple-900 dark:text-purple-200" : "text-gray-900 dark:text-gray-100"}`}>
                  {category.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Frequently Asked Questions
            {selectedCategory && ` - ${selectedCategory}`}
          </h2>
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const itemIndex = faqItems.indexOf(item);
              const isExpanded = expandedIndex === itemIndex;

              return (
                <div
                  key={itemIndex}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : itemIndex)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{item.question}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.category}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* No Results */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-300">No topics found in this category</p>
          </div>
        )}

        {/* Footer CTA */}
        <div className="bg-gradient-to-r from-purple-50 dark:from-purple-950/30 to-blue-50 dark:to-blue-950/30 rounded-xl border border-purple-200 dark:border-purple-900 p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Didn't find what you're looking for?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Our support team is here to help. Reach out to us anytime.
          </p>
          <button className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </ModuleLayout>
  );
}
