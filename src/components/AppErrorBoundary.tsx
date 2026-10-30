import { Component, type ReactNode } from "react";

/** Recover from rendering or lazy-chunk failures without displaying stack traces. */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="bt-recovery" role="alert">
      <h1>Let’s reload your workspace</h1>
      <p>This page could not be displayed. Reload to try again. Unsaved changes may be lost.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload workspace</button>
      <a href="/login">Return to sign in</a>
    </main>;
  }
}
