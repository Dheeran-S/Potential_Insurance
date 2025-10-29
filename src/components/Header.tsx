
import type React from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { LogOutIcon, UserCircleIcon, ShieldCheckIcon, HomeIcon } from './icons';
import { UserRole } from '../types';

const Header: React.FC = () => {
  const { user, logout } = useAppContext();

  const getDashboardLink = () => {
    if (!user) return "/";
    return user.role === UserRole.CUSTOMER ? "/customer/dashboard" : "/approver/dashboard";
  }

  return (
    <header className="bg-white/90 dark:bg-black/90 backdrop-blur-md sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between w-full">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to={getDashboardLink()} 
              className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white transition-opacity hover:opacity-80"
            >
              <ShieldCheckIcon className="h-8 w-8 text-teal-500 dark:text-teal-400" />
              <span className="text-gray-800 dark:text-white">Potential</span>
            </Link>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* User Info */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <UserCircleIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  <div className="hidden sm:block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.name}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {user.role}
                    </p>
                  </div>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <LogOutIcon className="h-4 w-4" />
                  <span className="hidden sm:block">Logout</span>
                </button>
              </>
            ) : (
              <Link 
                to="/" 
                className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <HomeIcon className="h-4 w-4" />
                Home
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
