import { useEffect, useState } from "react";
import {
  BellRing,
  Check,
  Loader2,
  Power,
  Settings2,
  X,
} from "lucide-react";
import {
  api,
  getApiErrorMessage,
} from "../lib/api";

type NotificationRule = {
  _id?: string;
  event: string;
  enabled: boolean;
  recipients?: string[];
  title?: string;
  message?: string;
};

export default function NotificationRules() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEvent, setSavingEvent] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/completion/notification-rules",
      );

      setRules(
        Array.isArray(response.data?.rules)
          ? response.data.rules
          : [],
      );
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل قواعد الإشعارات.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggle(rule: NotificationRule) {
    try {
      setSavingEvent(rule.event);
      setError("");

      await api.put(
        `/completion/notification-rules/${encodeURIComponent(
          rule.event,
        )}`,
        {
          event: rule.event,
          enabled: !rule.enabled,
          recipients: rule.recipients || [],
          title: rule.title,
          message: rule.message,
        },
      );

      await load();
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تحديث قاعدة الإشعار.",
        ),
      );
    } finally {
      setSavingEvent("");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const enabledCount = rules.filter(
    (rule) => rule.enabled,
  ).length;

  const disabledCount = rules.length - enabledCount;

  return (
    <main className="admin-main" dir="rtl">
<div className="admin-content">
        <div className="premium-page-shell">
          <section className="premium-page-intro">
            <div>
              <span className="premium-page-kicker">
                الأتمتة والتنبيهات
              </span>

              <h1>قواعد الإشعارات</h1>

              <p>
                التحكم في الإشعارات التي يتم إرسالها عند
                حدوث أحداث النظام المختلفة.
              </p>
            </div>

            <div className="premium-page-icon">
              <BellRing size={26} />
            </div>
          </section>

          {!loading && rules.length > 0 && (
            <section className="premium-stat-grid compact">
              <div className="premium-stat-card">
                <div className="premium-stat-icon success">
                  <Check size={20} />
                </div>

                <span>القواعد المفعلة</span>
                <strong>{enabledCount}</strong>
              </div>

              <div className="premium-stat-card">
                <div className="premium-stat-icon danger">
                  <X size={20} />
                </div>

                <span>القواعد المعطلة</span>
                <strong>{disabledCount}</strong>
              </div>

              <div className="premium-stat-card">
                <div className="premium-stat-icon">
                  <Settings2 size={20} />
                </div>

                <span>إجمالي القواعد</span>
                <strong>{rules.length}</strong>
              </div>
            </section>
          )}

          {error && (
            <div className="premium-error">
              {error}
            </div>
          )}

          {loading ? (
            <section className="premium-state-card">
              <Loader2
                size={28}
                className="premium-spin"
              />
              <span>جارٍ تحميل قواعد الإشعارات...</span>
            </section>
          ) : rules.length === 0 ? (
            <section className="premium-state-card muted">
              <BellRing size={30} />
              <h3>لا توجد قواعد إشعارات</h3>
              <p>
                لم يتم العثور على قواعد إشعارات متاحة حاليًا.
              </p>
            </section>
          ) : (
            <section className="premium-rules-grid">
              {rules.map((rule) => {
                const saving = savingEvent === rule.event;

                return (
                  <article
                    className={`premium-rule-card${
                      rule.enabled ? " enabled" : " disabled"
                    }`}
                    key={rule._id || rule.event}
                  >
                    <div className="premium-rule-top">
                      <div className="premium-rule-icon">
                        <BellRing size={19} />
                      </div>

                      <span
                        className={`premium-status-pill ${
                          rule.enabled
                            ? "success"
                            : "neutral"
                        }`}
                      >
                        {rule.enabled
                          ? "مفعلة"
                          : "معطلة"}
                      </span>
                    </div>

                    <h2>{rule.title || rule.event}</h2>

                    <p>
                      {rule.message ||
                        "لا توجد رسالة محددة لهذه القاعدة."}
                    </p>

                    <div className="premium-rule-event">
                      <span>الحدث</span>
                      <strong>{rule.event}</strong>
                    </div>

                    <button
                      type="button"
                      className={`premium-rule-button ${
                        rule.enabled
                          ? "danger"
                          : "primary"
                      }`}
                      disabled={saving}
                      onClick={() =>
                        void toggle(rule)
                      }
                    >
                      {saving ? (
                        <>
                          <Loader2
                            size={17}
                            className="premium-spin"
                          />
                          جارٍ الحفظ...
                        </>
                      ) : (
                        <>
                          <Power size={17} />
                          {rule.enabled
                            ? "تعطيل القاعدة"
                            : "تفعيل القاعدة"}
                        </>
                      )}
                    </button>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
