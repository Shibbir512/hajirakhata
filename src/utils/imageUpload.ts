import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

export const compressAndUploadImage = async (
  file: File,
  path: string
): Promise<string | null> => {
  if (!storage) {
    console.error("Firebase Storage is not initialized.");
    throw new Error("স্টোরেজ ইনিশিয়ালাইজ করা হয়নি।");
  }

  try {
    // Use robust browser-image-compression library
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 800,
      useWebWorker: false, // Disabled web worker for better mobile compatibility
      fileType: 'image/jpeg'
    };
    
    let compressedFile: File | Blob = file;
    try {
      compressedFile = await imageCompression(file, options);
    } catch (compressionError) {
      console.warn("Compression failed, using original file:", compressionError);
      // Fallback to original file if compression fails
      compressedFile = file;
    }
    
    // Create a storage reference
    const storageRef = ref(storage, path);
    
    // Upload the compressed image with metadata
    const metadata = {
      contentType: file.type || 'image/jpeg',
    };
    const snapshot = await uploadBytes(storageRef, compressedFile, metadata);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error compressing or uploading image:", error);
    throw error;
  }
};
