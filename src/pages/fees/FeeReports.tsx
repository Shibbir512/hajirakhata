import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasses } from '../../hooks/useClasses';
import { useFeeCategories } from '../../hooks/useFeeCategories';
import { useFeeSetup } from '../../hooks/useFeeSetup';
import { useFeeCollections } from '../../hooks/useFeeCollections';
import { useStudents } from '../../hooks/useStudents';
import { HIJRI_MONTHS, getCurrentHijriYear } from '../../constants/hijri';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Printer, CalendarDays } from 'lucide-react';
import { toBengaliNumber } from '../../utils/dateFormatter';
import { ClassSelect } from '../../components/ClassSelect';

const ENGLISH_MONTHS = [
  { id: 1, name: "জানুয়ারি" },
  { id: 2, name: "ফেব্রুয়ারি" },
  { id: 3, name: "মার্চ" },
  { id: 4, name: "এপ্রিল" },
  { id: 5, name: "মে" },
  { id: 6, name: "জুন" },
  { id: 7, name: "জুলাই" },
  { id: 8, name: "আগস্ট" },
  { id: 9, name: "সেপ্টেম্বর" },
  { id: 10, name: "অক্টোবর" },
  { id: 11, name: "নভেম্বর" },
  { id: 12, name: "ডিসেম্বর" }
];

