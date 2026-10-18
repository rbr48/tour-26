import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  canInstallPackages,
  openInstallSettings,
  downloadAndInstallApk,
} from '../utils/appUpdater';
import { toBnNum } from '../utils/videoHelper';

export default function AppUpdateModal({
  updateInfo,
  isOpen,
  onClose,
}) {
  const [downloadProgress, setDownloadProgress] = useState(null); // { percent, bytesDownloaded, totalBytes }
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [hasPermission, setHasPermission] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDownloadProgress(null);
    setIsDownloading(false);
    setDownloadError('');
    setIsSuccess(false);

    canInstallPackages().then((canInstall) => {
      setHasPermission(canInstall);
    });
  }, [isOpen]);

  if (!isOpen || !updateInfo) return null;

  const handleStartUpdate = async () => {
    setDownloadError('');
    setIsDownloading(true);
    setDownloadProgress({ percent: 0, bytesDownloaded: 0, totalBytes: 0 });

    try {
      // Re-verify permission before start
      const allowed = await canInstallPackages();
      if (!allowed) {
        setHasPermission(false);
        setIsDownloading(false);
        return;
      }

      const result = await downloadAndInstallApk({
        apkUrl: updateInfo.apkUrl,
        onProgress: (p) => {
          setDownloadProgress(p);
        },
      });

      if (result?.success) {
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('Update download failed:', err);
      setDownloadError(err?.message || 'ডাউনলোড সম্পন্ন করা যায়নি। ইন্টারনেট সংযোগ চেক করুন।');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenSettings = async () => {
    await openInstallSettings();
    // After returning from settings, re-check
    setTimeout(async () => {
      const allowed = await canInstallPackages();
      setHasPermission(allowed);
    }, 1500);
  };

  const formatMb = (bytes) => {
    if (!bytes || bytes <= 0) return '০ MB';
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${toBnNum(mb)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      role="presentation"
      onClick={updateInfo.forceUpdate ? undefined : onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with decorative badge */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white p-5 relative">
          {!updateInfo.forceUpdate && (
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer disabled:opacity-40"
              title="বন্ধ করুন"
            >
              <X size={18} />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Sparkles size={24} className="animate-spin duration-3000" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                <span>OTA আপডেট পাওয়া গেছে</span>
              </div>
              <h3 className="font-extrabold text-lg text-white">নতুন ভার্সন v{updateInfo.serverVersion}</h3>
              <p className="text-xs text-teal-200">
                বর্তমান ভার্সন: v{updateInfo.currentVersion} • সাইজ: {updateInfo.apkSize}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Release Notes */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-teal-600" /> নতুন ফিচার ও পরিবর্তনসমূহ:
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-line">
              {updateInfo.releaseNotes}
            </p>
          </div>

          {/* Unknown sources permission banner if not granted */}
          {!hasPermission && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-start gap-2 text-amber-900 font-bold">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>ইনস্টল পারমিশন প্রয়োজন</span>
              </div>
              <p className="text-[11px] text-amber-800">
                অ্যান্ড্রয়েড সিকিউরিটি নিয়মানুযায়ী অ্যাপের ভেতর থেকে আপডেট নিতে "Install unknown apps" অন করতে হবে।
              </p>
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <ExternalLink size={14} /> সেটিংসে গিয়ে পারমিশন দিন
              </button>
            </div>
          )}

          {/* Downloading Progress Screen */}
          {isDownloading && (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-teal-700" />
                  নতুন APK ডাউনলোড হচ্ছে...
                </span>
                <span className="font-mono text-teal-700 text-sm">
                  {downloadProgress?.percent !== undefined && downloadProgress.percent >= 0
                    ? `${toBnNum(downloadProgress.percent)}%`
                    : 'প্রস্তুত হচ্ছে...'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-teal-200/60 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-600 to-emerald-500 h-3 rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.max(5, downloadProgress?.percent || 5)}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-teal-700 font-semibold">
                <span>ডাউনলোড হচ্ছে:</span>
                <span>
                  {downloadProgress?.bytesDownloaded
                    ? `${formatMb(downloadProgress.bytesDownloaded)} / ${formatMb(downloadProgress.totalBytes || 36000000)}`
                    : 'অপেক্ষা করুন...'}
                </span>
              </div>
              <p className="text-[10px] text-teal-800/80 text-center">
                ⚠️ ডাউনলোড শেষ হলে স্বয়ংক্রিয়ভাবে ইনস্টলেশন শুরু হবে।
              </p>
            </div>
          )}

          {/* Success Screen */}
          {isSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-in fade-in">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-bold text-sm text-emerald-900">ডাউনলোড সম্পন্ন হয়েছে!</h4>
              <p className="text-xs text-emerald-700">
                অ্যান্ড্রয়েড ইনস্টলার ওপেন হয়েছে। স্ক্রিনের নির্দেশ অনুযায়ী "Update" চাপুন।
              </p>
            </div>
          )}

          {/* Error Message */}
          {downloadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{downloadError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {!updateInfo.forceUpdate && (
            <button
              type="button"
              onClick={onClose}
              disabled={isDownloading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-40"
            >
              পরে করব
            </button>
          )}

          <button
            type="button"
            onClick={handleStartUpdate}
            disabled={isDownloading}
            className="flex-1 py-2.5 bg-gradient-to-r from-teal-800 to-emerald-700 hover:from-teal-700 hover:to-emerald-600 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>ডাউনলোড হচ্ছে...</span>
              </>
            ) : isSuccess ? (
              <>
                <RefreshCw size={16} className="text-white" />
                <span>পুনরায় ইনস্টল চালান</span>
              </>
            ) : (
              <>
                <DownloadCloud size={16} className="text-white" />
                <span>এখনই আপডেট করুন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
