import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { generateTeacherCode } from "../../utils/teacherCode";
import { registrationSchema } from "../../schemas/auth";
import AuthLayout, { PasswordToggleInput } from "./AuthLayout";
import { Button, Field, Icon, Input, Select } from "../ui";

function readTeacherCodeParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get("teacher") || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export default function Register({ setView, error, setError, success, setSuccess }) {
  const { t, i18n } = useTranslation();
  const initialTeacherParam = readTeacherCodeParam();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: initialTeacherParam ? "student" : "student",
    studentId: "",
    teacherCode: initialTeacherParam,
    school_id: "",
  });

  const [schools, setSchools] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSchools = async () => {
      const { data, error: fetchError } = await supabase
        .from("schools")
        .select("id, name")
        .order("name", { ascending: true });
      if (!fetchError && data) setSchools(data);
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [i18n.language, setError, setSuccess]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.role === "superadmin") {
      setError(
        t("errors.superadminRestricted") ||
          "Superadmin accounts must be created by the system administrator.",
      );
      return;
    }

    const validationResult = registrationSchema.safeParse(formData);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues[0]?.message || "Validation Error";
      setError(errorMsg);
      return;
    }

    setSubmitting(true);
    try {
      const emailToCheck = formData.email.trim().toLowerCase();

      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id, email, role, verified")
        .eq("email", emailToCheck)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        setError(
          t("errors.verifyEmailAvailability") ||
            "Unable to verify email availability. Please try again.",
        );
        return;
      }

      if (existingUser) {
        setError(
          t("errors.emailAlreadyRegistered") ||
            "This email is already registered. Please login instead or use a different email.",
        );
        return;
      }

      let teacherId = null;
      let teacherCodeToSave = null;
      let cleanedTeacherInvite = null;

      if (formData.role === "student") {
        if (!formData.studentId.trim()) {
          setError(t("errors.studentIdRequired") || "Student number is required.");
          return;
        }

        if (!formData.teacherCode.trim()) {
          setError(t("errors.teacherCodeRequired") || "Teacher code is required for students.");
          return;
        }

        const cleanCode = formData.teacherCode.replace(/-/g, "").toUpperCase();
        cleanedTeacherInvite = cleanCode;

        const { data: teacher, error: teacherError } = await supabase
          .from("users")
          .select("id, name, teacher_code, school_id")
          .eq("teacher_code", cleanCode)
          .eq("role", "teacher")
          .maybeSingle();

        if (teacherError) {
          setError(`Database error: ${teacherError.message}`);
          return;
        }

        if (!teacher) {
          setError(
            t("errors.invalidTeacherCode") ||
              "Invalid teacher code. Please check the code and try again.",
          );
          return;
        }

        teacherId = teacher.id;

        const { data: existingStudents } = await supabase
          .from("users")
          .select("id, email")
          .eq("student_id", formData.studentId.trim())
          .eq("teacher_id", teacher.id)
          .limit(1);

        if (existingStudents && existingStudents.length > 0) {
          const matchedEmail = existingStudents[0].email;
          setError(
            t("errors.studentAlreadyRegistered", { email: matchedEmail }) ||
              `You have already successfully registered with the email ${matchedEmail}. Please wait for your teacher to approve your account.`,
          );
          return;
        }
      }

      if (formData.role === "teacher") {
        if (!formData.school_id) {
          setError(t("errors.selectSchool") || "Please select a school.");
          return;
        }
        let codeExists = true;
        while (codeExists) {
          teacherCodeToSave = generateTeacherCode();
          const { data: existing } = await supabase
            .from("users")
            .select("id")
            .eq("teacher_code", teacherCodeToSave)
            .maybeSingle();
          codeExists = !!existing;
        }
      }

      let resolvedSchoolId = null;
      if (formData.role === "student" && teacherId) {
        const { data: teacherData } = await supabase
          .from("users")
          .select("school_id")
          .eq("id", teacherId)
          .single();
        resolvedSchoolId = teacherData?.school_id || null;
      } else if (formData.role === "teacher") {
        resolvedSchoolId = formData.school_id || null;
      }

      sessionStorage.setItem("quizapp_registration_in_progress", "true");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        sessionStorage.removeItem("quizapp_registration_in_progress");
        if (
          authError.message?.includes("already registered") ||
          authError.message?.includes("already exists")
        ) {
          setError(
            t("errors.emailAlreadyRegisteredShort") ||
              "This email is already registered. Please login instead.",
          );
        } else if (authError.message?.includes("Invalid email")) {
          setError(t("errors.invalidEmail") || "Please enter a valid email address.");
        } else if (authError.message?.includes("Password")) {
          setError(
            t("errors.passwordTooShortSignup") ||
              "Password must be at least 6 characters long.",
          );
        } else {
          setError(authError.message || t("errors.registrationFailed") || "Registration failed. Try again.");
        }
        return;
      }

      if (!authData.user) {
        sessionStorage.removeItem("quizapp_registration_in_progress");
        setError(t("errors.registrationFailedGeneral") || "Registration failed. Please try again.");
        return;
      }

      const isStudent = formData.role === "student";
      const profileData = {
        id: authData.user.id,
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        student_id: isStudent ? formData.studentId.trim() : null,
        teacher_id: teacherId,
        teacher_invite_code: cleanedTeacherInvite,
        teacher_code: teacherCodeToSave,
        school_id: resolvedSchoolId,
        verified: isStudent ? true : false,
        approved: false,
      };

      const { error: profileError } = await supabase.from("users").insert([profileData]);

      if (profileError) {
        sessionStorage.removeItem("quizapp_registration_in_progress");
        if (profileError.code === "23505" || profileError.message?.includes("duplicate key")) {
          setError(
            t("errors.emailAlreadyRegisteredLong") ||
              "This email is already registered. Please login instead or contact support if you believe this is an error.",
          );
        } else if (profileError.message?.includes("violates foreign key constraint")) {
          setError(
            t("errors.invalidTeacherReference") ||
              "Invalid teacher reference. Please try again or contact support.",
          );
        } else {
          setError(
            `${t("errors.registrationFailedPrefix") || "Registration failed"}: ${profileError.message || t("errors.unknownError") || "Unknown error occurred"}`,
          );
        }
        return;
      }

      await supabase.auth.signOut();
      sessionStorage.removeItem("quizapp_registration_in_progress");

      if (formData.role === "student") {
        sessionStorage.setItem("quizapp_registered_email", formData.email.trim().toLowerCase());
        setView("registration-success");
      } else {
        setSuccess(
          t("auth.registrationSuccessDetailed") ||
            "Registration successful! Please verify your email, then a superadmin will approve your account.",
        );
        setView("verify");
      }
    } catch {
      sessionStorage.removeItem("quizapp_registration_in_progress");
      setError(t("errors.somethingWentWrong") || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");

    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (oauthErr) {
        setError(`Google sign-in failed: ${oauthErr.message}`);
      }
    } catch {
      setError("Failed to initiate Google sign-in. Please try again.");
    }
  };

  return (
    <AuthLayout
      title={t("auth.registerForQuizMaster")}
      subtitle={t("auth.createAccount")}
      error={error || null}
      success={success || null}
      footer={
        <p>
          {t("auth.alreadyHaveAccount")}{" "}
          <button
            type="button"
            onClick={() => setView("login")}
            className="font-semibold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
          >
            {t("auth.login")}
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t("auth.fullName")} required>
          <Input
            type="text"
            name="name"
            placeholder={t("auth.fullName")}
            value={formData.name}
            onChange={handleChange}
            required
          />
        </Field>

        <Field label={t("auth.email")} required>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("auth.email")}
            value={formData.email}
            onChange={handleChange}
            required
          />
        </Field>

        <Field label={t("auth.password")} required>
          <PasswordToggleInput
            name="password"
            autoComplete="new-password"
            placeholder={t("auth.password")}
            value={formData.password}
            onChange={handleChange}
            required
          />
        </Field>

        <Field label={t("auth.selectRole")} required>
          <Select name="role" value={formData.role} onChange={handleChange}>
            <option value="student">{t("auth.student")}</option>
            <option value="teacher">{t("auth.teacher")}</option>
          </Select>
        </Field>

        {formData.role === "teacher" && (
          <Field label={t("auth.selectSchoolTitle") || "Select Your School"} required>
            <Select
              name="school_id"
              value={formData.school_id}
              onChange={handleChange}
              required
            >
              <option value="">{t("auth.selectSchool") || "— Select Your School —"}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {formData.role === "student" && (
          <>
            <Field label={t("auth.studentId")} required>
              <Input
                type="text"
                name="studentId"
                placeholder={t("auth.studentId")}
                value={formData.studentId}
                onChange={handleChange}
                required
              />
            </Field>

            <Field
              label={t("auth.enterTeacherCode")}
              hint={t("auth.teacherCodeHelp")}
              required
            >
              <Input
                type="text"
                name="teacherCode"
                placeholder={t("auth.teacherCodePlaceholder")}
                value={formData.teacherCode}
                onChange={handleChange}
                className="uppercase tracking-wider"
                required
              />
            </Field>
          </>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          className="w-full"
        >
          {t("auth.register")}
        </Button>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-surface px-2.5 text-ink-muted">
            {t("auth.orContinueWith")}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={handleGoogleSignIn}
        className="w-full"
      >
        <Icon name="google" className="h-5 w-5" />
        <span>{t("auth.signInWithGoogle")}</span>
      </Button>
    </AuthLayout>
  );
}
