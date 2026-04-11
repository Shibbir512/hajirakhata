import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { X, Check, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const moveCrop = (dx: number, dy: number) => {
    setCrop((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex justify-between items-center p-4 bg-black text-white z-10">
        <button type="button" onClick={onCancel} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-lg font-semibold">ছবি ক্রপ করুন</h3>
        <button type="button" onClick={handleSave} className="p-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white">
          <Check className="w-6 h-6" />
        </button>
      </div>
      
      <div className="relative flex-1 w-full bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={3 / 4} // Portrait aspect ratio (standard for ID photos)
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
          objectFit="contain"
        />
      </div>
      
      <div className="p-4 bg-black z-10 flex flex-col gap-4">
        <div className="flex justify-center items-center gap-4 mb-2">
          <button type="button" onClick={() => moveCrop(0, -10)} className="p-3 bg-gray-800 rounded-full text-white hover:bg-gray-700 active:bg-gray-600">
            <ChevronUp className="w-6 h-6" />
          </button>
          <div className="flex gap-4">
            <button type="button" onClick={() => moveCrop(-10, 0)} className="p-3 bg-gray-800 rounded-full text-white hover:bg-gray-700 active:bg-gray-600">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button type="button" onClick={() => moveCrop(10, 0)} className="p-3 bg-gray-800 rounded-full text-white hover:bg-gray-700 active:bg-gray-600">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          <button type="button" onClick={() => moveCrop(0, 10)} className="p-3 bg-gray-800 rounded-full text-white hover:bg-gray-700 active:bg-gray-600">
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-white text-sm">জুম</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => {
              setZoom(Number(e.target.value));
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>
        <p className="text-gray-400 text-xs text-center">ছবিটি টেনেও (Drag) সরাতে পারবেন</p>
      </div>
    </div>
  );
};

export default ImageCropper;
