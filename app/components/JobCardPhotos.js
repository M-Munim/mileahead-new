'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Loader2, Trash2, AlertCircle, ImageOff, PlayCircle, MessageCircle, Link2, Copy, Check, XCircle } from 'lucide-react';
import { jobCardService } from '../../utils/axiosInstance';
import { OPEN_STATUSES, MAX_PHOTOS, PHOTOS_PER_UPLOAD, inspectionUrl, inspectionMessage } from '../../utils/jobCards';
import { getWhatsAppUrl, toWhatsAppNumber } from '../../utils/location';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_PHOTO_MB = 10;
const MAX_VIDEO_MB = 50;
const isVideo = (type) => String(type || '').startsWith('video/');
const when = (d) => (d ? new Date(String(d).replace(' ', 'T')).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function ErrorBox({ children }) {
  return (
    <div className="mt-2 flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
      <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" /><span>{children}</span>
    </div>
  );
}

/**
 * The customer's private link to the after-service photos/videos: turn it on,
 * send it on WhatsApp, copy it, or turn it off.
 */
function InspectionShare({ job, hasMedia, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const token = job.inspection_token;
  const url = token ? inspectionUrl(token) : '';
  const number = toWhatsAppNumber(job.customer?.phone);

  const turnOn = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await jobCardService.inspectionLink(job.id);
      onChanged({ ...job, inspection_token: res.data.data.token }, 'Inspection link ready');
    } catch (err) {
      setError(err?.message || 'Could not make the link.');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!window.confirm('Turn off the link? The customer will no longer be able to open the inspection page.')) return;
    setBusy(true);
    setError('');
    try {
      const res = await jobCardService.removeInspectionLink(job.id);
      onChanged({ ...job, inspection_token: null }, res.data.message);
    } catch (err) {
      setError(err?.message || 'Could not turn off the link.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy the link:', url);
    }
  };

  if (!hasMedia) {
    return <p className="text-[11px] text-gray-500">Add photos or videos of the finished car here, then send them to the customer.</p>;
  }

  return (
    <div className="border border-green-200 bg-green-50 p-3 space-y-2">
      {!token ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <p className="text-sm text-green-900">Send these photos and videos to the customer as a private link.</p>
          <button type="button" onClick={turnOn} disabled={busy} className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Link2 className="w-4 h-4" aria-hidden="true" />} Make customer link
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-green-900">The customer&apos;s link is on. Only people with the link can see these after-service photos and videos.</p>
          <div className="flex flex-wrap gap-2">
            {number ? (
              <a
                href={getWhatsAppUrl(inspectionMessage(job, url), number)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" /> Send to customer on WhatsApp
              </a>
            ) : (
              <span className="text-xs text-gray-600 self-center">The customer has no valid WhatsApp number. Copy the link instead.</span>
            )}
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50">
              {copied ? <Check className="w-4 h-4 text-green-600" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />} {copied ? 'Copied' : 'Copy link'}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50">
              Preview
            </a>
            <button type="button" onClick={turnOff} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50">
              <XCircle className="w-4 h-4" aria-hidden="true" /> Turn off link
            </button>
          </div>
        </>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  );
}

/** One group of photos/videos (check-in or after service) with its own upload. */
function MediaGroup({ stage, title, hint, placeholder, items, total, urls, onOpen, onRemove, removing, onUpload, busy, canRemove, children }) {
  const [caption, setCaption] = useState('');
  const inputRef = useRef(null);

  const pick = async (fileList) => {
    const files = [...(fileList || [])];
    if (inputRef.current) inputRef.current.value = '';
    if (await onUpload(files, caption, stage)) setCaption('');
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500">{title} ({items.length})</p>
      {items.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {items.map((p) => {
            const u = urls[p.id];
            const video = isVideo(p.file_type);
            return (
              <li key={p.id} className="relative border border-gray-200 bg-gray-50">
                <button type="button" onClick={() => onOpen(p)} className="block w-full aspect-square" aria-label={`Open ${video ? 'video' : 'photo'}${p.caption ? `: ${p.caption}` : ''}`}>
                  {video ? (
                    <span className="flex h-full flex-col items-center justify-center gap-1 bg-gray-800 text-white">
                      {u === 'loading' ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" /> : <PlayCircle className="w-8 h-8" aria-hidden="true" />}
                      <span className="text-[10px]">Video</span>
                    </span>
                  ) : u === 'error' ? (
                    <span className="flex h-full items-center justify-center text-gray-400"><ImageOff className="w-5 h-5" aria-hidden="true" /></span>
                  ) : u && u !== 'loading' ? (
                    // Blob URLs from the private photo endpoint; next/image can't load these.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u} alt={p.caption || 'Vehicle photo'} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /></span>
                  )}
                </button>
                <p className="px-1.5 py-1 text-[10.5px] leading-tight text-gray-600 truncate" title={[p.caption, when(p.created_at), p.created_by].filter(Boolean).join(' · ')}>
                  {p.caption || when(p.created_at)}
                </p>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(p)}
                    disabled={removing === p.id}
                    aria-label={`Remove ${video ? 'video' : 'photo'}`}
                    className="absolute top-1 right-1 p-1 bg-white/90 text-red-600 hover:bg-white disabled:opacity-50"
                  >
                    {removing === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {total < MAX_PHOTOS && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input aria-label={`${title}: caption (optional)`} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={150} placeholder={placeholder} className="flex-1" />
          <input ref={inputRef} type="file" accept={[...PHOTO_TYPES, ...VIDEO_TYPES].join(',')} multiple hidden onChange={(e) => pick(e.target.files)} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === stage ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
            {busy === stage ? 'Uploading…' : 'Add photos / videos'}
          </button>
        </div>
      )}
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}

/**
 * Photos and short videos on a job card, in two groups: at check-in (damage)
 * and after the service (the inspection the customer can be sent as a private
 * link). Files are private, so each is loaded with the staff login as a blob:
 * photos straight away, videos only when opened. Removable while the job is open.
 */
export default function JobCardPhotos({ job, onChanged }) {
  const [urls, setUrls] = useState({}); // id → object URL, 'loading' or 'error'
  const [busy, setBusy] = useState(false); // the stage being uploaded
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');
  const urlsRef = useRef({});
  const mounted = useRef(true);
  const photos = useMemo(() => job.photos || [], [job.photos]);
  const canRemove = OPEN_STATUSES.includes(job.status);
  const checkIn = photos.filter((p) => (p.stage || 'check_in') === 'check_in');
  const after = photos.filter((p) => p.stage === 'after');

  const loadBlob = async (p) => {
    urlsRef.current[p.id] = 'loading';
    setUrls((prev) => ({ ...prev, [p.id]: 'loading' }));
    let value = 'error';
    try {
      const res = await jobCardService.getPhoto(p.id);
      value = URL.createObjectURL(res.data);
    } catch {
      /* shown as broken */
    }
    if (!mounted.current) {
      if (value !== 'error') URL.revokeObjectURL(value);
      return null;
    }
    urlsRef.current[p.id] = value;
    setUrls((prev) => ({ ...prev, [p.id]: value }));
    return value;
  };

  // Photos load straight away (each once); videos wait until opened
  useEffect(() => {
    photos.filter((p) => !isVideo(p.file_type) && !urlsRef.current[p.id]).forEach(loadBlob);
  }, [photos]);

  // Free the blobs when the job card closes
  useEffect(() => {
    mounted.current = true;
    const loaded = urlsRef.current;
    return () => {
      mounted.current = false;
      Object.values(loaded).forEach((u) => { if (u && u.startsWith('blob:')) URL.revokeObjectURL(u); });
    };
  }, []);

  const open = async (p) => {
    let u = urls[p.id];
    if (u === 'loading') return;
    if (isVideo(p.file_type) && (!u || u === 'error')) {
      // Open the tab now (a click), fill it when the video has loaded
      const tab = window.open('', '_blank');
      u = await loadBlob(p);
      if (tab) {
        if (u && u !== 'error') tab.location.href = u;
        else tab.close();
      }
      if (u === 'error') setError('Could not load the video.');
      return;
    }
    if (u && u.startsWith('blob:')) window.open(u, '_blank', 'noopener,noreferrer');
  };

  /** Returns true when uploaded. */
  const upload = async (files, caption, stage) => {
    if (!files.length) return false;
    setError('');
    const fail = (m) => { setError(m); return false; };
    if (files.length > PHOTOS_PER_UPLOAD) return fail(`Add at most ${PHOTOS_PER_UPLOAD} files at a time.`);
    if (photos.length + files.length > MAX_PHOTOS) return fail(`A job card can have at most ${MAX_PHOTOS} photos and videos (it has ${photos.length}).`);
    const wrong = files.find((f) => !PHOTO_TYPES.includes(f.type) && !VIDEO_TYPES.includes(f.type));
    if (wrong) return fail(`"${wrong.name}" can't be added. Use JPG, PNG or WEBP photos, or MP4, MOV or WEBM videos.`);
    const big = files.find((f) => f.size > (isVideo(f.type) ? MAX_VIDEO_MB : MAX_PHOTO_MB) * 1024 * 1024);
    if (big) return fail(`"${big.name}" is too large. The maximum is ${MAX_PHOTO_MB} MB per photo and ${MAX_VIDEO_MB} MB per video.`);

    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    if (caption.trim()) fd.append('caption', caption.trim());
    fd.append('stage', stage);
    setBusy(stage);
    try {
      const res = await jobCardService.addPhotos(job.id, fd);
      onChanged({ ...job, photos: res.data.data }, res.data.message);
      return true;
    } catch (err) {
      return fail(err?.message || 'Could not upload.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Remove this ${isVideo(p.file_type) ? 'video' : 'photo'}?`)) return;
    setRemoving(p.id);
    setError('');
    try {
      const res = await jobCardService.removePhoto(p.id);
      const u = urlsRef.current[p.id];
      if (u && u.startsWith('blob:')) URL.revokeObjectURL(u);
      delete urlsRef.current[p.id];
      onChanged({ ...job, photos: photos.filter((x) => x.id !== p.id) }, res.data.message);
    } catch (err) {
      setError(err?.message || 'Could not remove it.');
    } finally {
      setRemoving(null);
    }
  };

  const shared = { total: photos.length, urls, onOpen: open, onRemove: remove, removing, onUpload: upload, busy, canRemove };

  return (
    <div className="space-y-5">
      <MediaGroup
        {...shared}
        stage="check_in"
        title="Check-in photos (damage)"
        items={checkIn}
        placeholder="Caption, e.g. Scratch on rear bumper (optional)"
        hint={`Up to ${PHOTOS_PER_UPLOAD} at a time: photos ${MAX_PHOTO_MB} MB, videos ${MAX_VIDEO_MB} MB each. Staff only.${canRemove ? '' : ' After delivery they can no longer be removed.'}`}
      />
      {(after.length > 0 || ['in_progress', 'quality_check', 'ready', 'delivered'].includes(job.status)) && (
        <MediaGroup
          {...shared}
          stage="after"
          title="After service (inspection)"
          items={after}
          placeholder="Caption, e.g. Front view after tinting (optional)"
        >
          <InspectionShare job={job} hasMedia={after.length > 0} onChanged={onChanged} />
        </MediaGroup>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  );
}
