import React, { useState, useMemo, useEffect } from 'react';
import type { ClassData, Student } from '../types';
import { AttendanceStatus } from '../types';
import Button from './common/Button';
import ClassSelector from './ClassSelector';
import { ArrowLeftIcon, UserIcon, DocumentArrowDownIcon, MagnifyingGlassIcon } from './common/Icons';
import { normalizeSearchQuery, fuzzyMatch } from '../utils/search';

interface ConsolidatedReportProps {
    classes: ClassData[];
    getConsolidatedReport: (filters: { 
        startDate: Date | null; 
        endDate: Date | null; 
        status: AttendanceStatus 
    }) => Map<string, { student: Student; count: number }[]>;
    onSelectStudent: (student: Student) => void;
    onBack: () => void;
}

const ConsolidatedReport: React.FC<ConsolidatedReportProps> = ({ classes, getConsolidatedReport, onSelectStudent, onBack }) => {
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.Absent);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setSearchQuery('');
    }, [selectedClassId]);

    const reportData = useMemo(() => {
        return getConsolidatedReport({ startDate, endDate, status });
    }, [getConsolidatedReport, startDate, endDate, status]);

    const selectedClassReport = selectedClassId ? reportData.get(selectedClassId) : null;
    
    const filteredReport = useMemo(() => {
        if (!selectedClassReport) return null;
        if (!searchQuery) return selectedClassReport;

        const lowercasedQuery = searchQuery.toLowerCase();
        const normalizedRollQuery = normalizeSearchQuery(searchQuery);
        return selectedClassReport.filter(({ student }) =>
            fuzzyMatch(lowercasedQuery, student.name) ||
            student.roll.toString().includes(normalizedRollQuery)
        );
    }, [selectedClassReport, searchQuery]);

    const statusText = status === AttendanceStatus.Absent ? 'অনুপস্থিত' : 'উপস্থিত';

    const handleExportCSV = () => {
        if (!selectedClassId || !filteredReport || filteredReport.length === 0) {
            alert('রিপোর্ট এক্সপোর্ট করার জন্য অনুগ্রহ করে একটি শ্রেণি নির্বাচন করুন এবং নিশ্চিত করুন যে ডেটা আছে।');
            return;
        }

        const selectedClass = classes.find(c => c.id === selectedClassId);
        if (!selectedClass) return;

        const headers = ['রোল', 'নাম', `${statusText} দিনের সংখ্যা`];
        const rows = filteredReport.map(({ student, count }) => 
            [student.roll, `"${student.name}"`, count].join(',')
        );

        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        
        const datePart = (startDate ? `from_${startDate.toISOString().split('T')[0]}` : '') + (endDate ? `_to_${endDate.toISOString().split('T')[0]}` : '');
        const filename = `report_${selectedClass.name.replace(/\s/g, '_')}_${status}_${datePart || 'all_time'}.csv`;

        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 pb-4 border-b">
                <div className="mb-2 sm:mb-0">
                    <h2 className="text-xl font-bold text-gray-700">সকল ক্লাসের রিপোর্ট</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                        onClick={handleExportCSV} 
                        variant="secondary" 
                        size="sm" 
                        disabled={!selectedClassId || !filteredReport || filteredReport.length === 0}
                        title={!selectedClassId || !filteredReport || filteredReport.length === 0 ? "এক্সপোর্ট করতে একটি শ্রেণি নির্বাচন করুন" : "রিপোর্টটি CSV হিসাবে ডাউনলোড করুন"}
                    >
                        <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                        CSV এক্সপোর্ট করুন
                    </Button>
                    <Button onClick={onBack} variant="secondary" size="sm">
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        ফিরে যান
                    </Button>
                </div>
            </div>
            
            <div className="border-b pb-4 mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">ফিল্টার করুন</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">শুরুর তারিখ</label>
                        <input 
                            type="date" 
                            id="start-date"
                            value={startDate ? startDate.toISOString().split('T')[0] : ''}
                            onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">শেষ তারিখ</label>
                        <input 
                            type="date" 
                            id="end-date"
                            value={endDate ? endDate.toISOString().split('T')[0] : ''}
                            onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">স্ট্যাটাস</label>
                        <div className="flex gap-4 items-center">
                            <label className="flex items-center">
                                <input type="radio" name="status" value={AttendanceStatus.Absent} checked={status === AttendanceStatus.Absent} onChange={() => setStatus(AttendanceStatus.Absent)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                                <span className="ml-2 text-sm text-gray-700">অনুপস্থিত</span>
                            </label>
                            <label className="flex items-center">
                                <input type="radio" name="status" value={AttendanceStatus.Present} checked={status === AttendanceStatus.Present} onChange={() => setStatus(AttendanceStatus.Present)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                                <span className="ml-2 text-sm text-gray-700">উপস্থিত</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                 <h3 className="text-lg font-semibold mb-3 text-gray-700">শ্রেণি নির্বাচন করুন</h3>
                <ClassSelector 
                    classes={classes}
                    selectedClassId={selectedClassId}
                    onSelectClass={setSelectedClassId}
                />
            </div>
            
            {selectedClassId ? (
                <div>
                    <div className="relative mb-4">
                         <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="ছাত্র/ছাত্রী খুঁজুন (নাম বা রোল)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    {filteredReport && filteredReport.length > 0 ? (
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                             {filteredReport.map(({ student, count }) => (
                                <button 
                                    key={student.id} 
                                    onClick={() => onSelectStudent(student)}
                                    className="w-full flex items-center justify-between p-3 rounded-md border text-left hover:bg-gray-50 transition-colors"
                                >
                                    <p className="font-medium">{student.roll}. {student.name}</p>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm font-bold ${status === AttendanceStatus.Absent ? 'text-red-600' : 'text-green-600'}`}>
                                            {statusText}: {count} দিন
                                        </span>
                                         <UserIcon className="w-5 h-5 text-gray-400"/>
                                    </div>
                                </button>
                             ))}
                        </div>
                    ) : (
                        <div className="text-center p-10 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">{searchQuery ? 'আপনার সার্চের সাথে মেলে এমন কোনো ছাত্র/ছাত্রী পাওয়া যায়নি।' : `এই শ্রেণিতে কোনো ${statusText} ছাত্র/ছাত্রী নেই।`}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center p-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">রিপোর্ট দেখতে অনুগ্রহ করে একটি শ্রেণি নির্বাচন করুন।</p>
                </div>
            )}
        </div>
    );
};

export default ConsolidatedReport;