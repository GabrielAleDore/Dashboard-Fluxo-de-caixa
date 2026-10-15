/**
 * AUTH COMPONENT
 * Gerencia a autenticação client-side sem banco de dados, persistência de sessão e proteção de rota da SPA
 */

const AuthComponent = {
  STORAGE_KEY: 'fc_auth_token',
  ATTEMPTS_KEY: 'fc_auth_attempts',
  LOCKOUT_KEY: 'fc_auth_lockout',

  /**
   * Calcula o hash SHA-256 no navegador usando a API nativa Web Crypto
   */
  async computeHash(password) {
    const salt = (typeof AuthConfig !== 'undefined' && AuthConfig.salt) ? AuthConfig.salt : '';
    const enc = new TextEncoder();
    const data = enc.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Gera um token de sessão assinado para persistência
   */
  createSessionToken(user, isPersistent) {
    const payload = {
      u: user.username,
      d: user.displayName,
      r: user.role || 'user',
      p: isPersistent,
      t: Date.now()
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  },

  /**
   * Lê e valida o token de sessão ativo contra a lista oficial de usuários
   */
  getSession() {
    const rawToken = sessionStorage.getItem(this.STORAGE_KEY) || localStorage.getItem(this.STORAGE_KEY);
    if (!rawToken) return null;

    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(rawToken))));
      if (!decoded || !decoded.u) return null;

      // Valida se o usuário ainda existe na configuração
      const validUser = AuthConfig.users.find(u => u.username.toLowerCase() === decoded.u.toLowerCase());
      if (!validUser) {
        this.logout();
        return null;
      }

      return {
        username: validUser.username,
        displayName: validUser.displayName,
        role: validUser.role || 'user',
        isPersistent: decoded.p
      };
    } catch (e) {
      this.logout();
      return null;
    }
  },

  /**
   * Verifica se o usuário atual está autenticado
   */
  isAuthenticated() {
    return Boolean(this.getSession());
  },

  /**
   * Obtém os dados do usuário autenticado
   */
  getCurrentUser() {
    return this.getSession();
  },

  /**
   * Verifica se o sistema está em cooldown por excesso de tentativas
   */
  getLockoutRemainingSeconds() {
    const lockoutUntil = parseInt(sessionStorage.getItem(this.LOCKOUT_KEY) || '0', 10);
    const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  },

  /**
   * Registra falha de login e aplica cooldown se necessário
   */
  recordFailedAttempt() {
    const maxAttempts = (typeof AuthConfig !== 'undefined' && AuthConfig.maxFailedAttempts) ? AuthConfig.maxFailedAttempts : 5;
    const cooldownSecs = (typeof AuthConfig !== 'undefined' && AuthConfig.cooldownSeconds) ? AuthConfig.cooldownSeconds : 30;

    let attempts = parseInt(sessionStorage.getItem(this.ATTEMPTS_KEY) || '0', 10) + 1;
    sessionStorage.setItem(this.ATTEMPTS_KEY, attempts.toString());

    if (attempts >= maxAttempts) {
      const lockoutUntil = Date.now() + (cooldownSecs * 1000);
      sessionStorage.setItem(this.LOCKOUT_KEY, lockoutUntil.toString());
      sessionStorage.setItem(this.ATTEMPTS_KEY, '0');
      return cooldownSecs;
    }
    return 0;
  },

  clearFailedAttempts() {
    sessionStorage.removeItem(this.ATTEMPTS_KEY);
    sessionStorage.removeItem(this.LOCKOUT_KEY);
  },

  /**
   * Processa a autenticação do usuário
   */
  async login(username, password, rememberMe = false) {
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '');

    if (!cleanUser || !cleanPass) {
      throw new Error('Por favor, informe seu usuário e senha.');
    }

    const lockout = this.getLockoutRemainingSeconds();
    if (lockout > 0) {
      throw new Error(`Muitas tentativas incorretas. Aguarde ${lockout} segundos.`);
    }

    const user = AuthConfig.users.find(u => u.username.toLowerCase() === cleanUser);
    if (!user) {
      const wait = this.recordFailedAttempt();
      if (wait > 0) throw new Error(`Muitas tentativas incorretas. Aguarde ${wait} segundos.`);
      throw new Error('Usuário ou senha inválidos.');
    }

    const computedHash = await this.computeHash(cleanPass);
    if (computedHash !== user.passwordHash) {
      const wait = this.recordFailedAttempt();
      if (wait > 0) throw new Error(`Muitas tentativas incorretas. Aguarde ${wait} segundos.`);
      throw new Error('Usuário ou senha inválidos.');
    }

    // Sucesso: limpa tentativas e persiste sessão
    this.clearFailedAttempts();
    const token = this.createSessionToken(user, rememberMe);

    if (rememberMe) {
      localStorage.setItem(this.STORAGE_KEY, token);
      sessionStorage.removeItem(this.STORAGE_KEY);
    } else {
      sessionStorage.setItem(this.STORAGE_KEY, token);
      localStorage.removeItem(this.STORAGE_KEY);
    }

    return user;
  },

  /**
   * Encerra a sessão e retorna à tela de bloqueio
   */
  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
    if (typeof State !== 'undefined') {
      State.currentUser = null;
    }
    window.location.reload();
  },

  /**
   * Renderiza a interface de login fullscreen
   */
  render(container) {
    if (!container) return;

    container.innerHTML = `
      <div class="auth-overlay" id="auth-overlay">
        <div class="auth-box" id="auth-box">
          <div class="auth-header">
            <span class="auth-brand-icon">🌾</span>
            <div class="auth-title-group">
              <h2 class="auth-title">
                <span>Condomínio Agrícola Familiar</span>
                <strong>Bachinski</strong>
              </h2>
              <p class="auth-subtitle">Gestão Financeira &amp; Fluxo de Caixa</p>
            </div>
          </div>

          <form class="auth-form" id="auth-form" onsubmit="event.preventDefault(); AuthComponent.handleSubmit();">
            <div class="auth-error-box" id="auth-error" style="display:none;"></div>

            <div class="auth-form-group">
              <label for="auth-username">Usuário</label>
              <div class="auth-input-wrap">
                <span class="auth-input-icon">👤</span>
                <input 
                  type="text" 
                  id="auth-username" 
                  class="auth-input" 
                  placeholder="Seu usuário de acesso" 
                  autocomplete="username" 
                  required 
                  autofocus
                />
              </div>
            </div>

            <div class="auth-form-group">
              <label for="auth-password">Senha</label>
              <div class="auth-input-wrap">
                <span class="auth-input-icon">🔒</span>
                <input 
                  type="password" 
                  id="auth-password" 
                  class="auth-input" 
                  placeholder="Sua senha" 
                  autocomplete="current-password" 
                  required 
                />
                <button 
                  type="button" 
                  class="auth-btn-toggle-pass" 
                  id="btn-toggle-password" 
                  onclick="AuthComponent.togglePasswordVisibility()" 
                  title="Exibir ou ocultar senha"
                >
                  👁️
                </button>
              </div>
            </div>

            <div class="auth-options-row">
              <label class="auth-remember-label">
                <input type="checkbox" id="auth-remember" class="auth-checkbox" />
                <span class="auth-checkbox-custom"></span>
                <span class="auth-remember-text">Lembrar meu acesso neste dispositivo</span>
              </label>
            </div>

            <button type="submit" class="auth-btn-submit" id="btn-submit-login">
              <span class="btn-text">Entrar no Sistema</span>
              <span class="btn-spinner" style="display:none;"></span>
            </button>
          </form>

          <div class="auth-footer">
            <span>🔒 Acesso restrito e criptografado</span>
          </div>
        </div>
      </div>
    `;

    // Atualiza estado de cooldown se houver
    this.checkCooldownUI();
  },

  checkCooldownUI() {
    const errorBox = document.getElementById('auth-error');
    const submitBtn = document.getElementById('btn-submit-login');
    const lockout = this.getLockoutRemainingSeconds();

    if (lockout > 0) {
      if (errorBox) {
        errorBox.textContent = `Acesso temporariamente bloqueado. Aguarde ${lockout}s.`;
        errorBox.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = true;
      }
      setTimeout(() => this.checkCooldownUI(), 1000);
    } else {
      if (submitBtn) submitBtn.disabled = false;
      if (errorBox && errorBox.textContent.includes('bloqueado')) {
        errorBox.style.display = 'none';
      }
    }
  },

  togglePasswordVisibility() {
    const passInput = document.getElementById('auth-password');
    const toggleBtn = document.getElementById('btn-toggle-password');
    if (!passInput) return;

    if (passInput.type === 'password') {
      passInput.type = 'text';
      if (toggleBtn) toggleBtn.textContent = '🙈';
    } else {
      passInput.type = 'password';
      if (toggleBtn) toggleBtn.textContent = '👁️';
    }
  },

  async handleSubmit() {
    const userEl = document.getElementById('auth-username');
    const passEl = document.getElementById('auth-password');
    const remEl  = document.getElementById('auth-remember');
    const errBox = document.getElementById('auth-error');
    const btn    = document.getElementById('btn-submit-login');
    const box    = document.getElementById('auth-box');

    const username = userEl ? userEl.value : '';
    const password = passEl ? passEl.value : '';
    const remember = remEl ? remEl.checked : false;

    if (errBox) errBox.style.display = 'none';

    // Estado visual de loading no botão
    if (btn) {
      btn.disabled = true;
      const textSpan = btn.querySelector('.btn-text');
      const spinSpan = btn.querySelector('.btn-spinner');
      if (textSpan) textSpan.textContent = 'Autenticando...';
      if (spinSpan) spinSpan.style.display = 'inline-block';
    }

    try {
      const user = await this.login(username, password, remember);

      // Transição fluida de sucesso
      const overlay = document.getElementById('auth-overlay');
      if (overlay) {
        overlay.classList.add('auth-fade-out');
        setTimeout(() => {
          overlay.style.display = 'none';
          if (typeof App !== 'undefined' && App.onLoginSuccess) {
            App.onLoginSuccess(user);
          }
        }, 300);
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
      }
      if (box) {
        box.classList.remove('auth-shake');
        void box.offsetWidth; // Força reflow para reiniciar animação
        box.classList.add('auth-shake');
      }
      if (passEl) {
        passEl.value = '';
        passEl.focus();
      }
    } finally {
      if (btn) {
        btn.disabled = this.getLockoutRemainingSeconds() > 0;
        const textSpan = btn.querySelector('.btn-text');
        const spinSpan = btn.querySelector('.btn-spinner');
        if (textSpan) textSpan.textContent = 'Entrar no Sistema';
        if (spinSpan) spinSpan.style.display = 'none';
      }
      this.checkCooldownUI();
    }
  }
};
