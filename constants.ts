
import type { ClassData, Student } from './types';

export const CLASSES: ClassData[] = [
  { id: 'class-1', name: 'প্রথম শ্রেণি' },
  { id: 'class-2', name: 'দ্বিতীয় শ্রেণি' },
  { id: 'class-3', name: 'তৃতীয় শ্রেণি' },
  { id: 'class-4', name: 'চতুর্থ শ্রেণি' },
  { id: 'class-5', name: 'পঞ্চম শ্রেণি' },
  { id: 'class-6', name: 'ষষ্ঠ শ্রেণি' },
  { id: 'class-7', name: 'সপ্তম শ্রেণি' },
  { id: 'class-8', name: 'অষ্টম শ্রেণি' },
  { id: 'class-9', name: 'নবম শ্রেণি' },
  { id: 'class-10', name: 'দশম শ্রেণি' },
];

const studentNames = [
    'আবির আহমেদ', 'জান্নাতুল ফেরদৌস', 'মোঃ আব্দুল্লাহ', 'সুমাইয়া আক্তার', 'ইমরান হোসেন', 'ফাতিমা খাতুন', 'রাকিবুল ইসলাম', 'আয়েশা সিদ্দিকা', 'মেহেদী হাসান', 'নুসরাত জাহান',
    'শাকিব খান', 'শারমিন সুলতানা', 'তানভীর রহমান', 'ইসরাত জাহান', 'আলমগীর হোসেন', 'সাবিনা ইয়াসমিন', 'জাহিদ হাসান', 'রোকসানা পারভীন', 'কামরুল ইসলাম', 'মুমতাজ বেগম',
    'নাসির উদ্দিন', 'শাহনাজ পারভীন', 'ফিরোজ আলম', 'তাসলিমা আক্তার', 'সাইফুল ইসলাম', 'আফসানা মিমি', 'জামাল উদ্দিন', 'দিলারা বেগম', 'মনির হোসেন', 'পারভীন সুলতানা'
];

const generateStudents = (classId: string, count: number): Student[] => {
    const students: Student[] = [];
    for (let i = 0; i < count; i++) {
        students.push({
            id: `${classId}-student-${i + 1}`,
            roll: i + 1,
            name: studentNames[i % studentNames.length],
        });
    }
    return students;
};


export const STUDENTS: { [key: string]: Student[] } = {
  'class-1': generateStudents('class-1', 20),
  'class-2': generateStudents('class-2', 22),
  'class-3': generateStudents('class-3', 25),
  'class-4': generateStudents('class-4', 23),
  'class-5': generateStudents('class-5', 28),
  'class-6': generateStudents('class-6', 30),
  'class-7': generateStudents('class-7', 29),
  'class-8': generateStudents('class-8', 26),
  'class-9': generateStudents('class-9', 27),
  'class-10': generateStudents('class-10', 24),
};
