import { Suspense, useEffect, useState, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import ErrorBoundary from "../components/common/ErrorBoundary.jsx";
import AppShell from "../components/layout/AppShell";
import { Spinner } from "../components/ui";
import { resolveLandingPath } from "../domain/auth";
import { supabase } from "../supabaseClient";
import { lazyWithRetry } from "../utils/lazyWithRetry";
import { useAppAuth } from "./authContext";
import { RequireAuth, RequireGuest, RequireRole } from "./guards";
import { pathToView, useLegacySetView } from "./legacyNavigation";
import NotFoundPage from "./NotFoundPage";
import RouteErrorFallback from "./RouteErrorFallback";

const Login = lazyWithRetry(() => import("../components/auth/Login"));
const Register = lazyWithRetry(() => import("../components/auth/Register"));
const RegistrationSuccess = lazyWithRetry(() => import("../components/auth/RegistrationSuccess"));
const VerifyEmail = lazyWithRetry(() => import("../components/auth/VerifyEmail"));
const ForgotPassword = lazyWithRetry(() => import("../components/auth/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("../components/auth/ResetPassword"));
const CompleteProfile = lazyWithRetry(() => import("../components/auth/CompleteProfile"));

const StudentDashboard = lazyWithRetry(() => import("../components/dashboards/StudentDashboard"));
const TeacherDashboard = lazyWithRetry(() => import("../components/dashboards/TeacherDashboard"));
const SuperAdminDashboard = lazyWithRetry(() => import("../components/dashboards/SuperAdminDashboard"));

const CreateQuiz = lazyWithRetry(() => import("../components/quizzes/CreateQuiz"));
const EditQuiz = lazyWithRetry(() => import("../components/quizzes/EditQuiz"));
const PreviewQuiz = lazyWithRetry(() => import("../components/quizzes/PreviewQuiz"));
const TeacherControl = lazyWithRetry(() => import("../components/quizzes/TeacherControl"));

const ManageQuizzes = lazyWithRetry(() => import("../components/teachers/ManageQuizzes"));
const ManageStudents = lazyWithRetry(() => import("../components/teachers/ManageStudents"));
const Reports = lazyWithRetry(() => import("../components/teachers/Reports"));
const StudentReport = lazyWithRetry(() => import("../components/teachers/StudentReport"));
const PublicQuizzes = lazyWithRetry(() => import("../components/teachers/PublicQuizzes"));

const StudentQuiz = lazyWithRetry(() => import("../components/students/StudentQuiz"));
const AssignedQuizzes = lazyWithRetry(() => import("../components/students/AssignedQuizzes"));
const AssignedQuizTaking = lazyWithRetry(() => import("../components/students/AssignedQuizTaking"));
const StudentResults = lazyWithRetry(() => import("../components/students/StudentResults"));
const CreateTeam = lazyWithRetry(() => import("../components/students/CreateTeam"));

const Settings = lazyWithRetry(() => import("../components/settings/Settings"));
const UiGallery = lazyWithRetry(() => import("./dev/UiGallery"));

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <Spinner size="lg" label="Loading view" />
    </div>
  );
}

function LazyWrap({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function RootRedirect() {
  const { appState, authReady } = useAppAuth();
  if (!authReady) {
    return <RouteFallback />;
  }
  if (!appState.currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={resolveLandingPath(appState.currentUser)} replace />;
}

function ShellFrame() {
  const { appState } = useAppAuth();
  const setView = useLegacySetView();
  const location = useLocation();
  const currentView = pathToView(location.pathname);
  const [pendingAssignmentCount, setPendingAssignmentCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const studentId = appState.currentUser?.id;
    const role = appState.currentUser?.role;
    const approved = appState.currentUser?.approved;

    if (role !== "student" || !studentId || !approved) {
      return;
    }

    const fetchCount = async () => {
      try {
        const { data, error } = await supabase.rpc("get_pending_assignment_count", {
          p_student_id: studentId,
        });
        if (!cancelled && !error && typeof data === "number") {
          setPendingAssignmentCount(data);
          return;
        }
      } catch {
        // Fallback query below
      }

      try {
        const { data, error } = await supabase
          .from("quiz_assignments")
          .select("id")
          .eq("student_id", studentId)
          .in("status", ["pending", "in_progress"])
          .gt("deadline", new Date().toISOString());
        if (!cancelled && !error && data) {
          setPendingAssignmentCount(data.length);
        }
      } catch {
        // Non-critical badge fetch
      }
    };

    fetchCount();
    return () => {
      cancelled = true;
    };
  }, [appState.currentUser?.id, appState.currentUser?.role, appState.currentUser?.approved, location.pathname]);

  const displayedPendingCount =
    appState.currentUser?.role === "student" && appState.currentUser?.approved
      ? pendingAssignmentCount
      : 0;

  return (
    <AppShell
      currentView={currentView}
      setView={setView}
      appState={appState}
      pendingAssignmentCount={displayedPendingCount}
    >
      <LazyWrap>
        <Outlet />
      </LazyWrap>
    </AppShell>
  );
}

// --- Auth Route Wrappers ---

function LoginRoute() {
  const { appState, setAppState, setError, setSuccess, error, success } = useAppAuth();
  const setView = useLegacySetView();
  return (
    <LazyWrap>
      <Login
        appState={appState}
        setAppState={setAppState}
        setView={setView}
        setError={setError}
        setSuccess={setSuccess}
        globalError={error}
        globalSuccess={success}
      />
    </LazyWrap>
  );
}

function RegisterRoute() {
  const { error, setError, success, setSuccess } = useAppAuth();
  const setView = useLegacySetView();
  return (
    <LazyWrap>
      <Register
        setView={setView}
        error={error}
        setError={setError}
        success={success}
        setSuccess={setSuccess}
      />
    </LazyWrap>
  );
}

function RegistrationSuccessRoute() {
  const setView = useLegacySetView();
  return (
    <LazyWrap>
      <RegistrationSuccess setView={setView} />
    </LazyWrap>
  );
}

function VerifyEmailRoute() {
  const { error, success, setError, setSuccess } = useAppAuth();
  const setView = useLegacySetView();
  return (
    <LazyWrap>
      <VerifyEmail
        setView={setView}
        error={error}
        success={success}
        setError={setError}
        setSuccess={setSuccess}
      />
    </LazyWrap>
  );
}

function ForgotPasswordRoute() {
  const setView = useLegacySetView();
  return (
    <LazyWrap>
      <ForgotPassword setView={setView} />
    </LazyWrap>
  );
}

function ResetPasswordRoute() {
  const { setSuccess } = useAppAuth();
  const setView = useLegacySetView();
  return (
    <LazyWrap>
      <ResetPassword setView={setView} setSuccess={setSuccess} />
    </LazyWrap>
  );
}

function CompleteProfileRoute() {
  const { appState, setAppState, setError, setSuccess } = useAppAuth();
  const setView = useLegacySetView();
  return (
    <LazyWrap>
      <CompleteProfile
        user={appState.currentUser}
        setAppState={setAppState}
        setView={setView}
        setError={setError}
        setSuccess={setSuccess}
      />
    </LazyWrap>
  );
}

// --- Student Route Wrappers ---

function StudentDashboardRoute() {
  const { appState, setAppState, error, setError, refreshProfile } = useAppAuth();
  const setView = useLegacySetView();
  const { pin } = useParams();
  return (
    <StudentDashboard
      appState={appState}
      setAppState={setAppState}
      setView={setView}
      error={error}
      setError={setError}
      initialPin={pin || ""}
      refreshProfile={refreshProfile}
    />
  );
}

function StudentQuizRoute() {
  const { appState } = useAppAuth();
  const setView = useLegacySetView();
  const { sessionId } = useParams();
  return (
    <ErrorBoundary>
      <LazyWrap>
        <StudentQuiz sessionId={sessionId} appState={appState} setView={setView} />
      </LazyWrap>
    </ErrorBoundary>
  );
}

function AssignedQuizzesRoute() {
  const { appState } = useAppAuth();
  const setView = useLegacySetView();
  const navigate = useNavigate();
  return (
    <AssignedQuizzes
      setView={setView}
      appState={appState}
      onStartAssignment={(assignmentId: string, viewResultsOnly = false) => {
        navigate(`/student/assignments/${encodeURIComponent(assignmentId)}${viewResultsOnly ? "?results=1" : ""}`);
      }}
    />
  );
}

function AssignedQuizTakingRoute() {
  const { appState } = useAppAuth();
  const setView = useLegacySetView();
  const { assignmentId } = useParams();
  const [searchParams] = useSearchParams();
  return (
    <LazyWrap>
      <AssignedQuizTaking
        assignmentId={assignmentId}
        appState={appState}
        setView={setView}
        viewResults={searchParams.get("results") === "1"}
      />
    </LazyWrap>
  );
}

function StudentResultsRoute() {
  const { appState } = useAppAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-canvas">
      <StudentResults appState={appState} onBack={() => navigate("/student")} />
    </div>
  );
}

function CreateTeamRoute() {
  const { appState, error, setError } = useAppAuth();
  const setView = useLegacySetView();
  const navigate = useNavigate();
  return (
    <CreateTeam
      appState={appState}
      setView={setView}
      error={error}
      setError={setError}
      onBack={() => navigate("/student")}
      isApproved={Boolean(appState.currentUser?.approved)}
    />
  );
}

// --- Teacher & Admin Route Wrappers ---

function TeacherDashboardRoute() {
  const { appState, setAppState } = useAppAuth();
  const setView = useLegacySetView();
  return <TeacherDashboard appState={appState} setAppState={setAppState} setView={setView} />;
}

function ManageQuizzesRoute() {
  const { appState } = useAppAuth();
  const setView = useLegacySetView();
  return <ManageQuizzes setView={setView} appState={appState} />;
}

function CreateQuizRoute() {
  const { appState } = useAppAuth();
  const setView = useLegacySetView();
  return <CreateQuiz setView={setView} appState={appState} />;
}

function EditQuizRoute() {
  const { appState } = useAppAuth();
  const setView = useLegacySetView();
  const { quizId } = useParams();
  return <EditQuiz setView={setView} quizId={quizId} appState={appState} />;
}

function PreviewQuizRoute() {
  const setView = useLegacySetView();
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const returnView =
    returnTo === "public-quizzes" || returnTo === "global-quizzes"
      ? returnTo
      : "manage-quizzes";
  return (
    <LazyWrap>
      <PreviewQuiz quizId={quizId} setView={setView} returnView={returnView} />
    </LazyWrap>
  );
}

function TeacherControlRoute() {
  const setView = useLegacySetView();
  const { sessionId } = useParams();
  return (
    <ErrorBoundary>
      <LazyWrap>
        <TeacherControl sessionId={sessionId} setView={setView} />
      </LazyWrap>
    </ErrorBoundary>
  );
}

function ManageStudentsRoute() {
  const { appState } = useAppAuth();
  const setView = useLegacySetView();
  return <ManageStudents setView={setView} appState={appState} />;
}

function ReportsRoute() {
  const { appState, selectedTeacherId } = useAppAuth();
  const setView = useLegacySetView();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuizId = searchParams.get("quizId");
  const queryTeacherId = searchParams.get("teacherId");

  return (
    <Reports
      setView={setView}
      appState={appState}
      initialQuizId={initialQuizId}
      onClearInitialQuizId={() => {
        if (searchParams.has("quizId")) {
          const next = new URLSearchParams(searchParams);
          next.delete("quizId");
          setSearchParams(next, { replace: true });
        }
      }}
      teacherId={queryTeacherId || selectedTeacherId}
    />
  );
}

function StudentReportRoute() {
  const { appState } = useAppAuth();
  const setView = useLegacySetView();
  const { studentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialAttemptId = searchParams.get("attemptId");
  const initialAttemptType = searchParams.get("attemptType");

  return (
    <StudentReport
      setView={setView}
      studentId={studentId}
      appState={appState}
      initialAttemptId={initialAttemptId}
      initialAttemptType={initialAttemptType}
      onClearInitialAttempt={() => {
        if (searchParams.has("attemptId") || searchParams.has("attemptType")) {
          const next = new URLSearchParams(searchParams);
          next.delete("attemptId");
          next.delete("attemptType");
          setSearchParams(next, { replace: true });
        }
      }}
    />
  );
}

function PublicQuizzesRoute({ viewType }: { viewType: "public" | "global" }) {
  const { appState } = useAppAuth();
  return <PublicQuizzes appState={appState} viewType={viewType} />;
}

function SuperAdminDashboardRoute() {
  const { appState, setSelectedTeacherId } = useAppAuth();
  const setView = useLegacySetView();
  return (
    <SuperAdminDashboard
      appState={appState}
      setView={setView}
      setSelectedTeacherId={setSelectedTeacherId}
    />
  );
}

function SettingsRoute() {
  const { appState, setAppState } = useAppAuth();
  const setView = useLegacySetView();
  return <Settings setView={setView} appState={appState} setAppState={setAppState} />;
}

export function createAppRouter(RootComponent: React.ComponentType) {
  const devRoutes = import.meta.env.DEV
    ? [
        {
          path: "/dev/ui",
          element: (
            <LazyWrap>
              <UiGallery />
            </LazyWrap>
          ),
        },
      ]
    : [];

  return createBrowserRouter([
    {
      path: "/",
      element: <RootComponent />,
      errorElement: <RouteErrorFallback />,
      children: [
        { index: true, element: <RootRedirect /> },
        {
          path: "login",
          element: (
            <RequireGuest>
              <LoginRoute />
            </RequireGuest>
          ),
        },
        {
          path: "register",
          element: (
            <RequireGuest>
              <RegisterRoute />
            </RequireGuest>
          ),
        },
        {
          path: "register/success",
          element: (
            <RequireGuest>
              <RegistrationSuccessRoute />
            </RequireGuest>
          ),
        },
        {
          path: "verify",
          element: (
            <RequireGuest>
              <VerifyEmailRoute />
            </RequireGuest>
          ),
        },
        {
          path: "forgot-password",
          element: (
            <RequireGuest>
              <ForgotPasswordRoute />
            </RequireGuest>
          ),
        },
        { path: "reset-password", element: <ResetPasswordRoute /> },
        {
          path: "complete-profile",
          element: (
            <RequireAuth>
              <CompleteProfileRoute />
            </RequireAuth>
          ),
        },
        {
          path: "play/:sessionId",
          element: (
            <RequireRole roles={["student"]}>
              <StudentQuizRoute />
            </RequireRole>
          ),
        },
        {
          path: "student/assignments/:assignmentId",
          element: (
            <RequireRole roles={["student"]}>
              <AssignedQuizTakingRoute />
            </RequireRole>
          ),
        },
        {
          path: "teacher/quizzes/:quizId/preview",
          element: (
            <RequireRole roles={["teacher", "superadmin"]}>
              <PreviewQuizRoute />
            </RequireRole>
          ),
        },
        {
          path: "teacher/host/:sessionId",
          element: (
            <RequireRole roles={["teacher"]}>
              <TeacherControlRoute />
            </RequireRole>
          ),
        },
        {
          element: (
            <RequireAuth>
              <ShellFrame />
            </RequireAuth>
          ),
          children: [
            {
              path: "student",
              element: (
                <RequireRole roles={["student"]}>
                  <StudentDashboardRoute />
                </RequireRole>
              ),
            },
            {
              path: "join/:pin?",
              element: (
                <RequireRole roles={["student"]}>
                  <StudentDashboardRoute />
                </RequireRole>
              ),
            },
            {
              path: "student/assignments",
              element: (
                <RequireRole roles={["student"]}>
                  <AssignedQuizzesRoute />
                </RequireRole>
              ),
            },
            {
              path: "student/results",
              element: (
                <RequireRole roles={["student"]}>
                  <StudentResultsRoute />
                </RequireRole>
              ),
            },
            {
              path: "student/team",
              element: (
                <RequireRole roles={["student"]}>
                  <CreateTeamRoute />
                </RequireRole>
              ),
            },
            {
              path: "teacher",
              element: (
                <RequireRole roles={["teacher"]}>
                  <TeacherDashboardRoute />
                </RequireRole>
              ),
            },
            {
              path: "teacher/quizzes",
              element: (
                <RequireRole roles={["teacher"]}>
                  <ManageQuizzesRoute />
                </RequireRole>
              ),
            },
            {
              path: "teacher/quizzes/new",
              element: (
                <RequireRole roles={["teacher"]}>
                  <CreateQuizRoute />
                </RequireRole>
              ),
            },
            {
              path: "teacher/quizzes/:quizId/edit",
              element: (
                <RequireRole roles={["teacher"]}>
                  <EditQuizRoute />
                </RequireRole>
              ),
            },
            {
              path: "teacher/students",
              element: (
                <RequireRole roles={["teacher"]}>
                  <ManageStudentsRoute />
                </RequireRole>
              ),
            },
            {
              path: "teacher/reports",
              element: (
                <RequireRole roles={["teacher", "superadmin"]}>
                  <ReportsRoute />
                </RequireRole>
              ),
            },
            {
              path: "teacher/reports/students/:studentId",
              element: (
                <RequireRole roles={["teacher", "superadmin"]}>
                  <StudentReportRoute />
                </RequireRole>
              ),
            },
            {
              path: "teacher/library/school",
              element: (
                <RequireRole roles={["teacher"]}>
                  <PublicQuizzesRoute viewType="public" />
                </RequireRole>
              ),
            },
            {
              path: "teacher/library/community",
              element: (
                <RequireRole roles={["teacher"]}>
                  <PublicQuizzesRoute viewType="global" />
                </RequireRole>
              ),
            },
            {
              path: "admin",
              element: (
                <RequireRole roles={["superadmin"]}>
                  <SuperAdminDashboardRoute />
                </RequireRole>
              ),
            },
            {
              path: "settings",
              element: (
                <RequireAuth>
                  <SettingsRoute />
                </RequireAuth>
              ),
            },
          ],
        },
        ...devRoutes,
        {
          path: "*",
          element: <NotFoundPage />,
        },
      ],
    },
  ]);
}
