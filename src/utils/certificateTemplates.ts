import { CertificateRecord, CertificateTemplateStyle, CertificateType } from "../types";
import { toBengaliNumber } from "./dateFormatter";

export interface CertificateTypeInfo {
  type: CertificateType;
  titleBn: string;
  titleEn: string;
  prefix: string;
  shortDesc: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  defaultPurpose: string;
  defaultAchievement: string;
  defaultCharacter: string;
}

export const CERTIFICATE_TYPE_META: Record<CertificateType, CertificateTypeInfo> = {
  testimonial: {
    type: "testimonial",
    titleBn: "প্রশংসা পত্র",
    titleEn: "Testimonial",
    prefix: "PR",
    shortDesc: "শিক্ষার্থীর উত্তম চরিত্র, শৃঙ্খলা, আচার-আচরণ ও প্রাতিষ্ঠানিক সুনামের সনদ",
    accentBg: "bg-emerald-50 dark:bg-emerald-950/40",
    accentText: "text-emerald-700 dark:text-emerald-300",
    accentBorder: "border-emerald-200 dark:border-emerald-800/60",
    defaultPurpose: "উচ্চতর শ্রেণিতে ভর্তি ও দাপ্তরিক প্রয়োজনে",
    defaultAchievement: "",
    defaultCharacter: "অত্যন্ত ভদ্র, বিনয়ী, নিয়মানুবর্তী এবং প্রশংসনীয়",
  },
  bonafide: {
    type: "bonafide",
    titleBn: "প্রত্যয়ন পত্র",
    titleEn: "Bonafide Certificate",
    prefix: "PT",
    shortDesc: "বর্তমান বা পূর্ববর্তী শিক্ষাবর্ষে নিয়মিত অধ্যয়নরত থাকার দাপ্তরিক প্রত্যয়ন",
    accentBg: "bg-sky-50 dark:bg-sky-950/40",
    accentText: "text-sky-700 dark:text-sky-300",
    accentBorder: "border-sky-200 dark:border-sky-800/60",
    defaultPurpose: "পাসপোর্ট / জন্ম নিবন্ধন / বৃত্তি ও প্রাতিষ্ঠানিক যাচাইকরণের জন্য",
    defaultAchievement: "",
    defaultCharacter: "ভালো ও সন্তোষজনক",
  },
  transfer: {
    type: "transfer",
    titleBn: "ছাড়পত্র",
    titleEn: "Transfer Certificate",
    prefix: "TC",
    shortDesc: "প্রতিষ্ঠান ত্যাগ, বকেয়া নিষ্পত্তি ও অন্যত্র ভর্তির ছাড়পত্র সনদ",
    accentBg: "bg-amber-50 dark:bg-amber-950/40",
    accentText: "text-amber-700 dark:text-amber-300",
    accentBorder: "border-amber-200 dark:border-amber-800/60",
    defaultPurpose: "অভিভাবকের আবেদন ও পারিবারিক স্থানান্তরের কারণে",
    defaultAchievement: "",
    defaultCharacter: "উত্তম ও শৃঙ্খলাপরায়ণ",
  },
  merit: {
    type: "merit",
    titleBn: "কৃতিত্ব পত্র",
    titleEn: "Certificate of Merit",
    prefix: "KR",
    shortDesc: "হিফজ সমাপনী, পরীক্ষায় শীর্ষস্থান ও প্রতিযোগিতায় অসামান্য সাফল্যের সম্মাননা",
    accentBg: "bg-violet-50 dark:bg-violet-950/40",
    accentText: "text-violet-700 dark:text-violet-300",
    accentBorder: "border-violet-200 dark:border-violet-800/60",
    defaultPurpose: "বিশেষ কৃতিত্ব ও মেধার স্বীকৃতিস্বরূপ",
    defaultAchievement: "বার্ষিক পরীক্ষায় কৃতিত্বপূর্ণ ফলাফল এবং দ্বীনি ও নৈতিক শিক্ষায় অসাধারণ সাফল্য",
    defaultCharacter: "আদর্শবান ও মেধাবী",
  },
};

