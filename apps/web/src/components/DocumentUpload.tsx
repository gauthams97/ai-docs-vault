import { useState, useCallback, useRef } from 'react';
import { DocumentStatus } from '@ai-document-vault/shared';
import type { Document } from '@ai-document-vault/shared';
import { uploadDocument, type UploadResult } from '@/lib/api/client';
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
  const [costWarning, setCostWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate file type (PDF, DOC, DOCX only)
   */
  const validateFileType = useCallback((file: File): string | null => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    
    // Get file extension
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    // Validate MIME type
    const isValidMimeType = file.type && allowedMimeTypes.includes(file.type);
    
    // Validate file extension
    const isValidExtension = allowedExtensions.includes(fileExtension);
    
    if (!isValidMimeType || !isValidExtension) {
      return 'Invalid file type. Only PDF (.pdf), Word (.doc), and Word (.docx) files are allowed.';
    }
    
    return null;
  }, []);

  /**
   * Handle file selection and upload
   */
  const handleFile = useCallback(
    async (file: File) => {
      // Validate file name
      if (!file.name || file.name.trim() === '') {
        setError('File name is required');
        return;
      }

      // Validate file type BEFORE upload
      const typeError = validateFileType(file);
      if (typeError) {
        setError(typeError);
        return;
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError(`File size exceeds 50MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }

      setError(null);
      setCostWarning(null);
      setIsUploading(true);

      try {
        // Upload file
        const result: UploadResult = await uploadDocument(file);

        // Show cost awareness message if applicable (non-alarming, informative)
        if (result.costEstimate?.processingMessage) {
          setCostWarning(result.costEstimate.processingMessage);
        }

        // Create optimistic document with PROCESSING status for UI
        // (Backend returns UPLOADED, but we show PROCESSING to user)
        const optimisticDocument: Document = {
          ...result.document,
          status: DocumentStatus.PROCESSING, // Show as processing in UI
        };

        // Call success callback
        onUploadSuccess(optimisticDocument);
      } catch (err) {
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
    [handleFile, validateFileType]
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
    [handleFile, validateFileType]
  );

  /**
   * Trigger file input click
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Premium dropzone with Apple-inspired design */}
      <div
        className={`
          border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200
          ${isDragging 
            ? 'border-neutral-400 dark:border-neutral-600 bg-neutral-100/50 dark:bg-neutral-800/50 scale-[1.01] shadow-lg' 
            : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-md'
          }
          ${isUploading ? 'cursor-not-allowed opacity-60' : ''}
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
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-label="Upload document"
        />

        <div className="flex flex-col items-center gap-5">
          {isUploading ? (
            <>
              <div 
                className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin" 
                aria-label="Uploading" 
              />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Uploading...</p>
            </>
          ) : (
            <>
              <svg
                className={`w-14 h-14 transition-colors duration-200 ${
                  isDragging ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500'
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="space-y-2">
                <p className="text-base font-medium text-neutral-900 dark:text-neutral-50 tracking-tight">
                  {isDragging
                    ? 'Drop file here'
                    : 'Drag and drop a file here, or click to browse'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-light">
                  Supported formats: PDF, DOC, DOCX • Maximum size: 50MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cost awareness message (calm, informative, non-alarming) */}
      {costWarning && (
        <div 
          className="mt-5 p-4 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 rounded-xl flex items-start gap-3 text-blue-900 dark:text-blue-200 shadow-sm" 
          role="status"
        >
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm flex-1 leading-relaxed">{costWarning}</span>
          <button
            className="bg-transparent border-none text-blue-700 dark:text-blue-300 text-xl leading-none cursor-pointer p-1 w-6 h-6 flex items-center justify-center rounded-md hover:bg-blue-100/50 dark:hover:bg-blue-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 transition-colors"
            onClick={() => setCostWarning(null)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Error display with Apple-style design */}
      {error && (
        <div 
          className="mt-5 p-4 bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60 rounded-xl flex items-start gap-3 text-red-900 dark:text-red-200 shadow-sm" 
          role="alert"
        >
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm flex-1 leading-relaxed">{error}</span>
          <button
            className="bg-transparent border-none text-red-700 dark:text-red-300 text-xl leading-none cursor-pointer p-1 w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-100/50 dark:hover:bg-red-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 transition-colors"
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
