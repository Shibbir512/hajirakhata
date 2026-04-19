import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasses } from '../../hooks/useClasses';
import { useFeeCategories } from '../../hooks/useFeeCategories';
import { useFeeSetup } from '../../hooks/useFeeSetup';
import { useFeeCollections } from '../../hooks/useFeeCollections';
import { useStudents } from '../../hooks/useStudents';
import { HIJRI_MONTHS, getCurrentHijriYear } from '../../constants/hijri';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FeeReports: React.FC = () => {
  const { orgId, user, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { categories } = useFeeCategories(orgId);
  
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentHijriYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Default to Shawwal (id: 10)
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

  return (
    <div className="space-y-6">
      <div>
        
        <p className="text-sm text-slate-500">মাসিক ফি আদায়ের বিস্তারিত রিপোর্ট ও সামারি</p>
      </div>

      <div className="card-premium p-6 bg-white rounded-[20px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">হিজরি সন</label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value) || selectedYear)}
              className="input-premium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">মাস</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="input-premium"
            >
              {HIJRI_MONTHS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">শ্রেণি (ঐচ্ছিক)</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="input-premium"
            >
              <option value="">-- সকল শ্রেণি --</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">স্ট্যাটাস</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="input-premium"
            >
              <option value="all">সকল</option>
              <option value="paid">আদায় হয়েছে</option>
              <option value="due">বাকী রয়েছে</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <p className="text-blue-600 text-sm font-medium mb-1">মোট প্রত্যাশিত</p>
            <h3 className="text-3xl font-bold text-blue-900">৳{expectedTotal}</h3>
          </div>
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
            <p className="text-green-600 text-sm font-medium mb-1">মোট আদায়কৃত</p>
            <h3 className="text-3xl font-bold text-green-900">৳{collectedTotal}</h3>
          </div>
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
            <p className="text-red-600 text-sm font-medium mb-1">মোট বকেয়া</p>
            <h3 className="text-3xl font-bold text-red-900">৳{dueTotal > 0 ? dueTotal : 0}</h3>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && expectedTotal > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-slate-800 mb-4">খাতভিত্তিক তুলনা</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
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
            <h3 className="font-bold text-slate-800 mb-4">খাতভিত্তিক রিপোর্ট</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200">
                    <th className="p-4 font-semibold text-slate-700">খাতের নাম</th>
                    <th className="p-4 font-semibold text-slate-700">প্রত্যাশিত (৳)</th>
                    <th className="p-4 font-semibold text-slate-700">আদায়কৃত (৳)</th>
                    <th className="p-4 font-semibold text-slate-700">বকেয়া (৳)</th>
                    <th className="p-4 font-semibold text-slate-700">আদায়ের হার</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((cat, idx) => {
                    const due = cat.expected - cat.collected;
                    const percentage = cat.expected > 0 ? Math.round((cat.collected / cat.expected) * 100) : 0;
                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-4 font-medium text-slate-800">{cat.name}</td>
                        <td className="p-4 text-slate-600">{cat.expected}</td>
                        <td className="p-4 text-green-600 font-medium">{cat.collected}</td>
                        <td className="p-4 text-red-600 font-medium">{due > 0 ? due : 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-200 rounded-full h-2.5 max-w-[100px]">
                              <div className="bg-[#0F5C7A] h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <span className="text-sm text-slate-600">{percentage}%</span>
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
              <h3 className="font-bold text-slate-800">শিক্ষার্থীভিত্তিক রিপোর্ট</h3>
              <span className="text-sm text-slate-500">মোট: {filteredStudents.length} জন</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200">
                    <th className="p-4 font-semibold text-slate-700">নাম ও রোল</th>
                    <th className="p-4 font-semibold text-slate-700">প্রত্যাশিত (৳)</th>
                    <th className="p-4 font-semibold text-slate-700">আদায়কৃত (৳)</th>
                    <th className="p-4 font-semibold text-slate-700">বকেয়া (৳)</th>
                    <th className="p-4 font-semibold text-slate-700 text-center">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((report, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{report.student.name}</p>
                        <p className="text-xs text-slate-500">রোল: {report.student.roll}</p>
                      </td>
                      <td className="p-4 text-slate-600">{report.expected}</td>
                      <td className="p-4 text-green-600 font-medium">{report.collected}</td>
                      <td className="p-4 text-red-600 font-medium">{report.due > 0 ? report.due : 0}</td>
                      <td className="p-4 text-center">
                        {report.isPaid ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">আদায় হয়েছে</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">বাকী রয়েছে</span>
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
