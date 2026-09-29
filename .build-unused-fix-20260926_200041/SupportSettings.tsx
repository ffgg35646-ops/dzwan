import { useEffect, useState } from "react";
import {
  Check,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Headphones,
  Loader2,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type SupportData = {
  phoneNumbers: string[];
  whatsapp: string[];
};

const orange = "#E87516";
const orangeDark = "#C2410C";
const orangeLight = "#FFF7ED";
const orangeBorder = "#FED7AA";
const text = "#1F2937";
const muted = "#64748B";
const border = "#E5E7EB";

export default function SupportSettings() {
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState<string[]>([]);

  const [phoneDraft, setPhoneDraft] = useState("");
  const [whatsappDraft, setWhatsappDraft] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/support");
      const payload =
        response.data?.data ?? response.data ?? {};

      setPhoneNumbers(
        Array.isArray(payload?.phoneNumbers)
          ? payload.phoneNumbers
          : [],
      );

      setWhatsapp(
        Array.isArray(payload?.whatsapp)
          ? payload.whatsapp
          : [],
      );
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل بيانات الدعم.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function save(
    nextPhones: string[],
    nextWhatsapp: string[],
    successText = "تم الحفظ تلقائيًا.",
  ) {
    const cleanedPhones = nextPhones
      .map((value) => value.trim())
      .filter(Boolean);

    const cleanedWhatsapp = nextWhatsapp
      .map((value) => value.trim())
      .filter(Boolean);

    await api.patch("/support", {
      phoneNumbers: cleanedPhones,
      whatsapp: cleanedWhatsapp,
    });

    setPhoneNumbers(cleanedPhones);
    setWhatsapp(cleanedWhatsapp);
    setMessage(successText);

    window.setTimeout(() => {
      setMessage("");
    }, 2200);
  }

  async function addPhone() {
    const value = phoneDraft.trim();

    if (!value) {
      setError("اكتب رقم الهاتف أولًا.");
      return;
    }

    try {
      setSaving("phone-add");
      setError("");

      await save(
        [...phoneNumbers, value],
        whatsapp,
        "تمت إضافة رقم الهاتف وحفظه فورًا.",
      );

      setPhoneDraft("");
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر إضافة رقم الهاتف.",
        ),
      );
    } finally {
      setSaving("");
    }
  }

  async function addWhatsapp() {
    const value = whatsappDraft.trim();

    if (!value) {
      setError("اكتب رقم واتساب أولًا.");
      return;
    }

    try {
      setSaving("whatsapp-add");
      setError("");

      await save(
        phoneNumbers,
        [...whatsapp, value],
        "تمت إضافة رقم واتساب وحفظه فورًا.",
      );

      setWhatsappDraft("");
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر إضافة رقم واتساب.",
        ),
      );
    } finally {
      setSaving("");
    }
  }

  async function updatePhone(
    index: number,
    value: string,
  ) {
    const next = [...phoneNumbers];
    next[index] = value;

    try {
      setSaving(`phone-${index}`);
      setError("");

      await save(
        next,
        whatsapp,
        "تم تعديل رقم الهاتف وحفظه تلقائيًا.",
      );
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر حفظ تعديل رقم الهاتف.",
        ),
      );
      await load();
    } finally {
      setSaving("");
    }
  }

  async function updateWhatsapp(
    index: number,
    value: string,
  ) {
    const next = [...whatsapp];
    next[index] = value;

    try {
      setSaving(`whatsapp-${index}`);
      setError("");

      await save(
        phoneNumbers,
        next,
        "تم تعديل رقم واتساب وحفظه تلقائيًا.",
      );
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر حفظ تعديل رقم واتساب.",
        ),
      );
      await load();
    } finally {
      setSaving("");
    }
  }

  async function removePhone(index: number) {
    const next = phoneNumbers.filter(
      (_, currentIndex) => currentIndex !== index,
    );

    try {
      setSaving(`phone-delete-${index}`);
      setError("");

      await save(
        next,
        whatsapp,
        "تم حذف رقم الهاتف وحفظ التغيير فورًا.",
      );
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر حذف رقم الهاتف.",
        ),
      );
      await load();
    } finally {
      setSaving("");
    }
  }

  async function removeWhatsapp(index: number) {
    const next = whatsapp.filter(
      (_, currentIndex) => currentIndex !== index,
    );

    try {
      setSaving(`whatsapp-delete-${index}`);
      setError("");

      await save(
        phoneNumbers,
        next,
        "تم حذف رقم واتساب وحفظ التغيير فورًا.",
      );
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر حذف رقم واتساب.",
        ),
      );
      await load();
    } finally {
      setSaving("");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleEnter(
    event: React.KeyboardEvent<HTMLInputElement>,
    action: () => void,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      action();
    }
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#FFFDFC 0%,#FFF8F0 100%)",
        padding: 22,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1150,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <section
          style={{
            background: "#FFFFFF",
            border: `1px solid ${border}`,
            borderRadius: 22,
            padding: 24,
            marginBottom: 18,
            boxShadow:
              "0 12px 32px rgba(15,23,42,.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 15,
                  display: "grid",
                  placeItems: "center",
                  color: "#FFFFFF",
                  background:
                    "linear-gradient(135deg,#E87516,#F59E0B)",
                  boxShadow:
                    "0 9px 22px rgba(232,117,22,.18)",
                }}
              >
                <Headphones size={25} />
              </div>

              <div>
                <h1
                  style={{
                    margin: 0,
                    display: "inline-flex",
                    padding: "9px 15px",
                    borderRadius: 12,
                    background: orangeLight,
                    border:
                      `1px solid ${orangeBorder}`,
                    color: orangeDark,
                    fontSize: 24,
                    fontWeight: 950,
                  }}
                >
                  بيانات الدعم
                </h1>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: muted,
                    fontSize: 13,
                  }}
                >
                  أرقام الهاتف وواتساب التي تظهر
                  للمستخدمين.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 12px",
                borderRadius: 999,
                background: "#FFF7ED",
                border:
                  `1px solid ${orangeBorder}`,
                color: orangeDark,
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              <Check size={15} />
              الحفظ تلقائي
            </div>
          </div>
        </section>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 14,
              background: "#FFF1F2",
              border: "1px solid #FECDD3",
              color: "#BE123C",
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 14,
              background: "#FFF7ED",
              border:
                `1px solid ${orangeBorder}`,
              color: orangeDark,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check size={17} />
            {message}
          </div>
        )}

        {loading ? (
          <section
            style={{
              background: "#FFFFFF",
              border:
                `1px solid ${border}`,
              borderRadius: 20,
              padding: 55,
              textAlign: "center",
              color: muted,
            }}
          >
            <Loader2
              size={28}
              color={orange}
              className="premium-spin"
            />
            <div style={{ marginTop: 10 }}>
              جاري تحميل بيانات الدعم...
            </div>
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(340px,1fr))",
              gap: 18,
            }}
          >
            {/* PHONE */}
            <section
              style={{
                background: "#FFFFFF",
                border:
                  `1px solid ${border}`,
                borderRadius: 20,
                padding: 20,
                boxShadow:
                  "0 10px 28px rgba(15,23,42,.045)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    display: "grid",
                    placeItems: "center",
                    background: orangeLight,
                    color: orange,
                    border:
                      `1px solid ${orangeBorder}`,
                  }}
                >
                  <Phone size={20} />
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      display: "inline-flex",
                      padding: "7px 12px",
                      borderRadius: 10,
                      background: "#FFF1E4",
                      border:
                        `1px solid ${orangeBorder}`,
                      color: orangeDark,
                      fontSize: 17,
                      fontWeight: 950,
                    }}
                  >
                    أرقام الهاتف
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: muted,
                      fontSize: 12,
                    }}
                  >
                    أضف أكثر من رقم للدعم.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0,1fr) auto",
                  gap: 8,
                  marginBottom: 15,
                }}
              >
                <input
                  value={phoneDraft}
                  onChange={(e) =>
                    setPhoneDraft(e.target.value)
                  }
                  onKeyDown={(e) =>
                    handleEnter(
                      e,
                      () => void addPhone(),
                    )
                  }
                  placeholder="مثال: 0770..."
                  dir="ltr"
                  style={{
                    height: 45,
                    width: "100%",
                    boxSizing: "border-box",
                    border:
                      `1px solid ${orangeBorder}`,
                    borderRadius: 11,
                    padding: "0 12px",
                    outline: "none",
                    fontSize: 14,
                  }}
                />

                <button
                  type="button"
                  onClick={() => void addPhone()}
                  disabled={
                    saving === "phone-add"
                  }
                  style={{
                    minWidth: 96,
                    height: 45,
                    border: 0,
                    borderRadius: 11,
                    background:
                      "linear-gradient(135deg,#E87516,#F59E0B)",
                    color: "#FFFFFF",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {saving === "phone-add" ? (
                    <Loader2
                      size={17}
                      className="premium-spin"
                    />
                  ) : (
                    <Plus size={17} />
                  )}
                  إضافة
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 9,
                }}
              >
                {phoneNumbers.length === 0 ? (
                  <EmptyBox text="لا توجد أرقام هاتف حاليًا." />
                ) : (
                  phoneNumbers.map(
                    (value, index) => (
                      <SupportRow
                        key={`phone-${index}`}
                        value={value}
                        icon={<Phone size={16} />}
                        busy={
                          saving ===
                            `phone-${index}` ||
                          saving ===
                            `phone-delete-${index}`
                        }
                        onChange={(next) =>
                          setPhoneNumbers(
                            (current) =>
                              current.map(
                                (
                                  item,
                                  currentIndex,
                                ) =>
                                  currentIndex ===
                                  index
                                    ? next
                                    : item,
                              ),
                          )
                        }
                        onSave={() =>
                          void updatePhone(
                            index,
                            phoneNumbers[
                              index
                            ] || "",
                          )
                        }
                        onDelete={() =>
                          void removePhone(
                            index,
                          )
                        }
                      />
                    ),
                  )
                )}
              </div>
            </section>

            {/* WHATSAPP */}
            <section
              style={{
                background: "#FFFFFF",
                border:
                  `1px solid ${border}`,
                borderRadius: 20,
                padding: 20,
                boxShadow:
                  "0 10px 28px rgba(15,23,42,.045)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    display: "grid",
                    placeItems: "center",
                    background: orangeLight,
                    color: orange,
                    border:
                      `1px solid ${orangeBorder}`,
                  }}
                >
                  <MessageCircle size={20} />
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      display: "inline-flex",
                      padding: "7px 12px",
                      borderRadius: 10,
                      background: "#FFF1E4",
                      border:
                        `1px solid ${orangeBorder}`,
                      color: orangeDark,
                      fontSize: 17,
                      fontWeight: 950,
                    }}
                  >
                    أرقام WhatsApp
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: muted,
                      fontSize: 12,
                    }}
                  >
                    أرقام واتساب الخاصة بالدعم.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0,1fr) auto",
                  gap: 8,
                  marginBottom: 15,
                }}
              >
                <input
                  value={whatsappDraft}
                  onChange={(e) =>
                    setWhatsappDraft(
                      e.target.value,
                    )
                  }
                  onKeyDown={(e) =>
                    handleEnter(
                      e,
                      () => void addWhatsapp(),
                    )
                  }
                  placeholder="مثال: 0770..."
                  dir="ltr"
                  style={{
                    height: 45,
                    width: "100%",
                    boxSizing: "border-box",
                    border:
                      `1px solid ${orangeBorder}`,
                    borderRadius: 11,
                    padding: "0 12px",
                    outline: "none",
                    fontSize: 14,
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    void addWhatsapp()
                  }
                  disabled={
                    saving ===
                    "whatsapp-add"
                  }
                  style={{
                    minWidth: 96,
                    height: 45,
                    border: 0,
                    borderRadius: 11,
                    background:
                      "linear-gradient(135deg,#E87516,#F59E0B)",
                    color: "#FFFFFF",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {saving ===
                  "whatsapp-add" ? (
                    <Loader2
                      size={17}
                      className="premium-spin"
                    />
                  ) : (
                    <Plus size={17} />
                  )}
                  إضافة
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 9,
                }}
              >
                {whatsapp.length === 0 ? (
                  <EmptyBox text="لا توجد أرقام واتساب حاليًا." />
                ) : (
                  whatsapp.map(
                    (value, index) => (
                      <SupportRow
                        key={`whatsapp-${index}`}
                        value={value}
                        icon={
                          <MessageCircle
                            size={16}
                          />
                        }
                        busy={
                          saving ===
                            `whatsapp-${index}` ||
                          saving ===
                            `whatsapp-delete-${index}`
                        }
                        onChange={(next) =>
                          setWhatsapp(
                            (current) =>
                              current.map(
                                (
                                  item,
                                  currentIndex,
                                ) =>
                                  currentIndex ===
                                  index
                                    ? next
                                    : item,
                              ),
                          )
                        }
                        onSave={() =>
                          void updateWhatsapp(
                            index,
                            whatsapp[
                              index
                            ] || "",
                          )
                        }
                        onDelete={() =>
                          void removeWhatsapp(
                            index,
                          )
                        }
                      />
                    ),
                  )
                )}
              </div>
            </section>
          </div>
        )}


      </div>
    </main>
  );
}

