import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { convertNumber } from "../utils/numeralConverter";

const ResultCard: React.FC = () => {
  const { studentId, examId } = useParams<{ studentId: string; examId: string }>();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [numeralFormat] = useState<'bn' | 'ar' | 'en'>('en'); // Default to English

  useEffect(() => {
    const fetchResult = async () => {
      if (!studentId || !examId) return;
      try {
        const resultsRef = collection(db, "results");
        const q = query(resultsRef, where("studentId", "==", studentId), where("examId", "==", examId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setResult(snapshot.docs[0].data());
        } else {
          toast.error("Result not found.");
        }
      } catch (error) {
        toast.error("Error fetching result.");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [studentId, examId]);

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!result) return <div className="p-4 text-center">Result not found.</div>;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Student Result',
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto min-h-screen bg-slate-50">
      <div className="card-premium p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">Result Card</h2>
        <div className="space-y-3 text-slate-700">
            <p><span className="font-semibold">Name:</span> {result.studentName}</p>
            <p><span className="font-semibold">Roll:</span> {convertNumber(result.roll, numeralFormat)}</p>
            <p><span className="font-semibold">Class:</span> {result.className}</p>
            <p><span className="font-semibold">Total Marks:</span> {convertNumber(result.totalMarks, numeralFormat)}</p>
            <p><span className="font-semibold">Percentage:</span> {convertNumber(result.percentage, numeralFormat)}%</p>
            <p><span className="font-semibold">Grade:</span> {result.grade}</p>
            <p><span className="font-semibold">Rank:</span> {convertNumber(result.rank, numeralFormat)}</p>
        </div>
        
        <div className="mt-8 flex justify-center">
          <QRCodeSVG value={window.location.href} size={160} />
        </div>
        
        <button onClick={handleShare} className="btn-primary mt-8 w-full py-3 text-lg">
          Share Result
        </button>
      </div>
    </div>
  );
};

export default ResultCard;
