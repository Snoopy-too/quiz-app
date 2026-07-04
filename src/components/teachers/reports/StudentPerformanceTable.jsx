import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function StudentPerformanceTable({
  sortedStudentPerformance,
  studentSortConfig,
  handleStudentSort,
  setView,
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th
              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
              onClick={() => handleStudentSort('student')}
            >
              <div className="flex items-center gap-1">
                {t("reports.student")}
                <span className="text-gray-400">
                  {studentSortConfig.key === 'student' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </span>
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
              onClick={() => handleStudentSort('studentId')}
            >
              <div className="flex items-center gap-1">
                {t("reports.studentId")}
                <span className="text-gray-400">
                  {studentSortConfig.key === 'studentId' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </span>
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
              onClick={() => handleStudentSort('quizzesParticipated')}
            >
              <div className="flex items-center gap-1">
                {t("reports.quizzesParticipated")}
                <span className="text-gray-400">
                  {studentSortConfig.key === 'quizzesParticipated' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </span>
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
              onClick={() => handleStudentSort('averageAccuracy')}
            >
              <div className="flex items-center gap-1">
                {t("reports.overallAccuracy")}
                <span className="text-gray-400">
                  {studentSortConfig.key === 'averageAccuracy' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </span>
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
              onClick={() => handleStudentSort('courseAccuracy')}
            >
              <div className="flex items-center gap-1">
                {t("reports.courseAccuracy")}
                <span className="text-gray-400">
                  {studentSortConfig.key === 'courseAccuracy' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </span>
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors group"
              onClick={() => handleStudentSort('nonCourseAccuracy')}
            >
              <div className="flex items-center gap-1">
                {t("reports.nonCourseAccuracy")}
                <span className="text-gray-400">
                  {studentSortConfig.key === 'nonCourseAccuracy' && (studentSortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStudentPerformance.map((student) => (
            <tr key={student.student_id} className="border-b hover:bg-blue-50 transition-colors">
              <td className="px-6 py-4">
                <button
                  onClick={() => setView('student-report', { studentId: student.student_id })}
                  className="font-bold text-gray-900 hover:text-blue-600 text-left"
                >
                  {student.name}
                </button>
              </td>
              <td className="px-6 py-4 text-gray-600 font-mono text-sm">{student.studentIdNo || '-'}</td>
              <td className="px-6 py-4 text-gray-600">{student.quizzesParticipated}</td>
              <td className="px-6 py-4">
                <span className={`font-semibold ${parseFloat(student.averageAccuracy) > 80 ? 'text-green-600' :
                  parseFloat(student.averageAccuracy) > 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {student.averageAccuracy}%
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`font-semibold ${parseFloat(student.courseAccuracy) > 80 ? 'text-green-600' :
                  parseFloat(student.courseAccuracy) > 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {student.courseAccuracy}%
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`font-semibold ${parseFloat(student.nonCourseAccuracy) > 80 ? 'text-green-600' :
                  parseFloat(student.nonCourseAccuracy) > 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {student.nonCourseAccuracy}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
