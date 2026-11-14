'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Loader2, Trash2, AlertCircle, ImageOff } from 'lucide-react';
import { jobCardService } from '../../utils/axiosInstance';
import { OPEN_STATUSES, MAX_PHOTOS, PHOTOS_PER_UPLOAD } from '../../utils/jobCards';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 10;
const when = (d) => (d ? new Date(String(d).replace(' ', 'T')).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/**
 * Vehicle photos on a job card (damage at check-in, the finished work). The
 * files are private, so each one is loaded with the staff login as a blob.
 * Photos can be removed only while the job card is open.
 */
export default function JobCardPhotos({ job, onChanged }) {
  const [urls, setUrls] = useState({}); // photo id → object URL, or 'error'
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const urlsRef = useRef({});
  const photos = useMemo(() => job.photos || [], [job.photos]);
  const canRemove = OPEN_STATUSES.includes(job.status);

  const mounted = useRef(true);

  // Load the photos not loaded yet (each once, even if the list changes meanwhile)
  useEffect(() => {
    photos.filter((p) => !urlsRef.current[p.id]).forEach(async (p) => {
      urlsRef.current[p.id] = 'loading';
      let value = 'error';
      try {
        const res = await jobCardService.getPhoto(p.id);
        value = URL.createObjectURL(res.data);
      } catch {
        /* shown as a broken photo */
      }
      if (!mounted.current) {
        if (value !== 'error') URL.revokeObjectURL(value);
        return;
      }
      urlsRef.current[p.id] = value;
      setUrls((prev) => ({ ...prev, [p.id]: value }));
    });
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

  const upload = async (fileList) => {
    const files = [...(fileList || [])];
    if (inputRef.current) inputRef.current.value = '';
    if (!files.length) return;
    setError('');
    if (files.length > PHOTOS_PER_UPLOAD) return setError(`Add at most ${PHOTOS_PER_UPLOAD} photos at a time.`);
    if (photos.length + files.length > MAX_PHOTOS) return setError(`A job card can have at most ${MAX_PHOTOS} photos (it has ${photos.length}).`);
    const wrong = files.find((f) => !TYPES.includes(f.type));
    if (wrong) return setError(`"${wrong.name}" is not a photo. Use JPG, PNG or WEBP.`);
    const big = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (big) return setError(`"${big.name}" is larger than ${MAX_MB} MB.`);

    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    if (caption.trim()) fd.append('caption', caption.trim());
    setBusy(true);
    try {
      const res = await jobCardService.addPhotos(job.id, fd);
      setCaption('');
      onChanged({ ...job, photos: res.data.data }, res.data.message);
    } catch (err) {
      setError(err?.message || 'Could not upload the photos.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (photo) => {
    if (!window.confirm('Remove this photo?')) return;
    setRemoving(photo.id);
    setError('');
    try {
      const res = await jobCardService.removePhoto(photo.id);
      const u = urlsRef.current[photo.id];
      if (u && u.startsWith('blob:')) URL.revokeObjectURL(u);
      delete urlsRef.current[photo.id];
      onChanged({ ...job, photos: photos.filter((p) => p.id !== photo.id) }, res.data.message);
    } catch (err) {
      setError(err?.message || 'Could not remove the photo.');
    } finally {
      setRemoving(null);
    }
  };

  const open = (photo) => {
    const u = urls[photo.id];
    if (u && u.startsWith('blob:')) window.open(u, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">Vehicle photos ({photos.length})</p>
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
          {photos.map((p) => {
            const u = urls[p.id];
            return (
              <li key={p.id} className="relative border border-gray-200 bg-gray-50">
                <button type="button" onClick={() => open(p)} className="block w-full aspect-square" aria-label={`Open photo${p.caption ? `: ${p.caption}` : ''}`}>
                  {u === 'error' ? (
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
                    onClick={() => remove(p)}
                    disabled={removing === p.id}
                    aria-label="Remove photo"
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
      {photos.length < MAX_PHOTOS && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            aria-label="Photo caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={150}
            placeholder="Caption, e.g. Scratch on rear bumper (optional)"
            className="flex-1"
          />
          <input ref={inputRef} type="file" accept={TYPES.join(',')} multiple hidden onChange={(e) => upload(e.target.files)} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
            {busy ? 'Uploading…' : 'Add photos'}
          </button>
        </div>
      )}
      <p className="text-[11px] text-gray-500 mt-1">Up to {PHOTOS_PER_UPLOAD} at a time, {MAX_MB} MB each. Photos stay private to staff.{canRemove ? '' : ' After delivery they can no longer be removed.'}</p>
      {error && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 text-xs bg-red-50 border border-red-200 text-red-700" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" /><span>{error}</span>
        </div>
      )}
    </div>
  );
}
