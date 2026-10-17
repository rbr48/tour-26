import { Component } from 'react';

/** Shows a recovery screen instead of a blank page when a screen fails to render. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('The app failed to render:', error, info);
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-teal-950 p-6 text-center text-white">
        <h1 className="text-xl font-bold">কিছু একটা সমস্যা হয়েছে</h1>
        <p className="text-sm text-teal-100">আপনার সংরক্ষিত তথ্য মুছে যায়নি। পেজটি আবার খুলুন।</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-amber-400 px-5 py-2.5 font-bold text-teal-950"
        >
          আবার চালু করুন
        </button>
      </div>
    );
  }
}