const FeeReports: React.FC = () => {
  const { orgId, orgName, user, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { categories } = useFeeCategories(orgId);
  
  const [calendarType, setCalendarType] = useState<'hijri' | 'english'>('hijri');
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentHijriYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Default to Shawwal/October
  
  const handleCalendarTypeChange = (type: 'hijri' | 'english') => {
    setCalendarType(type);
    if (type === 'hijri') {
      setSelectedYear(getCurrentHijriYear());
    } else {
      setSelectedYear(new Date().getFullYear());
    }
  };
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'due'>('all');

  const { students } = useStudents(orgId, user, role);
  const { feeSetups } = useFeeSetup(orgId, selectedClass);
  const { collections } = useFeeCollections(orgId, selectedYear, selectedMonth, selectedClass);

  const classStudents = selectedClass ? (students[selectedClass] || []) : Object.values(students).flat();
  const activeStudents = classStudents.filter(s => s.isActive !== false && !s.isAlumni);

  // Calculate Summary
  const { expectedTotal, collectedTotal, dueTotal, categoryBreakdown, studentReports } = useMemo(() => {
    let expected = 0;
    let collected = 0;
    const breakdown: Record<string, { name: string, expected: number, collected: number }> = {};
    const reports: any[] = [];

    categories.forEach(cat => {
      breakdown[cat.id] = { name: cat.name, expected: 0, collected: 0 };
    });

    activeStudents.forEach(student => {
      let studentExpected = 0;
      let studentCollected = 0;

      // Calculate expected for this student
      // If selectedClass is empty, we need to find the fee setup for the student's actual class
      // But useFeeSetup currently only fetches for selectedClass. 
      // For simplicity, if selectedClass is empty, we might not have accurate expected fees per student unless we fetch all fee setups.
      // Assuming feeSetups contains setups for the selected class.
      feeSetups.forEach(setup => {
        // If we are viewing all classes, feeSetups might only contain the first class or none.
        // We should ideally only show student list when a class is selected, or use a global fee setup.
        // Let's assume feeSetups is correct for the student's class if selectedClass is set.
        if (!selectedClass || setup.classId === student.classId) {
          studentExpected += setup.amount;
          expected += setup.amount;
          if (breakdown[setup.categoryId]) {
            breakdown[setup.categoryId].expected += setup.amount;
          }
        }
      });

      // Calculate collected for this student
      const record = collections.find(c => c.studentId === student.id);
      if (record) {
        studentCollected = record.totalAmount;
      }

      reports.push({
        student,
        expected: studentExpected,
        collected: studentCollected,
        due: studentExpected - studentCollected,
        isPaid: studentCollected >= studentExpected && studentExpected > 0
      });
    });

    collections.forEach(record => {
      collected += record.totalAmount;
      record.payments.forEach(p => {
        if (breakdown[p.categoryId]) {
          breakdown[p.categoryId].collected += p.amount;
        }
      });
    });

    return {
      expectedTotal: expected,
      collectedTotal: collected,
      dueTotal: expected - collected,
      categoryBreakdown: Object.values(breakdown),
      studentReports: reports
    };
  }, [activeStudents, feeSetups, collections, categories, selectedClass]);

  const filteredStudents = studentReports.filter(report => {
    if (filterStatus === 'paid') return report.isPaid;
    if (filterStatus === 'due') return !report.isPaid;
    return true;
  });

  const chartData = categoryBreakdown.map(cat => ({
    name: cat.name,
    'প্রত্যাশিত': cat.expected,
    'আদায়কৃত': cat.collected
  }));

  const selectedMonthName = (calendarType === 'hijri' ? HIJRI_MONTHS : ENGLISH_MONTHS).find(m => m.id === selectedMonth)?.name || '';
  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || 'সকল শ্রেণি';

  return (
    <div id="fee-report-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ফি রিপোর্ট</h1>
          <p className="text-sm text-slate-500">মাসিক ফি আদায়ের বিস্তারিত রিপোর্ট ও সামারি</p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-primary print:hidden h-[42px] px-4 flex items-center gap-2"
          title="প্রিন্ট করুন"
        >
          <Printer className="w-4 h-4" />
          <span>প্রিন্ট রিপোর্ট</span>
        </button>
      </div>

      {/* Print-Only Official Header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold text-black">{orgName || "মাদরাসা / প্রতিষ্ঠান"}</h1>
        <h2 className="text-lg font-bold text-black mt-1">মাসিক ফি আদায় বিবরণী</h2>
        <div className="flex justify-center gap-6 mt-2 text-sm text-black">
          <span><strong>{calendarType === 'hijri' ? 'হিজরি সন:' : 'ইংরেজি সন:'}</strong> {toBengaliNumber(selectedYear)}</span>
          <span><strong>মাস:</strong> {selectedMonthName}</span>
          <span><strong>শ্রেণি:</strong> {selectedClassName}</span>
          <span><strong>তারিখ:</strong> {new Date().toLocaleDateString('bn-BD')}</span>
        </div>
      </div>

      <div className="card-premium p-6 rounded-[20px]">
        <div className="flex justify-center mb-6 print:hidden">
          <div className="bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 p-1 rounded-xl flex shadow-inner">
            <button
              onClick={() => handleCalendarTypeChange('hijri')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                calendarType === 'hijri'
                  ? 'bg-white dark:bg-slate-800 text-[#0F5C7A] dark:text-[#38BDF8] shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              হিজরী ক্যালেন্ডার
            </button>
            <button
              onClick={() => handleCalendarTypeChange('english')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                calendarType === 'english'
                  ? 'bg-white dark:bg-slate-800 text-[#0F5C7A] dark:text-[#38BDF8] shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              ইংরেজি ক্যালেন্ডার
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:hidden">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {calendarType === 'hijri' ? 'হিজরি সন' : 'ইংরেজি সন'}
            </label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value) || selectedYear)}
              className="input-premium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">মাস</label>
            <ClassSelect
              value={String(selectedMonth)}
              onChange={(val) => setSelectedMonth(parseInt(val))}
              options={(calendarType === 'hijri' ? HIJRI_MONTHS : ENGLISH_MONTHS).map(m => ({ id: String(m.id), name: m.name }))}
              placeholder="মাস নির্বাচন করুন"
              title="মাস নির্বাচন করুন"
              icon={CalendarDays}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">শ্রেণি (ঐচ্ছিক)</label>
            <ClassSelect
              value={selectedClass}
              onChange={(val) => setSelectedClass(val)}
              classes={classes}
              placeholder="-- সকল শ্রেণি --"
              allOptionLabel="-- সকল শ্রেণি --"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">স্ট্যাটাস</label>
            <ClassSelect
              value={filterStatus}
              onChange={(val) => setFilterStatus(val as any)}
              options={[
                { id: 'all', name: 'সকল' },
                { id: 'paid', name: 'আদায় হয়েছে' },
                { id: 'due', name: 'বাকী রয়েছে' }
              ]}
              placeholder="স্ট্যাটাস"
              title="স্ট্যাটাস নির্বাচন করুন"
              className="w-full"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:grid-cols-3">
          <div className="bg-blue-50 dark:bg-sky-950/40 p-6 rounded-2xl border border-blue-100 dark:border-sky-900/50 print:border-slate-400 print:bg-white">
            <p className="text-blue-600 dark:text-sky-400 print:text-black text-sm font-medium mb-1">মোট প্রত্যাশিত</p>
            <h3 className="text-3xl font-bold text-blue-900 dark:text-sky-100 print:text-black">৳{expectedTotal}</h3>
          </div>
          <div className="bg-green-50 dark:bg-emerald-950/40 p-6 rounded-2xl border border-green-100 dark:border-emerald-900/50 print:border-slate-400 print:bg-white">
            <p className="text-green-600 dark:text-emerald-400 print:text-black text-sm font-medium mb-1">মোট আদায়কৃত</p>
            <h3 className="text-3xl font-bold text-green-900 dark:text-emerald-100 print:text-black">৳{collectedTotal}</h3>
          </div>
          <div className="bg-red-50 dark:bg-rose-950/40 p-6 rounded-2xl border border-red-100 dark:border-rose-900/50 print:border-slate-400 print:bg-white">
            <p className="text-red-600 dark:text-rose-400 print:text-black text-sm font-medium mb-1">মোট বকেয়া</p>
            <h3 className="text-3xl font-bold text-red-900 dark:text-rose-100 print:text-black">৳{dueTotal > 0 ? dueTotal : 0}</h3>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && expectedTotal > 0 && (
          <div className="mb-8 print:hidden">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">খাতভিত্তিক তুলনা</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} />
                  <Legend />
                  <Bar dataKey="প্রত্যাশিত" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="আদায়কৃত" fill="#0F5C7A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed Table */}
        {categoryBreakdown.length > 0 && expectedTotal > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">খাতভিত্তিক রিপোর্ট</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">খাতের নাম</th>
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">প্রত্যাশিত (৳)</th>
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">আদায়কৃত (৳)</th>
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">বকেয়া (৳)</th>
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">আদায়ের হার</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((cat, idx) => {
                    const due = cat.expected - cat.collected;
                    const percentage = cat.expected > 0 ? Math.round((cat.collected / cat.expected) * 100) : 0;
                    return (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{cat.name}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{cat.expected}</td>
                        <td className="p-4 text-green-600 dark:text-emerald-400 font-medium">{cat.collected}</td>
                        <td className="p-4 text-red-600 dark:text-rose-400 font-medium">{due > 0 ? due : 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 max-w-[100px]">
                              <div className="bg-[#0F5C7A] dark:bg-[#38BDF8] h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-300">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Student List */}
        {filteredStudents.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">শিক্ষার্থীভিত্তিক রিপোর্ট</h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">মোট: {filteredStudents.length} জন</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">নাম ও রোল</th>
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">প্রত্যাশিত (৳)</th>
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">আদায়কৃত (৳)</th>
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">বকেয়া (৳)</th>
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-300 text-center">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((report, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-4">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{report.student.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">রোল: {report.student.roll}</p>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{report.expected}</td>
                      <td className="p-4 text-green-600 dark:text-emerald-400 font-medium">{report.collected}</td>
                      <td className="p-4 text-red-600 dark:text-rose-400 font-medium">{report.due > 0 ? report.due : 0}</td>
                      <td className="p-4 text-center">
                        {report.isPaid ? (
                          <span className="px-3 py-1 bg-green-100 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-400 rounded-full text-xs font-medium">আদায় হয়েছে</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 dark:bg-rose-950/60 text-red-700 dark:text-rose-400 rounded-full text-xs font-medium">বাকী রয়েছে</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeReports;
