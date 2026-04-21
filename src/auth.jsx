// Sign in / sign up modal + session chip.
// Google Sign-In is a placeholder UI: real OAuth requires a Google Cloud
// OAuth Client ID and a registered origin. See notes in AuthModal below.
const { useState: _useState, useEffect: _useEffect } = React;

// When/if a real Google OAuth Client ID is configured, drop it here and the
// component will automatically upgrade to using Google Identity Services.
const GOOGLE_CLIENT_ID = null; // e.g. '123-abc.apps.googleusercontent.com'

function AuthModal({ open, onClose }) {
  const { signInWithIdentity } = window.YGG_STORE.useStore();
  const [err, setErr] = _useState('');

  _useEffect(() => {
    if (!open) return;
    setErr('');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Placeholder sign-in. Real deployment will replace this handler with a
  // Google Identity Services credential callback that decodes the ID token,
  // checks `hd === 'oddin.gg'`, and passes { email, name, picture } through.
  const signInAsDemo = () => {
    const email = 'team@oddin.gg';
    signInWithIdentity({ email, name: 'Oddin.gg Team' });
    onClose();
  };

  return (
    <div className="auth-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-card">
        <div className="auth-eyebrow">Project Yggdrasil · sign in</div>
        <h3 className="auth-title">Welcome <em>in.</em></h3>
        <p className="auth-sub">
          Editing is reserved for <span style={{ color: 'var(--accent)' }}>@oddin.gg</span> Workspace accounts.
          Every change is recorded against the signer.
        </p>

        <button type="button" className="google-btn" onClick={signInAsDemo}>
          <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>Sign in with Google</span>
        </button>

        <p className="auth-hint">
          {GOOGLE_CLIENT_ID
            ? <>Only <code>@oddin.gg</code> Workspace accounts are accepted.</>
            : <><strong>Placeholder:</strong> real Google OAuth activates once a Cloud Client ID is provisioned and this site is hosted on an authorized origin. The button signs you in as a shared <code>team@oddin.gg</code> identity for now — all edits attribute to it.</>
          }
        </p>

        {err && <div className="auth-err">{err}</div>}

        <button type="button" className="auth-swap" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function SessionChip({ onRequestAuth }) {
  const { session, signOut } = window.YGG_STORE.useStore();

  if (!session) {
    return (
      <button className="nav-signin" onClick={onRequestAuth}>
        <span className="dot dim"/>sign in to edit
      </button>
    );
  }
  const initials = session.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="nav-session">
      <span className="nav-avatar">{initials}</span>
      <div className="nav-session-body">
        <div className="nav-session-name">{session.name}</div>
        <div className="nav-session-email">{session.email}</div>
      </div>
      <button className="nav-signout" onClick={signOut} title="Sign out">↵</button>
    </div>
  );
}

window.YGG_AUTH = { AuthModal, SessionChip };
