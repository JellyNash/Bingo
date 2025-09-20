interface ReconnectToastProps {
  visible: boolean;
  attempt: number;
  maxAttempts: number;
  nextRetryIn: number;
  onRetryNow: () => void;
  onDismiss: () => void;
}

export default function ReconnectToast({
  visible,
  attempt,
  maxAttempts,
  nextRetryIn,
  onRetryNow,
  onDismiss,
}: ReconnectToastProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-surface-raised border border-feedback-warning rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-feedback-warning"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-text-primary">
              Connection Lost
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Attempting to reconnect... ({attempt}/{maxAttempts})
            </p>
            {nextRetryIn > 0 && (
              <p className="text-xs text-text-muted mt-1">
                Next retry in {nextRetryIn}s
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={onRetryNow}
                className="px-3 py-1 text-xs font-medium bg-brand-primary text-text-inverse rounded hover:bg-brand-secondary transition-colors"
              >
                Retry Now
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}