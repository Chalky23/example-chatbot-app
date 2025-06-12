"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';

export default function AuthForm({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState('idle');
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [setPasswordStatus, setSetPasswordStatus] = useState('idle');
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // Detect password recovery session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        setShowSetPassword(true);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    let result;
    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
    }
    if (result.error) {
      setError(result.error.message);
    } else {
      if (!isLogin && !result.data.session) {
        setSignUpSuccess(true);
      } else {
        onAuth(result.data.session);
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetStatus('loading');
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
    if (error) {
      setResetStatus('error');
      setError(error.message);
    } else {
      setResetStatus('success');
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setSetPasswordStatus('loading');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setSetPasswordStatus('error');
      setError(error.message);
    } else {
      setSetPasswordStatus('success');
    }
  };

  if (showSetPassword) {
    return (
      <div className="auth-form">
        <h2>Set New Password</h2>
        <form onSubmit={handleSetPassword}>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={setPasswordStatus==='loading'}>
            {setPasswordStatus==='loading' ? 'Setting...' : 'Set Password'}
          </button>
        </form>
        {setPasswordStatus==='success' && <div className="auth-success">Password updated! You can now log in.</div>}
        {setPasswordStatus==='error' && <div className="auth-error">{error}</div>}
      </div>
    );
  }

  if (showReset) {
    return (
      <div className="auth-form">
        <h2>Reset Password</h2>
        <form onSubmit={handleResetPassword}>
          <input
            type="email"
            placeholder="Enter your email"
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={resetStatus==='loading'}>
            {resetStatus==='loading' ? 'Sending...' : 'Send Reset Email'}
          </button>
        </form>
        <button className="toggle-auth" onClick={() => setShowReset(false)}>
          Back to Login
        </button>
        {resetStatus==='success' && <div className="auth-success">Check your email for a reset link.</div>}
        {resetStatus==='error' && <div className="auth-error">{error}</div>}
      </div>
    );
  }

  if (signUpSuccess) {
    return (
      <div className="auth-form">
        <h2>Sign Up Successful</h2>
        <div className="auth-success">
          Please check your email to confirm your sign up.<br />
          The email will be from Supabase.
        </div>
        <button className="toggle-auth" onClick={() => { setSignUpSuccess(false); setIsLogin(true); }}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h2>{isLogin ? 'JackBot' : 'JackBot'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
        </button>
      </form>
      {isLogin && (
        <button className="forgot-password" onClick={() => setShowReset(true)}>
          Forgot password?
        </button>
      )}
      <button className="toggle-auth" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
      </button>
      {error && <div className="auth-error">{error}</div>}
    </div>
  );
} 