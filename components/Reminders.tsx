import React, { useState, useEffect } from 'react';
import Button from './common/Button';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from './common/Icons';

interface RemindersProps {
    reminders: string[];
    onAddReminder: (time: string) => void;
    onDeleteReminder: (time: string) => void;
    onBack: () => void;
}

const Reminders: React.FC<RemindersProps> = ({ reminders, onAddReminder, onDeleteReminder, onBack }) => {
    const [newTime, setNewTime] = useState('');
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

    useEffect(() => {
        // This component doesn't need to request permission on mount
        // The App component handles checking. This state is for UI rendering.
    }, []);

    const handleEnableNotifications = () => {
        Notification.requestPermission().then(permission => {
            setNotificationPermission(permission);
        });
    };

    const handleAddReminder = () => {
        if (newTime) {
            onAddReminder(newTime);
            setNewTime('');
        }
    };

    const formatTime = (time24h: string) => {
        const [hours, minutes] = time24h.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 pb-4 border-b">
                <h2 className="text-xl font-bold text-gray-700">হাজিরার রিমাইন্ডার</h2>
                <Button onClick={onBack} variant="secondary" size="sm">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    ফিরে যান
                </Button>
            </div>

            {notificationPermission !== 'granted' && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                    <p className="font-bold">নোটিফিকেশন অনুমতি প্রয়োজন</p>
                    <p>রিমাইন্ডারগুলো সঠিকভাবে কাজ করার জন্য, অনুগ্রহ করে ব্রাউজারে নোটিফিকেশন দেখানোর অনুমতি দিন।</p>
                    {notificationPermission === 'default' && (
                        <Button onClick={handleEnableNotifications} size="sm" className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white">
                            অনুমতি দিন
                        </Button>
                    )}
                     {notificationPermission === 'denied' && (
                         <p className="text-sm mt-2">আপনি নোটিফিকেশন ব্লক করেছেন। এটি চালু করতে অনুগ্রহ করে আপনার ব্রাউজার সেটিংস পরিবর্তন করুন।</p>
                     )}
                </div>
            )}

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">নতুন রিমাইন্ডার যোগ করুন</h3>
                <div className="flex gap-2">
                    <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <Button onClick={handleAddReminder} disabled={!newTime}>
                        <PlusIcon className="w-5 h-5 mr-2" />
                        যোগ করুন
                    </Button>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-700">আপনার রিমাইন্ডারসমূহ</h3>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                    {reminders.length > 0 ? (
                        reminders.map(time => (
                            <div key={time} className="flex items-center justify-between p-3 rounded-md border bg-gray-50">
                                <p className="font-medium text-gray-800 text-lg">{formatTime(time)}</p>
                                <Button size="sm" variant="ghost" onClick={() => onDeleteReminder(time)} title="মুছে ফেলুন">
                                    <TrashIcon className="w-5 h-5 text-red-500 hover:text-red-700" />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-10">
                            <p className="text-gray-500">কোনো রিমাইন্ডার সেট করা হয়নি।</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reminders;
