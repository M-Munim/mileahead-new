'use client';

import { ExternalLink } from 'lucide-react';
import { NAME_TAG, SAMPLE_NAME } from '../../utils/broadcastText';

/** *bold* the way WhatsApp shows it. */
function WhatsAppText({ text }) {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) => (
    /^\*[^*\n]+\*$/.test(part) ? <b key={i}>{part.slice(1, -1)}</b> : part
  ));
}

/** The message as a customer sees it, with an example name for {{name}}. */
export default function WhatsAppPreview({ body, footer, sampleName, buttonText, emptyText = 'The message shows here as customers will see it.' }) {
  const name = (sampleName || '').trim() || SAMPLE_NAME;
  const text = String(body || '').trim().replaceAll(NAME_TAG, name);
  const foot = String(footer || '').trim();
  const button = String(buttonText || '').trim();
  return (
    <div>
      <div className="bg-[#e5ddd5] p-3 min-h-[160px]">
        {text ? (
          <div className="max-w-[92%]">
            <div className="bg-white shadow-sm px-3 py-2 text-sm text-gray-900 whitespace-pre-wrap break-words" dir="auto">
              <WhatsAppText text={text} />
              {foot && <span className="block mt-1 text-xs text-gray-500">{foot}</span>}
            </div>
            {button && (
              <div className="mt-px bg-white shadow-sm px-3 py-2 flex items-center justify-center gap-1.5 text-sm font-medium text-[#0b8bd6]" dir="auto">
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> {button}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center pt-12">{emptyText}</p>
        )}
      </div>
      {String(body || '').includes(NAME_TAG) && (
        <p className="mt-1 text-[11px] text-gray-500">&quot;{name}&quot; is an example. Each customer sees their own name.</p>
      )}
    </div>
  );
}
