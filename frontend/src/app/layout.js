// src/app/layout.js - FIXED VERSION
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { Inter } from 'next/font/google';
import Providers from '../../components/Providers'; // ✅ This handles both Auth and Notification
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../../components/layout/Header'; 
import WebSocketDebugger from '../../components/WebSocketDebugger';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Scam Awareness & Reporting App',
  description: 'Report, search, and stay safe from online scams',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} d-flex flex-column min-vh-100`}>
        {/* ✅ ONLY USE Providers - it contains both AuthProvider and NotificationProvider */}
        <Providers>
          <Header />
          <main className="flex-grow-1">
            {children}
            <WebSocketDebugger />
          </main>
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </Providers>
      </body>
    </html>
  );
}