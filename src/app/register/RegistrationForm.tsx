import React, { useState } from 'react';

interface RegistrationFormProps {
  onSubmit?: (data: any) => void;
}

export default function RegistrationForm({ onSubmit }: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    username: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.fullName) newErrors.fullName = 'Full Name is required';
    if (!formData.username) newErrors.username = 'Username is required';
    
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="email">Email</label>
        <input 
          id="email" 
          name="email" 
          type="email" 
          value={formData.email} 
          onChange={handleChange} 
          className="border p-2 rounded"
        />
        {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
      </div>
      
      <div className="flex flex-col gap-1">
        <label htmlFor="password">Password</label>
        <input 
          id="password" 
          name="password" 
          type="password" 
          value={formData.password} 
          onChange={handleChange} 
          className="border p-2 rounded"
        />
        {errors.password && <span className="text-red-500 text-sm">{errors.password}</span>}
      </div>
      
      <div className="flex flex-col gap-1">
        <label htmlFor="fullName">Full Name</label>
        <input 
          id="fullName" 
          name="fullName" 
          type="text" 
          value={formData.fullName} 
          onChange={handleChange} 
          className="border p-2 rounded"
        />
        {errors.fullName && <span className="text-red-500 text-sm">{errors.fullName}</span>}
      </div>
      
      <div className="flex flex-col gap-1">
        <label htmlFor="username">Username</label>
        <input 
          id="username" 
          name="username" 
          type="text" 
          value={formData.username} 
          onChange={handleChange} 
          className="border p-2 rounded"
        />
        {errors.username && <span className="text-red-500 text-sm">{errors.username}</span>}
      </div>
      
      <button type="submit" className="bg-blue-600 text-white p-2 rounded mt-2 hover:bg-blue-700">
        Register
      </button>
    </form>
  );
}
