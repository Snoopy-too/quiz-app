import React from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Input } from "../../ui";

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
    <Card>
      <CardBody className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder={t("manageStudents.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map(({ key, label }) => {
            const active = filterStatus === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterStatus(key)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "border border-line bg-surface-muted text-ink-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
