import React from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SearchFilter({ searchTerm, setSearchTerm, filterStatus, setFilterStatus }) {
  const { t } = useTranslation();

  const filters = [
    { key: "my_students", label: t("manageStudents.filterMyStudents") },
    { key: "approved", label: t("manageStudents.filterApproved") },
    { key: "pending", label: t("manageStudents.filterPending") },
    { key: "unverified", label: t("manageStudents.filterUnverified") },
    { key: "unlinked", label: t("manageStudents.filterUnlinked") },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t("manageStudents.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-300"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === key
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
