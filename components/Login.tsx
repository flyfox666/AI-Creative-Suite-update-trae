
import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';

const Login: React.FC = () => {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    if (!email) {
      setError('Please enter an email address.');
      setIsLoading(false);
      return;
    }

    const success = await login(email);
    
    if (!success) {
      setError('An error occurred during login. Please try again.');
      setIsLoading(false);
    }
    // On success, the App component will automatically re-render the main content.
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-8 border border-gray-700">
        <div className="text-center">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">
                Welcome to AI Creative Suite
            </h1>
            <p className="mt-2 text-gray-400">
                Please sign in to continue.
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 text-gray-200 placeholder-gray-500"
              placeholder="Email address"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-900 border border-gray-700 rounded-lg text-sm">
            <h4 className="font-semibold text-gray-300">Getting Started:</h4>
            <p className="mt-2 text-gray-400">
                Enter any email to start with a free account. Your credits and plan will be saved in this browser.
            </p>
            <p className="mt-3 text-xs text-gray-500">You can use the 'Upgrade' button inside the app to test the PRO access code functionality.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;