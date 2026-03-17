export const calculateResultMetrics = (
  results: any[],
  subjects: any[],
  allStudentResults?: { studentId: string; totalMarks: number; hasFailed: boolean }[]
) => {
  let totalMarks = 0;
  let totalFullMarks = 0;
  let hasFailed = false;

  subjects.forEach((subject) => {
    const result = results.find((r) => r.subject_id === subject.id);
    const marks = result ? result.marks : 0;
    totalMarks += marks;
    totalFullMarks += subject.fullMarks;

    // Check if failed in this subject
    if (marks < subject.passMarks) {
      hasFailed = true;
    }
  });

  const percentage = totalFullMarks > 0 ? (totalMarks / totalFullMarks) * 100 : 0;

  let grade = "রাসেব";
  if (percentage >= 80) grade = "মুমতায";
  else if (percentage >= 65) grade = "জায়্যিদ জিদ্দান";
  else if (percentage >= 50) grade = "জায়্যিদ";
  else if (percentage >= 35) grade = "মকবুল";

  let rank = "-";
  if (allStudentResults) {
    const sorted = [...allStudentResults].sort((a, b) => b.totalMarks - a.totalMarks);

    const rankIndex = sorted.findIndex(r => r.studentId === (results[0]?.student_id || ""));
    if (rankIndex !== -1 && grade !== "রাসেব") {
      rank = (rankIndex + 1).toString();
    }
  }

  return {
    totalMarks,
    totalFullMarks,
    percentage: parseFloat(percentage.toFixed(2)),
    grade,
    rank,
    hasFailed,
    statusKey: grade !== "রাসেব" ? "pass" : "fail"
  };
};
