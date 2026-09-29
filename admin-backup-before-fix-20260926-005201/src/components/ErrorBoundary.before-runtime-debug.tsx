
import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends React.Component<
  Props,
  State
> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
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
              حدثت مشكلة مؤقتة أثناء تحميل الواجهة.
            </p>

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
