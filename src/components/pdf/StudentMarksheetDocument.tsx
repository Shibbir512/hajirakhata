import React from "react";
import { convertNumber } from "../../utils/numeralConverter";

interface StudentMarksheetProps {
  student: any;
  orgName: string;
  examName: string;
  academicYearText: string;
  classNameText: string;
  subjects: any[];
  results: any[];
  metrics: {
    totalMarks: number;
    totalFullMarks: number;
    percentage: number;
    grade: string;
    rank: string | number;
    statusKey: string;
  };
  numeralFormat: 'bn' | 'ar' | 'en';
  t: any;
}

export const StudentMarksheetDocument: React.FC<StudentMarksheetProps> = ({
  student,
  orgName,
  examName,
  academicYearText,
  classNameText,
  subjects,
  results,
  metrics,
  numeralFormat,
  t
}) => {
  return (
    <div
      className="a4-marksheet"
      style={{
        width: "794px",
        minHeight: "1123px",
        backgroundColor: "white",
        color: "black",
        padding: "56px", // approx 15mm margin
        boxSizing: "border-box",
        position: "relative",
        fontFamily: "'Tiro Bangla', serif", // Assuming this font is loaded in CSS
      }}
    >
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold mb-2">{orgName}</h1>
        <h2 className="text-xl font-semibold mb-2">{examName}</h2>
        <p className="text-md">
          {academicYearText} | {classNameText}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="space-y-1">
          <p><span className="font-semibold w-24 inline-block">{t.studentName}:</span> {student.name}</p>
          <p><span className="font-semibold w-24 inline-block">{t.fatherName}:</span> {student.fatherName || "N/A"}</p>
          <p><span className="font-semibold w-24 inline-block">{t.roll}:</span> {convertNumber(student.roll, numeralFormat)}</p>
        </div>
        <div className="space-y-1">
          <p><span className="font-semibold w-24 inline-block">{t.rank}:</span> {convertNumber(metrics.rank, numeralFormat)}</p>
          <p>
            <span className="font-semibold w-24 inline-block">{t.result}:</span> 
            {t[metrics.statusKey as keyof typeof t]} ({metrics.grade})
          </p>
        </div>
      </div>

      <table className="w-full text-left border-collapse mb-8 text-sm border border-black">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border border-black">{t.subject}</th>
            <th className="p-2 border border-black text-center">{t.fullMarks}</th>
            <th className="p-2 border border-black text-center">{t.passMarks}</th>
            <th className="p-2 border border-black text-center">{t.obtainedMarks}</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => {
            const result = results.find(r => r.subject_id === subject.id);
            return (
              <tr key={subject.id}>
                <td className="p-2 border border-black">{subject.name}</td>
                <td className="p-2 border border-black text-center">{convertNumber(subject.fullMarks, numeralFormat)}</td>
                <td className="p-2 border border-black text-center">{convertNumber(subject.passMarks, numeralFormat)}</td>
                <td className="p-2 border border-black text-center font-bold">
                  {result ? convertNumber(result.marks, numeralFormat) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td className="p-2 border border-black font-bold text-right">{t.total}:</td>
            <td className="p-2 border border-black font-bold text-center">{convertNumber(metrics.totalFullMarks, numeralFormat)}</td>
            <td className="p-2 border border-black text-center font-bold">-</td>
            <td className="p-2 border border-black font-bold text-center">{convertNumber(metrics.totalMarks, numeralFormat)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="p-2 border border-black font-bold text-right">{t.percentage}:</td>
            <td colSpan={2} className="p-2 border border-black font-bold text-center">{convertNumber(metrics.percentage, numeralFormat)}%</td>
          </tr>
        </tfoot>
      </table>

      {/* Signature Section */}
      <div 
        className="absolute bottom-14 left-14 right-14 flex justify-between"
      >
        <div className="text-center w-40">
          <div className="border-t border-black mb-1"></div>
          <p className="text-sm">{t.teacherSignature}</p>
        </div>
        <div className="text-center w-40">
          <div className="border-t border-black mb-1"></div>
          <p className="text-sm">{t.principalSignature}</p>
        </div>
      </div>
    </div>
  );
};
