export const calculateResultMetrics = (
  results: any[],
  subjects: any[],
  allStudentResults?: { studentId: string; totalMarks: number; hasFailed: boolean }[],
  gradingSystem: 'madrasa' | 'general' = 'madrasa',
  strictFailing: boolean = true,
  defaultPassMark: number = 33
) => {
  let totalMarks = 0;
  let totalFullMarks = 0;
  let hasFailed = false;

  subjects.forEach((subject) => {
    const result = results.find((r) => r.subject_id === subject.id);
    const marks = result ? result.marks : 0;
    totalMarks += marks;
    totalFullMarks += subject.fullMarks;

    const passMark = (subject.passMarks !== undefined && subject.passMarks !== null) ? subject.passMarks : defaultPassMark;

    // Check if failed in this subject
    if (marks < passMark) {
      hasFailed = true;
    }
  });

  const percentage = totalFullMarks > 0 ? (totalMarks / totalFullMarks) * 100 : 0;

  let grade = "";
  let isPassed = false;

  if (gradingSystem === 'general') {
    isPassed = percentage >= defaultPassMark;
    if (strictFailing && hasFailed) {
      grade = "F";
      isPassed = false;
    } else if (percentage >= 80) grade = "A+";
    else if (percentage >= 70) grade = "A";
    else if (percentage >= 60) grade = "A-";
    else if (percentage >= 50) grade = "B";
    else if (percentage >= 40) grade = "C";
    else if (percentage >= defaultPassMark) grade = "D";
    else {
      grade = "F";
      isPassed = false;
    }
  } else {
    isPassed = percentage >= defaultPassMark;
    if (strictFailing && hasFailed) {
      grade = "রাসেব";
      isPassed = false;
    } else if (percentage >= 80) grade = "মুমতায";
    else if (percentage >= 65) grade = "জায়্যিদ জিদ্দান";
    else if (percentage >= 50) grade = "জায়্যিদ";
    else if (percentage >= defaultPassMark) grade = "মকবুল";
    else {
      grade = "রাসেব";
      isPassed = false;
    }
  }

  let rank = "-";
  if (allStudentResults) {
    const sorted = [...allStudentResults].sort((a, b) => b.totalMarks - a.totalMarks);

    const rankIndex = sorted.findIndex(r => r.studentId === (results[0]?.student_id));
    if (rankIndex !== -1 && isPassed) {
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
    statusKey: isPassed ? "pass" : "fail"
  };
};
