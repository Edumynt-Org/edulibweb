import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import RegistrationForm from '../../src/app/register/RegistrationForm';

describe('RegistrationForm', () => {
  it('renders all required fields', () => {
    render(<RegistrationForm />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    render(<RegistrationForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Full Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Username is required/i)).toBeInTheDocument();
    });
  });

  it('calls onSubmit with correct values when form is valid', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<RegistrationForm onSubmit={handleSubmit} />);
    
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.type(screen.getByLabelText(/Full Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Username/i), 'testuser');
    
    await user.click(screen.getByRole('button', { name: /Register/i }));
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        username: 'testuser',
      });
    });
  });
});
