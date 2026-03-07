import type { ClassData, Student } from "./types";

export const CLASSES: ClassData[] = [
  { id: "class-1", name: "Class 1" },
  { id: "class-2", name: "Class 2" },
  { id: "class-3", name: "Class 3" },
  { id: "class-4", name: "Class 4" },
  { id: "class-5", name: "Class 5" },
  { id: "class-6", name: "Class 6" },
  { id: "class-7", name: "Class 7" },
  { id: "class-8", name: "Class 8" },
  { id: "class-9", name: "Class 9" },
  { id: "class-10", name: "Class 10" },
];

const studentNames = [
  "Abir Ahmed",
  "Jannatul Ferdous",
  "Md. Abdullah",
  "Sumaiya Akter",
  "Imran Hossain",
  "Fatima Khatun",
  "Rakibul Islam",
  "Ayesha Siddiqa",
  "Mehedi Hasan",
  "Nusrat Jahan",
  "Shakib Khan",
  "Sharmin Sultana",
  "Tanvir Rahman",
  "Israt Jahan",
  "Alamgir Hossain",
  "Sabina Yasmin",
  "Zahid Hasan",
  "Roksana Parvin",
  "Kamrul Islam",
  "Mumtaz Begum",
  "Nasir Uddin",
  "Shahnaz Parvin",
  "Firoz Alam",
  "Taslima Akter",
  "Saiful Islam",
  "Afsana Mimi",
  "Jamal Uddin",
  "Dilara Begum",
  "Monir Hossain",
  "Parvin Sultana",
];

const generateStudents = (classId: string, count: number): Student[] => {
  const students: Student[] = [];
  for (let i = 0; i < count; i++) {
    students.push({
      id: `${classId}-student-${i + 1}`,
      classId,
      roll: i + 1,
      name: studentNames[i % studentNames.length],
    });
  }
  return students;
};

export const STUDENTS: { [key: string]: Student[] } = {
  "class-1": generateStudents("class-1", 20),
  "class-2": generateStudents("class-2", 22),
  "class-3": generateStudents("class-3", 25),
  "class-4": generateStudents("class-4", 23),
  "class-5": generateStudents("class-5", 28),
  "class-6": generateStudents("class-6", 30),
  "class-7": generateStudents("class-7", 29),
  "class-8": generateStudents("class-8", 26),
  "class-9": generateStudents("class-9", 27),
  "class-10": generateStudents("class-10", 24),
};
