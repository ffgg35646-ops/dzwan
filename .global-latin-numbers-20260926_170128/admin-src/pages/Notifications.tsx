
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  Loader2,
  Search,
  Send,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { api } from "../lib/api";

type Target =
  | "all-shops"
  | "all-captains"
  | "selected-shops"
  | "selected-captains";

type Recipient = {
  _id: string;
  userId?: string;
  role?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  user?: {
    _id?: string;
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  owner?: {
    _id?: string;
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  ownerUserId?: string | {
    _id?: string;
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
};

function listFromResponse(data: any): Recipient[] {
  if (Array.isArray(data)) return data;

  for (const key of [
    "users",
    "items",
    "data",
    "captains",
    "establishments",
  ]) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (Array.isArray(data?.data?.users)) return data.data.users;
  if (Array.isArray(data?.data?.items)) return data.data.items;

  return [];
}

function userIdOf(item: Recipient) {
  return String(
    item.userId ||
      item.user?._id ||
      item.owner?._id ||
      (typeof item.ownerUserId === "object"
        ? item.ownerUserId?._id
        : item.ownerUserId) ||
      item._id ||
      "",
  );
}

function nameOf(item: Recipient) {
  return (
    item.fullName ||
    item.name ||
    item.user?.fullName ||
    item.user?.name ||
    item.owner?.fullName ||
    item.owner?.name ||
    "بدون اسم"
  );
}

function emailOf(item: Recipient) {
  return item.email || item.user?.email || item.owner?.email || "";
}

function phoneOf(item: Recipient) {
  return item.phone || item.user?.phone || item.owner?.phone || "";
}

function searchTextOf(item: Recipient) {
  return [
    nameOf(item),
    emailOf(item),
    phoneOf(item),
  ]
    .join(" ")
    .toLowerCase();
}

export default function Notifications() {
  const [target, setTarget] =
    useState<Target>("all-shops");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [shops, setShops] = useState<Recipient[]>([]);
  const [captains, setCaptains] = useState<Recipient[]>([]);

  const [selectedShopIds, setSelectedShopIds] =
    useState<string[]>([]);

  const [selectedCaptainIds, setSelectedCaptainIds] =
    useState<string[]>([]);

  const [loadingRecipients, setLoadingRecipients] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipients() {
      setLoadingRecipients(true);

      try {
        const [shopsRes, captainsRes] =
          await Promise.allSettled([
            api.get("/establishments"),
            api.get(
              "/users?role=captain&status=active&limit=1000",
            ),
          ]);

        let loadedShops: Recipient[] = [];
        let loadedCaptains: Recipient[] = [];

        if (shopsRes.status === "fulfilled") {
          loadedShops =
            listFromResponse(shopsRes.value.data);
        }

        if (captainsRes.status === "fulfilled") {
          loadedCaptains =
            listFromResponse(captainsRes.value.data);
        }

        if (!loadedCaptains.length) {
          try {
            const response =
              await api.get("/captains");

            loadedCaptains =
              listFromResponse(response.data).filter(
                (item) =>
                  !item.status ||
                  item.status === "active" ||
                  item.status === "approved",
              );
          } catch {
            loadedCaptains = [];
          }
        }

        if (!cancelled) {
          setShops(loadedShops);
          setCaptains(loadedCaptains);
        }
      } catch (error) {
        console.error(
          "Notification recipients error:",
          error,
        );
      } finally {
        if (!cancelled) {
          setLoadingRecipients(false);
        }
      }
    }

    void loadRecipients();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentRecipients =
    target === "selected-captains"
      ? captains
      : shops;

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return currentRecipients;

    return currentRecipients.filter((item) =>
      searchTextOf(item).includes(q),
    );
  }, [currentRecipients, search]);

  const selectedIds =
    target === "selected-captains"
      ? selectedCaptainIds
      : selectedShopIds;

  function toggleRecipient(id: string) {
    if (!id) return;

    if (target === "selected-shops") {
      setSelectedShopIds((current) =>
        current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      );
    }

    if (target === "selected-captains") {
      setSelectedCaptainIds((current) =>
        current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      );
    }
  }

  function selectVisible() {
    const ids = filteredRecipients
      .map(userIdOf)
      .filter(Boolean);

    if (target === "selected-shops") {
      setSelectedShopIds((current) =>
        Array.from(
          new Set([...current, ...ids]),
        ),
      );
    }

    if (target === "selected-captains") {
      setSelectedCaptainIds((current) =>
        Array.from(
          new Set([...current, ...ids]),
        ),
      );
    }
  }

  function clearSelected() {
    if (target === "selected-shops") {
      setSelectedShopIds([]);
    }

    if (target === "selected-captains") {
      setSelectedCaptainIds([]);
    }
  }

  async function sendNotification() {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle) {
      setResult({
        type: "error",
        text: "اكتب عنوان الموضوع.",
      });
      return;
    }

    if (!cleanMessage) {
      setResult({
        type: "error",
        text: "اكتب تفاصيل الموضوع.",
      });
      return;
    }

    if (
      (target === "selected-shops" ||
        target === "selected-captains") &&
      selectedIds.length === 0
    ) {
      setResult({
        type: "error",
        text: "اختر مستلمًا واحدًا على الأقل.",
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      if (
        target === "all-shops" ||
        target === "all-captains"
      ) {
        const role =
          target === "all-shops"
            ? "shop"
            : "captain";

        const response = await api.post(
          "/admin/notifications",
          {
            title: cleanTitle,
            message: cleanMessage,
            type: "admin",
            target: {
              type: "group",
              role,
            },
          },
        );

        const count = Number(
          response.data?.recipientCount ?? 0,
        );

        setResult({
          type: "success",
          text:
            count > 0
              ? `تم إرسال الإشعار إلى ${count} مستخدم.`
              : "تم إرسال الطلب، لكن لا يوجد مستلمون نشطون حاليًا.",
        });
      } else {
        let sent = 0;

        for (const userId of selectedIds) {
          await api.post(
            "/admin/notifications",
            {
              title: cleanTitle,
              message: cleanMessage,
              type: "admin",
              target: {
                type: "user",
                userId,
              },
            },
          );

          sent += 1;
        }

        setResult({
          type: "success",
          text: `تم إرسال الإشعار إلى ${sent} مستخدم.`,
        });
      }

      setTitle("");
      setMessage("");
      setSelectedShopIds([]);
      setSelectedCaptainIds([]);
      setSearch("");
    } catch (error: any) {
      console.error(
        "Send notification error:",
        error,
      );

      setResult({
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "تعذر إرسال الإشعار.",
      });
    } finally {
      setSending(false);
    }
  }

  const targets: Array<{
    key: Target;
    title: string;
    description: string;
    icon: typeof Store;
  }> = [
    {
      key: "all-shops",
      title: "جميع المطاعم",
      description:
        "إرسال الإشعار إلى جميع المطاعم والمحلات النشطة.",
      icon: Store,
    },
    {
      key: "all-captains",
      title: "جميع الكباتن",
      description:
        "إرسال الإشعار إلى جميع الكباتن النشطين.",
      icon: Truck,
    },
    {
      key: "selected-shops",
      title: "مطاعم معينة",
      description:
        "اختيار مطاعم ومحلات محددة وإرسال الإشعار إليها.",
      icon: Users,
    },
    {
      key: "selected-captains",
      title: "كباتن معينين",
      description:
        "اختيار كباتن محددين وإرسال الإشعار إليهم.",
      icon: Users,
    },
  ];

  return (
    <>
      <style>{`
        .notifications-new-page {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 0 40px;
          direction: rtl;
          font-family: inherit;
          color: #252a32;
        }

        .notifications-new-wrap {
          width: 100%;
          max-width: 1050px;
          margin: 0 auto;
        }

        .notifications-new-hero {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          margin-bottom: 18px;
          border: 1px solid #eceff3;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(25,35,50,.06);
        }

        .notifications-new-hero-icon {
          width: 56px;
          height: 56px;
          flex: 0 0 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 17px;
          background: #fff2e4;
          color: #f28c28;
        }

        .notifications-new-kicker {
          display: block;
          margin-bottom: 5px;
          color: #f28c28;
          font-size: 11px;
          font-weight: 900;
        }

        .notifications-new-hero h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 900;
          color: #252a32;
        }

        .notifications-new-hero p {
          margin: 6px 0 0;
          color: #8b929b;
          font-size: 12px;
          line-height: 1.8;
        }

        .notifications-new-card {
          padding: 24px;
          border: 1px solid #eceff3;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 12px 32px rgba(25,35,50,.055);
        }

        .notifications-new-section-head {
          display: flex;
          align-items: center;
          gap: 11px;
          padding-bottom: 17px;
          margin-bottom: 17px;
          border-bottom: 1px solid #eef0f3;
        }

        .notifications-new-section-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #fff3e6;
          color: #f28c28;
        }

        .notifications-new-section-head h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
        }

        .notifications-new-section-head p {
          margin: 3px 0 0;
          color: #9298a1;
          font-size: 11px;
        }

        .notifications-new-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 16px;
        }

        .notifications-new-field label {
          color: #4d535d;
          font-size: 11px;
          font-weight: 900;
        }

        .notifications-new-field input,
        .notifications-new-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e3e7ec;
          border-radius: 13px;
          background: #fbfcfd;
          color: #242a32;
          outline: none;
          font: inherit;
          font-size: 13px;
          transition: .18s ease;
        }

        .notifications-new-field input {
          min-height: 48px;
          padding: 0 14px;
        }

        .notifications-new-field textarea {
          min-height: 145px;
          padding: 13px 14px;
          line-height: 1.8;
          resize: vertical;
        }

        .notifications-new-field input:focus,
        .notifications-new-field textarea:focus {
          border-color: #f28c28;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(242,140,40,.09);
        }

        .notifications-new-recipients-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 15px;
          margin: 24px 0 12px;
        }

        .notifications-new-recipients-head h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 900;
        }

        .notifications-new-recipients-head p {
          margin: 4px 0 0;
          color: #949aa2;
          font-size: 11px;
        }

        .notifications-new-targets {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 11px;
        }

        .notifications-new-target {
          width: 100%;
          min-height: 88px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px;
          border: 1px solid #e6e9ed;
          border-radius: 16px;
          background: #fbfcfd;
          color: inherit;
          text-align: right;
          cursor: pointer;
          box-sizing: border-box;
          transition: .18s ease;
        }

        .notifications-new-target:hover {
          transform: translateY(-1px);
          border-color: #efc28e;
        }

        .notifications-new-target.active {
          border-color: #f28c28;
          background: #fff8f1;
          box-shadow: 0 8px 22px rgba(242,140,40,.08);
        }

        .notifications-new-target-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #fff0df;
          color: #f28c28;
        }

        .notifications-new-target-text {
          min-width: 0;
          flex: 1;
        }

        .notifications-new-target-text strong {
          display: block;
          margin-bottom: 4px;
          font-size: 13px;
          font-weight: 900;
        }

        .notifications-new-target-text small {
          display: block;
          color: #9097a0;
          font-size: 10px;
          line-height: 1.6;
        }

        .notifications-new-radio {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d7dce2;
          border-radius: 50%;
          background: #ffffff;
        }

        .notifications-new-target.active .notifications-new-radio {
          border-color: #f28c28;
        }

        .notifications-new-radio span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f28c28;
        }

        .notifications-new-picker {
          margin-top: 17px;
          padding: 15px;
          border: 1px solid #eceff3;
          border-radius: 17px;
          background: #fcfcfd;
        }

        .notifications-new-picker-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .notifications-new-picker-toolbar strong {
          display: block;
          font-size: 12px;
          font-weight: 900;
        }

        .notifications-new-picker-toolbar small {
          display: block;
          margin-top: 3px;
          color: #999fa7;
          font-size: 10px;
        }

        .notifications-new-actions {
          display: flex;
          gap: 7px;
        }

        .notifications-new-actions button {
          border: 1px solid #e4e8ed;
          border-radius: 9px;
          padding: 7px 10px;
          background: #ffffff;
          color: #656c75;
          font: inherit;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .notifications-new-actions button:hover {
          border-color: #f0bc82;
          color: #f28c28;
        }

        .notifications-new-search {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }

        .notifications-new-search svg {
          position: absolute;
          right: 13px;
          color: #a0a6ae;
        }

        .notifications-new-search input {
          width: 100%;
          height: 44px;
          box-sizing: border-box;
          border: 1px solid #e3e7ec;
          border-radius: 12px;
          background: #ffffff;
          color: #252a32;
          outline: none;
          padding: 0 41px 0 13px;
          font: inherit;
          font-size: 12px;
        }

        .notifications-new-search input:focus {
          border-color: #f28c28;
        }

        .notifications-new-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          max-height: 360px;
          overflow-y: auto;
          padding-right: 2px;
        }

        .notifications-new-recipient {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid #e8ebef;
          border-radius: 12px;
          background: #ffffff;
          text-align: right;
          color: inherit;
          cursor: pointer;
          box-sizing: border-box;
        }

        .notifications-new-recipient:hover,
        .notifications-new-recipient.selected {
          border-color: #f1c08b;
          background: #fffaf5;
        }

        .notifications-new-check {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d7dce2;
          border-radius: 7px;
          background: #ffffff;
          color: #ffffff;
        }

        .notifications-new-check.checked {
          border-color: #f28c28;
          background: #f28c28;
        }

        .notifications-new-recipient-info {
          min-width: 0;
          flex: 1;
        }

        .notifications-new-recipient-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 900;
        }

        .notifications-new-recipient-info small {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #9298a1;
          font-size: 10px;
        }

        .notifications-new-phone {
          color: #979da5;
          font-size: 10px;
          direction: ltr;
        }

        .notifications-new-state {
          padding: 24px 10px;
          text-align: center;
          color: #979da5;
          font-size: 11px;
        }

        .notifications-new-result {
          margin-top: 15px;
          padding: 12px 14px;
          border-radius: 11px;
          font-size: 11px;
          font-weight: 800;
        }

        .notifications-new-result.success {
          border: 1px solid #cce8d6;
          background: #f1fbf4;
          color: #277542;
        }

        .notifications-new-result.error {
          border: 1px solid #f0caca;
          background: #fff5f5;
          color: #af3a3a;
        }

        .notifications-new-send {
          width: 100%;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-top: 16px;
          border: 0;
          border-radius: 13px;
          background: #f28c28;
          color: #ffffff;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(242,140,40,.18);
        }

        .notifications-new-send:hover {
          background: #e87f18;
        }

        .notifications-new-send:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .notifications-new-spin {
          animation: notifications-new-spin 900ms linear infinite;
        }

        @keyframes notifications-new-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 760px) {
          .notifications-new-hero,
          .notifications-new-card {
            padding: 17px;
          }

          .notifications-new-targets {
            grid-template-columns: 1fr;
          }

          .notifications-new-picker-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .notifications-new-actions {
            width: 100%;
          }

          .notifications-new-actions button {
            flex: 1;
          }
        }
      `}</style>

      <div className="notifications-new-page">
        <div className="notifications-new-wrap">
          <section className="notifications-new-hero">
            <div className="notifications-new-hero-icon">
              <Bell size={25} />
            </div>

            <div>
              <span className="notifications-new-kicker">
                مركز الإشعارات
              </span>

              <h1>إرسال إشعار</h1>

              <p>
                اكتب الموضوع والتفاصيل ثم حدد المطاعم أو الكباتن
                الذين سيظهر لهم الإشعار داخل جرس التطبيق.
              </p>
            </div>
          </section>

          <section className="notifications-new-card">
            <div className="notifications-new-section-head">
              <div className="notifications-new-section-icon">
                <Send size={19} />
              </div>

              <div>
                <h2>محتوى الإشعار</h2>
                <p>
                  العنوان والتفاصيل سيظهران كاملين عند فتح الإشعار.
                </p>
              </div>
            </div>

            <div className="notifications-new-field">
              <label>عنوان الموضوع</label>
              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                maxLength={160}
                placeholder="مثال: تحديث مهم بخصوص الطلبات"
              />
            </div>

            <div className="notifications-new-field">
              <label>تفاصيل الموضوع</label>
              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                maxLength={1000}
                rows={6}
                placeholder="اكتب تفاصيل الرسالة هنا..."
              />
            </div>

            <div className="notifications-new-recipients-head">
              <div>
                <h3>من يستلم الإشعار؟</h3>
                <p>
                  اختر مجموعة كاملة أو مستلمين محددين.
                </p>
              </div>
            </div>

            <div className="notifications-new-targets">
              {targets.map((item) => {
                const Icon = item.icon;
                const active =
                  target === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`notifications-new-target ${
                      active ? "active" : ""
                    }`}
                    onClick={() => {
                      setTarget(item.key);
                      setSearch("");
                      setResult(null);
                    }}
                  >
                    <span className="notifications-new-target-icon">
                      <Icon size={20} />
                    </span>

                    <span className="notifications-new-target-text">
                      <strong>{item.title}</strong>
                      <small>
                        {item.description}
                      </small>
                    </span>

                    <span className="notifications-new-radio">
                      {active ? <span /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {(target === "selected-shops" ||
              target === "selected-captains") && (
              <section className="notifications-new-picker">
                <div className="notifications-new-picker-toolbar">
                  <div>
                    <strong>
                      {target === "selected-shops"
                        ? "اختر المطاعم والمحلات"
                        : "اختر الكباتن"}
                    </strong>

                    <small>
                      محدد حاليًا:{" "}
                      {selectedIds.length}
                    </small>
                  </div>

                  <div className="notifications-new-actions">
                    <button
                      type="button"
                      onClick={selectVisible}
                    >
                      تحديد الظاهر
                    </button>

                    <button
                      type="button"
                      onClick={clearSelected}
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                <div className="notifications-new-search">
                  <Search size={18} />

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="بحث فوري بالاسم أو أول حرف أو الهاتف أو البريد..."
                  />
                </div>

                {loadingRecipients ? (
                  <div className="notifications-new-state">
                    <Loader2
                      size={20}
                      className="notifications-new-spin"
                    />
                    جاري تحميل المستلمين...
                  </div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="notifications-new-state">
                    لا يوجد مستلمون مطابقون للبحث.
                  </div>
                ) : (
                  <div className="notifications-new-list">
                    {filteredRecipients.map((item) => {
                      const id = userIdOf(item);
                      const checked =
                        selectedIds.includes(id);

                      const name =
                        nameOf(item);

                      const email =
                        emailOf(item);

                      const phone =
                        phoneOf(item);

                      return (
                        <button
                          key={id}
                          type="button"
                          className={`notifications-new-recipient ${
                            checked
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            toggleRecipient(id)
                          }
                        >
                          <span
                            className={`notifications-new-check ${
                              checked
                                ? "checked"
                                : ""
                            }`}
                          >
                            {checked ? (
                              <Check size={14} />
                            ) : null}
                          </span>

                          <span className="notifications-new-recipient-info">
                            <strong>{name}</strong>

                            <small>
                              {email ||
                                phone ||
                                "لا توجد بيانات اتصال"}
                            </small>
                          </span>

                          {phone &&
                          email ? (
                            <span className="notifications-new-phone">
                              {phone}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {result ? (
              <div
                className={`notifications-new-result ${
                  result.type
                }`}
              >
                {result.text}
              </div>
            ) : null}

            <button
              type="button"
              className="notifications-new-send"
              disabled={sending}
              onClick={() =>
                void sendNotification()
              }
            >
              {sending ? (
                <>
                  <Loader2
                    size={18}
                    className="notifications-new-spin"
                  />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send size={18} />
                  إرسال الإشعار
                </>
              )}
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
