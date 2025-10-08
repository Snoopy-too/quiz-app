import React, { useState, useEffect } from "react";
import { LogOut, BookOpen, Users, BarChart3, Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import VerticalNav from "../layout/VerticalNav";
import { formatTeacherCode, generateTeacherCode } from "../../utils/teacherCode";
import { supabase } from "../../supabaseClient";

export default function TeacherDashboard({ appState, setAppState, setView }) {
  const { t } = useTranslation();
  const teacher = appState.currentUser;
  const [copied, setCopied] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Generate teacher code if teacher doesn't have one
  useEffect(() => {
    const ensureTeacherCode = async () => {
      if (teacher && teacher.role === "teacher" && !teacher.teacher_code) {
        setGeneratingCode(true);
        try {
          // Generate unique code
          let newCode;
          let codeExists = true;

          while (codeExists) {
            newCode = generateTeacherCode();
            const { data: existing } = await supabase
              .from("users")
              .select("id")
              .eq("teacher_code", newCode)
              .maybeSingle();
            codeExists = !!existing;
          }

          // Update teacher with new code
          const { error } = await supabase
            .from("users")
            .update({ teacher_code: newCode })
            .eq("id", teacher.id);

          if (!error) {
            // Update app state
            setAppState({
              ...appState,
              currentUser: { ...teacher, teacher_code: newCode }
            });
          }
        } catch (err) {
          console.error("Error generating teacher code:", err);
        } finally {
          setGeneratingCode(false);
        }
      }
    };

    ensureTeacherCode();
  }, [teacher?.id]);

  const handleNavigation = (section) => {
    if (section === "Manage Quizzes") setView("manage-quizzes");
    if (section === "Manage Students") setView("manage-students");
    if (section === "Reports") setView("reports");
  };

  const copyTeacherCode = () => {
    if (teacher?.teacher_code) {
      const formattedCode = formatTeacherCode(teacher.teacher_code);
      console.log("=== COPYING TEACHER CODE ===");
      console.log("Raw code from database:", teacher.teacher_code);
      console.log("Formatted code (displayed):", formattedCode);
      console.log("Code being copied to clipboard:", formattedCode);

      // Copy the formatted version (with hyphen) for user convenience
      navigator.clipboard.writeText(formattedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Vertical Navigation */}
      <VerticalNav currentView="teacher-dashboard" setView={setView} appState={appState} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Bar */}
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-purple-600">{t('teacher.teacherDashboard')}</h1>
        </nav>

      {/* Dashboard Content */}
      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6">{t('teacher.teacherDashboard')}</h2>

        {/* Teacher Invitation Code */}
        {generatingCode ? (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-xl shadow-lg mb-6">
            <div className="flex items-center justify-center">
              <p className="text-lg">{t('teacher.generatingTeacherCode')}</p>
            </div>
          </div>
        ) : teacher?.teacher_code ? (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-xl shadow-lg mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-semibold mb-2">{t('teacher.yourTeacherInvitationCode')}</h3>
                <p className="text-sm text-purple-100 mb-3">
                  {t('teacher.shareCodeWithStudents')}
                </p>
                <div className="flex items-center gap-3">
                  <div className="bg-white text-purple-900 px-6 py-3 rounded-lg font-mono text-2xl font-bold tracking-wider">
                    {formatTeacherCode(teacher.teacher_code)}
                  </div>
                  <button
                    onClick={copyTeacherCode}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg transition flex items-center gap-2 font-medium"
                  >
                    {copied ? (
                      <>
                        <Check size={20} />
                        {t('teacher.copied')}
                      </>
                    ) : (
                      <>
                        <Copy size={20} />
                        {t('teacher.copyCode')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Manage Quizzes */}
          <div
            onClick={() => handleNavigation("Manage Quizzes")}
            className="cursor-pointer bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition"
          >
            <BookOpen className="text-purple-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">{t('nav.manageQuizzes')}</h3>
            <p className="text-gray-600">
              {t('teacher.manageQuizzesDescription')}
            </p>
          </div>

          {/* Manage Students */}
          <div
            onClick={() => handleNavigation("Manage Students")}
            className="cursor-pointer bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition"
          >
            <Users className="text-green-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">{t('teacher.manageStudents')}</h3>
            <p className="text-gray-600">
              {t('teacher.manageStudentsDescription')}
            </p>
          </div>

          {/* Reports */}
          <div
            onClick={() => handleNavigation("Reports")}
            className="cursor-pointer bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition"
          >
            <BarChart3 className="text-blue-600 mb-4" size={40} />
            <h3 className="text-xl font-bold mb-2">{t('nav.reports')}</h3>
            <p className="text-gray-600">
              {t('teacher.reportsDescription')}
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
