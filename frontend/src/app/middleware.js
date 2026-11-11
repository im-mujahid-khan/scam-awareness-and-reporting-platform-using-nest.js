// src/middleware.js (updated with immediate redirects)
import { NextResponse } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/phone-verify',
  '/auth/callback',
  '/auth/verify-email',
  '/search',
  '/companies/[id]',
];

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/dashboard/groups',
  '/dashboard/posts',
  '/dashboard/posts/create',
  '/dashboard/posts/edit',
  '/dashboard/posts/view',
  '/dashboard/groups/create',
  '/dashboard/groups/discover',
  '/dashboard/groups/moderation',
  '/profile',
  '/report',
  '/companies/create',
  '/companies/me',
  '/feed',
  '/notifications',
];

// Routes that need email verification
const emailVerificationRoutes = [
  '/dashboard',
  '/dashboard/groups',
  '/dashboard/posts',
  '/profile',
  '/report',
  '/companies/create',
];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log request details in development
  if (isDevelopment) {
    console.log('🛡️ Middleware triggered for:', pathname);
  }

  // Helper to check if route matches pattern
  const matchesRoute = (route, currentPath) => {
    // Exact match
    if (route === currentPath) return true;
    
    // Check if route is a prefix (for nested routes)
    if (currentPath.startsWith(route + '/')) return true;
    
    // Handle dynamic routes like /dashboard/posts/[id]
    if (route.includes('/[id]')) {
      const routePattern = route.replace('/[id]', '/');
      return currentPath.startsWith(routePattern);
    }
    
    // Handle dashboard sub-routes
    if (route.includes('dashboard/') && currentPath.includes('dashboard/')) {
      const routeBase = route.replace('/[id]', '');
      return currentPath.startsWith(routeBase);
    }
    
    return false;
  };

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => matchesRoute(route, pathname));

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => matchesRoute(route, pathname));

  // Get auth tokens from cookies
  const token = request.cookies.get('scamalert_token')?.value;
  const userDataCookie = request.cookies.get('scamalert_user')?.value;

  // Debug logging
  if (isDevelopment) {
    console.log('🔍 Middleware check:');
    console.log('  Path:', pathname);
    console.log('  Is Public Route:', isPublicRoute);
    console.log('  Is Protected Route:', isProtectedRoute);
    console.log('  Token exists:', !!token);
    console.log('  User data cookie exists:', !!userDataCookie);
  }

  // Parse user data if available
  let user = null;
  let isEmailVerified = false;
  
  if (userDataCookie) {
    try {
      user = JSON.parse(userDataCookie);
      isEmailVerified = user?.emailVerified || false;
      if (isDevelopment) {
        console.log('  User data:', { email: user?.email, emailVerified: isEmailVerified });
      }
    } catch (error) {
      console.error('❌ Error parsing user data cookie:', error);
    }
  }

  // Handle home page
  if (pathname === '/') {
    if (!token || !user) {
      // User not logged in - stay on home page
      return NextResponse.next();
    } else {
      // User is logged in - redirect to dashboard
      const url = new URL('/dashboard', request.url);
      return NextResponse.redirect(url);
    }
  }

  // Handle public routes
  if (isPublicRoute) {
    // If user is logged in and tries to access auth pages, redirect to dashboard
    if ((pathname.includes('/auth/login') || pathname.includes('/auth/signup')) && token && user) {
      const url = new URL('/dashboard', request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Handle protected routes - IMMEDIATE REDIRECT if not authenticated
  if (isProtectedRoute) {
    // Check if user is authenticated
    if (!token || !user) {
      if (isDevelopment) {
        console.log('🚫 Access denied - redirecting to login IMMEDIATELY');
        console.log('  Token:', token ? 'Exists' : 'Missing');
        console.log('  User:', user ? 'Exists' : 'Missing');
      }
      
      // IMMEDIATE redirect to login with return URL
      const url = new URL('/auth/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      const response = NextResponse.redirect(url);
      
      // Set cache headers to prevent caching of protected pages
      response.headers.set('Cache-Control', 'no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    }

    // Check if email is verified for routes that require it
    const needsEmailVerification = emailVerificationRoutes.some(route => 
      matchesRoute(route, pathname)
    );

    if (needsEmailVerification && !isEmailVerified) {
      if (isDevelopment) {
        console.log('📧 Email verification required - redirecting');
      }
      
      // Redirect to email verification page
      const url = new URL('/auth/verify-email', request.url);
      url.searchParams.set('status', 'pending');
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }

    if (isDevelopment) {
      console.log(' Access granted to protected route');
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files (like videos, images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|videos|images).*)',
  ],
};