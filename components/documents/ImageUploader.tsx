import React, { useRef } from 'react';
import { UploadCloud, X } from 'lucide-react';

interface ImageUploaderProps {
  label: string;
  currentImage: string | null | undefined;
  onImageUpload: (base64: string) => void;
  onImageRemove: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, currentImage, onImageUpload, onImageRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageUpload(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {currentImage ? (
        <div className="relative group">
          <img src={currentImage} alt={label} className="w-full h-24 object-contain rounded-md border border-slate-300 bg-slate-100" />
          <button
            type="button"
            onClick={onImageRemove}
            className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md cursor-pointer hover:border-sky-500"
        >
          <div className="space-y-1 text-center">
            <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
            <div className="flex text-sm text-slate-600">
              <span className="relative bg-white rounded-md font-medium text-sky-600 hover:text-sky-500">
                <span>Enviar imagem</span>
                <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg, image/svg+xml" />
              </span>
            </div>
            <p className="text-xs text-slate-500">PNG, JPG, SVG</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
