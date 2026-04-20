import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void error;
    void info;
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-6" data-theme="rugroulette">
          <div className="card bg-base-300 border border-error/40 p-8 max-w-md w-full text-center space-y-4">
            <div className="text-5xl">&#x26A0;</div>
            <h1 className="text-xl font-bold text-error">Something went wrong</h1>
            <p className="text-sm text-base-content/60">{this.state.errorMessage || 'An unexpected error occurred'}</p>
            <button
              className="btn btn-error btn-sm"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
