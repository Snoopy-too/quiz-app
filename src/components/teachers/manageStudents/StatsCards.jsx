import React from "react";
import { UserCheck, CheckCircle, Clock, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function StatsCards({ students, pendingStudents }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("manageStudents.totalStudents")}</p>
            <p className="text-3xl font-bold text-gray-800">{students.length}</p>
          </div>
          <UserCheck className="text-blue-600" size={40} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("manageStudents.approved")}</p>
            <p className="text-3xl font-bold text-green-600">
              {students.filter((s) => s.approved).length}
            </p>
          </div>
          <CheckCircle className="text-green-600" size={40} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("manageStudents.pendingApproval")}</p>
            <p className="text-3xl font-bold text-orange-600">
              {pendingStudents.length}
            </p>
          </div>
          <Clock className="text-orange-600" size={40} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("manageStudents.unverifiedEmail")}</p>
            <p className="text-3xl font-bold text-red-600">
              {students.filter((s) => !s.verified).length}
            </p>
          </div>
          <XCircle className="text-red-600" size={40} />
        </div>
      </div>
    </div>
  );
}
