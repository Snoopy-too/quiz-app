import React, { useState, useId } from "react";
import { Users, School, UserCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { bulkEditUsersSchema } from "../../schemas/bulkEdit";
import { formatTeacherCode } from "../../utils/teacherCode";

export default function BulkEditModal({
  isOpen,
  onClose,
  selectedUsers = [],
  schools = [],
  teachers = [],
  onSuccess,
  setAlertModal,
}) {
  const [schoolAction, setSchoolAction] = useState("keep"); // "keep" | "set" | "clear"
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [teacherAction, setTeacherAction] = useState("keep"); // "keep" | "set" | "clear"
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [syncSchoolWithTeacher, setSyncSchoolWithTeacher] = useState(true);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  if (!isOpen) return null;

  const studentsCount = selectedUsers.filter((u) => u.role === "student").length;
  const nonStudentsCount = selectedUsers.length - studentsCount;

  const handleTeacherChange = (e) => {
    const teacherId = e.target.value;
    setSelectedTeacherId(teacherId);

    if (syncSchoolWithTeacher && teacherId) {
      const teacher = teachers.find((t) => t.id === teacherId);
      if (teacher?.school_id) {
        setSchoolAction("set");
        setSelectedSchoolId(teacher.school_id);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    const payloadToValidate = {
      userIds: selectedUsers.map((u) => u.id),
      schoolAction,
      school_id: schoolAction === "set" ? selectedSchoolId : null,
      teacherAction,
      teacher_id: teacherAction === "set" ? selectedTeacherId : null,
    };

    const validationResult = bulkEditUsersSchema.safeParse(payloadToValidate);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed";
      setValidationError(firstError);
      return;
    }

    setLoading(true);

    try {
      const schoolUpdate = {};
      if (schoolAction === "set") schoolUpdate.school_id = selectedSchoolId;
      if (schoolAction === "clear") schoolUpdate.school_id = null;

      const teacherUpdate = {};
      if (teacherAction === "set") teacherUpdate.teacher_id = selectedTeacherId;
      if (teacherAction === "clear") teacherUpdate.teacher_id = null;

      const studentIds = selectedUsers.filter((u) => u.role === "student").map((u) => u.id);
      const nonStudentIds = selectedUsers.filter((u) => u.role !== "student").map((u) => u.id);

      // Utility: Chunk IDs in groups of 100 to stay well within URL filter limits
      const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      // 1. Update students (both school and teacher can apply)
      const studentPayload = { ...schoolUpdate, ...teacherUpdate };
      if (studentIds.length > 0 && Object.keys(studentPayload).length > 0) {
        const studentChunks = chunkArray(studentIds, 100);
        for (const chunk of studentChunks) {
          const { error: studentErr } = await supabase
            .from("users")
            .update(studentPayload)
            .in("id", chunk);
          if (studentErr) throw studentErr;
        }
      }

      // 2. Update non-students (only school applies, teacher_id does not apply to teachers/admins)
      if (nonStudentIds.length > 0 && Object.keys(schoolUpdate).length > 0) {
        const nonStudentChunks = chunkArray(nonStudentIds, 100);
        for (const chunk of nonStudentChunks) {
          const { error: nonStudentErr } = await supabase
            .from("users")
            .update(schoolUpdate)
            .in("id", chunk);
          if (nonStudentErr) throw nonStudentErr;
        }
      }

      setAlertModal({
        isOpen: true,
        title: "Bulk Edit Successful",
        message: `Successfully updated ${selectedUsers.length} user(s).`,
        type: "success",
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Bulk edit error:", err);
      setValidationError(err.message || "Failed to update users.");
    } finally {
      setLoading(false);
    }
  };

  const getTargetSchoolName = () => {
    if (schoolAction === "clear") return "None (Clear school)";
    if (schoolAction === "set") {
      const s = schools.find((sc) => sc.id === selectedSchoolId);
      return s ? s.name : "Selected School";
    }
    return "Keep existing (No change)";
  };

  const getTargetTeacherName = () => {
    if (teacherAction === "clear") return "None (Unlink teacher)";
    if (teacherAction === "set") {
      const t = teachers.find((tc) => tc.id === selectedTeacherId);
      return t ? `${t.name} (${formatTeacherCode(t.teacher_code)})` : "Selected Teacher";
    }
    return "Keep existing (No change)";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Bulk Edit Users</h2>
              <p className="text-sm text-gray-500">
                Editing <span className="font-semibold text-blue-700">{selectedUsers.length}</span> selected user(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            type="button"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User composition info badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
            <p className="font-semibold">Selection Breakdown:</p>
            <p>
              &bull; <span className="font-medium text-green-700">{studentsCount}</span> Student(s)
              {nonStudentsCount > 0 && (
                <span> &bull; <span className="font-medium text-blue-700">{nonStudentsCount}</span> Teacher/Admin(s)</span>
              )}
            </p>
            {nonStudentsCount > 0 && (
              <p className="text-amber-700">
                Note: Teacher assignment applies only to students in this selection.
              </p>
            )}
          </div>

          {/* Validation error banner */}
          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* SECTION 1: SCHOOL */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <School size={18} className="text-blue-600" />
              <span>School Assignment</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="schoolAction"
                  value="keep"
                  checked={schoolAction === "keep"}
                  onChange={() => setSchoolAction("keep")}
                  className="text-blue-600"
                />
                <span>Keep existing school (No change)</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="schoolAction"
                  value="set"
                  checked={schoolAction === "set"}
                  onChange={() => setSchoolAction("set")}
                  className="text-blue-600"
                />
                <span>Assign to school:</span>
              </label>

              {schoolAction === "set" && (
                <div className="pl-6 pt-1">
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    <option value="">— Select School —</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="schoolAction"
                  value="clear"
                  checked={schoolAction === "clear"}
                  onChange={() => setSchoolAction("clear")}
                  className="text-blue-600"
                />
                <span>Clear / Remove school assignment</span>
              </label>
            </div>
          </div>

          {/* SECTION 2: TEACHER */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <UserCheck size={18} className="text-green-600" />
              <span>Teacher Assignment</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="teacherAction"
                  value="keep"
                  checked={teacherAction === "keep"}
                  onChange={() => setTeacherAction("keep")}
                  className="text-blue-600"
                />
                <span>Keep existing teacher (No change)</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="teacherAction"
                  value="set"
                  checked={teacherAction === "set"}
                  onChange={() => setTeacherAction("set")}
                  className="text-blue-600"
                />
                <span>Assign to teacher:</span>
              </label>

              {teacherAction === "set" && (
                <div className="pl-6 pt-1 space-y-2">
                  <select
                    value={selectedTeacherId}
                    onChange={handleTeacherChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    <option value="">— Select Teacher —</option>
                    {teachers.map((t) => {
                      const tSchool = schools.find((s) => s.id === t.school_id)?.name || "No School";
                      const codeDisplay = t.teacher_code ? ` [${formatTeacherCode(t.teacher_code)}]` : "";
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} ({tSchool}){codeDisplay}
                        </option>
                      );
                    })}
                  </select>

                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={syncSchoolWithTeacher}
                      onChange={(e) => setSyncSchoolWithTeacher(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Automatically set school to match the selected teacher&apos;s school</span>
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="teacherAction"
                  value="clear"
                  checked={teacherAction === "clear"}
                  onChange={() => setTeacherAction("clear")}
                  className="text-blue-600"
                />
                <span>Unlink / Remove assigned teacher</span>
              </label>
            </div>
          </div>

          {/* PREVIEW BOX */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <CheckCircle2 size={14} className="text-blue-600" />
              Summary of Changes:
            </p>
            <p>&bull; <strong>School:</strong> {getTargetSchoolName()}</p>
            <p>&bull; <strong>Teacher:</strong> {getTargetTeacherName()}</p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (schoolAction === "keep" && teacherAction === "keep")}
              className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition shadow-sm"
            >
              {loading ? "Applying Changes..." : `Apply to ${selectedUsers.length} User(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
