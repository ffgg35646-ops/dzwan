import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

type Tone = "danger" | "error" | "success" | "info";

interface MessageModalProps {
  open: boolean;
  title: string;
  message: string;
  tone?: Tone;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function MessageModal({
  open,
  title,
  message,
  tone = "info",
  confirmLabel = "حسنًا",
  cancelLabel = "إلغاء",
  showCancel = true,
  onConfirm,
  onCancel,
}: MessageModalProps) {
  if (!open) return null;

  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "info"
        ? Info
        : AlertTriangle;

  return (
    <div
      className="dzwan-message-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.();
        }
      }}
    >
      <div
        className="dzwan-message-modal"
        role="dialog"
        aria-modal="true"
        dir="rtl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="dzwan-message-close"
          onClick={() => onCancel?.()}
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>

        <div className={`dzwan-message-icon ${tone}`}>
          <Icon size={28} />
        </div>

        <h2>{title}</h2>
        <p>{message}</p>

        <div className="dzwan-message-actions">
          {showCancel && (
            <button
              type="button"
              className="dzwan-message-cancel"
              onClick={() => onCancel?.()}
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            className={`dzwan-message-confirm ${tone}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