function EmptyBox({
  text,
}: {
  text: string;
}) {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 13,
        border:
          "1px dashed #FED7AA",
        background: "#FFFDFC",
        color: "#94A3B8",
        textAlign: "center",
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function SupportRow({
  value,
  icon,
  busy,
  onChange,
  onSave,
  onDelete,
}: {
  value: string;
  icon: React.ReactNode;
  busy: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "auto minmax(0,1fr) auto",
        alignItems: "center",
        gap: 9,
        padding: 9,
        border:
          "1px solid #F1F5F9",
        borderRadius: 13,
        background: "#FFFDFC",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: "#FFF1E4",
          color: "#C2410C",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <input
        value={value}
        dir="ltr"
        onChange={(e) =>
          onChange(e.target.value)
        }
        onBlur={onSave}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        disabled={busy}
        style={{
          height: 40,
          minWidth: 0,
          width: "100%",
          boxSizing: "border-box",
          border:
            "1px solid #E5E7EB",
          borderRadius: 10,
          padding: "0 10px",
          outline: "none",
          color: "#1F2937",
          background: "#FFFFFF",
        }}
      />

      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border:
            "1px solid #FED7AA",
          background: "#FFF7ED",
          color: "#C2410C",
          cursor: busy
            ? "not-allowed"
            : "pointer",
          display: "grid",
          placeItems: "center",
        }}
        aria-label="حذف"
      >
        {busy ? (
          <Loader2
            size={16}
            className="premium-spin"
          />
        ) : (
          <Trash2 size={16} />
        )}
      </button>
    </div>
  );
}
