export const calculateResultMetrics = (
  results: any[],
  subjects: any[],
  allStudentResults?: { studentId: string; totalMarks: number }[]
) => {
  let totalMarks = 0;
  let totalFullMarks = 0;

  subjects.forEach((subject) => {
    const result = results.find((r) => r.subject_id === subject.id);
    if (result) {
      totalMarks += result.marks;
    }
    totalFullMarks += subject.fullMarks;
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
    // Find first index where totalMarks matches, that's the rank
    const rankIndex = sorted.findIndex(r => r.totalMarks === totalMarks);
    rank = (rankIndex + 1).toString();
  }

  return {
    totalMarks,
    totalFullMarks,
    percentage: parseFloat(percentage.toFixed(2)),
    grade,
    rank
  };
};
