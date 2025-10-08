import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { generateTeacherCode, unformatTeacherCode } from "../../utils/teacherCode";

export default function CompleteProfile({ user, setAppState, setView, setSuccess, setError }) {
  const [teacherInviteCode, setTeacherInviteCode] = useState(user?.teacher_invite_code || "");
  const [role, setRole] = useState(user?.role || "");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setError?.("");
    setSuccess?.("");

    if (!role) {
      setLocalError("Please select your role to continue.");
      return;
    }

    const trimmedCode = teacherInviteCode?.trim();
    if (role === "student" && !trimmedCode) {
      setLocalError("Please enter your teacher invitation code.");
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
          .select("id, teacher_code, name")
          .eq("teacher_code", cleanedCode)
          .eq("role", "teacher")
          .maybeSingle();

        if (teacherError) {
          console.error("Failed to validate teacher code:", teacherError);
          throw new Error("Unable to validate teacher invitation code. Please try again.");
        }

        if (!teacher) {
          setLocalError("Invalid teacher invitation code. Please double-check the code you received.");
          setSubmitting(false);
          return;
        }

        updates.teacher_id = teacher.id;
        updates.teacher_invite_code = cleanedCode;
        linkedTeacher = teacher;
      } else if (role === "teacher") {
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
              throw new Error("Unable to generate teacher code. Please try again.");
            }

            if (!codeMatch) {
              uniqueCode = candidate;
            }
          }

          if (!uniqueCode) {
            throw new Error("Unable to generate a teacher code. Please try again later.");
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
        throw new Error(updateError.message || "Profile update failed. Please try again.");
      }

      setAppState?.((prev) => ({
        ...prev,
        currentUser: updatedUser,
      }));

      if (role === "student") {
        setSuccess?.(
          linkedTeacher
            ? `You're all set! You're now connected to ${linkedTeacher.name}.`
            : "Profile updated successfully."
        );
        setView?.("student-dashboard");
      } else if (role === "teacher") {
        setSuccess?.("Welcome! Your teacher profile is ready.");
        setView?.("teacher-dashboard");
      } else if (role === "superadmin") {
        setSuccess?.("Profile updated successfully.");
        setView?.("superadmin-dashboard");
      } else {
        setSuccess?.("Profile updated successfully.");
        setView?.("student-dashboard");
      }
    } catch (err) {
      console.error("Profile completion failed:", err);
      setLocalError(err.message || "Failed to complete profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-6 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Almost done!</h1>
          <p className="text-sm text-gray-600">Please complete your profile below.</p>
        </div>

        {(localError || user?.approved === false) && (
          <div className="rounded-md border p-3 text-sm" style={{ borderColor: "#ef4444", color: "#b91c1c", background: "#fef2f2" }}>
            {localError || "Your account is pending approval. Complete your profile so your teacher can approve you faster."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {role !== "teacher" && (
            <div>
              <label htmlFor="teacher-invite" className="block text-sm font-medium text-gray-700">
                Enter your Teacher Invitation Code
              </label>
              <input
                id="teacher-invite"
                type="text"
                value={teacherInviteCode}
                onChange={(e) => setTeacherInviteCode(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="e.g. ABCD-1234"
              />
              <p className="mt-1 text-xs text-gray-500">Students must enter the invitation code provided by their teacher.</p>
            </div>
          )}

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Select your role
            </label>
            <select
              id="role"
              value={role || ""}
              onChange={(e) => {
                setRole(e.target.value);
                setLocalError("");
              }}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="" disabled>
                Select role
              </option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
            {role === "teacher" && (
              <p className="mt-1 text-xs text-gray-500">Teachers can continue without an invitation code.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-purple-600 px-4 py-2 text-white font-medium hover:bg-purple-700 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
