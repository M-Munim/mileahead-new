'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '../../components/Toast';
import { driverService } from '../../../utils/axiosInstance';
import { useAuth, ROLES, ROLE_NAMES } from '../../contexts/AuthContext';
import Link from "next/link";
import { UserPlus, User, Mail, Phone, Lock, Shield } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s-]{7,15}$/;

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_name: ROLES.MANAGER,
    firstname: '',
    lastname: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstname.trim()) newErrors.firstname = 'First name is required';
    if (!formData.lastname.trim()) newErrors.lastname = 'Last name is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!PHONE_REGEX.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (formData.role_name !== ROLES.MANAGER) {
      newErrors.role_name = 'Only Manager accounts can be created here';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const registrationData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role_name: ROLES.MANAGER,
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        phone: formData.phone.trim()
      };

      await driverService.register(registrationData);

      setToast({
        message: 'Account created successfully!',
        type: 'success'
      });

      setTimeout(() => {
        router.push('/auth/login');
      }, 800);
    } catch (error) {
      setToast({
        message: error.message || 'Signup failed. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (id, label, icon, type = 'text', props = {}) => {
    const IconComponent = icon;
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
        <div className="relative">
          <IconComponent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            id={id}
            name={id}
            type={type}
            required
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 text-gray-900 text-sm placeholder-gray-400 transition-all"
            value={formData[id]}
            onChange={handleChange}
            aria-invalid={!!errors[id]}
            aria-describedby={errors[id] ? `${id}-error` : undefined}
            {...props}
          />
        </div>
        {errors[id] && (
          <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
            {errors[id]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <UserPlus className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Join Miles Ahead and get started
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white shadow-xl p-7">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Name Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField('firstname', 'First Name', User, 'text', { placeholder: 'First Name' })}
              {renderField('lastname', 'Last Name', User, 'text', { placeholder: 'Last Name' })}
            </div>

            {renderField('username', 'Username', User, 'text', { placeholder: 'Choose a username' })}
            {renderField('email', 'Email Address', Mail, 'email', { placeholder: 'you@example.com', autoComplete: 'email' })}
            {renderField('phone', 'Phone Number', Phone, 'tel', { placeholder: '+974 XXXX XXXX' })}

            {/* Role — fixed. Admin accounts are provisioned by the developer only. */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1.5">
                Role
              </span>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <div className="w-full pl-10 pr-4 py-2.5 border border-gray-300 bg-gray-50 text-gray-900 text-sm">
                  {ROLE_NAMES[ROLES.MANAGER]}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Sign-up creates a Manager account. Admin accounts are provisioned by the
                developer and cannot be self-registered.
              </p>
              {errors.role_name && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.role_name}
                </p>
              )}
            </div>

            {renderField('password', 'Password', Lock, 'password', {
              placeholder: 'Create a strong password (min 8 chars)',
              autoComplete: 'new-password'
            })}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-medium text-white bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:from-[var(--primary-hover)] hover:to-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center border-t border-gray-100 pt-5">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
                Sign in
              </Link>
            </p>
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
