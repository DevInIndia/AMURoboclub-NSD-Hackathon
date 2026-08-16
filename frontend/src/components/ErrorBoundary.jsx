import React from "react";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

/**
 * Contains a render failure to one panel.
 *
 * Live third-party data is the most likely thing on the page to arrive in an
 * unexpected shape, and without a boundary a single bad field would unmount
 * the whole route and leave a blank screen. Error boundaries must be class
 * components -- there is no hook equivalent for componentDidCatch.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error(`${this.props.label ?? "A panel"} failed to render:`, error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section className="nm-surface flex items-start gap-4 p-8">
        <span className="mt-0.5 shrink-0 text-amber-300">
          <WarningAmberIcon />
        </span>
        <div className="space-y-1">
          <h3 className="font-medium text-slate-200">
            {this.props.label ?? "This panel"} could not be displayed
          </h3>
          <p className="text-sm text-slate-500">
            The rest of the page is unaffected. This is usually a temporary
            problem with the upstream data feed.
          </p>
        </div>
      </section>
    );
  }
}

export default ErrorBoundary;
