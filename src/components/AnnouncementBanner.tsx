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
    <div className="bg-amber-100 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm">
      <div className="flex items-start">
        <Megaphone className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-800">ঘোষণা</h4>
          <p className="text-amber-900 text-lg font-medium">{latestAnnouncement.message}</p>
          <p className="text-amber-700 text-xs mt-1 italic">
            {latestAnnouncement.creatorName} - {latestAnnouncement.createdAt ? (typeof latestAnnouncement.createdAt === 'object' && 'toDate' in (latestAnnouncement.createdAt as any) && typeof (latestAnnouncement.createdAt as any).toDate === 'function' ? (latestAnnouncement.createdAt as any).toDate().toLocaleDateString('bn-BD') : new Date(latestAnnouncement.createdAt as any).toLocaleDateString('bn-BD')) : ''}
          </p>
        </div>
      </div>
    </div>
  );
};
