import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function StudentTable({
  filteredStudents,
  highlightedIds,
  sortColumn,
  sortDirection,
  handleSort,
  viewStudentDetails,
  handleApprove,
  handleReject,
  handleUnlink,
  handleDelete,
  handleLink,
  currentUserId,
  quizCounts = {},
  filterStatus,
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th
              onClick={() => handleSort("name")}
              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
            >
              <div className="flex items-center gap-2">
                {t("manageStudents.tableHeaderName")}
                {sortColumn === "name" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderEmail")}</th>
            <th
              onClick={() => handleSort("studentId")}
              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
            >
              <div className="flex items-center gap-2">
                {t("manageStudents.tableHeaderStudentId")}
                {sortColumn === "studentId" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderStatus")}</th>
            <th
              onClick={() => handleSort("joined")}
              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
            >
              <div className="flex items-center gap-2">
                {t("manageStudents.tableHeaderJoined")}
                {sortColumn === "joined" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
              </div>
            </th>
            {filterStatus !== "unlinked" && (
              <th
                onClick={() => handleSort("quizzesTaken")}
                className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition"
              >
                <div className="flex items-center gap-2">
                  {t("manageStudents.tableHeaderQuizzesTaken")}
                  {sortColumn === "quizzesTaken" && (sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </div>
              </th>
            )}
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{t("manageStudents.tableHeaderActions")}</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.length === 0 ? (
            <tr>
              <td colSpan={filterStatus !== "unlinked" ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                {t("manageStudents.noStudentsFound")}
              </td>
            </tr>
          ) : (
            filteredStudents.map((student) => (
              <tr key={student.id} className={`border-b hover:bg-gray-50 ${highlightedIds.has(student.id) ? 'student-glow' : ''}`}>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{student.name}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{student.email}</td>
                <td className="px-6 py-4 text-gray-600">{student.student_id || "-"}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {student.approved ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                        {t("manageStudents.statusApproved")}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">
                        {t("manageStudents.statusPending")}
                      </span>
                    )}
                    {!student.verified && (
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                        {t("manageStudents.statusUnverified")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(student.created_at).toLocaleDateString()}
                </td>
                {filterStatus !== "unlinked" && (
                  <td className="px-6 py-4 text-gray-600 text-center">
                    {quizCounts[student.id] || 0}
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewStudentDetails(student)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t("manageStudents.actionView")}
                    </button>

                    {student.teacher_id === currentUserId && (
                      <>
                        {!student.approved && (
                          <button
                            onClick={() => handleApprove(student.id)}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            {t("manageStudents.actionApprove")}
                          </button>
                        )}
                        {student.approved && (
                          <button
                            onClick={() => handleReject(student.id)}
                            className="text-orange-600 hover:text-orange-700 font-medium"
                          >
                            {t("manageStudents.actionRevoke")}
                          </button>
                        )}
                        <button
                          onClick={() => handleUnlink(student)}
                          className="text-gray-600 hover:text-gray-700 font-medium"
                        >
                          {t("manageStudents.actionUnlink")}
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          {t("manageStudents.actionDelete")}
                        </button>
                      </>
                    )}

                    {student.teacher_id === null && (
                      <button
                        onClick={() => handleLink(student)}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        {t("manageStudents.actionLink")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
