// Define the folder structure
export const S3_FOLDERS = {
  USERS: {
    PROFILE_IMAGES: 'users/profile-images/',
  },
  COMPANIES: {
    LOGOS: 'companies/logos/',
    BANNERS: 'companies/banners/',
  },
  REPORTS: {
    EVIDENCE: 'reports/evidence/',
  },
  POSTS: {
    MEDIA: 'posts/media/',
  },
  GROUPS: {
    COVERS: 'groups/covers/',
  },
} as const;

// Create the type based on the actual values
export type S3FolderType = 
  | 'users/profile-images'
  | 'companies/logos'
  | 'companies/banners'
  | 'reports/evidence'
  | 'posts/media'
  | 'groups/covers';

// Helper function to get folder path
export function getFolderPath(folderType: S3FolderType): string {
  const folderMap: Record<S3FolderType, string> = {
    'users/profile-images': S3_FOLDERS.USERS.PROFILE_IMAGES,
    'companies/logos': S3_FOLDERS.COMPANIES.LOGOS,
    'companies/banners': S3_FOLDERS.COMPANIES.BANNERS,
    'reports/evidence': S3_FOLDERS.REPORTS.EVIDENCE,
    'posts/media': S3_FOLDERS.POSTS.MEDIA,
    'groups/covers': S3_FOLDERS.GROUPS.COVERS,
  };
  
  return folderMap[folderType];
}