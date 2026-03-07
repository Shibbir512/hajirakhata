import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ClassData, Student } from '../types';
import { AttendanceStatus } from '../types';
import Button from './common/Button';
import ClassSelector from './ClassSelector';
import { ArrowLeftIcon, UserIcon, DocumentArrowDownIcon, MagnifyingGlassIcon, ShareIcon, EnvelopeIcon, DocumentTextIcon } from './common/Icons';
import { normalizeSearchQuery, fuzzyMatch } from '../utils/search';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ConsolidatedReportProps {
    classes: ClassData[];
    getConsolidatedReport: (filters: { 
        startDate: Date | null; 
        endDate: Date | null; 
        status: AttendanceStatus 
    }) => { report: Map<string, { student: Student; count: number }[]>; teachers: { name: string; timestamp: number }[] };
    onSelectStudent: (student: Student) => void;
    onBack: () => void;
    selectedClassId: string | null;
    onSelectClass: (id: string) => void;
}

const ConsolidatedReport: React.FC<ConsolidatedReportProps> = ({ 
    classes, 
    getConsolidatedReport, 
    onSelectStudent, 
    onBack,
    selectedClassId,
    onSelectClass
}) => {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.Absent);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setSearchQuery('');
    }, [selectedClassId]);

    const [reportData, setReportData] = useState<Map<string, { student: Student; count: number }[]>>(new Map());
    const [teachers, setTeachers] = useState<{ name: string; timestamp: number }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const result = await getConsolidatedReport({ startDate, endDate, status });
                setReportData(result.report);
                setTeachers(result.teachers);
            } catch (error) {
                console.error("Error fetching report:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
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

    const generateReportText = () => {
        if (!selectedClassId || !filteredReport || filteredReport.length === 0) return '';

        const selectedClass = classes.find(c => c.id === selectedClassId);
        if (!selectedClass) return '';

        const datePart = (startDate ? `শুরু: ${startDate.toLocaleDateString('en-GB')}` : '') + (endDate ? ` শেষ: ${endDate.toLocaleDateString('en-GB')}` : '');
        let report = `হাজিরার রিপোর্ট: ${selectedClass.name}\n`;
        report += `স্ট্যাটাস: ${statusText}\n`;
        if (datePart) report += `${datePart}\n`;
        report += `------------------------------------\n`;
        
        filteredReport.forEach(({ student, count }) => {
            report += `${student.roll}. ${student.name}: ${count} দিন\n`;
        });
        
        return report;
    };

    const handleShareReport = async () => {
        const report = generateReportText();
        if (!report) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `হাজিরার রিপোর্ট: ${statusText}`,
                    text: report,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(report);
                alert('রিপোর্ট ক্লipবোর্ডে কপি করা হয়েছে!');
            } catch (err) {
                console.error('Failed to copy report: ', err);
            }
        }
    };

    const reportRef = useRef<HTMLDivElement>(null);

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !selectedClassId) return;
        const selectedClass = classes.find(c => c.id === selectedClassId);
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${selectedClass?.name || 'class'}_report.pdf`);
        } catch (err) {
            console.error('Failed to generate PDF:', err);
            alert('PDF তৈরি করতে সমস্যা হয়েছে।');
        }
    };

    const handleEmailReport = () => {
        const report = generateReportText();
        if (!report) return;
        const selectedClass = classes.find(c => c.id === selectedClassId);
        const subject = encodeURIComponent(`${selectedClass?.name || 'Class'} এর হাজিরার রিপোর্ট`);
        const body = encodeURIComponent(report);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

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
                        onClick={handleShareReport} 
                        variant="secondary" 
                        size="sm" 
                        disabled={!selectedClassId || !filteredReport || filteredReport.length === 0}
                        title={!selectedClassId || !filteredReport || filteredReport.length === 0 ? "শেয়ার করতে একটি শ্রেণি নির্বাচন করুন" : "রিপোর্টটি শেয়ার করুন"}
                    >
                        <ShareIcon className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">শেয়ার</span>
                    </Button>
                    <Button 
                        onClick={handleEmailReport} 
                        variant="secondary" 
                        size="sm" 
                        disabled={!selectedClassId || !filteredReport || filteredReport.length === 0}
                        title={!selectedClassId || !filteredReport || filteredReport.length === 0 ? "ইমেইল করতে একটি শ্রেণি নির্বাচন করুন" : "রিপোর্টটি ইমেইল করুন"}
                    >
                        <EnvelopeIcon className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">ইমেইল</span>
                    </Button>
                    <Button 
                        onClick={handleDownloadPDF} 
                        variant="secondary" 
                        size="sm" 
                        disabled={!selectedClassId || !filteredReport || filteredReport.length === 0}
                        title={!selectedClassId || !filteredReport || filteredReport.length === 0 ? "PDF ডাউনলোড করতে একটি শ্রেণি নির্বাচন করুন" : "রিপোর্টটি PDF হিসাবে ডাউনলোড করুন"}
                    >
                        <DocumentTextIcon className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">PDF</span>
                    </Button>
                    <Button 
                        onClick={handleExportCSV} 
                        variant="secondary" 
                        size="sm" 
                        disabled={!selectedClassId || !filteredReport || filteredReport.length === 0}
                        title={!selectedClassId || !filteredReport || filteredReport.length === 0 ? "এক্সপোর্ট করতে একটি শ্রেণি নির্বাচন করুন" : "রিপোর্টটি CSV হিসাবে ডাউনলোড করুন"}
                    >
                        <DocumentArrowDownIcon className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">CSV</span>
                    </Button>
                    <Button onClick={onBack} variant="secondary" size="sm">
                        <ArrowLeftIcon className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">ফিরে যান</span>
                    </Button>
                </div>
            </div>
            
            <div ref={reportRef} className="bg-white">
                <div className="border-b pb-4 mb-6" data-html2canvas-ignore>
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

            {teachers.length > 0 && (
                <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">এই সময়ে হাজিরা নিয়েছেন:</h3>
                    <div className="flex flex-wrap gap-2">
                        {teachers.map((teacher, index) => {
                            const date = new Date(teacher.timestamp);
                            const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' ');
                            
                            // Manual 12-hour format
                            let hours = date.getHours();
                            const minutes = date.getMinutes().toString().padStart(2, '0');
                            const seconds = date.getSeconds().toString().padStart(2, '0');
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            hours = hours % 12;
                            hours = hours ? hours : 12; // the hour '0' should be '12'
                            const timeStr = `${hours}:${minutes}:${seconds} ${ampm}`;
                            
                            return (
                                <div key={index} className="px-3 py-2 bg-white text-blue-600 rounded-lg text-xs font-medium border border-blue-200 shadow-sm flex flex-col">
                                    <span className="font-bold">{teacher.name}</span>
                                    <span className="text-[10px] text-slate-500 mt-0.5">
                                        তারিখ: {dateStr}, সময়: {timeStr}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mb-6" data-html2canvas-ignore>
                 <h3 className="text-lg font-semibold mb-3 text-gray-700">শ্রেণি নির্বাচন করুন</h3>
                <ClassSelector 
                    classes={classes}
                    selectedClassId={selectedClassId}
                    onSelectClass={onSelectClass}
                />
            </div>
            
            {selectedClassId ? (
                <div>
                    <div className="relative mb-4" data-html2canvas-ignore>
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
        </div>
    );
};

export default ConsolidatedReport;