export const TEMPLATE_STYLE_OPTIONS: {
  id: CertificateTemplateStyle;
  name: string;
  desc: string;
}[] = [
  {
    id: "classic",
    name: "ক্লাসিক ইসলামিক ফ্রেম",
    desc: "মাদরাসা উপযোগী সবুজ ও সোনালি ডাবল বর্ডার",
  },
  {
    id: "royal",
    name: "রাজকীয় সম্মাননা ফ্রেম",
    desc: "সোনালি ও গাঢ় নীল রঙের অভিজাত বর্ডার",
  },
  {
    id: "minimal",
    name: "আধুনিক অফিসিয়াল প্যাড",
    desc: "পরিচ্ছন্ন দাপ্তরিক হেডার ও মিনিমাল লাইন বর্ডার",
  },
];

export interface CertificateBodyParams {
  orgName: string;
  studentName: string;
  fatherName: string;
  motherName?: string;
  address?: string;
  className: string;
  roll: number | string;
  studentUid?: string;
  academicYear: string;
  purposeOrReason?: string;
  achievementDetails?: string;
  characterRemarks?: string;
}

export const buildCertificateBody = (
  type: CertificateType,
  params: CertificateBodyParams
): string => {
  const {
    orgName,
    studentName,
    fatherName,
    motherName,
    address,
    className,
    roll,
    studentUid,
    academicYear,
    purposeOrReason,
    achievementDetails,
    characterRemarks,
  } = params;

  const sName = studentName?.trim() || "....................";
  const fName = fatherName?.trim() || "....................";
  const mText = motherName?.trim() ? `, মাতা: ${motherName.trim()}` : "";
  const addrText = address?.trim() ? `, ঠিকানা: ${address.trim()}` : "";
  const clsText = className?.trim() || "....................";
  const rollText = roll ? toBengaliNumber(roll) : ".....";
  const uidText = studentUid ? ` (আইডি: ${toBengaliNumber(studentUid)})` : "";
  const yearText = academicYear?.trim() || toBengaliNumber(new Date().getFullYear());
  const charText = characterRemarks?.trim() || CERTIFICATE_TYPE_META[type].defaultCharacter;
  const orgText = orgName?.trim() || "আমাদের প্রতিষ্ঠান";

  switch (type) {
    case "testimonial":
      return `এই মর্মে সাদরে প্রশংসা ও প্রত্যয়ন করা যাচ্ছে যে, ${sName}, পিতা: ${fName}${mText}${addrText} — ${orgText}-এর ${yearText} শিক্ষাবর্ষে ${clsText} শ্রেণির একজন নিয়মিত ও মেধাবী শিক্ষার্থী ছিল/আছে। তার শ্রেণি রোল নম্বর ${rollText}${uidText}।\n\nপ্রতিষ্ঠানে অধ্যয়নকালে আমার জানামতে সে প্রতিষ্ঠানের সকল নিয়ম-কানুন ও আদব-কায়দা যথাযথভাবে মেনে চলেছে এবং রাষ্ট্র বা শরিয়তবিরোধী কোনো কর্মকাণ্ডে জড়িত ছিল না। তার স্বভাব-চরিত্র ${charText}।\n\nআমি তার উজ্জ্বল ভবিষ্যৎ, দ্বীনি ও দুনিয়াবি সর্বাঙ্গীণ সফলতা কামনা করি।`;

    case "bonafide": {
      const purposeLine = purposeOrReason?.trim()
        ? `উক্ত সনদটি ${purposeOrReason.trim()} প্রদান করা হলো।`
        : "দাপ্তরিক প্রয়োজনে এই প্রত্যয়ন পত্রটি প্রদান করা হলো।";
      return `এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, ${sName}, পিতা: ${fName}${mText}${addrText} — ${orgText}-এর ${yearText} শিক্ষাবর্ষের ${clsText} শ্রেণিতে নিয়মিত অধ্যয়নরত একজন শিক্ষার্থী। প্রতিষ্ঠানের হাজিরা খাতা ও ভর্তি রেজিস্টার অনুযায়ী তার রোল নম্বর ${rollText}${uidText}।\n\nপ্রতিষ্ঠানে তার উপস্থিতি ও পড়াশোনার মান সন্তোষজনক এবং আমার জানামতে তার চরিত্র ${charText}। ${purposeLine}\n\nআমি তার উত্তরোত্তর উন্নতি ও কল্যাণ কামনা করছি।`;
    }

    case "transfer": {
      const reasonLine = purposeOrReason?.trim()
        ? purposeOrReason.trim()
        : "অভিভাবকের আবেদনক্রমে";
      return `এই মর্মে ছাড়পত্র প্রদান করা যাচ্ছে যে, ${sName}, পিতা: ${fName}${mText}${addrText} — অত্র ${orgText}-এর ${yearText} শিক্ষাবর্ষে ${clsText} শ্রেণির একজন নিয়মিত শিক্ষার্থী ছিল। তার শ্রেণি রোল নম্বর ছিল ${rollText}${uidText}।\n\n${reasonLine} অদ্য তাকে অত্র প্রতিষ্ঠান থেকে ছাড়পত্র প্রদান করা হলো। প্রতিষ্ঠানের সকল বেতন, ফি ও অন্যান্য যাবতীয় পাওনাদি পরিশোধিত রয়েছে। আমার জানামতে অধ্যয়নকালে তার আচার-আচরণ ও চরিত্র ${charText} ছিল।\n\nযে কোনো উপযুক্ত প্রতিষ্ঠানে তার ভর্তির ব্যাপারে আমাদের কোনো আপত্তি নেই। আমি তার সর্বাঙ্গীণ মঙ্গল ও সাফল্য কামনা করি।`;
    }

    case "merit": {
      const achieveText = achievementDetails?.trim()
        ? achievementDetails.trim()
        : CERTIFICATE_TYPE_META.merit.defaultAchievement;
      return `অত্যন্ত আনন্দের সাথে এই কৃতিত্ব ও সম্মাননা পত্র প্রদান করা হচ্ছে যে, ${sName}, পিতা: ${fName}${mText} — ${orgText}-এর ${yearText} শিক্ষাবর্ষের ${clsText} শ্রেণির রোল নম্বর ${rollText}${uidText}-এর শিক্ষার্থী হিসেবে "${achieveText}" অর্জন করে প্রতিষ্ঠানের সুনাম বৃদ্ধি করেছে।\n\nতার নিরলস পরিশ্রম, মেধা, বিনয় ও ${charText} আচরণের স্বীকৃতিস্বরূপ তাকে এই বিশেষ কৃতিত্ব পত্র প্রদান করা হলো।\n\nমহান আল্লাহ তাআলা তাকে দ্বীন ও মানবতার কল্যাণে কবুল করুন এবং আগামী দিনে আরও বড় সাফল্য দান করুন।`;
    }
  }
};

export const generateNextMemoNumber = (
  type: CertificateType,
  existingCertificates: CertificateRecord[]
): string => {
  const prefix = CERTIFICATE_TYPE_META[type].prefix;
  const year = new Date().getFullYear();
  const sameTypeThisYear = existingCertificates.filter(
    (c) =>
      c.certificateType === type &&
      c.memoNumber?.includes(`${year}`)
  );

  let maxSerial = sameTypeThisYear.length;
  sameTypeThisYear.forEach((c) => {
    const parts = c.memoNumber.split(/[/-]/);
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxSerial) {
      maxSerial = num;
    }
  });

  const nextSerial = String(maxSerial + 1).padStart(4, "0");
  return `${prefix}/${year}/${nextSerial}`;
};

export const getTodayDDMMYYYY = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
};
