export type UserRole = "student" | "teacher" | "superadmin";

export interface AuthProfile {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  approved: boolean | null;
  verified: boolean | null;
  teacher_code?: string | null;
  teacher_id?: string | null;
  teacher_invite_code?: string | null;
  avatar_url?: string | null;
  school_id?: string | null;
  student_id?: string | null;
}

export type ProfileGateResult =
  | { status: "ok"; landingPath: string }
  | { status: "complete-profile"; landingPath: "/complete-profile" }
  | { status: "blocked"; reason: "unapproved" | "unverified" };

/**
 * Resolves the default authenticated home path for a user profile.
 */
export function resolveLandingPath(profile: Pick<AuthProfile, "role"> | null | undefined): string {
  if (!profile || !profile.role) {
    return "/complete-profile";
  }

  switch (profile.role) {
    case "teacher":
      return "/teacher";
    case "superadmin":
      return "/admin";
    case "student":
      return "/student";
    default:
      return "/login";
  }
}

/**
 * Evaluates whether a profile satisfies role, OAuth teacher-linking, approval,
 * and verification gates before entering the authenticated app.
 */
export function evaluateProfileGate(
  profile: AuthProfile | null | undefined,
  options: { isGoogleUser?: boolean } = {},
): ProfileGateResult {
  if (!profile || !profile.role) {
    return { status: "complete-profile", landingPath: "/complete-profile" };
  }

  const hasInviteOrLink = Boolean(
    profile.teacher_invite_code ||
      profile.teacher_id ||
      (profile.role === "teacher" && profile.teacher_code),
  );

  if (options.isGoogleUser && profile.role !== "superadmin" && !hasInviteOrLink) {
    return { status: "complete-profile", landingPath: "/complete-profile" };
  }

  if (profile.role !== "superadmin") {
    if (!profile.approved) {
      return { status: "blocked", reason: "unapproved" };
    }
    if (!profile.verified) {
      return { status: "blocked", reason: "unverified" };
    }
  }

  return { status: "ok", landingPath: resolveLandingPath(profile) };
}

/**
 * Prevents open redirects by allowing only same-origin relative paths.
 */
export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}
