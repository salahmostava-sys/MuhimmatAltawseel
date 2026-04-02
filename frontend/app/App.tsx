import { lazy, Suspense } from "react";
import { ChunkRecoveryBootstrap } from "@app/components/ChunkRecoveryBootstrap";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, RouterProvider, createBrowserRouter, Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "@src/context/AuthContext";
import { LanguageProvider } from "@src/context/LanguageContext";
import { ThemeProvider } from "@src/context/ThemeContext";
import { SystemSettingsProvider } from "@src/context/SystemSettingsContext";
import ProtectedRoute from "@src/components/ProtectedRoute";
import PageGuard from "@src/components/PageGuard";
import ErrorBoundary from "@src/components/ErrorBoundary";
import { ErrorContextSync } from "@app/components/ErrorContextSync";
import { TemporalProvider } from "@src/context/TemporalContext";
import DashboardLayout from "@src/layouts/DashboardLayout";
import PublicLayout from "@src/layouts/PublicLayout";
import Loading from "@src/components/Loading";
import { emitAuthFailure, isStrictUnauthenticatedError } from "@shared/lib/auth/authFailureBus";
import "@src/i18n";

const Login = lazy(() => import("@src/pages/Login"));
const ForgotPassword = lazy(() => import("@src/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@src/pages/ResetPassword"));
const Dashboard = lazy(() => import("@src/pages/Dashboard"));
const Employees = lazy(() => import("@src/pages/Employees"));
const Attendance = lazy(() => import("@src/pages/Attendance"));
const Orders = lazy(() => import("@src/pages/Orders"));
const Salaries = lazy(() => import("@src/pages/Salaries"));
const Advances = lazy(() => import("@src/pages/Advances"));
const FuelPage = lazy(() => import("@src/pages/Fuel"));
const MaintenancePage = lazy(() => import("@src/pages/Maintenance"));
const Apps = lazy(() => import("@src/pages/Apps"));
const Alerts = lazy(() => import("@src/pages/Alerts"));
const SettingsHub = lazy(() => import("@src/pages/SettingsHub"));
const ViolationResolverPage = lazy(() => import("@src/pages/ViolationResolver"));
const Motorcycles = lazy(() => import("@src/pages/Motorcycles"));
const VehicleAssignment = lazy(() => import("@src/pages/VehicleAssignment"));
const EmployeeTiers = lazy(() => import("@src/pages/EmployeeTiers"));
const PlatformAccounts = lazy(() => import("@src/pages/PlatformAccounts"));
const AiAnalytics = lazy(() => import("@src/pages/AiAnalytics"));
const FinanceDashboard = lazy(() => import("@src/pages/FinanceDashboard"));
const ProfilePage = lazy(() => import("@src/pages/Profile"));
const NotFound = lazy(() => import("@src/pages/NotFound"));

const PageLoader = () => {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}`;
  return <Loading minHeightClassName="min-h-[300px]" resetKey={resetKey} />;
};

const handleGlobalAuthError = (source: "query" | "mutation", error: unknown) => {
  if (!isStrictUnauthenticatedError(error)) return;
  emitAuthFailure({ source, reason: "unauthenticated" });
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => handleGlobalAuthError("query", error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleGlobalAuthError("mutation", error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const DashboardRouteShell = () => (
  <DashboardLayout>
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  </DashboardLayout>
);

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicLayout>
        <Login />
      </PublicLayout>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <PublicLayout>
        <ForgotPassword />
      </PublicLayout>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicLayout>
        <ResetPassword />
      </PublicLayout>
    ),
  },
  { path: "/forgot", element: <Navigate to="/forgot-password" replace /> },
  { path: "/forget-password", element: <Navigate to="/forgot-password" replace /> },
  { path: "/reset", element: <Navigate to="/reset-password" replace /> },
  { path: "/resetpass", element: <Navigate to="/reset-password" replace /> },

  {
    path: "/*",
    element: (
      <ProtectedRoute>
        <DashboardRouteShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "employees", element: <PageGuard pageKey="employees"><Employees /></PageGuard> },
      { path: "attendance", element: <PageGuard pageKey="attendance"><Attendance /></PageGuard> },
      { path: "orders", element: <PageGuard pageKey="orders"><Orders /></PageGuard> },
      { path: "salaries", element: <PageGuard pageKey="salaries"><Salaries /></PageGuard> },
      { path: "advances", element: <PageGuard pageKey="advances"><Advances /></PageGuard> },
      { path: "motorcycles", element: <PageGuard pageKey="vehicles"><Motorcycles /></PageGuard> },
      {
        path: "vehicle-assignment",
        element: <PageGuard pageKey="vehicle_assignment"><VehicleAssignment /></PageGuard>,
      },
      { path: "fuel", element: <PageGuard pageKey="fuel"><FuelPage /></PageGuard> },
      { path: "maintenance", element: <PageGuard pageKey="maintenance"><MaintenancePage /></PageGuard> },
      { path: "apps", element: <PageGuard pageKey="apps"><Apps /></PageGuard> },
      { path: "alerts", element: <PageGuard pageKey="alerts"><Alerts /></PageGuard> },
      { path: "employee-tiers", element: <PageGuard pageKey="employee_tiers"><EmployeeTiers /></PageGuard> },
      {
        path: "platform-accounts",
        element: <PageGuard pageKey="platform_accounts"><PlatformAccounts /></PageGuard>,
      },
      { path: "ai-analytics", element: <PageGuard pageKey="ai_analytics"><AiAnalytics /></PageGuard> },
      {
        path: "finance-dashboard",
        element: <PageGuard pageKey="finance_dashboard"><FinanceDashboard /></PageGuard>,
      },
      { path: "profile", element: <ProfilePage /> },
      { path: "profile-page", element: <Navigate to="/profile" replace /> },
      { path: "settings", element: <PageGuard pageKey="settings"><SettingsHub /></PageGuard> },
      { path: "settings/general", element: <Navigate to="/settings?tab=general" replace /> },
      { path: "settings/schemes", element: <Navigate to="/settings?tab=schemes" replace /> },
      { path: "settings/users", element: <Navigate to="/settings?tab=users" replace /> },
      { path: "settings/permissions", element: <Navigate to="/settings?tab=users" replace /> },
      { path: "settings/profile", element: <Navigate to="/profile" replace /> },
      { path: "activity-log", element: <Navigate to="/settings?tab=activity" replace /> },
      { path: "reports", element: <Navigate to="/settings?tab=activity" replace /> },
      { path: "vehicles", element: <Navigate to="/motorcycles" replace /> },
      { path: "vehicle-tracking", element: <Navigate to="/motorcycles" replace /> },
      { path: "deductions", element: <Navigate to="/advances" replace /> },
      {
        path: "violation-resolver",
        element: <PageGuard pageKey="violation_resolver"><ViolationResolverPage /></PageGuard>,
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ChunkRecoveryBootstrap />
    <ThemeProvider>
      <TooltipProvider>
        <Toaster position="top-center" />
        <AuthProvider>
          <ErrorContextSync />
          <LanguageProvider>
            <TemporalProvider>
              <SystemSettingsProvider>
                <ErrorBoundary>
                  <RouterProvider
                    router={router}
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  />
                </ErrorBoundary>
              </SystemSettingsProvider>
            </TemporalProvider>
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
