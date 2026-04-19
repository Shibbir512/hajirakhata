import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasses } from '../../hooks/useClasses';
import { useStudents } from '../../hooks/useStudents';
import { useFeeCategories } from '../../hooks/useFeeCategories';
import { useFeeSetup } from '../../hooks/useFeeSetup';
import { useFeeCollections, FeePayment } from '../../hooks/useFeeCollections';
import { HIJRI_MONTHS, getCurrentHijriYear } from '../../constants/hijri';
import { CheckCircle, Search, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationDialog from '../../components/ConfirmationDialog';

const FeeCollection: React.FC = () => {
  const { orgId, user, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { categories } = useFeeCategories(orgId);
  
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentHijriYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  
  const { students } = useStudents(orgId, user, role);
  const { feeSetups } = useFeeSetup(orgId, selectedClass);
  const { collections, addCollection, bulkAddCollection, deleteCollection } = useFeeCollections(orgId, selectedYear, selectedMonth, selectedClass);

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [payments, setPayments] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // When students are selected, pre-fill the amounts based on fee setup
  useEffect(() => {
    if (selectedStudents.length > 0 && feeSetups.length > 0) {
      const initialPayments: Record<string, number> = {};
      
      categories.forEach(cat => {
        const setup = feeSetups.find(s => s.categoryId === cat.id);
        const expectedAmount = setup ? setup.amount : 0;
        
        // If only one student is selected, check their existing record
        if (selectedStudents.length === 1) {
          const existingRecord = collections.find(c => c.studentId === selectedStudents[0]);
          if (existingRecord) {
            const paid = existingRecord.payments.find(p => p.categoryId === cat.id);
            if (paid && paid.amount >= expectedAmount) {
              initialPayments[cat.id] = 0; // Fully paid
            } else if (paid) {
              initialPayments[cat.id] = expectedAmount - paid.amount; // Due amount
            } else {
              initialPayments[cat.id] = expectedAmount;
            }
          } else {
            initialPayments[cat.id] = expectedAmount;
          }
        } else {
          // For multiple students, just default to the expected amount
          initialPayments[cat.id] = expectedAmount;
        }
      });
      
      setPayments(initialPayments);
    } else {
      setPayments({});
    }
  }, [selectedStudents, feeSetups, categories, collections]);

  const handlePaymentChange = (categoryId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setPayments(prev => ({ ...prev, [categoryId]: numValue }));
  };

  const handleSave = async () => {
    if (selectedStudents.length === 0) {
      toast.error('শিক্ষার্থী নির্বাচন করুন');
      return;
    }

    const paymentsToSave: FeePayment[] = [];
    let totalAmount = 0;

    Object.entries(payments).forEach(([categoryId, amount]) => {
      if (amount > 0) {
        paymentsToSave.push({ categoryId, amount });
        totalAmount += amount;
      }
    });

    if (paymentsToSave.length === 0) {
      toast.error('কোনো ফি এর পরিমাণ দেওয়া হয়নি');
      return;
    }

    setIsSaving(true);
    try {
      if (selectedStudents.length === 1) {
        await addCollection(
          selectedStudents[0],
          selectedClass,
          selectedYear,
          selectedMonth,
          paymentsToSave,
          totalAmount,
          user?.displayName || 'Unknown'
        );
      } else {
        await bulkAddCollection(
          selectedStudents,
          selectedClass,
          selectedYear,
          selectedMonth,
          paymentsToSave,
          totalAmount,
          user?.displayName || 'Unknown'
        );
      }
      setSelectedStudents([]); // Reset after save
    } finally {
      setIsSaving(false);
    }
  };

  const classStudents = selectedClass ? (students[selectedClass] || []) : [];
  const activeStudents = classStudents.filter(s => s.isActive !== false && !s.isAlumni);
  const filteredStudents = activeStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.roll.toString().includes(searchQuery)
  );

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const singleSelectedRecord = selectedStudents.length === 1 
    ? collections.find(c => c.studentId === selectedStudents[0]) 
    : null;

  const handleDeleteRecord = async () => {
    if (singleSelectedRecord) {
      try {
        await deleteCollection(singleSelectedRecord.id);
        setIsDeleteDialogOpen(false);
        setSelectedStudents([]);
      } catch (error) {
        console.error("Error deleting record:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        
        <p className="text-sm text-slate-500">শিক্ষার্থীদের মাসিক ফি জমা নিন</p>
      </div>

      <div className="card-premium p-6 bg-white rounded-[20px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            <label className="block text-sm font-medium text-slate-700 mb-1">শ্রেণি</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="input-premium"
            >
              <option value="">-- শ্রেণি নির্বাচন করুন --</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedClass && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student List */}
            <div className="lg:col-span-1 border-r pr-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800">শিক্ষার্থী তালিকা</h3>
                {filteredStudents.length > 0 && (
                  <button 
                    onClick={toggleAllStudents}
                    className="text-xs font-medium text-[#0F5C7A] hover:underline"
                  >
                    {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? 'সব বাতিল' : 'সব নির্বাচন'}
                  </button>
                )}
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C7A]/20 focus:border-[#0F5C7A] transition-all"
                />
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
                ) : (
                  filteredStudents.map(student => {
                    const record = collections.find(c => c.studentId === student.id);
                    const isFullyPaid = record && feeSetups.every(setup => {
                      const paid = record.payments.find(p => p.categoryId === setup.categoryId);
                      return paid && paid.amount >= setup.amount;
                    });
                    
                    const isSelected = selectedStudents.includes(student.id);

                    return (
                      <div 
                        key={student.id}
                        onClick={() => toggleStudentSelection(student.id)}
                        className={`p-3 rounded-xl cursor-pointer border transition-colors flex justify-between items-center ${
                          isSelected 
                            ? 'bg-[#0F5C7A]/10 border-[#0F5C7A]' 
                            : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-[#0F5C7A] border-[#0F5C7A]' : 'border-slate-300 bg-white'}`}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{student.name}</p>
                            <p className="text-xs text-slate-500">রোল: {student.roll}</p>
                          </div>
                        </div>
                        {isFullyPaid && <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">পরিশোধিত</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Payment Entry */}
            <div className="lg:col-span-2">
              {selectedStudents.length > 0 ? (
                <div>
                  <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b">
                    ফি জমা দিন ({selectedStudents.length} জন শিক্ষার্থী)
                  </h3>
                  
                  <div className="space-y-4">
                    {categories.map(cat => {
                      const setup = feeSetups.find(s => s.categoryId === cat.id);
                      const expectedAmount = setup ? setup.amount : 0;
                      
                      let paidAmount = 0;
                      if (selectedStudents.length === 1) {
                        const record = collections.find(c => c.studentId === selectedStudents[0]);
                        paidAmount = record?.payments.find(p => p.categoryId === cat.id)?.amount || 0;
                      }
                      
                      return (
                        <div key={cat.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div>
                            <p className="font-medium text-slate-800">{cat.name}</p>
                            <p className="text-xs text-slate-500">
                              নির্ধারিত: ৳{expectedAmount} | ইতিমধ্যে জমা: ৳{paidAmount}
                            </p>
                          </div>
                          <div className="w-32 relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-medium">৳</span>
                            <input
                              type="number"
                              min="0"
                              value={payments[cat.id] !== undefined ? payments[cat.id] : ''}
                              onChange={(e) => handlePaymentChange(cat.id, e.target.value)}
                              className="input-premium pl-8"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex justify-between items-center bg-[#0F5C7A]/5 p-4 rounded-xl border border-[#0F5C7A]/20">
                    <div>
                      <p className="text-sm text-slate-600">সর্বমোট জমা দিচ্ছেন:</p>
                      <p className="text-2xl font-bold text-[#0F5C7A]">
                        ৳{Object.values(payments).reduce((sum, val) => sum + (val || 0), 0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {singleSelectedRecord && (
                        <button 
                          onClick={() => setIsDeleteDialogOpen(true)}
                          className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-5 h-5" /> এন্ট্রি মুছুন
                        </button>
                      )}
                      <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Save className="w-5 h-5" /> {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'জমা নিন'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12">
                  <Search className="w-12 h-12 mb-4 opacity-20" />
                  <p>বাম পাশ থেকে শিক্ষার্থী নির্বাচন করুন</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteRecord}
        title="ফি এন্ট্রি মুছুন"
        message="আপনি কি নিশ্চিত যে এই শিক্ষার্থীর এই মাসের ফি রেকর্ড মুছে ফেলতে চান? এটি মুছে ফেললে নতুন করে আবার ফি এন্ট্রি করা যাবে।"
      />
    </div>
  );
};

export default FeeCollection;
