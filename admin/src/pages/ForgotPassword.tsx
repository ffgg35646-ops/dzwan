
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post(
        "/auth/forgot-password",
        { email: email.trim() },
      );

      setVerificationId(response.data.verificationId);
      setStep("otp");
      setMessage(
        "تم إرسال كود التحقق إلى بريدك الإلكتروني.",
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "تعذر إرسال كود التحقق.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post(
        "/auth/forgot-password/verify",
        {
          verificationId,
          otp: otp.trim(),
        },
      );

      setResetToken(response.data.resetToken);
      setStep("password");
      setMessage(
        "تم تأكيد الكود. اختر كلمة المرور الجديدة.",
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "كود التحقق غير صحيح.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();

    if (newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف أو أكثر.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post(
        "/auth/forgot-password/reset",
        {
          verificationId,
          resetToken,
          newPassword,
        },
      );

      setStep("done");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "تعذر تغيير كلمة المرور.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <div className="login-content">
        <header className="brand">
          <img
            src="/logo.svg"
            alt="زاجل ديلفري"
            className="brand-logo"
          />
          <p>استعادة الوصول إلى الحساب</p>
        </header>

        <section className="login-card">
          <div className="card-heading">
            <h2>نسيت كلمة المرور؟</h2>

            <p>
              {step === "email" &&
                "أدخل البريد المرتبط بحسابك لإرسال كود التحقق."}

              {step === "otp" &&
                "أدخل الكود الذي وصل إلى بريدك الإلكتروني."}

              {step === "password" &&
                "أنشئ كلمة مرور جديدة لحسابك."}

              {step === "done" &&
                "تم تحديث كلمة المرور بنجاح."}
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={requestCode}>
              <div className="field">
                <label htmlFor="reset-email">
                  البريد الإلكتروني
                </label>

                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading
                  ? "جارٍ إرسال الكود..."
                  : "إرسال كود التحقق"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyCode}>
              <div className="field">
                <label htmlFor="reset-otp">
                  كود التحقق
                </label>

                <input
                  id="reset-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6),
                    )
                  }
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </div>

              {message && (
                <div className="success-message">
                  {message}
                </div>
              )}

              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading
                  ? "جارٍ التحقق..."
                  : "تأكيد الكود"}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={changePassword}>
              <div className="field">
                <label htmlFor="new-password">
                  كلمة المرور الجديدة
                </label>

                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="confirm-password">
                  تأكيد كلمة المرور
                </label>

                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  placeholder="أعد كتابة كلمة المرور"
                  required
                />
              </div>

              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading
                  ? "جارٍ حفظ كلمة المرور..."
                  : "حفظ كلمة المرور الجديدة"}
              </button>
            </form>
          )}

          {step === "done" && (
            <>
              <div className="success-message">
                تم تغيير كلمة المرور بنجاح.
              </div>

              <button
                type="button"
                onClick={() => navigate("/", { replace: true })}
              >
                العودة إلى تسجيل الدخول
              </button>
            </>
          )}

          {step !== "done" && (
            <div className="forgot-back-link">
              <Link to="/">
                العودة إلى تسجيل الدخول
              </Link>
            </div>
          )}

          {step !== "email" && step !== "done" && (
            <div className="forgot-spam-note">
              📩 إذا لم تجد الرسالة في البريد الوارد، تحقق من
              مجلد Spam / الرسائل غير المرغوب فيها.
            </div>
          )}

          <div className="card-bottom">
            حماية حسابك مهمة لدينا
          </div>
        </section>
      </div>
    </main>
  );
}
