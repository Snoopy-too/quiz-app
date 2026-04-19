import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Render error:", error, info?.componentStack);
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem("quizapp_view");
      sessionStorage.removeItem("quizapp_selectedQuizId");
      sessionStorage.removeItem("quizapp_selectedSessionId");
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            The screen hit an unexpected error. Your quiz session is still alive on the server —
            reload to rejoin.
          </p>
          {this.state.error?.message && (
            <pre className="text-xs text-left bg-gray-100 rounded p-3 mb-6 overflow-auto max-h-32">
              {String(this.state.error.message)}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 font-semibold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
