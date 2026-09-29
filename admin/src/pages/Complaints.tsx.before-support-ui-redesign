
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function dateText(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "غير محدد";

  return d.toLocaleString("ar-IQ", {
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
    : "شكوى";
}

export default function Complaints() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] =
    useState<any>(null);
  const [filter, setFilter] =
    useState<"all" | "captain" | "shop">("all");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const response =
        await api.get("/support-tickets");

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
    const response =
      await api.get(
        `/support-tickets/${id}`,
      );

    setSelected(
      response.data?.ticket || null,
    );
  }

  async function reply() {
    const text = message.trim();

    if (
      !selected?._id ||
      !text ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);

      const response =
        await api.post(
          `/support-tickets/${selected._id}/messages`,
          { body: text },
        );

      setSelected(
        response.data?.ticket || selected,
      );

      setMessage("");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function closeTicket() {
    if (!selected?._id) return;

    const response =
      await api.patch(
        `/support-tickets/${selected._id}/status`,
        { status: "closed" },
      );

    setSelected(
      response.data?.ticket || selected,
    );

    await load();
  }

  useEffect(() => {
    void load();

    const timer =
      window.setInterval(
        () => void load(),
        10000,
      );

    return () =>
      window.clearInterval(timer);
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") {
      return tickets;
    }

    return tickets.filter(
      (ticket) =>
        ticket.source === filter,
    );
  }, [tickets, filter]);

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 950,
              color: "#111827",
            }}
          >
            دعم سريع
          </h1>

          <div
            style={{
              marginTop: 5,
              color: "#64748B",
            }}
          >
            استقبال الشكاوى والطوارئ والرد عليها.
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          style={button("#FFFFFF", "#334155")}
        >
          تحديث
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 15,
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
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "360px minmax(0, 1fr)",
          gap: 15,
        }}
      >
        <div>
          {loading ? (
            <div style={emptyStyle}>
              جاري تحميل التذاكر...
            </div>
          ) : visible.length === 0 ? (
            <div style={emptyStyle}>
              لا توجد تذاكر.
            </div>
          ) : (
            visible.map((ticket) => (
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
                  border:
                    selected?._id === ticket._id
                      ? "2px solid #1257D6"
                      : "1px solid #E5E7EB",
                  borderRadius: 15,
                  background: "#FFFFFF",
                  padding: 14,
                  marginBottom: 9,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 10,
                  }}
                >
                  <strong>
                    {ticket.ticketNumber}
                  </strong>

                  <span
                    style={{
                      borderRadius: 999,
                      padding:
                        "5px 9px",
                      background:
                        ticket.type ===
                        "emergency"
                          ? "#FEE2E2"
                          : "#FFF7E6",
                      color:
                        ticket.type ===
                        "emergency"
                          ? "#B91C1C"
                          : "#9A5B00",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {labelType(
                      ticket.type,
                    )}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 7,
                    fontWeight: 900,
                    color: "#172033",
                  }}
                >
                  {ticket.title}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 12,
                    color: "#64748B",
                  }}
                >
                  {labelSource(
                    ticket.source,
                  )}{" "}
                  ·{" "}
                  {labelStatus(
                    ticket.status,
                  )}
                </div>

                <div
                  style={{
                    marginTop: 7,
                    fontSize: 11,
                    color: "#94A3B8",
                  }}
                >
                  {dateText(
                    ticket.lastMessageAt ||
                      ticket.createdAt,
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div
          style={{
            minHeight: 560,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {!selected ? (
            <div
              style={{
                minHeight: 560,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748B",
              }}
            >
              اختر تذكرة لفتح المحادثة.
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: 16,
                  borderBottom:
                    "1px solid #E5E7EB",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 950,
                    }}
                  >
                    {selected.ticketNumber}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#64748B",
                    }}
                  >
                    {labelSource(
                      selected.source,
                    )}{" "}
                    ·{" "}
                    {labelType(
                      selected.type,
                    )}
                  </div>
                </div>

                {selected.status !==
                "closed" ? (
                  <button
                    type="button"
                    onClick={closeTicket}
                    style={button(
                      "#F1F5F9",
                      "#334155",
                    )}
                  >
                    إغلاق التذكرة
                  </button>
                ) : null}
              </div>

              <div
                style={{
                  padding: 16,
                  height: 430,
                  overflowY: "auto",
                  background:
                    "#F8FAFC",
                }}
              >
                {(selected.messages || []).map(
                  (item: any) => {
                    const admin =
                      [
                        "admin",
                        "super_admin",
                        "governorate_leader",
                        "area_leader",
                      ].includes(
                        String(
                          item.senderRole ||
                            "",
                        ).toLowerCase(),
                      );

                    return (
                      <div
                        key={String(
                          item._id,
                        )}
                        style={{
                          display: "flex",
                          justifyContent:
                            admin
                              ? "flex-start"
                              : "flex-end",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "78%",
                            borderRadius: 14,
                            padding: 11,
                            background:
                              admin
                                ? "#EEF4FF"
                                : "#FFFFFF",
                            border:
                              "1px solid #E2E8F0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                "#64748B",
                              fontWeight: 800,
                              marginBottom: 4,
                            }}
                          >
                            {admin
                              ? "الإدارة"
                              : "صاحب التذكرة"}
                          </div>

                          <div
                            style={{
                              lineHeight: 1.8,
                              whiteSpace:
                                "pre-wrap",
                              color:
                                "#172033",
                            }}
                          >
                            {item.body}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 10,
                              color:
                                "#94A3B8",
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

              {selected.status !==
              "closed" ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: 14,
                    borderTop:
                      "1px solid #E5E7EB",
                  }}
                >
                  <textarea
                    value={message}
                    onChange={(e) =>
                      setMessage(
                        e.target.value,
                      )
                    }
                    placeholder="اكتب رد الإدارة..."
                    rows={3}
                    style={{
                      flex: 1,
                      resize: "vertical",
                      border:
                        "1px solid #D7DCE3",
                      borderRadius: 12,
                      padding: 11,
                      fontFamily:
                        "inherit",
                    }}
                  />

                  <button
                    type="button"
                    disabled={
                      sending ||
                      !message.trim()
                    }
                    onClick={reply}
                    style={button(
                      sending ||
                      !message.trim()
                        ? "#CBD5E1"
                        : "#1257D6",
                      "#FFFFFF",
                    )}
                  >
                    إرسال الرد
                  </button>
                </div>
              ) : null}
            </>
          )}
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
        borderRadius: 11,
        padding: "0 13px",
        border: active
          ? "1px solid #1257D6"
          : "1px solid #E5E7EB",
        background: active
          ? "#EEF4FF"
          : "#FFFFFF",
        color: active
          ? "#1257D6"
          : "#475569",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {text}
    </button>
  );
}

function button(
  background: string,
  color: string,
): React.CSSProperties {
  return {
    minHeight: 42,
    border: 0,
    borderRadius: 11,
    padding: "0 14px",
    background,
    color,
    fontWeight: 900,
    cursor: "pointer",
  };
}

const emptyStyle: React.CSSProperties = {
  padding: 30,
  background: "#FFFFFF",
  borderRadius: 15,
  border: "1px solid #E5E7EB",
  color: "#64748B",
  textAlign: "center",
};
