/**
 * Error handling utilities for API responses
 * Provides consistent error message extraction and formatting
 */

export interface ApiError {
  message: string;
  errors?: Array<{
    field?: string;
    path?: string;
    param?: string;
    msg?: string;
    message?: string;
  }>;
}

/**
 * Extracts user-friendly error messages from API error responses
 * @param error - The error object from axios or API call
 * @returns Object containing general error message and field-specific errors
 */
export const extractErrorMessage = (error: any): {
  general: string;
  fieldErrors: Record<string, string>;
} => {
  const response = error?.response?.data;
  
  if (!response) {
    return {
      general: 'An unexpected error occurred. Please try again.',
      fieldErrors: {}
    };
  }

  // Extract general error message
  const general = response.message || 'An error occurred. Please try again.';

  // Extract field-specific errors
  const fieldErrors: Record<string, string> = {};
  
  if (response.errors && Array.isArray(response.errors)) {
    response.errors.forEach((err: any) => {
      const field = err.field || err.path || err.param;
      const message = err.msg || err.message;
      
      if (field && message) {
        fieldErrors[field] = message;
      }
    });
  }

  return { general, fieldErrors };
};

/**
 * Formats validation errors for display in forms
 * @param fieldErrors - Object containing field-specific error messages
 * @returns Formatted error messages object
 */
export const formatValidationErrors = (fieldErrors: Record<string, string>): Record<string, string> => {
  const formatted: Record<string, string> = {};
  
  Object.entries(fieldErrors).forEach(([field, message]) => {
    // Handle nested field errors (e.g., address.street)
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (!formatted[parent]) {
        formatted[parent] = {};
      }
      (formatted[parent] as any)[child] = message;
    } else {
      formatted[field] = message;
    }
  });
  
  return formatted;
};

/**
 * Logs API errors for debugging purposes
 * @param error - The error object from API call
 * @param context - Additional context about where the error occurred
 */
export const logApiError = (error: any, context?: string): void => {
  const errorInfo = {
    context: context || 'API Call',
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    url: error?.config?.url,
    method: error?.config?.method,
    data: error?.response?.data,
    requestData: error?.config?.data
  };
  
  console.error('API Error:', errorInfo);
  
  // Log validation errors separately for easier debugging
  if (error?.response?.data?.errors) {
    console.error('Validation Errors:', error.response.data.errors);
  }
};

/**
 * Common validation error messages for better user experience
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long',
  PHONE_INVALID: 'Please enter a valid 10-digit phone number',
  ZIPCODE_INVALID: 'Please enter a valid 6-digit ZIP code starting with 1-9',
  FILE_REQUIRED: 'This file is required',
  FILE_TOO_LARGE: 'File size must be less than 5MB',
  INVALID_CATEGORY: 'Please select a valid category',
  PRICE_INVALID: 'Please enter a valid price',
  DATE_INVALID: 'Please enter a valid date',
  RATING_INVALID: 'Rating must be between 1 and 5'
} as const;
