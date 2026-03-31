import React from "react";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { Megaphone } from "lucide-react";

interface AnnouncementBannerProps {
  orgId: string | null;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ orgId }) => {
  const { announcements, loading } = useAnnouncements(orgId);

  if (loading || announcements.length === 0) return null;

  const latestAnnouncement = announcements[0];

  return (
    <div className="mb-6 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-[#006f73] p-5 flex items-start gap-4">
        <div className="flex-1">
          <h1 className="font-bold text-[#f4f6fb] text-xl flex items-center gap-2 mb-2">
            <Megaphone className="w-6 h-6 text-[#ffffff]" />
            ঘোষণা
          </h1>
          <p className="text-[#d8f1ec] text-lg font-medium leading-relaxed">
            {latestAnnouncement.message}
          </p>
          <p className="text-[#d8f1ec]/60 text-xs mt-2 italic">
            {latestAnnouncement.creatorName} - {latestAnnouncement.createdAt ? (typeof latestAnnouncement.createdAt === 'object' && 'toDate' in (latestAnnouncement.createdAt as any) && typeof (latestAnnouncement.createdAt as any).toDate === 'function' ? (latestAnnouncement.createdAt as any).toDate().toLocaleDateString('bn-BD') : new Date(latestAnnouncement.createdAt as any).toLocaleDateString('bn-BD')) : ''}
          </p>
        </div>
      </div>
    </div>
  );
};
