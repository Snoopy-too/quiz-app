import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { generateTeacherCode, unformatTeacherCode } from "../../utils/teacherCode";
import AuthLayout from "./AuthLayout";
import { Button, Field, Input, Select } from "../ui";

export default function CompleteProfile({ user, setAppState, setView, setSuccess, setError }) {
  const { t } = useTranslation();
  const [teacherInviteCode, setTeacherInviteCode] = useState(user?.teacher_invite_code || "");
  const [role, setRole] = useState(user?.role || "");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  useEffect(() => {
    const fetchSchools = async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .order("name", { ascending: true });
      if (!error && data) setSchools(data);
    };
    fetchSchools();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setError?.("");
    setSuccess?.("");

    if (!role) {
      setLocalError(t("errors.selectRoleToContinue") || "Please select your role to continue.");
      return;
    }

    const trimmedCode = teacherInviteCode?.trim();
    if (role === "student" && !teacherInviteCode.trim()) {
      setLocalError(
        t("errors.teacherCodeRequired") || "Teacher code is required for students.",
      );
      return;
    }
    if (role === "teacher" && !selectedSchoolId) {
      setLocalError(t("errors.selectSchool") || "Please select a school.");
      return;
    }
    setSubmitting(true);

    try {
      const updates = { role };
      let linkedTeacher = null;

      if (role === "student") {
        const cleanedCode = unformatTeacherCode(trimmedCode);

        const { data: teacher, error: teacherError } = await supabase
          .from("users")
          .select("id, teacher_code, name, school_id")
          .eq("teacher_code", cleanedCode)
          .eq("role", "teacher")
          .maybeSingle();

        if (teacherError) {
          throw new Error(
            t("errors.unableToValidateTeacherCode") ||
              "Unable to validate teacher invitation code. Please try again.",
          );
        }

        if (!teacher) {
          setLocalError(
            t("errors.invalidTeacherCode") ||
              "Invalid teacher code. Please check the code and try again.",
          );
          setSubmitting(false);
          return;
        }

        updates.teacher_id = teacher.id;
        updates.teacher_invite_code = cleanedCode;
        updates.student_id = studentId.trim() || null;
        updates.school_id = teacher.school_id || null;
        linkedTeacher = teacher;
      } else if (role === "teacher") {
        if (!selectedSchoolId) {
          setLocalError(t("errors.selectSchool") || "Please select your school.");
          setSubmitting(false);
          return;
        }
        updates.school_id = selectedSchoolId;
        const existingCode = user?.teacher_code;

        if (!existingCode) {
          let uniqueCode = null;
          let attempts = 0;

          while (!uniqueCode && attempts < 10) {
            attempts += 1;
            const candidate = generateTeacherCode();
            const { data: codeMatch, error: codeError } = await supabase
              .from("users")
              .select("id")
              .eq("teacher_code", candidate)
              .maybeSingle();

            if (codeError) {
              throw new Error(
                t("errors.unableToGenerateTeacherCode") ||
                  "Unable to generate teacher code. Please try again.",
              );
            }

            if (!codeMatch) {
              uniqueCode = candidate;
            }
          }

          if (!uniqueCode) {
            throw new Error(
              t("errors.unableToGenerateTeacherCodeLater") ||
                "Unable to generate a teacher code. Please try again later.",
            );
          }

          updates.teacher_code = uniqueCode;
        }

        updates.teacher_id = null;
        updates.teacher_invite_code = trimmedCode || null;
      } else {
        updates.teacher_id = null;
        updates.teacher_invite_code = trimmedCode || null;
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(
          updateError.message ||
            t("errors.profileUpdateFailed") ||
            "Profile update failed. Please try again.",
        );
      }

      setAppState?.((prev) => ({
        ...prev,
        currentUser: updatedUser,
      }));

      if (role === "student" && (teacherInviteCode || (user && user.teacher_id))) {
        const teacherName = linkedTeacher?.name || "your teacher";
        setSuccess?.(
          t("auth.successConnected", { name: teacherName }) ||
            `You're all set! You're now connected to ${teacherName}.`,
        );
        if (!updatedUser.approved) {
          sessionStorage.setItem("quizapp_registered_email", updatedUser.email);
          await supabase.auth.signOut();
          setView?.("registration-success");
        } else {
          setView?.("student-dashboard");
        }
      } else if (role === "teacher") {
        if (!updatedUser.approved) {
          sessionStorage.setItem("quizapp_registered_email", updatedUser.email);
          await supabase.auth.signOut();
          setSuccess?.(
            t("auth.teacherPendingApproval") ||
              "Your teacher profile has been submitted and is pending administrator approval.",
          );
          setView?.("login");
        } else {
          setSuccess?.(
            t("auth.welcomeTeacher") || "Welcome! Your teacher profile is ready.",
          );
          setView?.("teacher-dashboard");
        }
      } else if (role === "superadmin") {
        setSuccess?.(t("messages.profileUpdatedSuccess") || "Profile updated successfully.");
        setView?.("superadmin-dashboard");
      } else {
        setSuccess?.(t("messages.profileUpdatedSuccess") || "Profile updated successfully.");
        if (!updatedUser.approved) {
          sessionStorage.setItem("quizapp_registered_email", updatedUser.email);
          await supabase.auth.signOut();
          setView?.("registration-success");
        } else {
          setView?.("student-dashboard");
        }
      }
    } catch (err) {
      setLocalError(
        err.message ||
          t("errors.registrationFailedGeneral") ||
          "Failed to complete profile. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.almostDone")}
      subtitle={t("auth.completeProfileBelow")}
      error={localError || null}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {role !== "teacher" && (
          <>
            <Field label={t("auth.studentId")}>
              <Input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder={t("auth.studentIdPlaceholder") || "e.g. 12345"}
              />
            </Field>

            <Field
              label={t("auth.enterTeacherCode")}
              hint={t("auth.studentsMustEnterCode")}
            >
              <Input
                type="text"
                value={teacherInviteCode}
                onChange={(e) => setTeacherInviteCode(e.target.value.toUpperCase())}
                placeholder={t("auth.teacherCodeExample")}
                className="uppercase tracking-wider"
              />
            </Field>
          </>
        )}

        <Field
          label={t("auth.selectYourRole")}
          hint={role === "teacher" ? t("auth.teachersNoCodeNeeded") : undefined}
          required
        >
          <Select
            value={role || ""}
            onChange={(e) => {
              setRole(e.target.value);
              setLocalError("");
            }}
          >
            <option value="" disabled>
              {t("auth.selectRole")}
            </option>
            <option value="student">{t("auth.student")}</option>
            <option value="teacher">{t("auth.teacher")}</option>
          </Select>
        </Field>

        {role === "teacher" && (
          <Field label={t("auth.selectSchoolTitle") || "Select Your School"} required>
            <Select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              required
            >
              <option value="">
                {t("auth.selectSchool") || "— Select a School —"}
              </option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          className="w-full"
        >
          {submitting ? t("auth.saving") : t("common.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
