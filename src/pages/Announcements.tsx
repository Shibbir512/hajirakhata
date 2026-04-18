import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationDialog from "../components/ConfirmationDialog";

const Announcements: React.FC = () => {
  const { orgId, user } = useAuth();
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useAnnouncements(orgId);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newMessage.trim()) return;
    try {
      await addAnnouncement(newMessage, user?.displayName || "Admin");
      
      // Send push notification to all users in the organization
      if (orgId) {
        try {
          // We'll call our new Vercel API endpoint to send the notification
          fetch('/api/send-announcement', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orgId: orgId,
              title: 'নতুন ঘোষণা',
              body: newMessage,
              senderName: user?.displayName || "Admin"
            }),
          }).catch(err => console.error("Failed to trigger push notification:", err));
        } catch (e) {
          console.error("Error triggering push notification:", e);
        }
      }

      setNewMessage("");
      toast.success("বার্তা যোগ করা হয়েছে");
    } catch (error) {
      toast.error("বার্তা যোগ করতে ব্যর্থ হয়েছে");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editMessage.trim()) return;
    try {
      await updateAnnouncement(id, editMessage);
      setEditingId(null);
      setEditMessage("");
      toast.success("বার্তা আপডেট করা হয়েছে");
    } catch (error) {
      toast.error("বার্তা আপডেট করতে ব্যর্থ হয়েছে");
    }
  };

  const handleDelete = async (id: string) => {
    setAnnouncementToDelete(id);
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    try {
      await deleteAnnouncement(announcementToDelete);
      toast.success("বার্তা মুছে ফেলা হয়েছে");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("বার্তা মুছতে ব্যর্থ হয়েছে");
    } finally {
      setAnnouncementToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold gradient-text tracking-tight">ঘোষণা ব্যবস্থাপনা</h2>

      <div className="card-premium p-6 bg-white rounded-[20px]">
        <h3 className="text-lg font-bold mb-4">নতুন বার্তা যোগ করুন</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="বার্তা লিখুন..."
            className="flex-grow p-3 border rounded-xl"
          />
          <button onClick={handleAdd} className="bg-[#0F5C7A] text-white px-6 py-3 rounded-xl flex items-center gap-2">
            <Plus className="w-5 h-5" /> যোগ করুন
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {announcements.map((ann) => (
          <div key={ann.id} className="card-premium p-6 bg-white rounded-[20px] flex justify-between items-center">
            {editingId === ann.id ? (
              <div className="flex-grow flex gap-2">
                <input
                  type="text"
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  className="flex-grow p-2 border rounded-xl"
                />
                <button onClick={() => handleUpdate(ann.id)} className="text-green-600"><Save /></button>
                <button onClick={() => setEditingId(null)} className="text-red-600"><X /></button>
              </div>
            ) : (
              <>
                <p className="text-slate-800 flex-grow">{ann.message}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(ann.id); setEditMessage(ann.message); }} className="text-blue-600"><Edit2 /></button>
                  <button onClick={() => handleDelete(ann.id)} className="text-red-600"><Trash2 /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <ConfirmationDialog
        isOpen={!!announcementToDelete}
        onClose={() => setAnnouncementToDelete(null)}
        onConfirm={confirmDelete}
        title="বার্তা মুছে ফেলুন"
        message="আপনি কি নিশ্চিত যে আপনি এই বার্তাটি মুছে ফেলতে চান? এই কাজটি অপরিবর্তনীয়।"
      />
    </div>
  );
};

export default Announcements;
