import React, { useState, useMemo, useEffect } from 'react';
import { useAttendanceData } from './hooks/useAttendanceData';
import type { ClassData, Student } from './types';
import Header from './components/Header';
import ClassSelector from './components/ClassSelector';
import AttendanceSheet from './components/AttendanceSheet';
import StudentDetailModal from './components/StudentDetailModal';
import ConsolidatedReport from './components/ConsolidatedReport';
import ManageClasses from './components/ManageClasses';
import ManageStudents from './components/ManageStudents';
import Reminders from './components/Reminders';
import Button from './components/common/Button';
import { ChartBarIcon, Cog6ToothIcon, BellIcon, ClipboardIcon } from './components/common/Icons';
import Login from './components/Login';
import OrgManagement from './components/OrgManagement';
import { auth } from './src/firebase';

const App: React.FC = () => {
  const { 
    user,
    orgId,
    loading,
    classes, 
    attendance, 
    students, 
    takeAttendance, 
    getAbsencesForStudent, 
    updateAttendanceRecordStatus, 
    getConsolidatedReport,
    addClass,
    updateClassName,
    deleteClass,
    updateStudentName,
    updateAttendanceRecordNote,
    addStudent,
    deleteStudent,
    reminders,
    addReminder,
    deleteReminder,
    createOrganization,
    joinOrganization,
    leaveOrganization
  } = useAttendanceData();
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [view, setView] = useState<'attendance' | 'report' | 'manageClasses' | 'manageStudents' | 'reminders'>('attendance');
  const [classForStudentManagement, setClassForStudentManagement] = useState<string | null>(null);

  useEffect(() => {
    if (classes.length > 0 && (!selectedClassId || !classes.find(c => c.id === selectedClassId))) {
        setSelectedClassId(classes[0].id);
    } else if (classes.length === 0) {
        setSelectedClassId(null);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
      const checkReminders = () => {
        if (Notification.permission !== 'granted') return;
        
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;

        if (reminders.includes(currentTime)) {
          const lastNotified = sessionStorage.getItem(`notified_${currentTime}`);
          const today = now.toISOString().split('T')[0];

          if (lastNotified !== today) {
            new Notification('হাজিরা নেওয়ার সময় হয়েছে!', {
              body: `সময়: ${currentTime}। এখন ছাত্র/ছাত্রীদের হাজিরা নেওয়ার জন্য অ্যাপটি খুলুন।`,
              icon: '/vite.svg',
              tag: `attendance-reminder-${currentTime}`
            });
            sessionStorage.setItem(`notified_${currentTime}`, today);
          }
        }
      };

      checkReminders();
      const intervalId = setInterval(checkReminders, 60000); 

      return () => clearInterval(intervalId);
  }, [reminders]);


  const selectedClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || null;
  }, [selectedClassId, classes]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
  };

  const handleManageStudents = (classId: string) => {
    setClassForStudentManagement(classId);
    setView('manageStudents');
  };

  const handleBackToManageClasses = () => {
      setClassForStudentManagement(null);
      setView('manageClasses');
  };
  
  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  };

  const handleLeaveOrg = async () => {
    if (window.confirm('আপনি কি বর্তমান স্কুল থেকে বের হতে চান? আপনি পরে আবার স্কুল আইডির মাধ্যমে জয়েন করতে পারবেন।')) {
      try {
        await leaveOrganization();
      } catch (error) {
        console.error("Error leaving organization:", error);
        alert("স্কুল পরিবর্তন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }
    }
  };

  const copyOrgId = () => {
    if (orgId) {
      navigator.clipboard.writeText(orgId);
      alert('স্কুল আইডি কপি করা হয়েছে। অন্য শিক্ষকদের সাথে এটি শেয়ার করুন।');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">লোড হচ্ছে...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (!orgId) {
    return (
      <OrgManagement 
        onCreateOrg={createOrganization} 
        onJoinOrg={joinOrganization} 
        onLogout={handleLogout} 
      />
    );
  }
  
  const renderView = () => {
    switch (view) {
        case 'report':
            return (
                <ConsolidatedReport
                    classes={classes}
                    getConsolidatedReport={getConsolidatedReport}
                    onSelectStudent={handleSelectStudent}
                    onBack={() => setView('attendance')}
                />
            );
        case 'reminders':
            return (
                <Reminders
                    reminders={reminders}
                    onAddReminder={addReminder}
                    onDeleteReminder={deleteReminder}
                    onBack={() => setView('attendance')}
                />
            );
        case 'manageStudents': {
            const classToManage = classes.find(c => c.id === classForStudentManagement);
            if (!classToManage) {
                return (
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <p className="text-red-500">ত্রুটি: শ্রেণি খুঁজে পাওয়া যায়নি।</p>
                        <Button onClick={() => setView('manageClasses')} className="mt-4">শ্রেণি পরিচালনায় ফিরে যান</Button>
                    </div>
                );
            }
            return (
                <ManageStudents
                    classData={classToManage}
                    students={students[classToManage.id] || []}
                    onAddStudent={addStudent}
                    onUpdateStudentName={updateStudentName}
                    onDeleteStudent={deleteStudent}
                    onBack={handleBackToManageClasses}
                />
            );
        }
        case 'manageClasses':
            return (
                <ManageClasses
                    classes={classes}
                    onAddClass={addClass}
                    onUpdateClass={updateClassName}
                    onDeleteClass={deleteClass}
                    onManageStudents={handleManageStudents}
                    onBack={() => setView('attendance')}
                />
            );
        case 'attendance':
        default:
            return (
              <>
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3">
                      <h2 className="text-xl font-bold text-gray-700 mb-3 sm:mb-0">শ্রেণি নির্বাচন করুন</h2>
                      <div className="flex flex-wrap gap-2">
                          <Button onClick={() => setView('reminders')} variant="secondary">
                              <BellIcon className="w-5 h-5 mr-2" />
                              রিমাইন্ডার
                          </Button>
                          <Button onClick={() => setView('manageClasses')} variant="secondary">
                              <Cog6ToothIcon className="w-5 h-5 mr-2" />
                              শ্রেণি পরিচালনা
                          </Button>
                          <Button onClick={() => setView('report')} variant="secondary">
                              <ChartBarIcon className="w-5 h-5 mr-2" />
                              রিপোর্ট দেখুন
                          </Button>
                      </div>
                  </div>
                  <ClassSelector
                    classes={classes}
                    selectedClassId={selectedClassId}
                    onSelectClass={setSelectedClassId}
                  />
                </div>
    
                {selectedClass ? (
                  <AttendanceSheet
                    key={selectedClass.id}
                    classData={selectedClass}
                    attendanceRecords={attendance}
                    students={students[selectedClass.id] || []}
                    onTakeAttendance={takeAttendance}
                    onSelectStudent={handleSelectStudent}
                    onUpdateStudentName={updateStudentName}
                  />
                ) : (
                  <div className="text-center p-10 bg-white rounded-lg shadow-md">
                    <p className="text-gray-500">{classes.length > 0 ? 'শুরু করতে অনুগ্রহ করে একটি শ্রেণি নির্বাচন করুন।' : 'কোনো শ্রেণি পাওয়া যায়নি। অনুগ্রহ করে একটি নতুন শ্রেণি যোগ করুন।'}</p>
                  </div>
                )}
              </>
            );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-2 flex flex-col sm:flex-row justify-between items-center gap-2">
         <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors" onClick={copyOrgId} title="স্কুল আইডি কপি করুন">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">School ID:</span>
            <code className="text-xs font-mono text-slate-700">{orgId}</code>
            <ClipboardIcon className="w-3 h-3 text-slate-400" />
         </div>
         <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 hidden sm:inline">{user.displayName || user.email}</span>
            <Button onClick={handleLeaveOrg} variant="secondary" size="sm" className="text-xs">স্কুল পরিবর্তন</Button>
            <Button onClick={handleLogout} variant="secondary" size="sm">লগ আউট</Button>
         </div>
      </div>
      <main className="container mx-auto p-4 md:p-6">
        {renderView()}
      </main>

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          absences={getAbsencesForStudent(selectedStudent.id)}
          onClose={handleCloseModal}
          onUpdateRecord={updateAttendanceRecordStatus}
          onUpdateRecordNote={updateAttendanceRecordNote}
        />
      )}
    </div>
  );
};

export default App;