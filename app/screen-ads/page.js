'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MonitorPlay, RefreshCw, ExternalLink, Upload, Loader2, AlertCircle, Info, Film, Image as ImageIcon,
  Sparkles, ArrowUp, ArrowDown, Trash2, Eye, EyeOff, Clock,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';
import {
  BACKEND_HAS_SCREEN_ADS, DEFAULT_IMAGE_SECONDS, fetchAllScreenAds, fetchScreenSettings,
  uploadScreenAd, updateScreenAd, deleteScreenAd, saveScreenSettings,
} from '../../utils/screenAds';

/**
 * Screen Ads: the videos and pictures the queue screen (/queue) plays full
 * screen between queue views. Upload, order, hide / show and delete them, and
 * set how long the queue shows between ads.
 */

const ACCEPT = 'video/mp4,video/webm,image/jpeg,image/png,image/webp';
const MAX_UPLOAD_MB = 200;

const TYPE_META = {
  video: { label: 'Video', icon: Film, pill: 'bg-blue-100 text-blue-700' },
  image: { label: 'Picture', icon: ImageIcon, pill: 'bg-violet-100 text-violet-700' },
  promo: { label: 'Magic Track promo', icon: Sparkles, pill: 'bg-[var(--primary-light)] text-[var(--primary-dark)]' },
};

const TONE = {
  primary: 'bg-[var(--primary)] text-white border border-transparent hover:bg-[var(--primary-hover)]',
  ghost:   'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
};

function AdPreview({ ad }) {
  if (ad.type === 'video') {
    return <video src={ad.url} className="w-full h-full object-contain bg-black" muted controls preload="metadata" playsInline />;
  }
  if (ad.type === 'image') {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded files, any size / host
    return <img src={ad.url} alt={ad.title} className="w-full h-full object-contain bg-black" />;
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[var(--brand-black)] text-white text-center px-3">
      <Sparkles className="w-6 h-6 text-[var(--primary)]" aria-hidden="true" />
      <span className="text-sm font-bold">{ad.title}</span>
      <span className="text-[11px] text-white/60">Made from the price list</span>
    </div>
  );
}

