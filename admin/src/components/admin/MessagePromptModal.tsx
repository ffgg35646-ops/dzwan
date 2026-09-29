import { useEffect, useState } from "react";
import { MessageCircleQuestion, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function MessagePromptModal({
  open,
  title,
  message,
  defaultValue = "",
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  if (!open) return null;

  return (
    <div className="dzwan-message-backdrop">
      <div
        className="dzwan-message-modal"
        role="dialog"
        aria-modal="true"
        dir="rtl"
      >
        <button
          type="button"
          className="dzwan-message-close"
          onClick={onCancel}
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>

        <div className="dzwan-message-icon info">
          <MessageCircleQuestion size={28} />
        </div>

        <h2>{title}</h2>
        <p>{message}</p>

        <textarea
          className="dzwan-message-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          rows={4}
        />

        <div className="dzwan-message-actions">
          <button
            type="button"
            className="dzwan-message-cancel"
            onClick={onCancel}
          >
            إلغاء
          </button>

          <button
            type="button"
            className="dzwan-message-confirm info"
            onClick={() => onConfirm(value)}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}
