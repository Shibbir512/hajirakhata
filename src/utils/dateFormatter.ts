export const toBengaliDate = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string') return "";
  
  // Input format: "dd mm yyyy" or "dd-mm-yyyy"
  const separator = dateStr.includes("-") ? "-" : " ";
  const parts = dateStr.split(separator);
  if (parts.length !== 3) return dateStr;

  const [day, month, year] = parts;
  const monthNames = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];

  const monthIndex = parseInt(month) - 1;
  const monthName = monthNames[monthIndex] || month;

  return `${toBengaliNumber(day)} ${monthName}, ${toBengaliNumber(year)}`;
};

export const getDayNameInBengali = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string') return "";
  
  // Try different separators
  const separator = dateStr.includes("-") ? "-" : dateStr.includes("/") ? "/" : " ";
  const parts = dateStr.split(separator);
  
  if (parts.length !== 3) {
    console.error("Invalid date format in getDayNameInBengali:", dateStr);
    return "";
  }

  // Handle formats: dd mm yyyy, dd-mm-yyyy, dd/mm/yyyy
  let day, month, year;
  if (parts[0].length === 4) { // yyyy-mm-dd
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
    day = parseInt(parts[2]);
  } else { // dd-mm-yyyy or dd mm yyyy
    day = parseInt(parts[0]);
    month = parseInt(parts[1]);
    year = parseInt(parts[2]);
  }

  const date = new Date(year, month - 1, day);
  
  if (isNaN(date.getTime())) {
    console.error("Invalid date object in getDayNameInBengali:", dateStr, year, month, day);
    return "Invalid Date";
  }
  
  const dayNames = [
    "রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"
  ];
  
  return dayNames[date.getDay()];
};

export const toBengaliNumber = (num: string | number | undefined | null) => {
  if (num === undefined || num === null) return "";
  const bengaliNumbers = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num.toString().split("").map(char => bengaliNumbers[parseInt(char)] || char).join("");
};

export const toEnglishNumber = (numStr: string | undefined | null) => {
  if (!numStr) return "";
  const bengaliToEnglishMap: { [key: string]: string } = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
  };
  return numStr.split("").map(char => bengaliToEnglishMap[char] || char).join("");
};

export const toBengaliTime = (timeStr: string) => {
  if (!timeStr || typeof timeStr !== 'string') return "";
  
  // Handle various formats like "hh mm ss-AM/PM" or "hh-mm ss AM/PM"
  // The issue was .replace(' ', '-') in useAttendance only replaced the first space
  const normalized = timeStr.replace(/-/g, ' ').trim();
  const parts = normalized.split(/\s+/);
  
  if (parts.length < 2) return timeStr;

  const hour = parts[0];
  const minute = parts[1];
  const ampm = parts[parts.length - 1].toUpperCase();
  
  // Check if seconds are present (format: hh mm ss AM/PM)
  let second = "";
  if (parts.length >= 4) {
    second = parts[2];
  }

  const displayAMPM = ampm.includes("AM") ? "AM" : "PM";
  
  let result = `${toBengaliNumber(hour)}:${toBengaliNumber(minute)}`;
  if (second) {
    result += `:${toBengaliNumber(second)}`;
  }
  
  return `${result} ${displayAMPM}`;
};

export const formatAcademicYear = (ay: { year_name?: string; hijri_year?: string } | null | undefined): string => {
  if (!ay) return "N/A";
  const hijriPart = ay.hijri_year ? `${ay.hijri_year} হি. ` : "";
  const gregorianPart = ay.year_name ? `${ay.year_name} ঈ.` : "";
  const result = `${hijriPart}${gregorianPart}`.trim();
  return result || "N/A";
};

export const getTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeDateToISO = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  // If already YYYY-MM-DD
  if (dateStr.length === 10 && dateStr.charAt(4) === '-') return dateStr;
  
  // Format DD MM YYYY or DD-MM-YYYY or DD/MM/YYYY
  const separator = dateStr.includes("-") ? "-" : dateStr.includes("/") ? "/" : " ";
  const parts = dateStr.split(separator);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
       // YYYY MM DD
       return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
       // DD MM YYYY
       return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return dateStr;
};

export const isLeaveActiveNow = (leave: any): boolean => {
  if (leave.status !== 'approved') return false;
  
  const todayISO = getTodayISO();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const sDate = normalizeDateToISO(leave.startDate || leave.date);
  const eDate = normalizeDateToISO(leave.endDate || leave.date);
  
  if (!sDate || !eDate || todayISO < sDate || todayISO > eDate) return false;
  
  // It's on a valid day. Now check time constraints for today.
  if (todayISO === sDate && leave.startTime && leave.startTime > currentTime) {
    return false; // Leave hasn't started yet today
  }
  
  if (todayISO === eDate && leave.endTime && leave.endTime < currentTime) {
    return false; // Leave has already ended today
  }
  
  return true;
};
