import React, { useState } from 'react';
import { InventoryService } from '../../services/storageService';
import { User as UserIcon, Lock, ArrowRight, Clock, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../../types/inventory';

interface LoginViewProps {
  onLogin: (user: any) => void;
  sessionExpiredMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, sessionExpiredMessage }) => {
  const service = InventoryService.getInstance();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Silakan isi username dan password Anda.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Username atau password salah.');
      }

      // Pastikan data role dari DB dipetakan ke UserRole frontend
      const user = {
        ...data,
        role: data.role as UserRole
      };

      service.currentUser = user;
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* White Card for Logo & Login */}
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-200 flex flex-col items-center">
          {/* Exact Jet Cyber Network Logo */}
          <div className="mb-6 flex flex-col items-center">
            <img 
              src="/jetcyber-logo.svg" 
              alt="Jet Cyber Network - Reach Without Limits" 
              className="w-56 h-auto object-contain select-none"
            />
          </div>

          {/* Form Header */}
          <div className="w-full border-t border-slate-100 pt-5 pb-2">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight text-center">
              Sistem Inventory & Gudang
            </h2>
            <p className="text-xs text-slate-500 text-center mt-0.5">
              Silakan login dengan kredensial akun Anda
            </p>
          </div>

          {/* Form */}
          <form className="w-full space-y-4 mt-2" onSubmit={handleLogin}>
            {sessionExpiredMessage && !error && (
              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-medium flex items-start gap-2 shadow-2xs">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{sessionExpiredMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs text-center font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700">
                Username
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="appearance-none block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="appearance-none block w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
