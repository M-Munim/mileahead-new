'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '../../components/Toast';
import { driverService } from '../../../utils/axiosInstance';
import { useAuth, ROLES, ROLE_NAMES, isDashboardRole } from '../../contexts/AuthContext';
import Link from "next/link";
import NextImage from 'next/image';
import { Shield, UserCog } from 'lucide-react';
import emblem from '../../../public/magic-track-emblem.png';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    role: ROLES.ADMIN
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  const roleConfig = {
    [ROLES.ADMIN]: {
      icon: Shield,
      color: 'from-[var(--primary)] to-[var(--primary-dark)]',
      bgColor: 'bg-orange-50',
      borderColor: 'border-[var(--primary)]',
      textColor: 'text-orange-800',
      description: 'Admin account'
    },
    [ROLES.MANAGER]: {
      icon: UserCog,
      color: 'from-neutral-700 to-neutral-900',
      bgColor: 'bg-gray-50',
      borderColor: 'border-neutral-800',
      textColor: 'text-neutral-900',
      description: 'Manager account'
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Username or email is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const loginData = {
        identifier: formData.identifier.trim(),
        password: formData.password
      };

      const response = await driverService.login(loginData);

      // The account's real role comes from the server. The card the user picked
      // is presentational only and must never grant privilege: if the API omits
      // the role we fall back to Manager (least privilege), never to Admin.
      const accountRole = response.data.user?.role || ROLES.MANAGER;

      // Driver accounts (chauffeurs / pddriver) have no access to this panel.
      if (!isDashboardRole(accountRole)) {
        setToast({
          message: 'This account does not have dashboard access. Please sign in with an Admin or Manager account.',
          type: 'error'
        });
        return;
      }

      if (response.data.token) {
        const userData = {
          username: response.data.user?.username || formData.identifier,
          email: response.data.user?.email || response.data.email || formData.identifier,
          role: accountRole
        };

        login(response.data.token, userData, accountRole);
      }

      setToast({
        message: `Login successful as ${ROLE_NAMES[accountRole]}!`,
        type: 'success'
      });

      setTimeout(() => {
        router.push('/orders');
      }, 800);
    } catch (error) {
      setToast({
        message: error.message || 'Login failed. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="text-center">
          <NextImage
            src={emblem}
            alt="Magic Track — Car Wash & Auto Care"
            className="mx-auto w-40 h-40 rounded-full mb-4 shadow-lg"
            priority
          />
          <h1 className="text-2xl font-bold text-gray-900">
            Sign in to Magic Track
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Select your role and enter your credentials
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* Role Selection */}
            <fieldset>
              <legend className="block text-sm font-semibold text-gray-900 mb-4">
                Select Your Role
              </legend>
              <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Select your role">
                {Object.entries(roleConfig).map(([roleKey, config]) => {
                  const IconComponent = config.icon;
                  const isSelected = formData.role === roleKey;

                  return (
                    <button
                      key={roleKey}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setFormData(prev => ({ ...prev, role: roleKey }))}
                      className={`relative p-4 border-2 transition-all duration-200 ${
                        isSelected
                          ? `${config.borderColor} ${config.bgColor} shadow-md scale-[1.02]`
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                          <IconComponent className="w-6 h-6 text-white" aria-hidden="true" />
                        </div>
                        <div>
                          <div className={`font-semibold ${isSelected ? config.textColor : 'text-gray-900'}`}>
                            {ROLE_NAMES[roleKey]}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {config.description}
                          </div>
                        </div>
                        {isSelected && (
                          <div className={`absolute top-2 right-2 w-5 h-5 rounded-full ${config.color} bg-gradient-to-br flex items-center justify-center`}>
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Credentials */}
            <div className="space-y-4">
              <div>
                <label htmlFor="identifier">
                  Username or Email
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Enter your username or email"
                  value={formData.identifier}
                  onChange={handleChange}
                  aria-invalid={!!errors.identifier}
                  aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                />
                {errors.identifier && (
                  <p id="identifier-error" className="mt-1 text-xs text-red-600" role="alert">
                    {errors.identifier}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="mt-1 text-xs text-red-600" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--primary)] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]">
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-medium text-white bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:from-[var(--primary-hover)] hover:to-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in as {ROLE_NAMES[formData.role]}</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Role Info */}
        <div className="bg-white shadow-sm p-4">
          <div className="text-center text-xs text-gray-500">
            <p>Selected Role: <span className="font-semibold text-[var(--primary)]">{ROLE_NAMES[formData.role]}</span></p>
            <p className="mt-1">{roleConfig[formData.role].description}</p>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
