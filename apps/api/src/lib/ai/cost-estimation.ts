/**
 * AI Cost Estimation Utility
 * 
 * Lightweight cost awareness for document processing.
 * Estimates processing cost based on document size and type.
 * 
 * Philosophy: Design AI systems with cost and scale in mind, even at prototype stage.
 * 
 * Note: These are rough estimates for awareness, not exact billing calculations.
 */

export interface CostEstimate {
  /**
   * Estimated processing complexity level
   * - 'small': < 10 pages, fast processing
   * - 'medium': 10-50 pages, normal processing
   * - 'large': 50-100 pages, longer processing
   * - 'very_large': > 100 pages, extended processing
   */
  complexity: 'small' | 'medium' | 'large' | 'very_large';
  
  /**
   * Approximate page count (for PDFs) or equivalent pages (for other formats)
   */
  estimatedPages: number;
  
  /**
   * Whether this document should trigger a "large document" warning
   */
  isLargeDocument: boolean;
  
  /**
   * User-friendly message about processing time
   */
  processingMessage: string | null;
}

/**
 * Estimate document processing cost and complexity
 * 
 * Uses lightweight heuristics:
 * - PDF: ~50KB per page average
 * - DOC/DOCX: ~30KB per page average
 * - Text extraction ratio: ~10% of file size becomes text
 * 
 * @param fileSize - File size in bytes
 * @param fileName - File name (for extension detection)
 * @returns Cost estimate with complexity and warnings
 */
export function estimateProcessingCost(
  fileSize: number,
  fileName: string
): CostEstimate {
  // Get file extension
  const extension = fileName.toLowerCase().split('.').pop() || '';
  
  // Estimate pages based on file type
  // These are rough approximations for awareness, not exact calculations
  let estimatedPages: number;
  
  if (extension === 'pdf') {
    // PDF: ~50KB per page average (varies widely, but good heuristic)
    estimatedPages = Math.ceil(fileSize / (50 * 1024));
  } else if (extension === 'doc' || extension === 'docx') {
    // Word: ~30KB per page average (compressed format)
    estimatedPages = Math.ceil(fileSize / (30 * 1024));
  } else {
    // Fallback: assume text-like format, ~20KB per page
    estimatedPages = Math.ceil(fileSize / (20 * 1024));
  }
  
  // Ensure minimum of 1 page
  estimatedPages = Math.max(1, estimatedPages);
  
  // Determine complexity level
  let complexity: CostEstimate['complexity'];
  let isLargeDocument: boolean;
  let processingMessage: string | null = null;
  
  if (estimatedPages < 10) {
    complexity = 'small';
    isLargeDocument = false;
  } else if (estimatedPages < 50) {
    complexity = 'medium';
    isLargeDocument = false;
  } else if (estimatedPages < 100) {
    complexity = 'large';
    isLargeDocument = true;
    processingMessage = 'This document may take longer to process.';
  } else {
    complexity = 'very_large';
    isLargeDocument = true;
    processingMessage = 'This is a large document and may take longer to process.';
  }
  
  return {
    complexity,
    estimatedPages,
    isLargeDocument,
    processingMessage,
  };
}

/**
 * Check if document size exceeds safe processing threshold
 * 
 * This is a guardrail to prevent extremely large documents from causing issues.
 * Currently set to 50MB (matches upload limit), but can be adjusted.
 * 
 * @param fileSize - File size in bytes
 * @returns true if document exceeds safe threshold
 */
export function exceedsSafeThreshold(fileSize: number): boolean {
  // 50MB threshold (matches upload limit)
  const SAFE_THRESHOLD = 50 * 1024 * 1024;
  return fileSize > SAFE_THRESHOLD;
}

