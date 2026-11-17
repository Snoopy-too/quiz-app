import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles, Trophy, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { Card, CardBody, Input } from "../ui";

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  success?: string | null;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared password input with accessible show/hide visibility toggle. */
export function PasswordToggleInput({
  id,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        className={className ? `${className} pr-10` : "pr-10"}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-r-lg"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

/** Shared desktop split-panel and mobile card shell for all auth & onboarding pages. */
export default function AuthLayout({
  title,
  subtitle,
  error,
  success,
  children,
  footer,
}: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-canvas text-ink grid lg:grid-cols-2">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-pop focus:ring-2 focus:ring-accent-500"
      >
        {t("nav.skipToContent", "Skip to main content")}
      </a>

      {/* Desktop Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-brand-700 text-white p-12 relative overflow-hidden">
        <div className="relative z-10">
          <img
            src="/brand/logo.svg"
            alt="QuizMaster"
            className="h-10 w-auto"
          />
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h2 className="text-3xl font-bold leading-tight text-white">
            {t("auth.tagline")}
          </h2>
          <ul className="space-y-4 text-brand-100 text-sm">
            <li className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white shrink-0">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="pt-1">
                {t("teacher.manageQuizzesDescription")}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white shrink-0">
                <Users className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="pt-1">
                {t("student.teamQuizDescription")}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white shrink-0">
                <Trophy className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="pt-1">
                {t("teacher.reportsDescription")}
              </span>
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-brand-200">
          QuizMaster Classroom Platform
        </p>
      </div>

      {/* Right Column: Mobile header + Auth Card */}
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-4 py-3 bg-brand-700 text-white lg:bg-transparent lg:text-ink lg:px-8 lg:pt-6 lg:justify-end">
          <img
            src="/brand/logo.svg"
            alt="QuizMaster"
            className="h-8 w-auto lg:hidden"
          />
          <div className="lg:bg-brand-700 lg:rounded-xl lg:px-2 lg:py-1">
            <LanguageSwitcher />
          </div>
        </header>

        <main
          id="auth-main"
          tabIndex={-1}
          className="flex-1 flex items-center justify-center p-4 sm:p-8 focus:outline-none"
        >
          <div className="w-full max-w-md space-y-6">
            <Card className="shadow-pop">
              <CardBody className="p-6 sm:p-8 space-y-6">
                <div className="space-y-1.5 text-center">
                  <h1 className="text-2xl font-bold text-ink">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-ink-muted">{subtitle}</p>
                  )}
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger-600 flex items-start gap-2.5"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-success-600 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{success}</span>
                  </div>
                )}

                {children}
              </CardBody>
            </Card>

            {footer && <div className="text-center text-sm text-ink-muted">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