export default function ScreenAdsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [queueSeconds, setQueueSeconds] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [seconds, setSeconds] = useState(String(DEFAULT_IMAGE_SECONDS));
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('canDeleteRecords');
  const canEdit = BACKEND_HAS_SCREEN_ADS;

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const loadAll = useCallback(async () => {
    const [adsResult, settingsResult] = await Promise.allSettled([fetchAllScreenAds(), fetchScreenSettings()]);
    if (adsResult.status === 'fulfilled') {
      setAds(adsResult.value);
      setLoadError(null);
    } else {
      console.error('Error loading screen ads:', adsResult.reason);
      setLoadError(adsResult.reason?.message || 'Could not load the ads.');
    }
    if (settingsResult.status === 'fulfilled') setQueueSeconds(String(settingsResult.value.queueSeconds));
    setLoading(false);
  }, []);

  useEffect(() => {
    const first = setTimeout(loadAll, 0);
    return () => clearTimeout(first);
  }, [loadAll]);

  const refreshNow = async () => {
    setLoading(true);
    await loadAll();
  };

  const isVideoFile = file?.type?.startsWith('video/');

  const handleFile = (e) => {
    const picked = e.target.files?.[0] || null;
    if (picked && picked.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setToast({ message: `That file is over ${MAX_UPLOAD_MB} MB. Please use a smaller or shorter video.`, type: 'error' });
      e.target.value = '';
      return;
    }
    setFile(picked);
    if (picked && !title) setTitle(picked.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    try {
      await uploadScreenAd(file, {
        title: title.trim(),
        seconds: isVideoFile ? undefined : Number(seconds) || DEFAULT_IMAGE_SECONDS,
        order: ads.length,
      });
      setToast({ message: `"${title.trim() || file.name}" added — the screen plays it within 5 minutes`, type: 'success' });
      setFile(null);
      setTitle('');
      setSeconds(String(DEFAULT_IMAGE_SECONDS));
      e.target.reset();
      await loadAll();
    } catch (error) {
      console.error('Upload ad error:', error);
      setToast({ message: `Could not upload: ${error.message || 'server error'}`, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const runAction = async (ad, action, success) => {
    setBusyId(ad.id);
    try {
      await action();
      if (success) setToast({ message: success, type: 'success' });
      await loadAll();
    } catch (error) {
      console.error('Screen ad action error:', error);
      setToast({ message: error.message || 'Could not save the change.', type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = (ad) =>
    runAction(ad, () => updateScreenAd(ad, { active: !ad.active }), `"${ad.title}" ${ad.active ? 'hidden from' : 'shown on'} the screen`);

  // Swap places with the neighbour above / below.
  const move = (index, direction) => {
    const other = ads[index + direction];
    const ad = ads[index];
    if (!other) return;
    runAction(ad, async () => {
      await updateScreenAd(ad, { order: index + direction });
      await updateScreenAd(other, { order: index });
    });
  };

  const confirmDelete = () => {
    const ad = pendingDelete;
    if (ad) runAction(ad, () => deleteScreenAd(ad), `"${ad.title}" deleted`);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const value = Math.round(Number(queueSeconds));
    if (!Number.isFinite(value) || value < 10 || value > 3600) {
      setToast({ message: 'Enter between 10 and 3600 seconds.', type: 'error' });
      return;
    }
    setSavingSettings(true);
    try {
      await saveScreenSettings({ queueSeconds: value });
      setToast({ message: `The queue now shows for ${value} seconds between ads`, type: 'success' });
    } catch (error) {
      setToast({ message: error.message || 'Could not save.', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px] w-full lg:w-auto overflow-x-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Header title="Screen Ads" toggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {/* Panel header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                    <MonitorPlay className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-gray-900">Queue Screen Ads</h1>
                    <p className="text-xs text-gray-500">Videos and pictures shown full screen on the queue display, one at a time, between queue views</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={refreshNow}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
                  </button>
                  <a
                    href="/queue"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${TONE.primary}`}
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" /> Open Queue Screen
                  </a>
                </div>
              </div>

              {!BACKEND_HAS_SCREEN_ADS && (
                <div className="mx-5 mt-4 px-4 py-3 flex items-start gap-2.5 text-sm bg-amber-50 border border-amber-200 text-amber-800">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <b>Uploading is not switched on yet</b> — it needs a small server update from the backend developer.
                    Until then the screen plays the built-in Magic Track ads below.
                  </span>
                </div>
              )}

              {loadError && (
                <div className="mx-5 mt-4 px-3 py-2 flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="mr-auto">{loadError}</span>
                  <button onClick={refreshNow} className="text-xs font-semibold underline">Try again</button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5">
                {/* Upload */}
                <form onSubmit={handleUpload} className="border border-gray-200 p-4">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Upload className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" /> Add a video or picture
                  </h2>
                  <fieldset disabled={!canEdit || uploading} className="space-y-3 disabled:opacity-60">
                    <div>
                      <label htmlFor="ad-file">File</label>
                      <input id="ad-file" type="file" accept={ACCEPT} onChange={handleFile} className="w-full text-sm" />
                      <p className="mt-1 text-[11px] text-gray-500">
                        MP4 or WebM video, or a JPG / PNG / WebP picture, up to {MAX_UPLOAD_MB} MB. Best size: 1080 × 1920 (tall), to fill the screen.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="ad-title">Name</label>
                      <input id="ad-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Our washing process" autoComplete="off" />
                    </div>
                    {!isVideoFile && (
                      <div>
                        <label htmlFor="ad-seconds">Show a picture for (seconds)</label>
                        <input id="ad-seconds" type="number" min="3" max="120" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
                      </div>
                    )}
                    {isVideoFile && <p className="text-[11px] text-gray-500">Videos play to the end.</p>}
                    <button
                      type="submit"
                      disabled={!file || !canEdit || uploading}
                      className={`w-full py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${TONE.primary}`}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
                      {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                  </fieldset>
                </form>

                {/* Timing */}
                <form onSubmit={handleSaveSettings} className="border border-gray-200 p-4">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" /> Timing
                  </h2>
                  <fieldset disabled={!canEdit || savingSettings} className="space-y-3 disabled:opacity-60">
                    <div>
                      <label htmlFor="ad-queue-seconds">Show the queue for (seconds) before the next ad</label>
                      <input id="ad-queue-seconds" type="number" min="10" max="3600" value={queueSeconds} onChange={(e) => setQueueSeconds(e.target.value)} />
                    </div>
                    <button
                      type="submit"
                      disabled={!canEdit || savingSettings}
                      className={`w-full py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${TONE.primary}`}
                    >
                      {savingSettings && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Save
                    </button>
                  </fieldset>
                  <div className="mt-4 text-[12px] text-gray-600 space-y-1.5">
                    <p className="font-semibold text-gray-700">How the screen plays ads</p>
                    <p>Queue → one ad full screen → queue → next ad, round and round. Ready numbers stay visible at the bottom during an ad, and a car that becomes ready cuts the ad short.</p>
                    <p>For one screen only, add to its link: <code className="bg-gray-100 px-1">/queue?queue=60</code> (seconds) or <code className="bg-gray-100 px-1">/queue?ads=off</code>.</p>
                  </div>
                </form>
              </div>
            </div>

            {/* Ads list */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Play order <span className="text-gray-400 font-normal">({ads.filter((a) => a.active).length} showing)</span>
              </h2>
              {loading && ads.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-[var(--primary)] animate-spin" aria-hidden="true" />
                  <p className="text-sm">Loading ads…</p>
                </div>
              ) : ads.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">No ads yet — upload a video or picture above.</p>
              ) : (
                <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {ads.map((ad, i) => {
                    const meta = TYPE_META[ad.type] || TYPE_META.image;
                    const locked = ad.builtIn || !canEdit;
                    const busy = busyId === ad.id;
                    return (
                      <li key={ad.id} className={`border flex flex-col ${ad.active ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'}`}>
                        <div className="aspect-[9/16] max-h-[280px] w-full bg-gray-900 overflow-hidden">
                          <AdPreview ad={ad} />
                        </div>
                        <div className="p-3 flex-1 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              <span className="text-gray-400 mr-1">{i + 1}.</span>{ad.title}
                            </span>
                            <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.pill}`}>
                              <meta.icon className="w-3 h-3" aria-hidden="true" /> {meta.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {ad.type === 'video' ? 'Plays to the end' : `${ad.seconds} seconds`}
                            {ad.builtIn && ' · Built in'}
                            {!ad.active && ' · Hidden'}
                          </div>
                          <div className="mt-auto flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleActive(ad)}
                              disabled={locked || busy}
                              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${TONE.ghost}`}
                            >
                              {ad.active ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
                              {ad.active ? 'Hide' : 'Show'}
                            </button>
                            <button
                              type="button"
                              onClick={() => move(i, -1)}
                              disabled={locked || busy || i === 0 || ads[i - 1]?.builtIn}
                              className={`btn-icon p-1.5 transition-colors disabled:opacity-40 ${TONE.ghost}`}
                              aria-label={`Move ${ad.title} up`}
                            >
                              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => move(i, 1)}
                              disabled={locked || busy || i === ads.length - 1}
                              className={`btn-icon p-1.5 transition-colors disabled:opacity-40 ${TONE.ghost}`}
                              aria-label={`Move ${ad.title} down`}
                            >
                              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setPendingDelete(ad)}
                                disabled={locked || busy}
                                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                              </button>
                            )}
                            {busy && <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" aria-hidden="true" />}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </main>
      </div>

      <ConfirmationDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        type="error"
        title="Delete ad?"
        message={`This removes "${pendingDelete?.title}" from the queue screen. This cannot be undone.`}
        confirmText="Delete"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
