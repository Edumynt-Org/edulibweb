import React, { useState } from 'react';
import Link from 'next/link';

interface RegistrationFormProps {
  onSubmit?: (data: any) => void;
}

export default function RegistrationForm({ onSubmit }: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName) newErrors.firstName = 'Required';
    if (!formData.lastName) newErrors.lastName = 'Required';
    if (!formData.email) newErrors.email = 'Required';
    if (!formData.password) newErrors.password = 'Required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
      <div className="flex flex-row gap-4">
        <div className="flex flex-col gap-1.5 w-1/2">
          <label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
          <input 
            id="firstName" 
            name="firstName" 
            type="text" 
            value={formData.firstName} 
            onChange={handleChange} 
            className="border p-2.5 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="John"
          />
          {errors.firstName && <span className="text-red-500 text-xs">{errors.firstName}</span>}
        </div>
        
        <div className="flex flex-col gap-1.5 w-1/2">
          <label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
          <input 
            id="lastName" 
            name="lastName" 
            type="text" 
            value={formData.lastName} 
            onChange={handleChange} 
            className="border p-2.5 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="Doe"
          />
          {errors.lastName && <span className="text-red-500 text-xs">{errors.lastName}</span>}
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
        <input 
          id="email" 
          name="email" 
          type="email" 
          value={formData.email} 
          onChange={handleChange} 
          className="border p-2.5 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="you@example.com"
        />
        {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
      </div>
      
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
        <input 
          id="password" 
          name="password" 
          type="password" 
          value={formData.password} 
          onChange={handleChange} 
          className="border p-2.5 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="••••••••"
        />
        {errors.password && <span className="text-red-500 text-xs">{errors.password}</span>}
      </div>
      
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-3 rounded-lg mt-2 transition-colors shadow-sm">
        Create Account
      </button>

      <div className="text-center pt-2">
        <span className="text-gray-500 text-sm">Already have an account? </span>
        <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500 font-medium hover:underline">
          Sign In
        </Link>
      </div>
    </form>
  );
}
