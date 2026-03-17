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
  
  const hourNum = parseInt(hour);
  
  // Determine Bengali AM/PM/Time of day
  let timeOfDay = "";
  if (ampm.includes("AM")) {
    timeOfDay = hourNum >= 5 && hourNum < 12 ? "সকাল" : "রাত";
  } else {
    timeOfDay = hourNum >= 12 || hourNum < 5 ? "দুপুর" : "সন্ধ্যা";
  }
  
  return `${timeOfDay} ${toBengaliNumber(hour)}:${toBengaliNumber(minute)} মিনিট`;
};
