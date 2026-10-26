// Bug Invaders: CodeRabbit x Google Arcade Engine

class BugInvadersGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = 760;
    this.height = 820;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.audio = new window.ArcadeAudio();
    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
    this.time = 0;

    // Persistent High Scores
    this.highScores = this.loadHighScores();
    this.score = 0;
    this.highScore = this.highScores[0]?.score || 0;
    this.wave = 1;
    this.lives = 3;
    this.bombs = 2;
    this.combo = 1;
    this.comboTimer = 0;
    this.bugsKilled = 0;

    // Input state
    this.keys = {};
    this.touchState = { left: false, right: false, fire: false };

    // Camera Shake & Shockwaves
    this.shakeTime = 0;
    this.shakeMagnitude = 0;
    this.shockwaves = [];

    // Background Starfield & Matrix Hashes
    this.stars = Array.from({ length: 75 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: Math.random() * 2 + 0.8,
      speed: Math.random() * 45 + 15,
      alpha: Math.random() * 0.6 + 0.2,
      hash: Math.random() < 0.14 ? this.randomCommitHash() : null
    }));

    // Entities
    this.player = null;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.ufo = null;
    this.boss = null;
    this.bunkers = [];
    this.powerups = [];
    this.particles = [];
    this.floatingTexts = [];

    // Formation marching state
    this.marchDir = 1;
    this.marchTimer = 0;
    this.marchInterval = 0.55;
    this.animFrame = 0;
    this.ufoSpawnTimer = 14;
    this.waveBannerTimer = 0;

    this.bindEvents();
    this.renderLeaderboard();
    this.updateHUD();
    this.addReviewLog('🐰 CodeRabbit AI initialized. Ready to review incoming PR waves.', 'success');
    this.addReviewLog('✨ Gemini 2.5 Turbo context window linked to targeting computer.', 'gemini');

    this.lastTimestamp = performance.now();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  randomCommitHash() {
    const tags = ['a4f8c21', '9b0e11d', 'LGTM✓', 'fix(ci)', 'feat(ai)', '0xDEAD', 'PR#404'];
    return tags[Math.floor(Math.random() * tags.length)];
  }

  loadHighScores() {
    try {
      const raw = localStorage.getItem('bug_invaders_scores');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { name: 'RABBIT-AI', score: 12500, wave: 6 },
      { name: 'GEMINI-PRO', score: 9400, wave: 5 },
      { name: 'DEV-HERO', score: 6200, wave: 3 },
      { name: 'LINTER-BOT', score: 3800, wave: 2 },
      { name: 'INTERN-01', score: 1500, wave: 1 }
    ];
  }

  saveHighScore(score, wave) {
    this.highScores.push({
      name: `DEV-W${wave}`,
      score: Math.floor(score),
      wave
    });
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 5);
    this.highScore = this.highScores[0].score;
    try {
      localStorage.setItem('bug_invaders_scores', JSON.stringify(this.highScores));
    } catch (e) {}
    this.renderLeaderboard();
  }

  renderLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    container.innerHTML = this.highScores
      .map(
        (item, idx) => `
        <div class="lb-row">
          <span>#${idx + 1} ${item.name} (W${item.wave})</span>
          <span>${item.score.toLocaleString()}</span>
        </div>
      `
      )
      .join('');
  }

  addReviewLog(text, type = '') {
    const feed = document.getElementById('reviewFeed');
    if (!feed) return;
    const entry = document.createElement('div');
    entry.className = `review-entry ${type}`;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    entry.innerHTML = `<span class="review-time">[${timeStr}]</span>${text}`;
    feed.prepend(entry);
    while (feed.children.length > 12) {
      feed.removeChild(feed.lastChild);
    }
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if ((e.code === 'Space' || e.code === 'Enter') && (this.state === 'MENU' || this.state === 'GAMEOVER')) {
        this.startNewGame();
      } else if (e.code === 'KeyP' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        this.togglePause();
      } else if (e.code === 'KeyM') {
        this.toggleMute();
      } else if ((e.code === 'KeyX' || e.code === 'KeyE') && this.state === 'PLAYING') {
        this.triggerSmartBomb();
      } else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyC') && this.state === 'PLAYING') {
        this.triggerDash();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Click on Canvas to Start if in Menu/GameOver
    this.canvas.addEventListener('pointerdown', () => {
      this.audio.init();
      if (this.state === 'MENU' || this.state === 'GAMEOVER') {
        this.startNewGame();
      }
    });

    // Top HUD Buttons
    const btnMute = document.getElementById('btnMute');
    if (btnMute) {
      btnMute.addEventListener('click', () => this.toggleMute());
    }
    const btnCrt = document.getElementById('btnCrt');
    if (btnCrt) {
      btnCrt.addEventListener('click', () => {
        const crt = document.getElementById('crtOverlay');
        crt.classList.toggle('hidden');
        btnCrt.classList.toggle('active');
      });
    }
    const btnPause = document.getElementById('btnPause');
    if (btnPause) {
      btnPause.addEventListener('click', () => {
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
          this.togglePause();
        }
      });
    }

    // Touch controls
    const bindHold = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.touchState[prop] = true;
      });
      el.addEventListener('pointerup', () => (this.touchState[prop] = false));
      el.addEventListener('pointerleave', () => (this.touchState[prop] = false));
    };
    bindHold('touchLeft', 'left');
    bindHold('touchRight', 'right');
    bindHold('touchFire', 'fire');

    const touchDash = document.getElementById('touchDash');
    if (touchDash) {
      touchDash.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.state === 'PLAYING') this.triggerDash();
      });
    }
    const touchBomb = document.getElementById('touchBomb');
    if (touchBomb) {
      touchBomb.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.state === 'PLAYING') this.triggerSmartBomb();
      });
    }
  }

  toggleMute() {
    const muted = this.audio.toggleMute();
    const btnMute = document.getElementById('btnMute');
    if (btnMute) {
      btnMute.textContent = muted ? '🔇 AUDIO OFF' : '🔊 AUDIO ON';
      btnMute.classList.toggle('active', !muted);
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
    }
  }

  startNewGame() {
    this.audio.init();
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.bombs = 2;
    this.combo = 1;
    this.comboTimer = 0;
    this.bugsKilled = 0;

    this.player = {
      x: this.width / 2,
      y: this.height - 68,
      speed: 330,
      fireCooldown: 0,
      invulnTimer: 1.5,
      spreadTimer: 0,
      pierceTimer: 0,
      wingmanTimer: 0,
      shield: 0,
      dashTimer: 0,
      dashCooldown: 0,
      dashDir: 0,
      trail: []
    };

    this.bullets = [];
    this.enemyBullets = [];
    this.powerups = [];
    this.particles = [];
    this.floatingTexts = [];
    this.ufo = null;

    this.createBunkers();
    this.startWave(1);
    this.state = 'PLAYING';
    this.addReviewLog('🚀 Sprint Wave #1 started! Defend the Production Branch!', 'success');
    this.updateHUD();
  }

  createBunkers() {
    this.bunkers = [];
    const labels = ['UNIT TESTS', 'LINTER', 'TYPECHECK', 'CI/CD GATE'];
    const spacing = this.width / 5;
    const bunkerY = this.height - 155;
    const blockSize = 7;

    for (let i = 0; i < 4; i++) {
      const centerX = spacing * (i + 1);
      const blocks = [];
      // 11 cols x 5 rows arch
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 11; c++) {
          // Cut out top corners and bottom inner arch
          if (r === 0 && (c < 2 || c > 8)) continue;
          if (r >= 3 && c >= 3 && c <= 7) continue;
          blocks.push({
            x: centerX - (11 * blockSize) / 2 + c * blockSize,
            y: bunkerY + r * blockSize,
            w: blockSize - 1,
            h: blockSize - 1,
            hp: 2
          });
        }
      }
      this.bunkers.push({
        x: centerX,
        y: bunkerY - 8,
        label: labels[i],
        blocks
      });
    }
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.waveBannerTimer = 2.4;
    this.enemyBullets = [];
    this.enemies = [];
    this.boss = null;
    this.marchDir = 1;
    this.marchTimer = 0;

    // Repair bunkers slightly between waves
    if (waveNum > 1 && waveNum % 2 === 1) {
      this.createBunkers();
    }

    // Every 3rd wave is a BOSS Fight!
    if (waveNum % 3 === 0) {
      this.audio.bossAlert();
      const isHydra = waveNum >= 6;
      const maxHp = 85 + waveNum * 35;
      this.boss = {
        name: isHydra
          ? `⚠️ BOSS: TECH DEBT HYDRA (v${waveNum}.0)`
          : `⚠️ BOSS: THE SPAGHETTI MONOLITH (v${waveNum}.0)`,
        x: this.width / 2,
        y: 135,
        vx: 115 + waveNum * 10,
        hp: maxHp,
        maxHp: maxHp,
        fireTimer: 1.2,
        summonTimer: 4.5,
        hitFlash: 0,
        weakSpotX: this.width / 2
      };
      this.addReviewLog(
        `🚨 CRITICAL ALERT: ${this.boss.name} detected! Aim for the green 2X CRIT vulnerability box!`,
        'warn'
      );
      return;
    }

    // Standard + Elite Invader Formation
    const rows = 5;
    const cols = Math.min(11, 8 + Math.floor(waveNum / 2));
    const startX = (this.width - (cols - 1) * 52) / 2;
    const startY = 95;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = 'null';
        let hp = 1 + Math.floor(waveNum / 4);
        let pts = 20;

        if (r === 0) {
          type = 'conflict';
          hp = 2 + Math.floor(waveNum / 3);
          pts = 60;
        } else if (r === 1) {
          type = 'leak';
          hp = 2 + Math.floor(waveNum / 4);
          pts = 45;
        } else if (r === 2) {
          type = 'race';
          pts = 30;
        }

        this.enemies.push({
          x: startX + c * 52,
          y: startY + r * 44,
          homeX: startX + c * 52,
          homeY: startY + r * 44,
          type,
          hp,
          maxHp: hp,
          pts,
          state: 'formation', // 'formation' or 'diving'
          vx: 0,
          vy: 0,
          hitFlash: 0,
          scale: 2.8,
          isMini: false
        });
      }
    }

    this.marchInterval = Math.max(0.16, 0.56 - waveNum * 0.04);
  }

  triggerDash() {
    if (!this.player || this.player.dashCooldown > 0) return;
    let dir = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchState.left) dir = -1;
    else if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchState.right) dir = 1;
    else dir = Math.random() < 0.5 ? -1 : 1;

    this.player.dashDir = dir;
    this.player.dashTimer = 0.16;
    this.player.dashCooldown = 1.15;
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.25);
    this.player.trail = [];
    this.audio.dash();
    this.spawnFloatingText(this.player.x, this.player.y - 24, 'GIT REBASE!', '#00f0ff');
  }

  triggerSmartBomb() {
    if (this.bombs <= 0 || !this.player) return;
    this.bombs--;
    this.audio.bomb();
    this.shake(0.45, 11);

    this.shockwaves.push({
      x: this.player.x,
      y: this.player.y,
      radius: 10,
      maxRadius: 920,
      color: '#00f0ff'
    });

    // Clear all enemy projectiles
    this.enemyBullets.forEach((b) => {
      this.spawnParticles(b.x, b.y, '#00f0ff', 4);
    });
    this.enemyBullets = [];

    // Damage all enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.hp -= 3;
      e.hitFlash = 0.2;
      if (e.hp <= 0) {
        this.killEnemy(e, i, true);
      }
    }

    // Damage boss if active
    if (this.boss) {
      this.boss.hp -= 35;
      this.boss.hitFlash = 0.25;
      this.spawnFloatingText(this.boss.x, this.boss.y, '-35 AI REFACTOR!', '#00ff88');
      if (this.boss.hp <= 0) {
        this.defeatBoss();
      }
    }

    this.spawnFloatingText(this.width / 2, this.height / 2, '⚡ 1-CLICK AI FIX APPLIED! ⚡', '#ffe600', 18);
    this.addReviewLog('⚡ CodeRabbit 1-Click Fix Bomb deployed! Cleared all technical debt projectiles.', 'success');
    this.updateHUD();
  }

  shake(duration, magnitude) {
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
  }

  spawnParticles(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 190 + 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color,
        life: Math.random() * 0.45 + 0.2,
        maxLife: 0.65
      });
    }
  }

  spawnFloatingText(x, y, text, color = '#00ff88', size = 12) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      life: 0.95
    });
  }

  spawnPowerUp(x, y, guaranteed = false) {
    if (!guaranteed && Math.random() > 0.14) return;
    const types = [
      { id: 'spread', label: '🐰 AUTO-REVIEW (3X)', color: '#ff6b2b' },
      { id: 'pierce', label: '✨ GEMINI BEAM', color: '#4285f4' },
      { id: 'wingman', label: '☁️ CLOUD DRONE', color: '#00f0ff' },
      { id: 'shield', label: '🛡️ GIT REVERT SHIELD', color: '#00ff88' },
      { id: 'bomb', label: '⚡ +1 AI FIX BOMB', color: '#ffe600' }
    ];
    const pick = types[Math.floor(Math.random() * types.length)];
    this.powerups.push({
      x,
      y,
      vy: 115,
      ...pick
    });
  }

  firePlayerWeapon() {
    const p = this.player;
    if (p.fireCooldown > 0) return;

    const isSpread = p.spreadTimer > 0;
    const isPierce = p.pierceTimer > 0;
    p.fireCooldown = isPierce ? 0.13 : 0.2;

    this.audio.shoot(isSpread, isPierce);

    const createBullet = (x, y, vx, vy) => {
      this.bullets.push({
        x,
        y,
        vx,
        vy,
        pierce: isPierce,
        color: isPierce ? '#00f0ff' : isSpread ? '#ff6b2b' : '#00ff88',
        dmg: isPierce ? 2 : 1
      });
    };

    createBullet(p.x, p.y - 18, 0, -560);

    if (isSpread) {
      createBullet(p.x - 12, p.y - 12, -135, -540);
      createBullet(p.x + 12, p.y - 12, 135, -540);
    }

    if (p.wingmanTimer > 0) {
      createBullet(p.x + 38, p.y - 14, 0, -560);
    }
  }

  killEnemy(e, index, fromBomb = false) {
    this.enemies.splice(index, 1);
    this.bugsKilled++;
    this.audio.explode(false);

    // Combo multiplier
    this.comboTimer = 2.8;
    this.combo = Math.min(8, +(this.combo + 0.25).toFixed(2));
    const gained = Math.round(e.pts * this.combo);
    this.score += gained;
    if (this.score > this.highScore) this.highScore = this.score;

    const colors = {
      conflict: '#ff2a85',
      leak: '#00ff88',
      race: '#ffe600',
      null: '#7c9eff'
    };
    this.spawnParticles(e.x, e.y, colors[e.type] || '#00f0ff', 15);

    const words = ['LGTM!', 'MERGED!', 'FIXED!', 'CLEAN PR!', 'REFACTORED!'];
    const tag = words[Math.floor(Math.random() * words.length)];
    this.spawnFloatingText(e.x, e.y, `+${gained} ${tag}`, colors[e.type] || '#00ff88');

    // Memory Leak splits into 2 mini-bugs unless killed by piercing/bomb
    if (e.type === 'leak' && !e.isMini && !fromBomb) {
      for (let side of [-1, 1]) {
        this.enemies.push({
          x: e.x + side * 14,
          y: e.y,
          homeX: e.x + side * 14,
          homeY: e.y,
          type: 'leak',
          hp: 1,
          maxHp: 1,
          pts: 25,
          state: 'diving',
          vx: side * 95,
          vy: 145,
          hitFlash: 0,
          scale: 1.9,
          isMini: true
        });
      }
    }

    this.spawnPowerUp(e.x, e.y, false);
    this.updateHUD();
  }

  defeatBoss() {
    if (!this.boss) return;
    const bx = this.boss.x;
    const by = this.boss.y;
    this.audio.explode(true);
    this.shake(0.8, 16);
    this.spawnParticles(bx, by, '#ff2a85', 45);
    this.spawnParticles(bx, by, '#ffe600', 35);
    this.score += 1500 * (this.wave / 3);
    if (this.score > this.highScore) this.highScore = this.score;

    this.spawnFloatingText(bx, by, 'MONOLITH DECOMPOSED! +1500', '#ffe600', 16);
    this.addReviewLog(`🏆 ${this.boss.name} refactored into clean microservices!`, 'success');
    this.spawnPowerUp(bx - 25, by, true);
    this.spawnPowerUp(bx + 25, by, true);
    this.boss = null;
    this.updateHUD();
  }

  damagePlayer() {
    const p = this.player;
    if (p.invulnTimer > 0) return;

    if (p.shield > 0) {
      p.shield = 0;
      p.invulnTimer = 1.2;
      this.audio.hit();
      this.shake(0.25, 7);
      this.spawnParticles(p.x, p.y, '#00ff88', 20);
      this.spawnFloatingText(p.x, p.y - 20, 'GIT REVERT SAVED YOU!', '#00ff88');
      this.addReviewLog('🛡️ Git Revert Shield absorbed a breaking change in production!', 'gemini');
      this.updateHUD();
      return;
    }

    this.lives--;
    this.combo = 1;
    this.audio.explode(true);
    this.shake(0.45, 12);
    this.spawnParticles(p.x, p.y, '#ff2a85', 28);
    this.spawnFloatingText(p.x, p.y - 20, 'PRODUCTION INCIDENT!', '#ff2a85', 14);
    this.addReviewLog('💥 P0 Incident: Unhandled exception hit the main branch!', 'warn');

    if (this.lives <= 0) {
      this.state = 'GAMEOVER';
      this.audio.gameOver();
      this.saveHighScore(this.score, this.wave);
      this.addReviewLog(`🛑 Deployment halted on Wave ${this.wave}. Final Score: ${this.score.toLocaleString()}`, 'warn');
    } else {
      p.x = this.width / 2;
      p.invulnTimer = 2.2;
    }
    this.updateHUD();
  }

  update(dt) {
    this.time += dt;

    // Background stars always scroll
    this.stars.forEach((s) => {
      s.y += s.speed * dt;
      if (s.y > this.height) {
        s.y = -10;
        s.x = Math.random() * this.width;
      }
    });

    if (this.state !== 'PLAYING') return;

    if (this.waveBannerTimer > 0) this.waveBannerTimer -= dt;
    if (this.shakeTime > 0) this.shakeTime -= dt;

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.updateHUD();
      }
    }

    // Update Player
    const p = this.player;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    if (p.invulnTimer > 0) p.invulnTimer -= dt;
    if (p.spreadTimer > 0) p.spreadTimer -= dt;
    if (p.pierceTimer > 0) p.pierceTimer -= dt;
    if (p.wingmanTimer > 0) p.wingmanTimer -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 5) p.trail.shift();
      p.x += p.dashDir * 780 * dt;
    } else {
      let moveX = 0;
      let moveY = 0;
      if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchState.left) moveX -= 1;
      if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchState.right) moveX += 1;
      if (this.keys['ArrowUp'] || this.keys['KeyW']) moveY -= 1;
      if (this.keys['ArrowDown'] || this.keys['KeyS']) moveY += 1;

      p.x += moveX * p.speed * dt;
      p.y += moveY * (p.speed * 0.65) * dt;
    }

    p.x = Math.max(32, Math.min(this.width - 32, p.x));
    p.y = Math.max(this.height - 115, Math.min(this.height - 38, p.y));

    if (this.keys['Space'] || this.keys['KeyZ'] || this.touchState.fire) {
      this.firePlayerWeapon();
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 1100 * dt;
      if (sw.radius > sw.maxRadius) this.shockwaves.splice(i, 1);
    }

    // Update Player Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.y < -20 || b.x < -20 || b.x > this.width + 20) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check UFO Hit
      if (this.ufo && Math.abs(b.x - this.ufo.x) < 26 && Math.abs(b.y - this.ufo.y) < 16) {
        this.audio.explode(true);
        this.score += 350;
        this.spawnParticles(this.ufo.x, this.ufo.y, '#ffe600', 25);
        this.spawnFloatingText(this.ufo.x, this.ufo.y, 'SAVED THE WEEKEND! +350', '#ffe600', 14);
        this.addReviewLog('🎉 Blocked a Friday 5PM Deploy! Dropped a guaranteed Power-Up.', 'success');
        this.spawnPowerUp(this.ufo.x, this.ufo.y, true);
        this.ufo = null;
        if (!b.pierce) this.bullets.splice(i, 1);
        this.updateHUD();
        continue;
      }

      // Check Boss Hit
      if (this.boss && Math.abs(b.x - this.boss.x) < 66 && Math.abs(b.y - this.boss.y) < 32) {
        const isCrit = Math.abs(b.x - this.boss.weakSpotX) < 18;
        const dmg = b.dmg * (isCrit ? 2.5 : 1);
        this.boss.hp -= dmg;
        this.boss.hitFlash = 0.08;
        this.audio.hit();
        this.spawnParticles(b.x, b.y, isCrit ? '#00ff88' : '#ff2a85', 5);
        if (isCrit) {
          this.spawnFloatingText(b.x, b.y, 'CRIT 2.5X!', '#00ff88', 11);
        }
        this.bullets.splice(i, 1);
        if (this.boss.hp <= 0) {
          this.defeatBoss();
        }
        continue;
      }

      // Check Enemy Hit
      let bulletRemoved = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.abs(b.x - e.x) < 18 && Math.abs(b.y - e.y) < 15) {
          e.hp -= b.dmg;
          e.hitFlash = 0.1;
          if (e.hp <= 0) {
            this.killEnemy(e, j, b.pierce);
          } else {
            this.audio.hit();
            this.spawnParticles(b.x, b.y, '#ffffff', 4);
          }
          if (!b.pierce) {
            this.bullets.splice(i, 1);
            bulletRemoved = true;
            break;
          }
        }
      }
      if (bulletRemoved) continue;
    }

    // Spawn & Update Friday 5PM Deploy UFO
    this.ufoSpawnTimer -= dt;
    if (this.ufoSpawnTimer <= 0 && !this.ufo && !this.boss) {
      this.ufoSpawnTimer = 18 + Math.random() * 10;
      const fromLeft = Math.random() < 0.5;
      this.ufo = {
        x: fromLeft ? -30 : this.width + 30,
        y: 52,
        vx: fromLeft ? 135 : -135,
        soundTimer: 0
      };
      this.addReviewLog('🛸 WARNING: Someone is trying to push a Friday 5PM Deploy at the top of the screen!', 'warn');
    }

    if (this.ufo) {
      this.ufo.x += this.ufo.vx * dt;
      this.ufo.soundTimer -= dt;
      if (this.ufo.soundTimer <= 0) {
        this.ufo.soundTimer = 0.35;
        this.audio.ufoPulse();
      }
      if (this.ufo.x < -50 || this.ufo.x > this.width + 50) {
        this.ufo = null;
      }
    }

    // Update Boss
    if (this.boss) {
      if (this.boss.hitFlash > 0) this.boss.hitFlash -= dt;
      this.boss.x += this.boss.vx * dt;
      if (this.boss.x > this.width - 90 || this.boss.x < 90) {
        this.boss.vx *= -1;
      }

      this.boss.fireTimer -= dt;
      if (this.boss.fireTimer <= 0) {
        this.boss.fireTimer = Math.max(0.55, 1.35 - this.wave * 0.08);
        for (let angle = -0.45; angle <= 0.45; angle += 0.3) {
          this.enemyBullets.push({
            x: this.boss.x + Math.sin(angle) * 30,
            y: this.boss.y + 30,
            vx: Math.sin(angle) * 180,
            vy: Math.cos(angle) * 230,
            label: '500 ERR'
          });
        }
      }

      this.boss.summonTimer -= dt;
      if (this.boss.summonTimer <= 0 && this.enemies.length < 6) {
        this.boss.summonTimer = 5.0;
        this.enemies.push({
          x: this.boss.x + (Math.random() - 0.5) * 80,
          y: this.boss.y + 36,
          homeX: this.boss.x,
          homeY: 220,
          type: 'conflict',
          hp: 2,
          maxHp: 2,
          pts: 50,
          state: 'diving',
          vx: (this.player.x - this.boss.x) * 0.45,
          vy: 155,
          hitFlash: 0,
          scale: 2.5
        });
      }
    }

    // Update Formation March & Enemies
    const formationEnemies = this.enemies.filter((e) => e.state === 'formation');
    const dynamicInterval = Math.max(
      0.08,
      this.marchInterval * (0.25 + 0.75 * (formationEnemies.length / 45))
    );

    this.marchTimer += dt;
    if (this.marchTimer >= dynamicInterval && formationEnemies.length > 0) {
      this.marchTimer = 0;
      this.animFrame++;
      this.audio.marchStep();

      let hitWall = false;
      const stepX = 13 * this.marchDir;
      formationEnemies.forEach((e) => {
        if (e.x + stepX > this.width - 36 || e.x + stepX < 36) {
          hitWall = true;
        }
      });

      if (hitWall) {
        this.marchDir *= -1;
        formationEnemies.forEach((e) => {
          e.y += 20;
          e.homeY += 20;
        });
      } else {
        formationEnemies.forEach((e) => {
          const jitter = e.type === 'race' ? (Math.random() - 0.5) * 10 : 0;
          e.x += stepX + jitter;
          e.homeX += stepX;
        });
      }
    }

    // Update individual enemy behavior (diving, shooting, collisions)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (e.state === 'diving') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        // Slight homing towards player
        e.vx += Math.sign(this.player.x - e.x) * 65 * dt;
        if (e.y > this.height + 25) {
          if (e.isMini) {
            this.enemies.splice(i, 1);
            continue;
          }
          e.y = 40;
          e.state = 'formation';
        }
      } else {
        // Chance for elite conflict or race bugs to dive-bomb Galaga style
        if ((e.type === 'conflict' || e.type === 'race') && Math.random() < (0.018 + this.wave * 0.004) * dt) {
          e.state = 'diving';
          e.vx = (this.player.x - e.x) * 0.45;
          e.vy = 165 + this.wave * 12;
        }

        // Enemy shooting
        if (Math.random() < (0.045 + this.wave * 0.008) * dt) {
          this.enemyBullets.push({
            x: e.x,
            y: e.y + 14,
            vx: e.type === 'conflict' ? (this.player.x - e.x) * 0.25 : 0,
            vy: 235 + this.wave * 15,
            label: e.type === 'conflict' ? '<<<<<<<' : 'ERR!'
          });
        }
      }

      // Check if enemy reached bottom or collided with player
      if (e.y > this.height - 65 || (Math.abs(e.x - p.x) < 24 && Math.abs(e.y - p.y) < 22)) {
        this.enemies.splice(i, 1);
        this.damagePlayer();
        continue;
      }
    }

    // Update Enemy Bullets & Bunker Collisions
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.y > this.height + 20) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      // Check Bunker collision
      let hitBunker = false;
      for (const bunker of this.bunkers) {
        for (let k = bunker.blocks.length - 1; k >= 0; k--) {
          const blk = bunker.blocks[k];
          if (b.x >= blk.x && b.x <= blk.x + blk.w + 3 && b.y >= blk.y && b.y <= blk.y + blk.h + 3) {
            blk.hp--;
            if (blk.hp <= 0) bunker.blocks.splice(k, 1);
            this.spawnParticles(b.x, b.y, '#00f0ff', 4);
            hitBunker = true;
            break;
          }
        }
        if (hitBunker) break;
      }
      if (hitBunker) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      // Check Player collision
      if (Math.abs(b.x - p.x) < 16 && Math.abs(b.y - p.y) < 16) {
        this.enemyBullets.splice(i, 1);
        this.damagePlayer();
      }
    }

    // Update Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pw = this.powerups[i];
      pw.y += pw.vy * dt;
      if (pw.y > this.height + 20) {
        this.powerups.splice(i, 1);
        continue;
      }

      if (Math.abs(pw.x - p.x) < 26 && Math.abs(pw.y - p.y) < 24) {
        this.audio.powerup();
        this.score += 100;
        this.spawnFloatingText(pw.x, pw.y - 10, pw.label, pw.color, 13);

        if (pw.id === 'spread') {
          p.spreadTimer = 11;
          this.addReviewLog('🐰 CodeRabbit Auto-Review active: Triple PR Spread Laser enabled!', '');
        } else if (pw.id === 'pierce') {
          p.pierceTimer = 9;
          this.addReviewLog('✨ Gemini Context Boost active: Piercing high-velocity laser enabled!', 'gemini');
        } else if (pw.id === 'wingman') {
          p.wingmanTimer = 14;
          this.addReviewLog('☁️ Google Cloud Run Autoscaler spawned an autonomous wingman drone!', 'gemini');
        } else if (pw.id === 'shield') {
          p.shield = 1;
          this.createBunkers();
          this.addReviewLog('🛡️ Git Revert Shield active + CI/CD Test Suites restored!', 'success');
        } else if (pw.id === 'bomb') {
          this.bombs = Math.min(5, this.bombs + 1);
          this.addReviewLog('⚡ Added +1 CodeRabbit 1-Click Fix Smart Bomb to inventory!', 'success');
        }

        this.powerups.splice(i, 1);
        this.updateHUD();
      }
    }

    // Update Particles & Floating Texts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 42 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Check Wave Complete
    if (this.enemies.length === 0 && !this.boss) {
      this.audio.waveClear();
      this.score += 250 * this.wave;
      this.addReviewLog(`✅ Sprint Wave #${this.wave} merged cleanly! Deploying Wave #${this.wave + 1}...`, 'success');
      this.startWave(this.wave + 1);
      this.updateHUD();
    }
  }

  updateHUD() {
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setEl('hudScore', Math.floor(this.score).toLocaleString());
    setEl('hudHigh', Math.floor(this.highScore).toLocaleString());
    setEl('hudWave', `W-${this.wave}`);
    setEl('hudLives', '❤️'.repeat(Math.max(0, this.lives)) || '💀');
    setEl('statCombo', `${this.combo.toFixed(1)}x`);
    setEl('statBombs', '⚡'.repeat(this.bombs) || '0');
    setEl('statBugs', this.bugsKilled);
    setEl('statUptime', `${Math.max(0, this.lives * 33.3).toFixed(1)}%`);
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake
    if (this.shakeTime > 0) {
      const dx = (Math.random() - 0.5) * this.shakeMagnitude;
      const dy = (Math.random() - 0.5) * this.shakeMagnitude;
      ctx.translate(dx, dy);
    }

    // Clear Background
    ctx.fillStyle = '#05060d';
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle Cyber Grid at Bottom
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // Draw Stars & Faint Commit Hashes
    this.stars.forEach((s) => {
      ctx.fillStyle = `rgba(180, 220, 255, ${s.alpha})`;
      if (s.hash) {
        ctx.font = '10px Courier New';
        ctx.fillText(s.hash, s.x, s.y);
      } else {
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
    });

    if (this.state === 'MENU') {
      this.drawMenuScreen(ctx);
      ctx.restore();
      return;
    }

    // Draw CI/CD Bunkers
    this.bunkers.forEach((bunker) => {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
      ctx.font = 'bold 9px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(bunker.label, bunker.x, bunker.y);

      bunker.blocks.forEach((blk) => {
        ctx.fillStyle = blk.hp === 2 ? '#00f0ff' : '#0088aa';
        ctx.fillRect(blk.x, blk.y, blk.w, blk.h);
      });
    });

    // Draw Shockwaves
    this.shockwaves.forEach((sw) => {
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 4;
      ctx.stroke();
    });

    // Draw UFO
    if (this.ufo) {
      window.Sprites.drawUFO(ctx, this.ufo, this.time);
    }

    // Draw Boss
    if (this.boss) {
      window.Sprites.drawBoss(ctx, this.boss, this.time);
    }

    // Draw Enemies
    this.enemies.forEach((e) => {
      window.Sprites.drawEnemy(ctx, e, this.animFrame, this.time);
    });

    // Draw Player
    if (this.player && this.state !== 'GAMEOVER') {
      window.Sprites.drawPlayer(ctx, this.player, this.time);
    }

    // Draw Player Bullets
    this.bullets.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x - 2.5, b.y - 10, 5, 16);
      ctx.shadowBlur = 0;
    });

    // Draw Enemy Bullets
    this.enemyBullets.forEach((b) => {
      ctx.fillStyle = '#ff2a85';
      ctx.font = 'bold 10px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(b.label || '!', b.x, b.y);
    });

    // Draw Powerups
    this.powerups.forEach((pw) => {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 14, 30, 0.9)';
      ctx.strokeStyle = pw.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pw.x, pw.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pw.color;
      ctx.font = 'bold 10px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(pw.id.toUpperCase().slice(0, 3), pw.x, pw.y + 3);
      ctx.restore();
    });

    // Draw Particles
    this.particles.forEach((pt) => {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    });
    ctx.globalAlpha = 1;

    // Draw Floating Texts
    this.floatingTexts.forEach((ft) => {
      ctx.globalAlpha = Math.min(1, ft.life * 1.4);
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.size}px Courier New`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1;

    // Draw Active Power-up Timers Bar at bottom left
    if (this.player) {
      let py = this.height - 14;
      ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'left';
      if (this.player.spreadTimer > 0) {
        ctx.fillStyle = '#ff6b2b';
        ctx.fillText(`🐰 3X AUTO-REVIEW: ${this.player.spreadTimer.toFixed(1)}s`, 16, py);
        py -= 16;
      }
      if (this.player.pierceTimer > 0) {
        ctx.fillStyle = '#4285f4';
        ctx.fillText(`✨ GEMINI PIERCE BEAM: ${this.player.pierceTimer.toFixed(1)}s`, 16, py);
        py -= 16;
      }
      if (this.player.wingmanTimer > 0) {
        ctx.fillStyle = '#00f0ff';
        ctx.fillText(`☁️ CLOUD RUN DRONE: ${this.player.wingmanTimer.toFixed(1)}s`, 16, py);
      }
    }

    // Wave Banner Overlay
    if (this.waveBannerTimer > 0 && this.state === 'PLAYING') {
      ctx.fillStyle = 'rgba(5, 7, 15, 0.72)';
      ctx.fillRect(0, this.height / 2 - 55, this.width, 95);
      ctx.strokeStyle = '#00f0ff';
      ctx.strokeRect(0, this.height / 2 - 55, this.width, 95);

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 28px Courier New';
      ctx.textAlign = 'center';
      const title =
        this.wave % 3 === 0 ? `🚨 BOSS SPRINT — WAVE ${this.wave} 🚨` : `SPRINT WAVE #${this.wave}`;
      ctx.fillText(title, this.width / 2, this.height / 2 - 12);

      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 14px Courier New';
      ctx.fillText(
        this.wave % 3 === 0
          ? 'AIM FOR THE GREEN 2X CRIT VULNERABILITY!'
          : 'PROTECT THE PRODUCTION BRANCH & CI/CD GATES!',
        this.width / 2,
        this.height / 2 + 18
      );
    }

    // Pause Overlay
    if (this.state === 'PAUSED') {
      ctx.fillStyle = 'rgba(5, 7, 15, 0.78)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 34px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('⏸️ GAME PAUSED', this.width / 2, this.height / 2);
      ctx.fillStyle = '#eef4ff';
      ctx.font = '15px Courier New';
      ctx.fillText('Press [P] to Resume Code Review', this.width / 2, this.height / 2 + 34);
    }

    // Game Over Overlay
    if (this.state === 'GAMEOVER') {
      this.drawGameOverScreen(ctx);
    }

    ctx.restore();
  }

  drawMenuScreen(ctx) {
    ctx.textAlign = 'center';

    // Top Collaboration Pill
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 13px Courier New';
    ctx.fillText('⚡ CODERABBIT x GOOGLE ARCADE EDITION ⚡', this.width / 2, 130);

    // Main Title
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    ctx.font = '900 54px Courier New';
    ctx.fillText('BUG INVADERS', this.width / 2, 195);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ff6b2b';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText('DEFEND THE PRODUCTION BRANCH FROM LEGACY BUGS', this.width / 2, 232);

    // Showcase Enemy Scoring Card
    const boxX = this.width / 2 - 220;
    const boxY = 275;
    ctx.fillStyle = 'rgba(13, 18, 38, 0.88)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.fillRect(boxX, boxY, 440, 250);
    ctx.strokeRect(boxX, boxY, 440, 250);

    const frame = Math.floor(this.time * 3) % 2;
    const showcase = [
      { type: 'conflict', y: boxY + 45, label: 'MERGE CONFLICT (Dives & Forks)', pts: '60 PTS', color: '#ff2a85' },
      { type: 'leak', y: boxY + 95, label: 'MEMORY LEAK (Splits in 2)', pts: '45 PTS', color: '#00ff88' },
      { type: 'race', y: boxY + 145, label: 'RACE CONDITION (Phase Shifts)', pts: '30 PTS', color: '#ffe600' },
      { type: 'null', y: boxY + 195, label: 'NULL POINTER EXCEPTION', pts: '20 PTS', color: '#7c9eff' }
    ];

    showcase.forEach((item) => {
      window.Sprites.drawEnemy(
        ctx,
        { x: boxX + 55, y: item.y, type: item.type, scale: 2.7 },
        frame,
        this.time
      );
      ctx.textAlign = 'left';
      ctx.fillStyle = '#eef4ff';
      ctx.font = 'bold 13px Courier New';
      ctx.fillText(item.label, boxX + 95, item.y + 4);

      ctx.textAlign = 'right';
      ctx.fillStyle = item.color;
      ctx.fillText(item.pts, boxX + 415, item.y + 4);
    });

    // Hero Ship Preview
    window.Sprites.drawPlayer(
      ctx,
      {
        x: this.width / 2,
        y: 595,
        invulnTimer: 0,
        dashTimer: 0,
        shield: 1,
        wingmanTimer: 1
      },
      this.time
    );

    // Blinking Start Prompt
    if (Math.floor(this.time * 2.5) % 2 === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 22px Courier New';
      ctx.fillText('▶ PRESS [SPACE] OR CLICK TO START ◀', this.width / 2, 690);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#7c8ba1';
    ctx.font = '13px Courier New';
    ctx.fillText(
      'Move: [WASD / Arrows]  •  Fire: [SPACE]  •  Rebase Dash: [SHIFT]  •  AI Fix Bomb: [X]',
      this.width / 2,
      745
    );
  }

  drawGameOverScreen(ctx) {
    ctx.fillStyle = 'rgba(6, 8, 18, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2a85';
    ctx.font = '900 46px Courier New';
    ctx.fillText('PRODUCTION DOWN!', this.width / 2, 290);

    ctx.fillStyle = '#eef4ff';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText(`FINAL SCORE: ${Math.floor(this.score).toLocaleString()} PTS`, this.width / 2, 345);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`REACHED SPRINT WAVE #${this.wave}  •  BUGS SQUASHED: ${this.bugsKilled}`, this.width / 2, 380);

    if (Math.floor(this.time * 2.5) % 2 === 0) {
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 22px Courier New';
      ctx.fillText('▶ PRESS [SPACE] OR CLICK TO REDEPLOY ◀', this.width / 2, 465);
    }
  }

  loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((ts) => this.loop(ts));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new BugInvadersGame();
});
