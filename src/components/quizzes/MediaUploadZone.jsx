import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MediaUploadZone({ type, accept, currentUrl, onFileSelect, onRemove, uploading }) {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (uploading) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            // Basic validation based on accept (files like image/*)
            if (accept) {
                const fileType = file.type;
                const acceptType = accept.replace('*', '');
                if (!fileType.startsWith(acceptType)) {
                    // Could add error handling here, but for now just ignore
                    return;
                }
            }
            onFileSelect(file, type);
        }
    };

    const handleClick = () => {
        if (!uploading) {
            fileInputRef.current?.click();
        }
    };

    const handleInputChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0], type);
        }
    };

    if (currentUrl) {
        return (
            <div className="relative group">
                {type === 'video' ? (
                    <video src={currentUrl} className="w-full h-24 object-cover rounded border" controls />
                ) : (
                    <img src={currentUrl} alt="Preview" className="w-full h-24 object-cover rounded border" />
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(type);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm opacity-100 transition-opacity"
                    type="button"
                    title={t('common.remove') || "Remove"}
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    // Get label text safely
    const getLabel = () => {
        if (type === 'gif') return t('quiz.gif') || 'GIF';
        if (type === 'video') return t('quiz.video') || 'Video';
        return t('quiz.image') || 'Image';
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`relative flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
        ${isDragging
                    ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-sm'
                    : 'border-gray-300 hover:border-cyan-400 hover:bg-blue-50/50'
                }
        ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleInputChange}
                className="hidden"
                disabled={uploading}
            />
            <Upload
                size={20}
                className={`mb-1 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'}`}
            />
            <span className={`text-xs font-medium transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-500'}`}>
                {isDragging ? (t('common.dropHere') || "Drop here") : getLabel()}
            </span>
        </div>
    );
}
