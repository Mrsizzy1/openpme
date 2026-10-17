import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Veuillez saisir votre identifiant et votre mot de passe.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo & Titre */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            background: '#2563EB',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '16px',
          }}>
            <Building2 size={26} />
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
            Smart PME Finance
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
            Gestion commerciale & financière — RDC
          </p>
        </div>

        {/* Carte connexion */}
        <div className="login-card">
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
              Connexion
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
              Saisissez vos identifiants professionnels.
            </p>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
              <AlertCircle size={15} className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Adresse e-mail <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <Mail size={15} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input-field"
                  placeholder="nom@entreprise.cd"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="login-password">
                Mot de passe <span className="required">*</span>
              </label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={15} className="input-icon" />
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="input-field"
                  style={{ paddingRight: '38px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    display: 'flex',
                    padding: '2px',
                  }}
                  tabIndex={-1}
                  aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  Connexion en cours...
                </>
              ) : 'Se connecter'}
            </button>
          </form>

          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #E2E8F0',
            fontSize: '0.75rem',
            color: '#9CA3AF',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            Pour obtenir vos identifiants, contactez l'administrateur de votre organisation.
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.75rem', color: '#9CA3AF' }}>
          Smart PME Finance v1.0 · Kinshasa, RDC
        </p>
      </div>
    </div>
  );
};
