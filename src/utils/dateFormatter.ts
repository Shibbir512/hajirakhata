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
