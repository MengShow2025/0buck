import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { usePreferenceContext } from '../../VCC/contexts/PreferenceContext';
import { useSessionContext } from '../../VCC/contexts/SessionContext';
import { authApi } from '../../../services/api';

export const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
    const { refreshUser, setUser } = useSessionContext();
  const { t } = usePreferenceContext();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // The backend expects JSON for login_v46
      const payload = {
        email: email,
        password: password
      };

      const res = await authApi.login(payload);
      if (res.data?.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        
        if (res.data.user) {
          setUser(res.data.user);
        } else {
          // Fallback if user is not in response
          try {
              await refreshUser();
          } catch (meErr) {
              console.error("Failed to fetch user details after login", meErr);
          }
        }
        
        // Redirect to where they came from, or /admin
        const from = location.state?.from?.pathname || "/admin";
        navigate(from, { replace: true });
      } else {
        setError('Invalid credentials');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Handle Pydantic validation error array
        setError(detail.map(d => d.msg).join(', '));
      } else {
        setError(typeof detail === 'string' ? detail : 'Login failed. Check credentials or server connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          0Buck 平台管理后台
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 font-bold">
          请使用您的管理员凭证登录
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm font-bold">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-gray-700">邮箱地址</label>
              <div className="mt-1">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  placeholder="admin@0buck.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">密码</label>
              <div className="mt-1">
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full font-bold" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};