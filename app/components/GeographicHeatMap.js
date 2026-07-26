'use client';

import { Flame } from 'lucide-react';
import Image from 'next/image';
import qatarMap from '../../public/image.png';

export default function GeographicHeatMap() {
  return (
    <div className="relative w-full h-full min-h-[200px] bg-gradient-to-br from-blue-50 to-green-50 overflow-hidden shadow-sm border border-gray-100 animate-fade-in">
      <div className="absolute top-3 left-3 flex items-center bg-white/90 backdrop-blur-sm p-2 z-20 shadow-sm">
        <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
        <h3 className="text-sm text-gray-900 ml-2 font-medium">Geographic Heat Map</h3>
      </div>

      <div className="w-full h-full pt-12">
        <div className="w-full h-full relative">
          <Image
            src={qatarMap}
            alt="Qatar Geographic Heat Map"
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </div>
      </div>
    </div>
  );
}
