'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { api } from '../api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cookie management functions
const setAuthCookie = (name, value, days = 7) => {
  if (typeof document === 'undefined') return;
  
  const cookieValue = typeof value === 'object' ? JSON.stringify(value) : value;
  const encodedValue = encodeURIComponent(cookieValue);
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  document.cookie = `${name}=${encodedValue}; expires=${expires}; path=/; SameSite=Lax${secure}`;
  
  console.log(`🍪 Set cookie: ${name}`, value);
};

const getAuthCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split('; ');
  const cookie = cookies.find(row => row.startsWith(`${name}=`));
  
  if (cookie) {
    try {
      const value = cookie.split('=')[1];
      const decodedValue = decodeURIComponent(value);
      
      try {
        return JSON.parse(decodedValue);
      } catch {
        return decodedValue;
      }
    } catch (error) {
      console.error(`Error parsing cookie ${name}:`, error);
      return null;
    }
  }
  
  return null;
};

const removeAuthCookie = (name) => {
  if (typeof document === 'undefined') return;
  
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
};

const syncCookiesToLocalStorage = (token, userData, profileData, emailVerificationStatus) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('scamalert_token', token);
    }
    if (userData) {
      localStorage.setItem('scamalert_user', JSON.stringify(userData));
    }
    if (profileData) {
      localStorage.setItem('scamalert_profile', JSON.stringify(profileData));
    }
    if (emailVerificationStatus) {
      localStorage.setItem('scamalert_email_verified', JSON.stringify(emailVerificationStatus));
    }
  }
};

