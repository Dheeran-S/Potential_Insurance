import { useState } from "react";
import type React from "react";
import { useAppContext } from "../hooks/useAppContext";
import { UserRole } from "../types";
import { ShieldCheckIcon, UserCircleIcon } from "../components/icons";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { login } = useAppContext();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email);
    if (!success) {
      setError("Invalid credentials. Please try again.");
    }
  };

  const setCredentials = (role: UserRole) => {
    setSelectedRole(role);
    if (role === UserRole.CUSTOMER) {
      setEmail("customer@example.com");
    } else {
      setEmail("approver@example.com");
    }
    setError("");
  };

  return (
    <div className="min-h-screen w-screen bg-gray-100 dark:bg-black grid place-items-center px-4 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-teal-500" />
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Select a role to get started.
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-4">
          {/* Customer Role */}
          <button
            onClick={() => setCredentials(UserRole.CUSTOMER)}
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${
              selectedRole === UserRole.CUSTOMER
                ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
            }`}
          >
            <UserCircleIcon className="w-8 h-8 mb-2 text-gray-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              Customer
            </span>
          </button>

          {/* Approver Role */}
          <button
            onClick={() => setCredentials(UserRole.APPROVER)}
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${
              selectedRole === UserRole.APPROVER
                ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
            }`}
          >
            <ShieldCheckIcon className="w-8 h-8 mb-2 text-gray-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              Approver
            </span>
          </button>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg px-8 pt-6 pb-8 space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-md py-2 px-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
          </div>

          {error && <p className="text-red-500 text-sm italic">{error}</p>}

          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition"
          >
            Sign In
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-4">
          &copy; {new Date().getFullYear()} Potential Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;