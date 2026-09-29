
import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage?: string;
};

export default class ErrorBoundary extends React.Component<
  Props,
  State
> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(
    error: unknown,
  ): State {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error(
      "Unhandled React error:",
      error,
    );
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="global-error-page"
        >
          <div className="global-error-card">
            <h2>
              تعذر عرض الصفحة حاليًا
            </h2>

            <p>
              حدثت مشكلة أثناء تحميل الواجهة.
            </p>

            <pre
              style={{
                marginTop: 16,
                padding: 14,
                background: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: 10,
                direction: "ltr",
                textAlign: "left",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                color: "#991B1B",
                fontSize: 12,
              }}
            >
              {this.state.errorMessage || "خطأ غير معروف"}
            </pre>

            <button
              type="button"
              onClick={this.handleReload}
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
