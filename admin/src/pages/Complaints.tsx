import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Headphones,
  LifeBuoy,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { api } from "../lib/api";

function dateText(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "غير محدد";

  return d.toLocaleString("ar-IQ-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function labelStatus(status: string) {
  if (status === "closed") return "مغلقة";
  if (status === "in_progress") return "قيد المتابعة";
  return "جديدة";
}

function labelSource(source: string) {
  return source === "captain"
    ? "دعم الكباتن"
    : "دعم سريع للمطعم";
}

function labelType(type: string) {
  return type === "emergency"
    ? "طوارئ"
    : "دعم";
}

function statusTone(status: string) {
  if (status === "closed") {
    return {
      bg: "#ECFDF3",
      text: "#047857",
      border: "#BBF7D0",
    };
  }

  if (status === "in_progress") {
    return {
      bg: "#FFF7E6",
      text: "#D97706",
      border: "#BFDBFE",
    };
  }

  return {
    bg: "#FFF7ED",
    text: "#C2410C",
    border: "#FED7AA",
  };
}

function typeTone(type: string) {
  return type === "emergency"
    ? {
        bg: "#FEF2F2",
        text: "#B91C1C",
        border: "#FECACA",
      }
    : {
        bg: "#FFF7E6",
        text: "#F28C28",
        border: "#FED7AA",
      };
}

export default function Complaints() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] =
    useState<"all" | "captain" | "shop">("all");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    try {
      setLoading(true);

      const response = await api.get("/support-tickets");

      setTickets(
        Array.isArray(response.data?.tickets)
          ? response.data.tickets
          : [],
      );
    } finally {
      setLoading(false);
    }
  }

  async function openTicket(id: string) {
    const response = await api.get(`/support-tickets/${id}`);

    setSelected(response.data?.ticket || null);
  }

  async function reply() {
    const text = message.trim();

    if (!selected?._id || !text || sending) {
      return;
    }

    try {
      setSending(true);

      const response = await api.post(
        `/support-tickets/${selected._id}/messages`,
        { body: text },
      );

      setSelected(response.data?.ticket || selected);
      setMessage("");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function closeTicket() {
    if (!selected?._id) return;

    const response = await api.patch(
      `/support-tickets/${selected._id}/status`,
      { status: "closed" },
    );

    setSelected(response.data?.ticket || selected);
    await load();
  }

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  const visible = useMemo(() => {
    let rows = tickets;

    if (filter !== "all") {
      rows = rows.filter(
        (ticket) => ticket.source === filter,
      );
    }

    const q = search.trim().toLowerCase();

    if (q) {
      rows = rows.filter((ticket) =>
        [
          ticket.ticketNumber,
          ticket.title,
          ticket.source,
          ticket.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    return rows;
  }, [tickets, filter, search]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      new: tickets.filter(
        (x) => x.status === "open" || x.status === "new",
      ).length,
      progress: tickets.filter(
        (x) => x.status === "in_progress",
      ).length,
      closed: tickets.filter(
        (x) => x.status === "closed",
      ).length,
    };
  }, [tickets]);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100%",
        padding: "28px",
        background:
          "linear-gradient(180deg,#F8FAFC 0%,#F5F7FB 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1380,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            background:
              "linear-gradient(135deg,#0F172A 0%,#7C2D12 55%,#D97706 100%)",
            borderRadius: 26,
            padding: 26,
            color: "#fff",
            boxShadow: "0 18px 50px rgba(15,23,42,.16)",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 11px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,.12)",
                  fontSize: 12,
                  fontWeight: 900,
                  marginBottom: 12,
                }}
              >
                <LifeBuoy size={15} />
                مركز الدعم
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 950,
                  letterSpacing: "-.3px",
                }}
              >
                دعم سريع
              </h1>

              <div
                style={{
                  marginTop: 8,
                  color: "rgba(255,255,255,.76)",
                  fontSize: 13,
                }}
              >
                استقبال طلبات الدعم والطوارئ ومتابعتها والرد عليها.
              </div>
            </div>

            <button
              type="button"
              onClick={load}
              style={{
                minHeight: 44,
                border: "1px solid rgba(255,255,255,.16)",
                borderRadius: 14,
                padding: "0 15px",
                background: "rgba(255,255,255,.10)",
                color: "#fff",
                fontWeight: 900,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={17} />
              تحديث
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
              gap: 10,
              marginTop: 22,
            }}
          >
            {([
              ["كل التذاكر", stats.total, MessageCircle],
              ["الجديدة", stats.new, AlertTriangle],
              ["قيد المتابعة", stats.progress, Headphones],
              ["المغلقة", stats.closed, CheckCircle2],
            ] as const).map(([label, value, Icon]) => (
              <div
                key={String(label)}
                style={{
                  borderRadius: 18,
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.10)",
                  padding: "14px 15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,.74)",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </span>

                  <Icon size={17} />
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: 7,
                    fontSize: 25,
                    fontWeight: 950,
                  }}
                >
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 20,
            padding: 14,
            marginBottom: 15,
            boxShadow: "0 8px 24px rgba(15,23,42,.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Filter
              active={filter === "all"}
              onClick={() => setFilter("all")}
              text={`الكل (${tickets.length})`}
            />

            <Filter
              active={filter === "captain"}
              onClick={() => setFilter("captain")}
              text={`دعم الكباتن (${
                tickets.filter(
                  (x) => x.source === "captain",
                ).length
              })`}
            />

            <Filter
              active={filter === "shop"}
              onClick={() => setFilter("shop")}
              text={`دعم سريع للمطعم (${
                tickets.filter(
                  (x) => x.source === "shop",
                ).length
              })`}
            />

            <div style={{ flex: 1, minWidth: 220 }} />

            <div
              style={{
                minWidth: 230,
                flex: "0 1 320px",
                position: "relative",
              }}
            >
              <Search
                size={17}
                style={{
                  position: "absolute",
                  right: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94A3B8",
                }}
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في التذاكر..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  minHeight: 42,
                  border: "1px solid #E2E8F0",
                  borderRadius: 13,
                  padding: "0 40px 0 13px",
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#F8FAFC",
                  color: "#0F172A",
                }}
              />
            </div>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(290px, 360px) minmax(0,1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <section
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(15,23,42,.04)",
            }}
          >
            <div
              style={{
                padding: "15px 16px",
                borderBottom: "1px solid #EEF2F7",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong
                  style={{
                    color: "#0F172A",
                    fontSize: 15,
                  }}
                >
                  التذاكر
                </strong>
                <div
                  style={{
                    marginTop: 3,
                    color: "#94A3B8",
                    fontSize: 11,
                  }}
                >
                  آخر التحديثات تظهر أولًا
                </div>
              </div>

              <span
                style={{
                  minWidth: 30,
                  height: 30,
                  padding: "0 8px",
                  borderRadius: 10,
                  background: "#FFF7E6",
                  color: "#F28C28",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 950,
                }}
              >
                {visible.length}
              </span>
            </div>

            <div
              style={{
                padding: 10,
                maxHeight: 680,
                overflowY: "scroll",
                scrollbarGutter: "stable",
                scrollbarWidth: "auto",
              }}
            >
              {loading ? (
                <div style={emptyStyle}>
                  جاري تحميل التذاكر...
                </div>
              ) : visible.length === 0 ? (
                <div style={emptyStyle}>
                  <MessageCircle size={26} />
                  <div style={{ marginTop: 8 }}>
                    لا توجد تذاكر مطابقة.
                  </div>
                </div>
              ) : (
                visible.map((ticket) => {
                  const status = statusTone(ticket.status);
                  const type = typeTone(ticket.type);
                  const active =
                    selected?._id === ticket._id;

                  return (
                    <button
                      key={String(ticket._id)}
                      type="button"
                      onClick={() =>
                        openTicket(
                          String(ticket._id),
                        )
                      }
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "right",
                        border: active
                          ? "1px solid #FDBA74"
                          : "1px solid #E8EDF4",
                        borderRadius: 16,
                        background: active
                          ? "linear-gradient(180deg,#F8FBFF 0%,#F2F7FF 100%)"
                          : "#fff",
                        padding: 13,
                        marginBottom: 9,
                        cursor: "pointer",
                        boxShadow: active
                          ? "0 7px 20px rgba(37,99,235,.10)"
                          : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color: "#0F172A",
                              fontSize: 13,
                            }}
                          >
                            {ticket.ticketNumber}
                          </strong>

                          <div
                            style={{
                              marginTop: 5,
                              fontSize: 11,
                              color: "#94A3B8",
                            }}
                          >
                            {dateText(
                              ticket.lastMessageAt ||
                                ticket.createdAt,
                            )}
                          </div>
                        </div>

                        <span
                          style={{
                            borderRadius: 999,
                            padding: "5px 9px",
                            background: type.bg,
                            color: type.text,
                            border: `1px solid ${type.border}`,
                            fontSize: 10,
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {labelType(ticket.type)}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          fontWeight: 950,
                          color: "#172033",
                          fontSize: 14,
                          lineHeight: 1.55,
                        }}
                      >
                        {ticket.title}
                      </div>

                      <div
                        style={{
                          marginTop: 9,
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            color: "#64748B",
                          }}
                        >
                          {labelSource(ticket.source)}
                        </span>

                        <span style={{ color: "#CBD5E1" }}>•</span>

                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            color: status.text,
                            background: status.bg,
                            border: `1px solid ${status.border}`,
                            borderRadius: 999,
                            padding: "4px 8px",
                          }}
                        >
                          {labelStatus(ticket.status)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section
            style={{
              minHeight: 650,
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(15,23,42,.04)",
            }}
          >
            {!selected ? (
              <div
                style={{
                  minHeight: 650,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 30,
                  color: "#64748B",
                  textAlign: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      margin: "0 auto",
                      borderRadius: 20,
                      background: "#FFF7E6",
                      color: "#F28C28",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Headphones size={30} />
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      color: "#0F172A",
                      fontWeight: 950,
                      fontSize: 17,
                    }}
                  >
                    اختر تذكرة لفتح المحادثة
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "#94A3B8",
                    }}
                  >
                    ستظهر تفاصيل التذكرة والرسائل هنا.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: "18px 20px",
                    borderBottom: "1px solid #EEF2F7",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background:
                          selected.type === "emergency"
                            ? "#FEF2F2"
                            : "#FFF7E6",
                        color:
                          selected.type === "emergency"
                            ? "#B91C1C"
                            : "#F28C28",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {selected.type === "emergency" ? (
                        <AlertTriangle size={21} />
                      ) : (
                        <MessageCircle size={21} />
                      )}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 950,
                          color: "#0F172A",
                        }}
                      >
                        {selected.ticketNumber}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          display: "flex",
                          gap: 7,
                          alignItems: "center",
                          flexWrap: "wrap",
                          color: "#64748B",
                          fontSize: 11,
                        }}
                      >
                        <span>
                          {labelSource(selected.source)}
                        </span>

                        <span style={{ color: "#CBD5E1" }}>
                          •
                        </span>

                        <span>
                          {labelType(selected.type)}
                        </span>

                        <span style={{ color: "#CBD5E1" }}>
                          •
                        </span>

                        <span
                          style={{
                            color: statusTone(
                              selected.status,
                            ).text,
                            fontWeight: 900,
                          }}
                        >
                          {labelStatus(selected.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selected.status !== "closed" ? (
                    <button
                      type="button"
                      onClick={closeTicket}
                      style={{
                        minHeight: 40,
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                        background: "#fff",
                        color: "#334155",
                        padding: "0 13px",
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        cursor: "pointer",
                      }}
                    >
                      <XCircle size={17} />
                      إغلاق التذكرة
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        borderRadius: 999,
                        padding: "8px 11px",
                        background: "#ECFDF3",
                        color: "#047857",
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      <CheckCircle2 size={15} />
                      التذكرة مغلقة
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: 18,
                    minHeight: 430,
                    maxHeight: 500,
                    overflowY: "scroll",
                    scrollbarGutter: "stable",
                    scrollbarWidth: "auto",
                    background:
                      "linear-gradient(180deg,#F8FAFC 0%,#F4F7FB 100%)",
                  }}
                >
                  {(selected.messages || []).map(
                    (item: any) => {
                      const admin = [
                        "admin",
                        "super_admin",
                        "governorate_leader",
                        "area_leader",
                      ].includes(
                        String(
                          item.senderRole || "",
                        ).toLowerCase(),
                      );

                      return (
                        <div
                          key={String(item._id)}
                          style={{
                            display: "flex",
                            justifyContent: admin
                              ? "flex-start"
                              : "flex-end",
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              width: "fit-content",
                              maxWidth: "78%",
                              minWidth: 130,
                              borderRadius: 18,
                              padding: "12px 14px",
                              background: admin
                                ? "#FFF7E6"
                                : "#FFFFFF",
                              border: admin
                                ? "1px solid #D9E6FF"
                                : "1px solid #E2E8F0",
                              boxShadow:
                                "0 4px 14px rgba(15,23,42,.04)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                fontSize: 11,
                                color: admin
                                  ? "#F28C28"
                                  : "#64748B",
                                fontWeight: 900,
                                marginBottom: 6,
                              }}
                            >
                              {admin ? (
                                <ShieldCheck size={14} />
                              ) : (
                                <UserRound size={14} />
                              )}

                              {admin
                                ? "الإدارة"
                                : "صاحب التذكرة"}
                            </div>

                            <div
                              style={{
                                lineHeight: 1.85,
                                whiteSpace: "pre-wrap",
                                color: "#172033",
                                fontSize: 13,
                              }}
                            >
                              {item.body}
                            </div>

                            <div
                              style={{
                                marginTop: 7,
                                fontSize: 10,
                                color: "#94A3B8",
                              }}
                            >
                              {dateText(
                                item.createdAt,
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                {selected.status !== "closed" ? (
                  <div
                    style={{
                      padding: 15,
                      borderTop: "1px solid #EEF2F7",
                      background: "#FFFFFF",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-end",
                      }}
                    >
                      <textarea
                        value={message}
                        onChange={(e) =>
                          setMessage(e.target.value)
                        }
                        placeholder="اكتب رد الإدارة..."
                        rows={3}
                        style={{
                          flex: 1,
                          resize: "vertical",
                          minHeight: 88,
                          border: "1px solid #D9E1EA",
                          borderRadius: 15,
                          padding: "12px 13px",
                          fontFamily: "inherit",
                          outline: "none",
                          background: "#F8FAFC",
                          color: "#0F172A",
                        }}
                      />

                      <button
                        type="button"
                        disabled={
                          sending ||
                          !message.trim()
                        }
                        onClick={reply}
                        style={{
                          minHeight: 46,
                          border: 0,
                          borderRadius: 14,
                          padding: "0 16px",
                          background:
                            sending ||
                            !message.trim()
                              ? "#CBD5E1"
                              : "#F28C28",
                          color: "#FFFFFF",
                          fontWeight: 900,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          cursor:
                            sending ||
                            !message.trim()
                              ? "not-allowed"
                              : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Send size={17} />
                        إرسال
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Filter({
  active,
  onClick,
  text,
}: {
  active: boolean;
  onClick: () => void;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 40,
        borderRadius: 12,
        padding: "0 13px",
        border: active
          ? "1px solid #9AB9FF"
          : "1px solid #E2E8F0",
        background: active
          ? "#FFF7E6"
          : "#FFFFFF",
        color: active
          ? "#F28C28"
          : "#475569",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {text}
    </button>
  );
}

const emptyStyle: React.CSSProperties = {
  minHeight: 180,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#F8FAFC",
  border: "1px dashed #D9E1EA",
  borderRadius: 16,
  color: "#64748B",
  textAlign: "center",
};
