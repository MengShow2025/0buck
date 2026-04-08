import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { useQuery } from '@tanstack/react-query';

const BindingView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthorized'>('loading');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');

  // v5.7.12: Use global auth query instead of props for router compatibility
  const { data: authData, isLoading: isAuthLoading, isFetched: isAuthFetched } = useQuery<any>({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const url = getApiUrl('/v1/auth/me');
        const response = await axios.get(url);
        return response.data;
      } catch (e) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const isAuthenticated = !!authData?.user;

  useEffect(() => {
    // v5.7.16: Wait for fetch to complete before determining auth status
    if (isAuthLoading || !isAuthFetched) return;

    const params = new URLSearchParams(location.search);
    const platform = params.get('platform');
    const uid = params.get('uid');
    const sig = params.get('sig');

    if (!platform || !uid || !sig) {
      setStatus('error');
      setMessage('无效的绑定链接。请从飞书机器人重新获取。');
      return;
    }

    if (!isAuthenticated) {
      setStatus('unauthorized');
      return;
    }

    // If authenticated, perform the binding automatically
    const performBinding = async () => {
      try {
        const url = getApiUrl(`/v1/im/bind?platform=${platform}&uid=${uid}&sig=${sig}`);
        const response = await axios.get(url);
        
        if (response.data.status === 'success' || response.data.status === 'already_bound') {
          setStatus('success');
          setMessage(response.data.message);
          setUserName(response.data.user_name || '');
          
          // Auto redirect after success
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.data.message || '绑定失败，请稍后重试。');
        }
      } catch (err: any) {
        console.error('Binding error:', err);
        setStatus('error');
        setMessage(err.response?.data?.detail || '服务器连接失败，请检查网络。');
      }
    };

    performBinding();
  }, [location.search, isAuthenticated, isAuthLoading, navigate]);

  const handleLoginClick = () => {
    // v5.7.14: Support both modal login and redirect login
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    window.location.href = `/login?redirect=${returnUrl}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-full max-w-md p-8 rounded-3xl bg-surface-container border border-outline-variant shadow-xl">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <LinkIcon size={40} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-on-surface mb-2">身份桥接</h2>
        <p className="text-on-surface-variant mb-8">
          正在将您的 0Buck 账号与第三方平台进行安全关联
        </p>

        {(status === 'loading' || isAuthLoading) && (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <p className="text-primary font-medium">正在验证身份并同步数据...</p>
          </div>
        )}

        {!isAuthLoading && status === 'success' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-4"
          >
            <CheckCircle2 className="text-success mb-4" size={64} />
            <h3 className="text-xl font-bold text-on-surface mb-2">绑定成功！</h3>
            <p className="text-on-surface-variant mb-6">
              {userName ? `${userName}，` : ''}您的账号已成功关联。现在您可以回到飞书直接与智脑对话了。
            </p>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-full bg-primary text-on-primary font-bold hover:brightness-110 transition-all"
            >
              进入 0Buck 控制台
            </button>
          </motion.div>
        )}

        {!isAuthLoading && status === 'error' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-4"
          >
            <XCircle className="text-error mb-4" size={64} />
            <h3 className="text-xl font-bold text-on-surface mb-2">绑定失败</h3>
            <p className="text-error mb-6 font-medium">{message}</p>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-full bg-outline-variant text-on-surface font-bold hover:bg-outline transition-all"
            >
              返回首页
            </button>
          </motion.div>
        )}

        {!isAuthLoading && status === 'unauthorized' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-4"
          >
            <div className="p-4 rounded-2xl bg-primary/5 mb-6 text-left border border-primary/10">
              <p className="text-on-surface-variant text-sm leading-relaxed">
                为了确保您的数据安全，请先登录您的 0Buck 账号。登录后系统将自动为您完成关联。
              </p>
            </div>
            <button 
              onClick={handleLoginClick}
              className="w-full py-4 rounded-full bg-primary text-on-primary font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              立即登录并绑定
            </button>
          </motion.div>
        )}
      </div>
      
      <p className="mt-8 text-xs text-on-surface-variant opacity-50">
        0Buck Secure Identity Protocol v5.7.12
      </p>
    </div>
  );
};

export default BindingView;
