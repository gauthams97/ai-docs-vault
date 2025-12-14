import { useState, useCallback, useRef } from 'react';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Document } from '@ai-document-vault/shared';
import { uploadDocument } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/client';

interface DocumentUploadProps {
  onUploadSuccess: (document: Document) => void;
  onUploadError?: (error: ApiClientError) => void;
}

function getUserFriendlyErrorMessage(error: ApiClientError): string {
  if (error.statusCode === 0 || error.error === 'NETWORK_ERROR') {
    return 'Network error: Unable to connect to server. Please check your internet connection.';
  }
  
  if (error.statusCode && error.statusCode >= 500) {
    return 'Server error: The server encountered an issue. Please try again in a moment.';
  }
  
  if (error.statusCode === 400) {
    return error.message || 'Invalid file. Please check the file and try again.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
}

export function DocumentUpload({
  onUploadSuccess,
  onUploadError,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection and upload
   */
  const handleFile = useCallback(
    async (file: File) => {
      // Validate file
      if (!file.name || file.name.trim() === '') {
        setError('File name is required');
        return;
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError(`File size exceeds 50MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        // Upload file
        const document = await uploadDocument(file);

        // Create optimistic document with PROCESSING status for UI
        // (Backend returns UPLOADED, but we show PROCESSING to user)
        const optimisticDocument: Document = {
          ...document,
          status: DocumentStatus.PROCESSING, // Show as processing in UI
        };

        // Call success callback
        onUploadSuccess(optimisticDocument);
      } catch (err) {
        // Log error for debugging
        console.error('[DocumentUpload] Upload failed:', err);
        
        const apiError =
          err instanceof ApiClientError
            ? err
            : new ApiClientError(
                'UPLOAD_ERROR',
                err instanceof Error ? err.message : 'Failed to upload document. Please check your connection and try again.',
                'UNKNOWN_ERROR'
              );

        // Set explicit error message for user
        const userFriendlyMessage = getUserFriendlyErrorMessage(apiError);
        setError(userFriendlyMessage);
        
        // Call error callback
        onUploadError?.(apiError);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess, onUploadError]
  );

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]); // Handle first file only
      }
    },
    [handleFile]
  );

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input to allow selecting same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFile]
  );

  /**
   * Trigger file input click
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
            : 'border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50'
          }
          ${isUploading ? 'cursor-not-allowed opacity-70' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          onChange={handleFileInputChange}
          disabled={isUploading}
          aria-label="Upload document"
        />

        <div className="flex flex-col items-center gap-4">
          {isUploading ? (
            <>
              <div 
                className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" 
                aria-label="Uploading" 
              />
              <p className="text-base font-medium text-slate-700">Uploading...</p>
            </>
          ) : (
            <>
              <svg
                className={`w-12 h-12 transition-colors ${
                  isDragging ? 'text-blue-500' : 'text-slate-500'
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-base font-medium text-slate-700">
                {isDragging
                  ? 'Drop file here'
                  : 'Drag and drop a file here, or click to browse'}
              </p>
              <p className="text-sm text-slate-500">Maximum file size: 50MB</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div 
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-800" 
          role="alert"
        >
          <span className="text-xl flex-shrink-0">⚠️</span>
          <span className="text-sm flex-1">{error}</span>
          <button
            className="bg-transparent border-none text-red-800 text-2xl leading-none cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-800 focus:ring-offset-2"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
