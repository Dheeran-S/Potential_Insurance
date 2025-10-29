
import type React from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Clock, Lock } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:from-black dark:via-gray-950 dark:to-black dark:bg-gradient-to-br">
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-10 px-6 py-4">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-teal-500 dark:text-teal-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Potential</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen pt-24 pb-20">
        <div className="w-full px-6 lg:px-12">
          <div className="text-center w-full">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-gray-200 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-gray-300 dark:border-gray-700">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Trusted by 50,000+ customers</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
              Insurance Made
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-teal-400 dark:to-cyan-400">
                Simple & Secure
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Experience the future of insurance management. Our AI-powered platform makes filing claims faster, tracking easier, and peace of mind guaranteed.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/login"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-teal-600 rounded-xl shadow-lg hover:shadow-xl hover:bg-teal-700 hover:scale-105 transition-all duration-300"
              >
                Get Started
              </Link>
              <button className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-300 dark:text-gray-200 bg-transparent rounded-xl hover:scale-105 transition-all duration-300 border border-gray-700 hover:bg-gray-800 hover:text-white">
                Learn More
              </button>
            </div>

            {/* Features Grid */}
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full px-6 lg:px-12">
              <div className="bg-white/5 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-800">
                <div className="bg-teal-500/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Fast Processing</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Claims processed in 24 hours or less with AI assistance</p>
              </div>

              <div className="bg-white/5 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-800">
                <div className="bg-teal-500/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Bank-Level Security</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Your data is encrypted and protected 24/7</p>
              </div>

              <div className="bg-white/5 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-800">
                <div className="bg-teal-500/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Real-Time Updates</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Track your claim status every step of the way</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                © {new Date().getFullYear()} Potential Insurance Inc. All rights reserved.
              </span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
