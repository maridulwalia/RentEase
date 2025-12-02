import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';

interface MaintenanceStatus {
  isMaintenanceMode: boolean;
  message: string;
  estimatedDowntime: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for checking maintenance mode status in real-time
 * @returns {MaintenanceStatus} Current maintenance mode status and controls
 */
export const useMaintenanceMode = () => {
  const [status, setStatus] = useState<MaintenanceStatus>({
    isMaintenanceMode: false,
    message: '',
    estimatedDowntime: '',
    isLoading: true,
    error: null
  });

  const checkMaintenanceStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Use public maintenance status endpoint
      const response = await adminAPI.getMaintenanceStatus();
      const data = response.data.data;

      setStatus({
        isMaintenanceMode: data.maintenanceMode,
        message: data.message || 'System is currently under maintenance. Please try again later.',
        estimatedDowntime: data.estimatedDowntime || 'We apologize for the inconvenience. The system will be back online shortly.',
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      // If we get a 503 error, it means maintenance mode is active
      if (error.response?.status === 503 && error.response?.data?.maintenanceMode) {
        setStatus({
          isMaintenanceMode: true,
          message: error.response.data.message || 'System is currently under maintenance.',
          estimatedDowntime: error.response.data.estimatedDowntime || 'Please try again later.',
          isLoading: false,
          error: null
        });
      } else {
        // For other errors, assume maintenance mode is off
        setStatus({
          isMaintenanceMode: false,
          message: '',
          estimatedDowntime: '',
          isLoading: false,
          error: error.message || 'Failed to check maintenance status'
        });
      }
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkMaintenanceStatus();

    // Set up polling every 30 seconds
    const interval = setInterval(checkMaintenanceStatus, 30000);

    // Check when window regains focus
    const handleFocus = () => {
      checkMaintenanceStatus();
    };

    // Check when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkMaintenanceStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkMaintenanceStatus]);

  return {
    ...status,
    refetch: checkMaintenanceStatus
  };
};