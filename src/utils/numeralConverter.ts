export const bengaliNumerals = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export const englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const convertNumber = (num: number | string, format: 'bn' | 'ar' | 'en'): string => {
  const str = num.toString();
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char >= '0' && char <= '9') {
      const digit = parseInt(char);
      if (format === 'bn') result += bengaliNumerals[digit];
      else if (format === 'ar') result += arabicNumerals[digit];
      else result += englishNumerals[digit];
    } else {
      result += char;
    }
  }
  return result;
};
