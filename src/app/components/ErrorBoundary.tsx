import React, { Component, ErrorInfo, ReactNode } from 'react';
import { NoirMark } from './shell/noir/NoirMark';
import { strings } from '../constants/strings';

interface Props {
  children: ReactNode;
  /** Optional custom fallback — defaults to the NOIR crash screen */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

/**
 * Catches React render/lifecycle errors and shows a NOIR recovery surface
 * instead of a blank page. Must be a class component (React requirement).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      errorStack: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
      errorStack: error.stack || '',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[NOIR ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ hasError: false, errorMessage: '', errorStack: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="noir-crash" role="alert">
          <div className="noir-crash-atmosphere" aria-hidden />
          <div className="noir-crash-grain" aria-hidden />

          <div className="noir-crash-stage">
            <div className="noir-crash-mark" aria-hidden>
              <NoirMark size={56} variant="spray" />
            </div>

            <p className="noir-crash-brand">{strings.error.brand}</p>
            <h1 className="noir-crash-title">{strings.error.title}</h1>
            <p className="noir-crash-body">{strings.error.body}</p>

            {this.state.errorMessage ? (
              <pre className="noir-crash-detail" title={this.state.errorStack || undefined}>
                {this.state.errorMessage}
              </pre>
            ) : null}

            <div className="noir-crash-actions">
              <button type="button" className="noir-crash-btn noir-crash-btn-primary" onClick={this.handleReload}>
                {strings.error.reload}
              </button>
              <button type="button" className="noir-crash-btn noir-crash-btn-ghost" onClick={this.handleDismiss}>
                {strings.error.recover}
              </button>
            </div>

            <p className="noir-crash-hint">{strings.error.persist}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
