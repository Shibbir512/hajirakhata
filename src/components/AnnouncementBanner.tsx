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
    <div className="mb-6 rounded-[16px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-gradient-to-b from-[#E6F4F1] to-[#FFFFFF] border border-[#E6F4F1]">
      <div className="p-[18px] flex items-start gap-4">
        <div className="flex-1">
          <h1 className="font-bold text-[#0F766E] text-xl flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-5 h-5 text-[#0F766E]" strokeWidth={2} />
            </div>
            ঘোষণা
          </h1>
          <p className="text-[#1F2937] text-base font-bold leading-relaxed mb-3">
            {latestAnnouncement.message}
          </p>
          <p className="text-[#6B7280] text-sm">
            {latestAnnouncement.creatorName} - {latestAnnouncement.createdAt ? (typeof latestAnnouncement.createdAt === 'object' && 'toDate' in (latestAnnouncement.createdAt as any) && typeof (latestAnnouncement.createdAt as any).toDate === 'function' ? (latestAnnouncement.createdAt as any).toDate().toLocaleDateString('bn-BD') : new Date(latestAnnouncement.createdAt as any).toLocaleDateString('bn-BD')) : ''}
          </p>
        </div>
      </div>
    </div>
  );
};
