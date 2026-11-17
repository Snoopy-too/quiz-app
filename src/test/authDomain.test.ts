import { describe, it, expect } from "vitest";
import {
  evaluateProfileGate,
  resolveLandingPath,
  sanitizeNextPath,
  type AuthProfile,
} from "../domain/auth";

function makeProfile(overrides: Partial<AuthProfile> = {}): AuthProfile {
  return {
    id: "user-1",
    email: "user@example.com",
    name: "Test User",
    role: "student",
    approved: true,
    verified: true,
    teacher_id: "teacher-1",
    teacher_invite_code: "ABCD1234",
    teacher_code: null,
    ...overrides,
  };
}

describe("auth domain rules", () => {
  describe("resolveLandingPath", () => {
    it("routes each role to its URL dashboard or /complete-profile when role is missing", () => {
      expect(resolveLandingPath(null)).toBe("/complete-profile");
      expect(resolveLandingPath({ role: null })).toBe("/complete-profile");
      expect(resolveLandingPath({ role: "teacher" })).toBe("/teacher");
      expect(resolveLandingPath({ role: "superadmin" })).toBe("/admin");
      expect(resolveLandingPath({ role: "student" })).toBe("/student");
      expect(resolveLandingPath({ role: "guest" })).toBe("/login");
    });
  });

  describe("evaluateProfileGate", () => {
    it("requires profile completion when role is missing", () => {
      expect(evaluateProfileGate(makeProfile({ role: null }))).toEqual({
        status: "complete-profile",
        landingPath: "/complete-profile",
      });
    });

    it("requires profile completion for Google OAuth student/teacher without invite or teacher code link", () => {
      const oauthStudent = makeProfile({
        role: "student",
        teacher_id: null,
        teacher_invite_code: null,
      });
      expect(evaluateProfileGate(oauthStudent, { isGoogleUser: true })).toEqual({
        status: "complete-profile",
        landingPath: "/complete-profile",
      });

      const oauthTeacherWithoutCode = makeProfile({
        role: "teacher",
        teacher_id: null,
        teacher_invite_code: null,
        teacher_code: null,
      });
      expect(evaluateProfileGate(oauthTeacherWithoutCode, { isGoogleUser: true })).toEqual({
        status: "complete-profile",
        landingPath: "/complete-profile",
      });

      const oauthTeacherWithCode = makeProfile({
        role: "teacher",
        teacher_id: null,
        teacher_invite_code: null,
        teacher_code: "TCHR9999",
      });
      expect(evaluateProfileGate(oauthTeacherWithCode, { isGoogleUser: true })).toEqual({
        status: "ok",
        landingPath: "/teacher",
      });
    });

    it("blocks unapproved and unverified non-superadmin accounts", () => {
      expect(evaluateProfileGate(makeProfile({ approved: false }))).toEqual({
        status: "blocked",
        reason: "unapproved",
      });
      expect(evaluateProfileGate(makeProfile({ verified: false }))).toEqual({
        status: "blocked",
        reason: "unverified",
      });
    });

    it("allows superadmins regardless of approval flags or Google OAuth link", () => {
      const admin = makeProfile({
        role: "superadmin",
        approved: false,
        verified: false,
        teacher_id: null,
        teacher_invite_code: null,
      });
      expect(evaluateProfileGate(admin, { isGoogleUser: true })).toEqual({
        status: "ok",
        landingPath: "/admin",
      });
    });
  });

  describe("sanitizeNextPath", () => {
    it("allows relative same-origin paths and rejects external or protocol-relative URLs", () => {
      expect(sanitizeNextPath("/teacher/quizzes")).toBe("/teacher/quizzes");
      expect(sanitizeNextPath("  /join/123456?foo=1 ")).toBe("/join/123456?foo=1");
      expect(sanitizeNextPath("https://evil.example/steal")).toBeNull();
      expect(sanitizeNextPath("//evil.example/steal")).toBeNull();
      expect(sanitizeNextPath("javascript:alert(1)")).toBeNull();
      expect(sanitizeNextPath(null)).toBeNull();
      expect(sanitizeNextPath("")).toBeNull();
    });
  });
});
