export const HIJRI_MONTHS = [
  { id: 10, name: "শাওয়াল" },
  { id: 11, name: "জিলকদ" },
  { id: 12, name: "জিলহজ" },
  { id: 1, name: "মুহাররম" },
  { id: 2, name: "সফর" },
  { id: 3, name: "রবিউল আউয়াল" },
  { id: 4, name: "রবিউস সানি" },
  { id: 5, name: "জমাদিউল আউয়াল" },
  { id: 6, name: "জমাদিউস সানি" },
  { id: 7, name: "রজব" },
  { id: 8, name: "শাবান" },
  { id: 9, name: "রমজান" }
];

export const getCurrentHijriYear = () => {
  const gregorianYear = new Date().getFullYear();
  return gregorianYear - 579; // Rough estimate
};
