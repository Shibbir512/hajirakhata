/**
 * Converts Bengali digits in a string to Arabic digits.
 * @param query The string to normalize.
 * @returns The normalized string.
 */
export const normalizeSearchQuery = (query: string): string => {
    const bengaliToArabicMap: { [key: string]: string } = {
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
      '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    return query.replace(/[০-৯]/g, (match) => bengaliToArabicMap[match]);
};

/**
 * Performs a simple fuzzy match. Checks if characters of the query appear
 * in the text in the same order, but not necessarily consecutively.
 * @param query The search query.
 * @param text The text to search within.
 * @returns True if it's a match, false otherwise.
 */
export const fuzzyMatch = (query: string, text: string): boolean => {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    let queryIndex = 0;
    let textIndex = 0;

    while (queryIndex < lowerQuery.length && textIndex < lowerText.length) {
        if (lowerQuery[queryIndex] === lowerText[textIndex]) {
            queryIndex++;
        }
        textIndex++;
    }

    return queryIndex === lowerQuery.length;
};
