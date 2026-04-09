import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

export type CompressionLevel = 'high' | 'medium' | 'low';

export const compressAndUploadImage = async (
  file: File,
  path: string,
  compressionLevel: CompressionLevel = 'medium'
): Promise<string | null> => {
  if (!storage) {
    console.error("Firebase Storage is not initialized.");
    throw new Error("স্টোরেজ ইনিশিয়ালাইজ করা হয়নি।");
  }

  try {
    console.log("Starting image upload process...");
    
    let maxSizeMB = 0.5;
    let maxWidthOrHeight = 800;

    if (compressionLevel === 'high') {
      maxSizeMB = 1;
      maxWidthOrHeight = 1200;
    } else if (compressionLevel === 'low') {
      maxSizeMB = 0.2;
      maxWidthOrHeight = 500;
    }

    // Use robust browser-image-compression library
    const options = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: false, // Disabled web worker for better mobile compatibility
      fileType: 'image/jpeg'
    };
    
    let compressedFile: File | Blob = file;
    try {
      console.log("Compressing image...");
      compressedFile = await imageCompression(file, options);
      console.log("Image compressed successfully.");
    } catch (compressionError) {
      console.warn("Compression failed, using original file:", compressionError);
      // Fallback to original file if compression fails
      compressedFile = file;
    }
    
    // Create a storage reference
    console.log("Creating storage reference for path:", path);
    const storageRef = ref(storage, path);
    
    // Upload the compressed image with metadata
    console.log("Uploading image...");
    const metadata = {
      contentType: file.type || 'image/jpeg',
    };
    const snapshot = await uploadBytes(storageRef, compressedFile, metadata);
    console.log("Image uploaded successfully.");
    
    // Get the download URL
    console.log("Getting download URL...");
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("Download URL:", downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Error compressing or uploading image:", error);
    throw error;
  }
};