const clearAllAuthData = () => {
  if (typeof window !== 'undefined') {
    // Clear localStorage
    localStorage.removeItem('scamalert_token');
    localStorage.removeItem('scamalert_user');
    localStorage.removeItem('scamalert_profile');
    localStorage.removeItem('scamalert_refresh_token');
    localStorage.removeItem('scamalert_email_verified');
    
    // Clear cookies
    removeAuthCookie('scamalert_token');
    removeAuthCookie('scamalert_user');
    removeAuthCookie('scamalert_profile');
    removeAuthCookie('scamalert_email_verified');
    removeAuthCookie('scamalert_refresh_token');
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Email verification states
  const [emailVerificationStatus, setEmailVerificationStatus] = useState({
    isVerified: false,
    isPending: false,
    isSending: false,
  });
  
  // Session states
  const [sessionStatus, setSessionStatus] = useState({
    isExpired: false,
    expiredMessage: '',
    showNotification: false,
    conflictType: null, // 'device' | 'session' | 'inactivity'
  });
  
  const router = useRouter();

  // Token management functions
  const getToken = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('scamalert_token');
      if (token) return token;
      
      return getAuthCookie('scamalert_token');
    }
    return null;
  };

  const setToken = (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scamalert_token', token);
      setAuthCookie('scamalert_token', token);
    }
  };

  const storeUserData = (userData) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scamalert_user', JSON.stringify(userData));
      setAuthCookie('scamalert_user', userData);
    }
    setUser(userData);
  };

  const storeProfileData = (profileData) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scamalert_profile', JSON.stringify(profileData));
      setAuthCookie('scamalert_profile', profileData);
    }
    setProfile(profileData);
  };

  const storeEmailVerificationStatus = (status) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scamalert_email_verified', JSON.stringify(status));
      setAuthCookie('scamalert_email_verified', status);
    }
    setEmailVerificationStatus(status);
  };

  const storeRefreshToken = (refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scamalert_refresh_token', refreshToken);
      setAuthCookie('scamalert_refresh_token', refreshToken);
    }
  };

  const clearLocalStorage = () => {
    clearAllAuthData();
  };

  // Session notification handler
  const showSessionExpiredNotification = (message = 'Your session has expired due to login on another device.', conflictType = 'device') => {
    setSessionStatus({
      isExpired: true,
      expiredMessage: message,
      showNotification: true,
      conflictType,
    });
    
    // Auto-hide notification after 10 seconds
    setTimeout(() => {
      setSessionStatus(prev => ({ ...prev, showNotification: false }));
    }, 10000);
  };

  const dismissSessionNotification = () => {
    setSessionStatus(prev => ({ ...prev, showNotification: false }));
  };

  const handleSessionExpiredAction = () => {
    clearAllAuthData();
    setUser(null);
    setProfile(null);
    setEmailVerificationStatus({
      isVerified: false,
      isPending: false,
      isSending: false,
    });
    setSessionStatus({
      isExpired: false,
      expiredMessage: '',
      showNotification: false,
      conflictType: null,
    });
    router.push('/auth/login');
  };

  // Initialize auth state from cookies/localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      
      let userData = getAuthCookie('scamalert_user');
      let profileData = getAuthCookie('scamalert_profile');
      let emailVerificationData = getAuthCookie('scamalert_email_verified');
      
      if (!userData) {
        const storedUser = localStorage.getItem('scamalert_user');
        if (storedUser) {
          try {
            userData = JSON.parse(storedUser);
          } catch (error) {
            console.error('Error parsing stored user data:', error);
          }
        }
      }
      
      if (!profileData) {
        const storedProfile = localStorage.getItem('scamalert_profile');
        if (storedProfile) {
          try {
            profileData = JSON.parse(storedProfile);
          } catch (error) {
            console.error('Error parsing stored profile data:', error);
          }
        }
      }
      
      if (!emailVerificationData) {
        const storedEmailVerification = localStorage.getItem('scamalert_email_verified');
        if (storedEmailVerification) {
          try {
            emailVerificationData = JSON.parse(storedEmailVerification);
          } catch (error) {
            console.error('Error parsing stored email verification:', error);
          }
        }
      }
      
      if (token && userData) {
        try {
          setUser(userData);
          
          if (profileData) {
            setProfile(profileData);
          } else {
            await fetchUserProfile();
          }

          if (emailVerificationData) {
            setEmailVerificationStatus(emailVerificationData);
          } else {
            await checkEmailVerification();
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          clearLocalStorage();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const checkEmailVerification = async () => {
    try {
      const response = await api.auth.checkEmailVerification();
      const status = {
        isVerified: response.verified || false,
        isPending: response.pending || false,
        isSending: false,
      };
      
      storeEmailVerificationStatus(status);
      return status;
    } catch (error) {
      console.error('Error checking email verification:', error);
      
      const storedUser = getAuthCookie('scamalert_user') || user;
      if (storedUser) {
        const status = {
          isVerified: storedUser.emailVerified || false,
          isPending: !storedUser.emailVerified,
          isSending: false,
        };
        
        storeEmailVerificationStatus(status);
        return status;
      }
      
      const defaultStatus = {
        isVerified: false,
        isPending: false,
        isSending: false,
      };
      
      storeEmailVerificationStatus(defaultStatus);
      return defaultStatus;
    }
  };

  const sendVerificationEmail = async () => {
    try {
      setEmailVerificationStatus(prev => ({ ...prev, isSending: true }));
      
      const response = await api.auth.sendVerificationEmail();
      
      const status = {
        isVerified: false,
        isPending: true,
        isSending: false,
      };
      
      storeEmailVerificationStatus(status);
      
      toast.success('Verification email sent! Check your inbox.');
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Error sending verification email:', error);
      
      setEmailVerificationStatus(prev => ({ ...prev, isSending: false }));
      
      let errorMessage = 'Failed to send verification email';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await api.auth.verifyEmail(token);
      
      const status = {
        isVerified: true,
        isPending: false,
        isSending: false,
      };
      
      storeEmailVerificationStatus(status);
      
      const currentUser = getAuthCookie('scamalert_user') || user;
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          emailVerified: true,
        };
        storeUserData(updatedUser);
      }
      
      toast.success('Email verified successfully!');
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Error verifying email:', error);
      
      let errorMessage = 'Email verification failed';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await api.auth.requestPasswordReset(email);
      
      toast.success('Password reset link sent! Check your email.');
      return { 
        success: true, 
        message: response.message || 'Reset link sent successfully' 
      };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      
      let errorMessage = 'Failed to send reset link';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (token, newPassword, confirmPassword) => {
    try {
      const response = await api.auth.resetPassword(token, newPassword, confirmPassword);
      
      toast.success('Password reset successful! You can now login with your new password.');
      return { 
        success: true, 
        message: response.message || 'Password reset successful' 
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      
      let errorMessage = 'Password reset failed';
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
        errorMessage = 'The reset link is invalid or has expired. Please request a new one.';
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await api.auth.changePassword(currentPassword, newPassword, confirmPassword);
      
      toast.success('Password changed successfully!');
      return { 
        success: true, 
        message: response.message || 'Password changed successfully' 
      };
    } catch (error) {
      console.error('Error changing password:', error);
      
      let errorMessage = 'Failed to change password';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const fetchUserProfile = async (forceRefresh = false) => {
    try {
      setProfileLoading(true);
      
      if (forceRefresh) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('scamalert_profile');
          removeAuthCookie('scamalert_profile');
        }
        setProfile(null);
      }
      
      console.log('Fetching profile from /api/v1/users/me...');
      
      let profileData;
      try {
        profileData = await api.users.getProfile();
        console.log('Profile response from users/me:', profileData);
      } catch (error) {
        console.log('Users endpoint failed, trying auth/me...', error);
        profileData = await api.auth.getMe();
        console.log('Profile response from auth/me:', profileData);
      }
      
      storeProfileData(profileData);
      
      const userData = {
        id: profileData.id || profileData._id || user?.id,
        email: profileData.email || user?.email,
        displayName: profileData.displayName || profileData.name || user?.displayName,
        firstName: profileData.firstName || user?.firstName,
        lastName: profileData.lastName || user?.lastName,
        phone: profileData.phone || user?.phone,
        bio: profileData.bio || user?.bio,
        avatarUrl: profileData.avatarUrl || user?.avatarUrl,
        role: profileData.role || user?.role || 'USER',
        createdAt: profileData.createdAt || user?.createdAt,
        emailVerified: profileData.emailVerified || user?.emailVerified || false,
        country: profileData.country || user?.country,
        region: profileData.region || user?.region,
        city: profileData.city || user?.city,
        location: profileData.location || user?.location,
      };
      
      storeUserData(userData);
      
      if (profileData.emailVerified !== undefined) {
        const status = {
          isVerified: profileData.emailVerified,
          isPending: !profileData.emailVerified,
          isSending: false,
        };
        storeEmailVerificationStatus(status);
      }
      
      return profileData;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      
      if (error.message?.includes('404')) {
        console.log('Profile endpoint not found. Using fallback data.');
        
        const currentUser = getAuthCookie('scamalert_user') || user;
        
        const fallbackProfile = {
          id: currentUser?.id || 'unknown',
          email: currentUser?.email || '',
          displayName: currentUser?.displayName || 'User',
          firstName: currentUser?.firstName || '',
          lastName: currentUser?.lastName || '',
          phone: currentUser?.phone || '',
          bio: currentUser?.bio || '',
          country: currentUser?.country || '',
          region: currentUser?.region || '',
          city: currentUser?.city || '',
          location: 'Not set',
          website: '',
          title: 'Scam Awareness Expert',
          reportCount: 42,
          followerCount: 256,
          followingCount: 89,
          credibilityScore: 94,
          responseRate: 92,
          role: currentUser?.role || 'USER',
          emailVerified: currentUser?.emailVerified || false,
          createdAt: currentUser?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        storeProfileData(fallbackProfile);
        return fallbackProfile;
      }
      
      toast.error('Unable to load profile data. Using cached information.');
      
      if (profile) {
        return profile;
      }
      
      const currentUser = getAuthCookie('scamalert_user') || user;
      
      return {
        id: currentUser?.id || 'unknown',
        email: currentUser?.email || '',
        displayName: currentUser?.displayName || 'User',
        firstName: currentUser?.firstName || '',
        lastName: currentUser?.lastName || '',
        phone: currentUser?.phone || '',
        bio: currentUser?.bio || '',
        country: currentUser?.country || '',
        region: currentUser?.region || '',
        city: currentUser?.city || '',
        location: 'Not set',
        website: '',
        title: 'Scam Awareness Expert',
        reportCount: 42,
        followerCount: 256,
        followingCount: 89,
        credibilityScore: 94,
        responseRate: 92,
        role: currentUser?.role || 'USER',
        emailVerified: currentUser?.emailVerified || false,
        createdAt: currentUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } finally {
      setProfileLoading(false);
    }
  };

  const updateUserProfile = async (profileData) => {
    try {
      setProfileLoading(true);
      
      const updateData = {
        displayName: profileData.displayName?.trim() || null,
        firstName: profileData.firstName?.trim() || null,
        lastName: profileData.lastName?.trim() || null,
        bio: profileData.bio?.trim() || null,
        phone: profileData.phone?.trim() || null,
        country: profileData.country?.trim() || null,
        region: profileData.region?.trim() || null,
        city: profileData.city?.trim() || null,
        ...(profileData.location && { location: profileData.location.trim() }),
        ...(profileData.website && { website: profileData.website.trim() }),
        ...(profileData.title && { title: profileData.title.trim() }),
        ...(profileData.avatarUrl && { avatarUrl: profileData.avatarUrl.trim() }),
      };
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null || updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });
      
      console.log('Updating profile with data:', updateData);
      
      let updatedProfile;
      try {
        updatedProfile = await api.users.updateProfile(updateData);
        console.log('Profile update response from users/me:', updatedProfile);
      } catch (error) {
        console.log('Users endpoint failed, trying auth/me...', error);
        updatedProfile = await api.auth.updateMe(updateData);
        console.log('Profile update response from auth/me:', updatedProfile);
      }
      
      storeProfileData(updatedProfile);
      
      const currentUser = getAuthCookie('scamalert_user') || user;
      const userData = {
        ...currentUser,
        displayName: updatedProfile.displayName || updatedProfile.name || currentUser.displayName,
        firstName: updatedProfile.firstName || currentUser.firstName,
        lastName: updatedProfile.lastName || currentUser.lastName,
        phone: updatedProfile.phone || currentUser.phone,
        bio: updatedProfile.bio || currentUser.bio,
        avatarUrl: updatedProfile.avatarUrl || currentUser.avatarUrl,
        country: updatedProfile.country || currentUser.country,
        region: updatedProfile.region || currentUser.region,
        city: updatedProfile.city || currentUser.city,
        emailVerified: updatedProfile.emailVerified || currentUser.emailVerified,
      };
      
      storeUserData(userData);
      
      if (updatedProfile.emailVerified !== undefined && updatedProfile.emailVerified !== currentUser.emailVerified) {
        const status = {
          isVerified: updatedProfile.emailVerified,
          isPending: !updatedProfile.emailVerified,
          isSending: false,
        };
        storeEmailVerificationStatus(status);
      }
      
      return { success: true, profile: updatedProfile, user: userData };
    } catch (error) {
      console.error('Update profile error:', error);
      
      let errorMessage = 'Failed to update profile';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'Profile update endpoint not found. Changes saved locally only.';
      }
      
      toast.error(errorMessage);
      
      const timestamp = new Date().toISOString();
      const currentProfile = getAuthCookie('scamalert_profile') || profile;
      const localProfile = {
        ...currentProfile,
        ...profileData,
        updatedAt: timestamp,
      };
      
      storeProfileData(localProfile);
      
      const currentUser = getAuthCookie('scamalert_user') || user;
      const localUserData = {
        ...currentUser,
        displayName: profileData.displayName || currentUser.displayName,
        firstName: profileData.firstName || currentUser.firstName,
        lastName: profileData.lastName || currentUser.lastName,
        phone: profileData.phone || currentUser.phone,
        bio: profileData.bio || currentUser.bio,
        country: profileData.country || currentUser.country,
        region: profileData.region || currentUser.region,
        city: profileData.city || currentUser.city,
      };
      
      storeUserData(localUserData);
      
      return { 
        success: false, 
        error: errorMessage,
        profile: localProfile,
        user: localUserData
      };
    } finally {
      setProfileLoading(false);
    }
  };

  const uploadProfileImage = async (file) => {
    try {
      setProfileLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Uploading profile image...', file.name, file.type);
      
      const uploadResponse = await api.upload.uploadUserProfile(formData);
      
      console.log('Upload response:', uploadResponse);
      
      if (uploadResponse.url) {
        const result = await updateUserProfile({ avatarUrl: uploadResponse.url });
        
        return { 
          success: true, 
          imageUrl: uploadResponse.url, 
          fullResponse: uploadResponse,
          profile: result.profile 
        };
      } else if (uploadResponse.imageUrl) {
        const result = await updateUserProfile({ avatarUrl: uploadResponse.imageUrl });
        
        toast.success('Profile image updated successfully!');
        return { 
          success: true, 
          imageUrl: uploadResponse.imageUrl, 
          fullResponse: uploadResponse,
          profile: result.profile 
        };
      }
      
      throw new Error('Invalid upload response format');
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      
      let errorMessage = 'Failed to upload image';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setProfileLoading(false);
    }
  };

  const updateNotificationSettings = async (settings) => {
    try {
      await api.users.updateNotifications(settings);
      toast.success('Notification settings updated!');
      return { success: true };
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      toast.error('Failed to update settings');
      return { success: false, error: error.message };
    }
  };

  const updatePrivacySettings = async (settings) => {
    try {
      await api.users.updatePrivacy(settings);
      toast.success('Privacy settings updated!');
      return { success: true };
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      toast.error('Failed to update settings');
      return { success: false, error: error.message };
    }
  };

  const deleteAccount = async () => {
    try {
      await api.users.deleteAccount();
      
      clearAllAuthData();
      setUser(null);
      setProfile(null);
      setEmailVerificationStatus({
        isVerified: false,
        isPending: false,
        isSending: false,
      });
      
      toast.success('Account deleted successfully');
      router.push('/');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password, options = {}) => {
    console.log('🔐 === LOGIN ATTEMPT STARTED ===');
    console.log('📧 Email:', email);
    console.log('⚙️ Options:', options);
    
    try {
      const loginPayload = { 
        email, 
        password,
        ...(options.force && { force: true })
      };
      
      console.log('📤 Sending login request to backend...');
      console.log('🔑 Payload (password hidden):', { email, force: options.force || false });
      
      const response = await api.auth.login(loginPayload);
      
      console.log(' Login API response received:', {
        hasAccessToken: !!response.accessToken,
        hasRefreshToken: !!response.refreshToken,
        hasUser: !!response.user,
        userId: response.userId || response.user?.id
      });
      
      let token, userData;
      
      if (response.accessToken) {
        token = response.accessToken;
        setToken(token);
        console.log(' Token stored successfully');
        
        if (response.refreshToken) {
          storeRefreshToken(response.refreshToken);
          console.log(' Refresh token stored');
        }
        
        console.log('👤 Fetching user profile...');
        const profileData = await fetchUserProfile(true);
        
        userData = {
          id: profileData?.id || response.userId || response.user?.id,
          email: profileData?.email || email,
          displayName: profileData?.displayName || profileData?.name || response.user?.name || email.split('@')[0],
          firstName: profileData?.firstName || response.user?.firstName,
          lastName: profileData?.lastName || response.user?.lastName,
          role: profileData?.role || response.user?.role || response.role || 'USER',
          avatarUrl: profileData?.avatarUrl || response.user?.avatarUrl,
          phone: profileData?.phone || response.user?.phone,
          bio: profileData?.bio || response.user?.bio,
          emailVerified: profileData?.emailVerified || response.user?.emailVerified || false,
          createdAt: profileData?.createdAt || new Date().toISOString(),
        };
        
        storeUserData(userData);
        console.log(' User data stored:', { id: userData.id, email: userData.email, emailVerified: userData.emailVerified });
        
        const verificationStatus = {
          isVerified: userData.emailVerified,
          isPending: !userData.emailVerified,
          isSending: false,
        };
        storeEmailVerificationStatus(verificationStatus);
        
        syncCookiesToLocalStorage(token, userData, profileData, verificationStatus);
        
        // Clear any session expiration notifications
        setSessionStatus({
          isExpired: false,
          expiredMessage: '',
          showNotification: false,
          conflictType: null,
        });
        
        if (!userData.emailVerified) {
          console.log('⚠️ Email not verified, requiring verification');
          return { 
            success: true, 
            user: userData,
            profile: profileData,
            token: token,
            emailVerified: userData.emailVerified,
            requiresVerification: true
          };
        } else {
          console.log(' Login successful - email verified');
          toast.success('Login successful!');
          return { 
            success: true, 
            user: userData,
            profile: profileData,
            token: token,
            emailVerified: userData.emailVerified
          };
        }
      } else {
        throw new Error('Invalid login response format - no access token');
      }
    } catch (error) {
      console.log(' === LOGIN ERROR OCCURRED ===');
      console.error('🔴 Full error object:', error);
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error response:', error.response);
      console.error('🔴 Response data:', error.response?.data);
      console.error('🔴 Response status:', error.response?.status);
      console.error('🔴 Response headers:', error.response?.headers);
      
      // Extract detailed error information
      const errorStatus = error.response?.status;
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || error.message || 'Unknown error';
      
      console.log('📊 Error Analysis:', {
        status: errorStatus,
        message: errorMessage,
        fullData: errorData
      });
      
      // Check for session conflict (401 with active session)
      const isSessionConflict = 
        errorStatus === 401 && (
          errorMessage.toLowerCase().includes('already logged in') ||
          errorMessage.toLowerCase().includes('active session') ||
          errorMessage.toLowerCase().includes('session exists') ||
          errorMessage.toLowerCase().includes('logged in elsewhere') ||
          errorMessage.toLowerCase().includes('another device') ||
          errorMessage.toLowerCase().includes('another session') ||
          errorMessage.toLowerCase().includes('multiple sessions') ||
          errorMessage.toLowerCase().includes('session conflict') ||
          errorData?.code === 'SESSION_CONFLICT' ||
          errorData?.type === 'session_conflict'
        );
      
      console.log('🔍 Session conflict detected:', isSessionConflict);
      
      if (isSessionConflict) {
        const conflictMessage = 'Your account is currently logged in on another device or browser. Please log out from the other session first, or click "Force Login" to log out from all other devices and continue here.';
        console.log('⚠️ Returning session conflict response');
        
        // Show persistent toast notification
        toast.warning(conflictMessage, {
          autoClose: 8000, // 8 seconds
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          pauseOnHover: true,
        });
        
        return {
          success: false,
          error: conflictMessage,
          isSessionConflict: true,
          requiresForceLogin: true,
          errorDetails: {
            status: errorStatus,
            originalMessage: errorMessage,
            data: errorData
          }
        };
      }
      
      // Handle other error types
      let finalErrorMessage = 'Login failed. Please check your credentials.';
      let requiresVerification = false;
      let showToast = true;
      let toastDuration = 5000; // 5 seconds minimum
      
      const lowerCaseError = errorMessage.toLowerCase();
      
      // Email verification errors
      if (lowerCaseError.includes('email not verified') || 
          lowerCaseError.includes('verify your email') ||
          lowerCaseError.includes('email verification required') ||
          lowerCaseError.includes('please verify your email')) {
        requiresVerification = true;
        finalErrorMessage = 'Please verify your email before logging in. Check your inbox for the verification email.';
        console.log('⚠️ Email verification required');
        toastDuration = 6000;
        
        toast.error(finalErrorMessage, {
          autoClose: toastDuration,
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          pauseOnHover: true,
        });
      }
      // Invalid credentials
      else if (lowerCaseError.includes('invalid credentials') ||
               lowerCaseError.includes('incorrect password') ||
               lowerCaseError.includes('user not found') ||
               lowerCaseError.includes('invalid email or password') ||
               (errorStatus === 401 && !isSessionConflict)) {
        finalErrorMessage = 'Invalid email or password. Please try again.';
        console.log('❌ Invalid credentials');
        toastDuration = 5000;
        
        toast.error(finalErrorMessage, {
          autoClose: toastDuration,
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          pauseOnHover: true,
        });
      }
      // Account issues
      else if (lowerCaseError.includes('account locked') ||
               lowerCaseError.includes('account suspended') ||
               lowerCaseError.includes('account disabled') ||
               lowerCaseError.includes('account banned')) {
        finalErrorMessage = 'Your account has been locked or suspended. Please contact support.';
        console.log('🔒 Account locked/suspended');
        toastDuration = 7000;
        
        toast.error(finalErrorMessage, {
          autoClose: toastDuration,
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          pauseOnHover: true,
        });
      }
      // Session expired - SPECIAL HANDLING WITH PERSISTENT TOAST
      else if (lowerCaseError.includes('session expired') || 
               lowerCaseError.includes('token expired') ||
               errorMessage === 'SESSION_EXPIRED_CONFLICT') {
        clearLocalStorage();
        finalErrorMessage = '⚠️ Your session has expired. Please login again or switch to another account.';
        console.log('⏰ Session expired - showing persistent notification');
        toastDuration = 8000; // 8 seconds for session expired
        
        // Show prominent error toast with longer duration
        toast.error(finalErrorMessage, {
          autoClose: toastDuration,
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          pauseOnHover: true,
          position: 'top-center', // More prominent position
          style: {
            fontSize: '16px',
            padding: '16px',
            minWidth: '400px'
          }
        });
        
        // Also show our custom notification for better UX
        showSessionExpiredNotification(
          'Your session has expired because you logged in on another device.',
          'device'
        );
      }
      // Network errors
      else if (lowerCaseError.includes('network error') ||
               lowerCaseError.includes('failed to fetch') ||
               error.code === 'ERR_NETWORK') {
        finalErrorMessage = 'Cannot connect to server. Please check your internet connection.';
        console.log('🌐 Network error');
        toastDuration = 6000;
        
        toast.error(finalErrorMessage, {
          autoClose: toastDuration,
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          pauseOnHover: true,
        });
      }
      // Server errors
      else if (errorStatus >= 500) {
        finalErrorMessage = 'Server error. Please try again later.';
        console.log('🖥️ Server error');
        toastDuration = 5000;
        
        toast.error(finalErrorMessage, {
          autoClose: toastDuration,
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          pauseOnHover: true,
        });
      }
      // Use original message if available
      else if (errorMessage && errorMessage !== 'Unknown error') {
        finalErrorMessage = errorMessage;
        console.log('💬 Using original error message');
        toastDuration = 5000;
        
        toast.error(finalErrorMessage, {
          autoClose: toastDuration,
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          pauseOnHover: true,
        });
      } else {
        // Generic error with default toast
        toast.error(finalErrorMessage, {
          autoClose: toastDuration,
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          pauseOnHover: true,
        });
      }
      
      console.log('📤 Final error response:', {
        success: false,
        error: finalErrorMessage,
        requiresVerification,
        isSessionConflict,
        errorStatus,
        toastDuration
      });
      
      return { 
        success: false, 
        error: finalErrorMessage,
        requiresVerification: requiresVerification,
        isSessionConflict: isSessionConflict,
        errorStatus: errorStatus,
        errorDetails: {
          originalMessage: errorMessage,
          data: errorData
        }
      };
    }
  };

  const isValidPhone = (phone) => {
    if (!phone || phone.trim() === '') return false;
    
    const cleanPhone = phone.trim();
    
    if (!cleanPhone.startsWith('+')) return false;
    
    const digitsOnly = cleanPhone.substring(1).replace(/[^\d]/g, '');
    
    return digitsOnly.length >= 6 && digitsOnly.length <= 15;
  };

  const signup = async (userData) => {
    try {
      const cleanUserData = {
        email: userData.email?.trim().toLowerCase() || '',
        password: userData.password || '',
        displayName: userData.displayName?.trim() || '',
        ...(userData.firstName?.trim() && { firstName: userData.firstName.trim() }),
        ...(userData.lastName?.trim() && { lastName: userData.lastName.trim() }),
        ...(userData.bio?.trim() && { bio: userData.bio.trim() }),
        ...(userData.phone && userData.phone.trim() !== '' && isValidPhone(userData.phone) && { 
          phone: userData.phone.trim() 
        }),
        ...(userData.country?.trim() && { country: userData.country.trim() }),
        ...(userData.region?.trim() && { region: userData.region.trim() }),
        ...(userData.city?.trim() && { city: userData.city.trim() }),
      };

      console.log('Sending user data to backend:', cleanUserData);

      const response = await api.auth.register(cleanUserData);
      
      console.log('Signup response:', response);
      
      const tempUserData = {
        id: response.userId || 'temp',
        email: userData.email,
        displayName: userData.displayName || '',
        emailVerified: false,
        createdAt: new Date().toISOString(),
      };
      
      const verificationStatus = {
        isVerified: false,
        isPending: true,
        isSending: false,
      };
      
      setAuthCookie('scamalert_user', tempUserData);
      setAuthCookie('scamalert_email_verified', verificationStatus);
      localStorage.setItem('scamalert_user', JSON.stringify(tempUserData));
      localStorage.setItem('scamalert_email_verified', JSON.stringify(verificationStatus));
      
      setUser(tempUserData);
      setEmailVerificationStatus(verificationStatus);
      
      toast.success('Account created! Please check your email to verify your account.');
      
      return { 
        success: true, 
        data: response,
        redirectTo: `/auth/verify-email?status=pending&email=${encodeURIComponent(userData.email)}`
      };
    } catch (error) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Signup failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      clearAllAuthData();
      
      setUser(null);
      setProfile(null);
      setEmailVerificationStatus({
        isVerified: false,
        isPending: false,
        isSending: false,
      });
      
      // Clear session status
      setSessionStatus({
        isExpired: false,
        expiredMessage: '',
        showNotification: false,
        conflictType: null,
      });
      
      toast.info('Logged out successfully');
      router.push('/auth/login');
    }
  };

  const updateProfile = async (profileData) => {
    return updateUserProfile(profileData);
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      return await changePassword(currentPassword, newPassword, newPassword);
    } catch (error) {
      console.error('Update password error:', error);
      
      let errorMessage = 'Failed to update password';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const getCurrentProfile = async (forceRefresh = false) => {
    try {
      const profileData = await fetchUserProfile(forceRefresh);
      return profileData;
    } catch (error) {
      console.error('Get current profile error:', error);
      return profile || null;
    }
  };

  const checkAuth = () => {
    const token = getToken();
    const userData = getAuthCookie('scamalert_user') || user;
    return !!token && !!userData;
  };

  const refreshSession = async () => {
    try {
      await fetchUserProfile(true);
      return true;
    } catch (error) {
      console.error('Refresh session error:', error);
      return false;
    }
  };

  const testProfileEndpoint = async () => {
    try {
      console.log('Testing profile endpoint...');
      const response = await api.auth.getMe();
      console.log('Profile endpoint test success:', response);
      return { success: true, data: response };
    } catch (error) {
      console.error('Profile endpoint test failed:', error);
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status
      };
    }
  };

  const testGroupAPI = async () => {
    try {
      console.log('Testing group API with auth...');
      const result = await api.testGroupEndpoints();
      return result;
    } catch (error) {
      console.error('Group API test failed:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        
        emailVerificationStatus,
        isEmailVerified: emailVerificationStatus.isVerified,
        isEmailVerificationPending: emailVerificationStatus.isPending,
        isSendingVerificationEmail: emailVerificationStatus.isSending,
        
        // Session status
        sessionStatus,
        showSessionExpiredNotification,
        dismissSessionNotification,
        handleSessionExpiredAction,
        
        login,
        signup,
        logout,
        updateProfile,
        updatePassword,
        
        updateUserProfile,
        uploadProfileImage,
        updateNotificationSettings,
        updatePrivacySettings,
        deleteAccount,
        getCurrentProfile,
        fetchUserProfile,
        
        sendVerificationEmail,
        verifyEmail,
        checkEmailVerification,
        
        requestPasswordReset,
        resetPassword,
        changePassword,
        
        refreshSession,
        testProfileEndpoint,
        testGroupAPI,
        isValidPhone,
        
        isAuthenticated: checkAuth(),
        getToken,
        
        api,
        
        checkAuth,
        storeUserData,
        storeProfileData,
        clearLocalStorage,
        setToken,
        
        getAuthCookie,
        setAuthCookie,
        removeAuthCookie,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};