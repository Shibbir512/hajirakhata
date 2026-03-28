import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const compressImageNative = (file: File, maxWidth = 500, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original file
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file); // Fallback
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file); // Fallback
    };
    reader.onerror = () => resolve(file); // Fallback
  });
};

export const compressAndUploadImage = async (
  file: File,
  path: string
): Promise<string | null> => {
  if (!storage) {
    console.error("Firebase Storage is not initialized.");
    throw new Error("স্টোরেজ ইনিশিয়ালাইজ করা হয়নি।");
  }

  try {
    // Use native compression to prevent hanging on mobile devices
    const compressedBlob = await compressImageNative(file, 500, 0.7);
    
    // Create a storage reference
    const storageRef = ref(storage, path);
    
    // Upload the compressed image
    const snapshot = await uploadBytes(storageRef, compressedBlob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error compressing or uploading image:", error);
    throw error;
  }
};
