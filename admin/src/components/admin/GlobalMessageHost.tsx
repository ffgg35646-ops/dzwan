import { useEffect, useState } from "react";
import MessageModal from "./MessageModal";
import MessagePromptModal from "./MessagePromptModal";
import type { DzwanMessageDetail } from "../../lib/message";

type Request = DzwanMessageDetail | null;

function getTitle(message: string) {
  if (message.includes("حذف")) return "تأكيد الحذف";
  if (message.includes("إغلاق")) return "تأكيد الإغلاق";
  if (message.includes("رفض")) return "تأكيد الرفض";
  if (message.includes("تعطيل")) return "تأكيد التعطيل";
  if (message.includes("تفعيل")) return "تأكيد التفعيل";
  return "تأكيد الإجراء";
}

export default function GlobalMessageHost() {
  const [request, setRequest] = useState<Request>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DzwanMessageDetail>).detail;
      setRequest(detail);
    };

    window.addEventListener("dzwan:message", handler);

    return () => {
      window.removeEventListener("dzwan:message", handler);
    };
  }, []);

  if (!request) return null;

  if (request.type === "prompt") {
    return (
      <MessagePromptModal
        open
        title="إدخال البيانات"
        message={request.message}
        defaultValue={request.defaultValue}
        onCancel={() => {
          request.resolve(null);
          setRequest(null);
        }}
        onConfirm={(value) => {
          request.resolve(value);
          setRequest(null);
        }}
      />
    );
  }

  return (
    <MessageModal
      open
      title={getTitle(request.message)}
      message={request.message}
      tone="danger"
      confirmLabel="تأكيد"
      cancelLabel="إلغاء"
      onCancel={() => {
        request.resolve(false);
        setRequest(null);
      }}
      onConfirm={() => {
        request.resolve(true);
        setRequest(null);
      }}
    />
  );
}
