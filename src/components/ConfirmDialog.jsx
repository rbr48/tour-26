import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

/** Asks before anything is deleted. Cancel is focused first, so Enter never deletes by accident. */
export default function ConfirmDialog({ request, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!request) return undefined;
    cancelRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [request, onCancel]);

  if (!request) return null;

  const confirm = () => {
    request.onConfirm();
    onCancel();
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-rose-100 p-2 text-rose-700">
            <AlertTriangle size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 id="confirm-dialog-title" className="text-base font-bold text-slate-900">
              {request.title}
            </h2>
            <p id="confirm-dialog-message" className="mt-1 text-sm text-slate-600">
              {request.message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
          >
            {request.confirmLabel || 'নিশ্চিত করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
