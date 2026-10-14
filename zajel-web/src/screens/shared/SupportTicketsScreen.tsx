import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost } from "../../api/request";

type Props = {
  ticketId?: string | null;
};

function statusText(status?: string) {
  if (status === "closed") return "مغلقة";
  if (status === "in_progress") return "قيد المتابعة";
  return "جديدة";
}

function statusStyle(status?: string) {
  if (status === "closed") return styles.closed;
  if (status === "in_progress") return styles.progress;
  return styles.new;
}

function getMessages(data: any) {
  if (Array.isArray(data?.ticket?.messages)) {
    return data.ticket.messages;
  }

  if (Array.isArray(data?.messages)) {
    return data.messages;
  }

  return [];
}

function messageText(message: any) {
  return String(
    message?.body ??
      message?.message ??
      message?.text ??
      "",
  );
}

function isAdminMessage(message: any) {
  const role = String(
    message?.senderRole ??
      message?.senderType ??
      message?.role ??
      "",
  ).toLowerCase();

  return (
    role.includes("admin") ||
    role.includes("staff") ||
    role.includes("support") ||
    role.includes("agent")
  );
}

export default function SupportTicketsScreen({
  ticketId,
}: Props) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!ticketId) {
      setTicket(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await apiGet(
        `/support-tickets/my/${ticketId}`,
      );

      const nextTicket =
        response?.ticket || null;

      if (nextTicket) {
        setTicket({
          ...nextTicket,
          messages:
            Array.isArray(nextTicket.messages)
              ? nextTicket.messages
              : getMessages(response),
        });
      }
    } catch (error) {
      console.error(
        "Support ticket load error:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();

    const timer = setInterval(
      () => void load(),
      10000,
    );

    return () => clearInterval(timer);
  }, [load]);

  async function sendReply() {
    const body = reply.trim();

    if (
      !ticket?._id ||
      !body ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);

      const response = await apiPost(
        `/support-tickets/my/${ticket._id}/messages`,
        { body },
      );

      if (response?.ticket) {
        setTicket({
          ...response.ticket,
          messages:
            Array.isArray(
              response.ticket.messages,
            )
              ? response.ticket.messages
              : getMessages(response),
        });
      } else {
        await load();
      }

      setReply("");
    } catch (error) {
      console.error(
        "Support reply error:",
        error,
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>
          جاري تحميل التذكرة...
        </Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="alert-circle-outline"
          size={34}
          color="#94A3B8"
        />
        <Text style={styles.emptyTitle}>
          تعذر تحميل التذكرة
        </Text>
      </View>
    );
  }

  const messages = Array.isArray(ticket.messages)
    ? ticket.messages
    : [];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketIcon}>
              <Ionicons
                name="chatbox-ellipses-outline"
                size={21}
                color="#E87516"
              />
            </View>

            <View style={styles.ticketHeaderText}>
              <Text style={styles.ticketTitle}>
                {ticket.title || "تذكرة دعم"}
              </Text>

              <Text style={styles.ticketDescription}>
                {ticket.description ||
                  "لا توجد تفاصيل إضافية."}
              </Text>
            </View>

            <View
              style={[
                styles.status,
                statusStyle(ticket.status),
              ]}
            >
              <Text style={styles.statusText}>
                {statusText(ticket.status)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.messagesHeader}>
            <View>
              <Text style={styles.messagesTitle}>
                رسائل التذكرة
              </Text>
              <Text style={styles.messagesSub}>
                جميع الردود الخاصة بهذه التذكرة هنا
              </Text>
            </View>

            <View style={styles.messagesCount}>
              <Text style={styles.messagesCountText}>
                {messages.length}
              </Text>
            </View>
          </View>

          {messages.length === 0 ? (
            <View style={styles.noMessages}>
              <Ionicons
                name="chatbubble-outline"
                size={28}
                color="#94A3B8"
              />
              <Text style={styles.muted}>
                لا توجد رسائل بعد.
              </Text>
            </View>
          ) : (
            <View style={styles.messages}>
              {messages.map(
                (message: any, index: number) => {
                  const admin =
                    isAdminMessage(message);

                  return (
                    <View
                      key={
                        String(
                          message?._id ??
                            index,
                        )
                      }
                      style={[
                        styles.message,
                        admin
                          ? styles.adminMessage
                          : styles.userMessage,
                      ]}
                    >
                      <View style={styles.messageTop}>
                        <Text
                          style={
                            styles.messageAuthor
                          }
                        >
                          {admin
                            ? "الإدارة"
                            : "أنت"}
                        </Text>

                        <Text
                          style={
                            styles.messageType
                          }
                        >
                          {admin
                            ? "رد الإدارة"
                            : "رسالتك"}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.messageBody
                        }
                      >
                        {messageText(message) ||
                          "رسالة فارغة"}
                      </Text>
                    </View>
                  );
                },
              )}
            </View>
          )}

          {ticket.status !== "closed" ? (
            <View style={styles.replyArea}>
              <Text style={styles.replyTitle}>
                الرد على التذكرة
              </Text>

              <TextInput
                value={reply}
                onChangeText={setReply}
                placeholder="اكتب ردك هنا..."
                placeholderTextColor="#94A3B8"
                style={styles.replyInput}
                multiline
                textAlignVertical="top"
                editable={!sending}
              />

              <Pressable
                onPress={() => void sendReply()}
                disabled={sending}
                style={({ pressed }) => [
                  styles.replyButton,
                  pressed && styles.pressed,
                  sending && styles.disabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="send-outline"
                      size={17}
                      color="#FFFFFF"
                    />
                    <Text
                      style={styles.replyButtonText}
                    >
                      إرسال الرد
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.closedNotice}>
              <Ionicons
                name="lock-closed-outline"
                size={17}
                color="#64748B"
              />
              <Text style={styles.closedText}>
                هذه التذكرة مغلقة.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  container: {
    padding: 4,
    paddingBottom: 25,
  },

  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },

  ticketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  ticketIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#FFF4E3",
    alignItems: "center",
    justifyContent: "center",
  },

  ticketHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  ticketTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },

  ticketDescription: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 11,
    lineHeight: 18,
  },

  status: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  new: {
    backgroundColor: "#EFF6FF",
  },

  progress: {
    backgroundColor: "#FFF7ED",
  },

  closed: {
    backgroundColor: "#F1F5F9",
  },

  statusText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },

  messagesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  messagesTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },

  messagesSub: {
    marginTop: 3,
    color: "#94A3B8",
    fontSize: 10,
  },

  messagesCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  messagesCountText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
  },

  messages: {
    gap: 8,
  },

  message: {
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
  },

  adminMessage: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },

  userMessage: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },

  messageTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  messageAuthor: {
    color: "#0F172A",
    fontSize: 11,
    fontWeight: "900",
  },

  messageType: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
  },

  messageBody: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 20,
  },

  replyArea: {
    marginTop: 12,
    padding: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  replyTitle: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
  },

  replyInput: {
    minHeight: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 10,
    color: "#0F172A",
    fontSize: 12,
    marginBottom: 8,
  },

  replyButton: {
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: "#E87516",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  replyButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  closedNotice: {
    marginTop: 12,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  closedText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
  },

  noMessages: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  emptyTitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "900",
  },

  muted: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 18,
  },

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.6,
  },
});
