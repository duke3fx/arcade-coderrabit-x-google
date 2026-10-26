// Pixel-Art Sprite Matrices & Custom Canvas Renderers for Bug Invaders: CodeRabbit Edition

const Sprites = {
  // 11x10 Hero Ship: CodeRabbit Cyber-Starfighter (ears + visor + wings)
  heroMatrix: [
    "00110001100",
    "00120002100",
    "00120002100",
    "00011111000",
    "00113331100",
    "01113331110",
    "11211111211",
    "11214141211",
    "10111011101",
    "10040004001"
  ],

  // Merge Conflict (Row 0 Elite - Crimson/Magenta) - 2 Frames (11x8)
  conflictFrames: [
    [
      "00100000100",
      "01110001110",
      "11211111211",
      "11112121111",
      "01111111110",
      "00101110100",
      "01001010010",
      "10000000001"
    ],
    [
      "00100000100",
      "10110001101",
      "11211111211",
      "11112121111",
      "01111111110",
      "00101110100",
      "00100100100",
      "01000000010"
    ]
  ],

  // Memory Leak (Row 1 - Neon Green / Slime Crab) - 2 Frames (11x8)
  leakFrames: [
    [
      "00100000100",
      "00010001000",
      "00111111100",
      "01121112110",
      "11111111111",
      "10111111101",
      "10100000101",
      "00011011000"
    ],
    [
      "00100000100",
      "10010001001",
      "10111111101",
      "11121112111",
      "11111111111",
      "01111111110",
      "00100000100",
      "01000000010"
    ]
  ],

  // Race Condition (Row 2 - Yellow/Cyan Glitch Wasp) - 2 Frames (11x8)
  raceFrames: [
    [
      "00011011000",
      "01111111110",
      "11121112111",
      "11111111111",
      "00112221100",
      "01011111010",
      "10100100101",
      "01000000010"
    ],
    [
      "00011011000",
      "00111111100",
      "01121112110",
      "11111111111",
      "10112221101",
      "00101110100",
      "01010001010",
      "10001010001"
    ]
  ],

  // Null Pointer / Syntax Bug (Rows 3-4 - Classic Beetle) - 2 Frames (11x8)
  nullFrames: [
    [
      "00001110000",
      "01111111110",
      "11111111111",
      "11121112111",
      "11111111111",
      "00110101100",
      "01100000110",
      "00110001100"
    ],
    [
      "00001110000",
      "01111111110",
      "11111111111",
      "11121112111",
      "11111111111",
      "00011011000",
      "00110101100",
      "11000000011"
    ]
  ],

  // Bonus UFO: Friday 5PM Deploy (14x6)
  ufoMatrix: [
    "00001111110000",
    "00111111111100",
    "01121122112110",
    "11111111111111",
    "00111011011100",
    "00010000001000"
  ],

  drawMatrix(ctx, matrix, centerX, centerY, pixelSize, palette) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const startX = centerX - (cols * pixelSize) / 2;
    const startY = centerY - (rows * pixelSize) / 2;

    for (let r = 0; r < rows; r++) {
      const rowStr = matrix[r];
      for (let c = 0; c < cols; c++) {
        const ch = rowStr[c];
        if (ch !== '0' && palette[ch]) {
          ctx.fillStyle = palette[ch];
          ctx.fillRect(
            Math.floor(startX + c * pixelSize),
            Math.floor(startY + r * pixelSize),
            Math.ceil(pixelSize),
            Math.ceil(pixelSize)
          );
        }
      }
    }
  },

  drawPlayer(ctx, player, time) {
    ctx.save();

    // Draw Dash Afterimages if dashing
    if (player.dashTimer > 0 && player.trail) {
      player.trail.forEach((pt, idx) => {
        ctx.globalAlpha = 0.15 * (idx + 1);
        this.drawMatrix(ctx, this.heroMatrix, pt.x, pt.y, 3.2, {
          '1': '#00f0ff',
          '2': '#00f0ff',
          '3': '#ffffff',
          '4': '#00f0ff'
        });
      });
      ctx.globalAlpha = 1;
    }

    // Invulnerability blink
    if (player.invulnTimer > 0 && Math.floor(time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Thruster flame animation
    const flameHeight = 6 + Math.sin(time * 45) * 4;
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(player.x - 10, player.y + 15, 4, flameHeight);
    ctx.fillRect(player.x + 6, player.y + 15, 4, flameHeight);
    ctx.fillStyle = '#ff6b2b';
    ctx.fillRect(player.x - 2, player.y + 16, 4, flameHeight + 3);

    // Hero ship pixel art
    this.drawMatrix(ctx, this.heroMatrix, player.x, player.y, 3.4, {
      '1': '#eef4ff', // Hull white
      '2': '#ff5722', // CodeRabbit inner ear / wing stripe
      '3': '#00f0ff', // Cyber visor
      '4': '#ffe600'  // Core accents
    });

    // Git Revert Shield bubble
    if (player.shield > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 26, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 136, ${0.55 + Math.sin(time * 8) * 0.25})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
      ctx.fill();
    }

    // Cloud Run Autoscaler Wingman Drone
    if (player.wingmanTimer > 0) {
      const wx = player.x + Math.cos(time * 3) * 6 + 38;
      const wy = player.y - 6 + Math.sin(time * 5) * 4;
      ctx.fillStyle = '#4285f4';
      ctx.fillRect(wx - 7, wy - 5, 14, 10);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(wx - 4, wy - 2, 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx - 5, wy - 9, 3, 4);
      ctx.fillRect(wx + 2, wy - 9, 3, 4);
    }

    ctx.restore();
  },

  drawEnemy(ctx, enemy, frameIndex, time) {
    ctx.save();
    let frames = this.nullFrames;
    let palette = { '1': '#00f0ff', '2': '#ffffff' };

    if (enemy.type === 'conflict') {
      frames = this.conflictFrames;
      palette = { '1': '#ff2a85', '2': '#ffe600' };
    } else if (enemy.type === 'leak') {
      frames = this.leakFrames;
      palette = { '1': '#00ff88', '2': '#b537f2' };
    } else if (enemy.type === 'race') {
      frames = this.raceFrames;
      palette = { '1': '#ffe600', '2': '#00f0ff' };
    } else {
      frames = this.nullFrames;
      palette = { '1': '#7c9eff', '2': '#ff6b2b' };
    }

    // Flash white when damaged
    if (enemy.hitFlash > 0) {
      palette = { '1': '#ffffff', '2': '#ffffff' };
    }

    const matrix = frames[frameIndex % 2];
    const scale = enemy.scale || 2.8;
    this.drawMatrix(ctx, matrix, enemy.x, enemy.y, scale, palette);

    // Label tag on diving elite enemies
    if (enemy.state === 'diving') {
      ctx.fillStyle = '#ff2a85';
      ctx.font = 'bold 9px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('<<<<<<<', enemy.x, enemy.y - 16);
    }

    ctx.restore();
  },

  drawUFO(ctx, ufo, time) {
    ctx.save();
    const blink = Math.floor(time * 12) % 2 === 0 ? '#ffe600' : '#00f0ff';
    this.drawMatrix(ctx, this.ufoMatrix, ufo.x, ufo.y, 3.0, {
      '1': '#ff2a85',
      '2': blink
    });
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ FRIDAY DEPLOY', ufo.x, ufo.y - 14);
    ctx.restore();
  },

  drawBoss(ctx, boss, time) {
    ctx.save();
    const x = boss.x;
    const y = boss.y;
    const flash = boss.hitFlash > 0;

    // Outer Aura
    ctx.strokeStyle = flash ? '#ffffff' : '#ff2a85';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 48 + Math.sin(time * 6) * 4, 0, Math.PI * 2);
    ctx.stroke();

    // Animated Spaghetti Code Tentacles
    for (let i = -3; i <= 3; i++) {
      ctx.strokeStyle = i % 2 === 0 ? '#b537f2' : '#ff6b2b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + i * 16, y + 18);
      const waveX = x + i * 20 + Math.sin(time * 5 + i) * 12;
      const waveY = y + 48 + Math.cos(time * 4 + i) * 6;
      ctx.quadraticCurveTo(waveX, y + 34, waveX, waveY);
      ctx.stroke();
    }

    // Core Monolith Body
    ctx.fillStyle = flash ? '#ffffff' : '#1b102e';
    ctx.fillRect(x - 64, y - 30, 128, 56);
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 64, y - 30, 128, 56);

    // Angry Cyber Eyes / Core
    ctx.fillStyle = '#ffe600';
    ctx.fillRect(x - 42, y - 14, 22, 12);
    ctx.fillRect(x + 20, y - 14, 22, 12);
    ctx.fillStyle = '#ff0044';
    ctx.fillRect(x - 34, y - 10, 8, 8);
    ctx.fillRect(x + 26, y - 10, 8, 8);

    // CodeRabbit Vulnerability Target Weak-Spot
    const weakX = x + Math.sin(time * 2.2) * 36;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(weakX - 12, y + 2, 24, 16);
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 9px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('2X CRIT', weakX, y - 2);
    boss.weakSpotX = weakX;

    // Boss Name & Health Bar
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Courier New';
    ctx.fillText(boss.name, x, y - 46);

    const barW = 160;
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x - barW / 2, y - 40, barW, 7);
    ctx.fillStyle = hpRatio > 0.35 ? '#ff2a85' : '#ffe600';
    ctx.fillRect(x - barW / 2, y - 40, barW * hpRatio, 7);

    ctx.restore();
  }
};

window.Sprites = Sprites;
