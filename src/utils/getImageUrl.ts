export const getImageUrl = (imagePath: string | undefined, type: 'profiles' | 'items' | 'documents' | 'evidence' | 'misc' = 'items'): string => {
  if (!imagePath) return '';
  
  // If it's already a full URL (like from Cloudinary or an external source)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // If it's a local file path, extract just the filename
  const fileName = imagePath.split(/[\\/]/).pop();
  
  // Use the backend base URL if it's set in production, otherwise rely on relative dev proxy
  const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';
  
  return `${baseUrl}/uploads/${type}/${fileName}`;
};
