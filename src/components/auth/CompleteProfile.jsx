import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { generateTeacherCode, unformatTeacherCode } from "../../utils/teacherCode";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";

export default function CompleteProfile({ user, setAppState, setView, setSuccess, setError }) {
  const { t } = useTranslation();
  const [teacherInviteCode, setTeacherInviteCode] = useState(user?.teacher_invite_code || "");
  const [role, setRole] = useState(user?.role || "");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");
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
      setLocalError(t('errors.selectRoleToContinue') || "Please select your role to continue.");
      return;
    }

    const trimmedCode = teacherInviteCode?.trim();
    if (role === "student" && !teacherInviteCode.trim()) {
      setLocalError(t('errors.teacherCodeRequired') || "Teacher code is required for students.");
      return;
    }
    if (role === "teacher" && !selectedSchoolId) {
      setLocalError(t('errors.selectSchool') || "Please select a school.");
      return;
    }
    setSubmitting(true);

    try {
      const updates = {
        role,
      };

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
          console.error("Failed to validate teacher code:", teacherError);
          throw new Error(t('errors.unableToValidateTeacherCode') || "Unable to validate teacher invitation code. Please try again.");
        }

        if (!teacher) {
          console.error("Invalid teacher code:", cleanedCode);
          setLocalError(t('errors.invalidTeacherCode') || "Invalid teacher code. Please check the code and try again.");
          setSubmitting(false);
          return;
        }

        updates.teacher_id = teacher.id;
        updates.teacher_invite_code = cleanedCode;
        updates.school_id = teacher.school_id || null; // Inherit school from teacher
        linkedTeacher = teacher;
      } else if (role === "teacher") {
        // Validate school selection
        if (!selectedSchoolId) {
          setLocalError(t('errors.selectSchool') || "Please select your school.");
          setSubmitting(false);
          return;
        }
        updates.school_id = selectedSchoolId;
        // Ensure the teacher has a shareable teacher_code
        let existingCode = user?.teacher_code;

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
              console.error("Failed to validate teacher code uniqueness:", codeError);
              throw new Error(t('errors.unableToGenerateTeacherCode') || "Unable to generate teacher code. Please try again.");
            }

            if (!codeMatch) {
              uniqueCode = candidate;
            }
          }

          if (!uniqueCode) {
            throw new Error(t('errors.unableToGenerateTeacherCodeLater') || "Unable to generate a teacher code. Please try again later.");
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
        console.error("Failed to update user profile:", updateError);
        throw new Error(updateError.message || t('errors.profileUpdateFailed') || "Profile update failed. Please try again.");
      }

      setAppState?.((prev) => ({
        ...prev,
        currentUser: updatedUser,
      }));

      if (role === "student" && (teacherInviteCode || (user && user.teacher_id))) {
        const teacherName = linkedTeacher?.name || "your teacher";
        setSuccess?.(t('auth.successConnected', { name: teacherName }) || `You're all set! You're now connected to ${teacherName}.`);
        setView?.("student-dashboard");
      } else if (role === "teacher") {
        setSuccess?.(t('auth.welcomeTeacher') || "Welcome! Your teacher profile is ready.");
        setView?.("teacher-dashboard");
      } else if (role === "superadmin") {
        setSuccess?.(t('messages.profileUpdatedSuccess') || "Profile updated successfully.");
        setView?.("superadmin-dashboard");
      } else {
        setSuccess?.(t('messages.profileUpdatedSuccess') || "Profile updated successfully.");
        setView?.("student-dashboard");
      }
    } catch (err) {
      console.error("Profile completion failed:", err);
      setLocalError(err.message || t('errors.registrationFailedGeneral') || "Failed to complete profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(to bottom, #4a7c7e, #3d6668)' }}>
      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-xl p-6 space-y-6">
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold" style={{ color: '#2c5aa0' }}>{t('auth.almostDone')}</h1>
          <p className="text-sm text-gray-600">{t('auth.completeProfileBelow')}</p>
        </div>

        {(localError || user?.approved === false) && (
          <div className="rounded-md border p-3 text-sm" style={{ borderColor: "#ef4444", color: "#b91c1c", background: "#fef2f2" }}>
            {localError || t('auth.pendingApprovalMessage')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {role !== "teacher" && (
            <div>
              <label htmlFor="teacher-invite" className="block text-sm font-medium text-gray-700">
                {t('auth.enterTeacherCode')}
              </label>
              <input
                id="teacher-invite"
                type="text"
                value={teacherInviteCode}
                onChange={(e) => setTeacherInviteCode(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder={t('auth.teacherCodeExample')}
              />
              <p className="mt-1 text-xs text-gray-500">{t('auth.studentsMustEnterCode')}</p>
            </div>
          )}

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              {t('auth.selectYourRole')}
            </label>
            <select
              id="role"
              value={role || ""}
              onChange={(e) => {
                setRole(e.target.value);
                setLocalError("");
              }}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="" disabled>
                {t('auth.selectRole')}
              </option>
              <option value="student">{t('auth.student')}</option>
              <option value="teacher">{t('auth.teacher')}</option>
            </select>
            {role === "teacher" && (
              <>
                <p className="mt-1 text-xs text-gray-500">{t('auth.teachersNoCodeNeeded')}</p>
                <div className="mt-3">
                  <label htmlFor="school" className="block text-sm font-medium text-gray-700">
                    {t('auth.selectSchoolTitle') || "Select Your School"}
                  </label>
                  <select
                    id="school"
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  >
                    <option value="">{t('auth.selectSchool') || "— Select a School —"}</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg px-4 py-2.5 text-white font-medium transition-all duration-200 disabled:opacity-60"
            style={{ background: 'linear-gradient(to right, #2c5aa0, #4db8d8)' }}
          >
            {submitting ? t('auth.saving') : t('common.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
