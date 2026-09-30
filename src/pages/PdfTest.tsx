import React, { useEffect, useState } from "react";
import { StudentMarksheetDocument } from "../components/pdf/StudentMarksheetDocument";
import { TabulationSheetDocument } from "../components/pdf/TabulationSheetDocument";

const PdfTest: React.FC = () => {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setFontsReady(true);
    });
  }, []);

  const dummySubjects = Array.from({ length: 22 }, (_, i) => ({
    id: `subj${i}`,
    name: `বিষয় ${i+1}: শারীরিক ও মানসিক স্বাস্থ্য ও নিরাপত্তা শিক্ষা`,
    fullMarks: 100,
    passMarks: 33
  }));

  const dummyResults = dummySubjects.map(s => ({
    subject_id: s.id,
    marks: 85
  }));

  const dummyMetrics = {
    totalMarks: 85 * 22,
    totalFullMarks: 100 * 22,
    percentage: 85,
    grade: "মুমতায",
    rank: "১",
    statusKey: "pass"
  };

  const dummyTabResults = Array.from({ length: 30 }, (_, i) => ({
    student: {
      id: `stu${i}`,
      name: `শিক্ষার্থী ${i + 1}: মহামান্য পরীক্ষার্থী লম্বা নাম যুক্ত বাংলার নবাব সিরাজউদ্দৌলা চৌধুরী বিশ্বাস ইসলাম`,
      fatherName: "মহামান্য পিতা লম্বা নাম যুক্ত বাংলার নবাব মীর জাফর আলী খান আল-হাশেমী বাহাদুর",
      roll: 1000 + i
    },
    metrics: dummyMetrics
  }));
  
  // Need global results array for the Tabulation component which does `results.find()`
  const globalResults = [];
  dummyTabResults.forEach(r => {
    dummySubjects.forEach(s => {
      globalResults.push({
        student_id: r.student.id,
        subject_id: s.id,
        marks: 85
      });
    });
  });

  if (!fontsReady) return <div>Loading fonts...</div>;

  return (
    <div style={{ padding: "20px", background: "#f0f0f0" }}>
      <h2 className="text-2xl mt-12 mb-4">Tabulation Test (Landscape)</h2>
      <div id="test-tabulation" style={{ display: 'inline-block', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
        <TabulationSheetDocument
          processedResults={dummyTabResults}
          subjects={dummySubjects}
          results={globalResults}
          reportHeader={{
            orgName: "খুব লম্বা একটি মাদরাসার নাম দারুল উলুম দত্তপাড়া মাদরাসা ও এতিমখানা, নরসিংদী",
            address: "দত্তপাড়া, নরসিংদী সদর, নরসিংদী",
            examTitle: "প্রথম সাময়িক পরীক্ষা পরীক্ষা", // To test duplicate removal
            academicYearText: "শিক্ষাবর্ষ: ২০২৫-২০২৬",
            classNameText: "জামাত: মেশকাত"
          }}
          numeralFormat="bn"
        />
      </div>
    </div>
  );
};

export default PdfTest;
