import * as PIXI from "pixi.js";
import { BlurFilter } from "@pixi/filter-blur";

interface Orb {
  sprite: PIXI.Graphics;
  color: number;
  x: number;
  y: number;
  radius: number;
  active: boolean;
  exploding: boolean;
  glowFilter: BlurFilter;
  col: number;
  row: number;
}

export class NeonChainGame {
  private app: PIXI.Application;
  private container: HTMLElement;
  private orbs: Orb[] = [];
  private score: number = 0;
  private timeLeft: number = 60;
  private gameOver: boolean = false;
  private colors: number[] = [
    0xff1744, // Neon Red
    0x00e5ff, // Neon Cyan
    0xffea00, // Neon Yellow
    0x76ff03, // Neon Green
    0xe040fb, // Neon Purple
  ];
  private scoreText!: PIXI.Text;
  private timerText!: PIXI.Text;
  private gameOverContainer!: PIXI.Container;
  private particles: PIXI.Graphics[] = [];
  private comboText!: PIXI.Text;
  private titleText!: PIXI.Text;
  private currentCombo: number = 0;
  private timerId: number | undefined;
  private tickerCb: ((delta: number) => void) | undefined;
  // Responsive layout state
  private cols: number = 8;
  private rows: number = 6;
  private baseOrbRadius: number = 35;
  private currentOrbRadius: number = 35;
  private currentSpacing: number = 90;
  private offsetX: number = 0;
  private offsetY: number = 120;
  private onResizeHandler?: () => void;
  private readonly aspectRatio: number = 4 / 3; // Width / Height
  private gridColors: number[][] = [];
  private colorCounts: Map<number, number> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x0a0a0a,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    container.appendChild(this.app.view as HTMLCanvasElement);

    // Prepare initial size and listeners before content
    this.setupResize();

    this.init();
  }

  private async init() {
    this.createUI();
    this.createOrbs();
    this.startGameLoop();
    this.startTimer();
    // Layout once content is created
    this.layout();
  }

  private createUI() {
    // Score text
    this.scoreText = new PIXI.Text("SCORE: 0", {
      fontFamily: "Arial",
      fontSize: 32,
      fontWeight: "bold",
      fill: 0x00e5ff,
      dropShadow: true,
      dropShadowColor: 0x00e5ff,
      dropShadowBlur: 10,
      dropShadowDistance: 0,
    });
    this.scoreText.position.set(20, 20);
    this.app.stage.addChild(this.scoreText);

    // Timer text
    this.timerText = new PIXI.Text("TIME: 60", {
      fontFamily: "Arial",
      fontSize: 32,
      fontWeight: "bold",
      fill: 0xff1744,
      dropShadow: true,
      dropShadowColor: 0xff1744,
      dropShadowBlur: 10,
      dropShadowDistance: 0,
    });
    this.timerText.position.set(this.app.screen.width - 180, 20);
    this.app.stage.addChild(this.timerText);

    // Combo text
    this.comboText = new PIXI.Text("", {
      fontFamily: "Arial",
      fontSize: 48,
      fontWeight: "bold",
      fill: 0xffea00,
      dropShadow: true,
      dropShadowColor: 0xffea00,
      dropShadowBlur: 15,
      dropShadowDistance: 0,
    });
    this.comboText.anchor.set(0.5);
    this.comboText.position.set(this.app.screen.width / 2, 100);
    this.comboText.alpha = 0;
    this.app.stage.addChild(this.comboText);

    // Title
    this.titleText = new PIXI.Text("NEON CHAIN REACTION", {
      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: "bold",
      fill: 0xe040fb,
      dropShadow: true,
      dropShadowColor: 0xe040fb,
      dropShadowBlur: 8,
      dropShadowDistance: 0,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.position.set(this.app.screen.width / 2, 30);
    this.app.stage.addChild(this.titleText);
  }

  private createOrbs() {
    // Ensure layout state is up to date
    this.computeLayout();

    // Prepare color grid to bias neighbors and create clusters
    this.gridColors = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(-1),
    );
    // Reset global color counters for more even distribution
    this.colorCounts = new Map(
      this.colors.map((c) => [c, 0] as [number, number]),
    );

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const x = this.offsetX + col * this.currentSpacing;
        const y = this.offsetY + row * this.currentSpacing;
        const color = this.pickColorForCell(col, row);
        this.gridColors[row][col] = color;
        this.colorCounts.set(color, (this.colorCounts.get(color) ?? 0) + 1);

        this.createOrb(x, y, this.baseOrbRadius, color, col, row);
      }
    }
  }

  private pickColorForCell(col: number, row: number): number {
    // Sticky clustering: heavily weight neighbor colors and run continuations
    const left = col > 0 ? this.gridColors[row][col - 1] : undefined;
    const left2 = col > 1 ? this.gridColors[row][col - 2] : undefined;
    const left3 = col > 2 ? this.gridColors[row][col - 3] : undefined;
    const top = row > 0 ? this.gridColors[row - 1][col] : undefined;
    const top2 = row > 1 ? this.gridColors[row - 2][col] : undefined;
    const top3 = row > 2 ? this.gridColors[row - 3][col] : undefined;
    const diagL =
      row > 0 && col > 0 ? this.gridColors[row - 1][col - 1] : undefined;
    const diagR =
      row > 0 && col < this.cols - 1
        ? this.gridColors[row - 1][col + 1]
        : undefined;

    const entries: { color: number; weight: number }[] = [];
    for (const color of this.colors) {
      let w = 1; // base weight

      // Strong boost for immediate neighbors
      if (left === color) w += 8;
      if (top === color) w += 8;

      // Amplify continuation of runs even more
      if (left === color && left2 === color) w += 10;
      if (top === color && top2 === color) w += 10;
      if (left === color && left2 === color && left3 === color) w += 6;
      if (top === color && top2 === color && top3 === color) w += 6;

      // Diagonals slightly encourage blocks to stick
      if (diagL === color) w += 3;
      if (diagR === color) w += 3;

      // If left and top are same and match this color — huge boost to grow the blob
      if (
        left !== undefined &&
        top !== undefined &&
        left === top &&
        left === color
      ) {
        w += 18;
      }

      // Small correction to prevent one color from dominating globally
      const used = this.colorCounts.get(color) ?? 0;
      w = w / (1 + used * 0.01);

      entries.push({ color, weight: Math.max(0.0001, w) });
    }

    // Stochastic weighted choice
    const total = entries.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const e of entries) {
      r -= e.weight;
      if (r <= 0) return e.color;
    }
    return entries[entries.length - 1].color;
  }

  private createOrb(
    x: number,
    y: number,
    radius: number,
    color: number,
    col: number,
    row: number,
  ) {
    const orb = new PIXI.Graphics();
    orb.beginFill(color);
    orb.drawCircle(0, 0, radius);
    orb.endFill();
    orb.position.set(x, y);
    orb.interactive = true;
    orb.cursor = "pointer";

    // Add blur filter to simulate glow
    const glowFilter = new BlurFilter(2, 1);
    glowFilter.repeatEdgePixels = false;
    orb.filters = [glowFilter];

    const orbData: Orb = {
      sprite: orb,
      color: color,
      x: x,
      y: y,
      radius: radius,
      active: true,
      exploding: false,
      glowFilter: glowFilter,
      col,
      row,
    };

    orb.on("pointerdown", () => this.onOrbClick(orbData));

    this.orbs.push(orbData);
    this.app.stage.addChild(orb);

    // Entrance animation
    orb.scale.set(0);
    orb.alpha = 0;
    this.animateOrbEntrance(orb);
  }

  private setupResize() {
    // Compute initial best-fit size and resize renderer
    this.resizeRendererToWindow();

    if (!this.onResizeHandler) {
      this.onResizeHandler = () => {
        this.resizeRendererToWindow();
        this.layout();
      };
      window.addEventListener("resize", this.onResizeHandler);
      window.addEventListener("orientationchange", this.onResizeHandler);
    }
  }

  private resizeRendererToWindow() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 20; // viewport padding
    const maxW = Math.max(320, vw - pad);
    const maxH = Math.max(240, vh - pad);

    // Keep designed aspect ratio (4:3)
    const wBasedOnH = Math.floor(maxH * this.aspectRatio);
    const hBasedOnW = Math.floor(maxW / this.aspectRatio);
    let width = maxW;
    let height = hBasedOnW;
    if (wBasedOnH <= maxW) {
      width = wBasedOnH;
      height = maxH;
    }

    this.app.renderer.resize(width, height);
  }

  private computeLayout() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    const sideMargin = Math.max(16, Math.min(40, Math.round(width * 0.04)));
    let topMargin = Math.max(60, Math.min(150, Math.round(height * 0.12)));
    const bottomMargin = Math.max(16, Math.min(60, Math.round(height * 0.06)));

    // First pass: estimate spacing and radius
    const gridWidthAvail = width - sideMargin * 2;
    let gridHeightAvail = height - (topMargin + bottomMargin);
    const spacingX = gridWidthAvail / (this.cols - 1);
    let spacingY = gridHeightAvail / (this.rows - 1);
    this.currentSpacing = Math.min(spacingX, spacingY);
    this.currentOrbRadius = Math.max(
      12,
      Math.min(this.currentSpacing * 0.39, 60),
    );

    // Ensure orbs don't collide with the top UI: add enough margin for text + radius
    const uiHeight = Math.max(
      this.scoreText ? this.scoreText.height : 0,
      this.timerText ? this.timerText.height : 0,
      this.titleText ? this.titleText.height : 0,
    );
    const minTop = Math.ceil(uiHeight + this.currentOrbRadius + 16);
    if (topMargin < minTop) {
      topMargin = minTop;
      gridHeightAvail = height - (topMargin + bottomMargin);
      spacingY = gridHeightAvail / (this.rows - 1);
      this.currentSpacing = Math.min(spacingX, spacingY);
      this.currentOrbRadius = Math.max(
        12,
        Math.min(this.currentSpacing * 0.39, 60),
      );
    }

    const gridWidth = (this.cols - 1) * this.currentSpacing;
    const gridHeight = (this.rows - 1) * this.currentSpacing;
    this.offsetX = Math.floor((width - gridWidth) / 2);
    this.offsetY = Math.floor(topMargin + (gridHeightAvail - gridHeight) / 2);
  }

  private layout() {
    // Pass 1: use current sizes to compute layout
    this.computeLayout();

    // UI text scaling relative to base 800x600
    const s = this.app.screen.width / 800;
    this.scoreText.style.fontSize = Math.max(16, Math.round(32 * s));
    this.timerText.style.fontSize = Math.max(16, Math.round(32 * s));
    this.comboText.style.fontSize = Math.max(24, Math.round(48 * s));
    this.titleText.style.fontSize = Math.max(12, Math.round(24 * s));

    this.scoreText.position.set(Math.round(20 * s), Math.round(20 * s));
    // Align timer to right edge with padding
    this.timerText.position.set(
      Math.round(this.app.screen.width - this.timerText.width - 20 * s),
      Math.round(20 * s),
    );
    this.comboText.position.set(
      Math.round(this.app.screen.width / 2),
      Math.round(100 * s),
    );
    this.titleText.position.set(
      Math.round(this.app.screen.width / 2),
      Math.round(30 * s),
    );

    // Pass 2: fonts changed -> recompute margins and grid
    this.computeLayout();

    // Orbs: position and scale to current radius
    const targetScale = this.currentOrbRadius / this.baseOrbRadius;
    for (const orb of this.orbs) {
      // Skip destroyed sprites
      if (orb.sprite.destroyed) continue;
      const x = this.offsetX + orb.col * this.currentSpacing;
      const y = this.offsetY + orb.row * this.currentSpacing;
      orb.x = x;
      orb.y = y;
      orb.sprite.position.set(x, y);
      if (orb.active && !orb.exploding) {
        orb.sprite.scale.set(targetScale);
      }
    }

    // If game over UI is visible, rebuild to fit new size
    if (this.gameOver && this.gameOverContainer) {
      this.app.stage.removeChild(this.gameOverContainer);
      this.gameOverContainer.destroy({ children: true });
      this.showGameOver();
    }
  }

  private animateOrbEntrance(sprite: PIXI.Graphics) {
    const duration = 300;
    const startTime = Date.now();
    const targetScale = this.currentOrbRadius / this.baseOrbRadius;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      sprite.scale.set(eased * targetScale);
      sprite.alpha = eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private onOrbClick(orb: Orb) {
    if (this.gameOver || !orb.active || orb.exploding) return;

    this.currentCombo = 0;
    this.explodeOrb(orb, true);
  }

  private explodeOrb(orb: Orb, isInitial: boolean = false) {
    if (!orb.active || orb.exploding) return;

    orb.exploding = true;
    orb.active = false;
    this.currentCombo++;

    // Add score
    const points = isInitial ? 10 : 5 * this.currentCombo;
    this.score += points;
    this.updateScore();

    // Show combo
    if (this.currentCombo > 2) {
      this.showCombo();
    }

    // Create explosion particles
    this.createExplosionParticles(orb.x, orb.y, orb.color);

    // Animate orb explosion
    const sprite = orb.sprite;
    const duration = 300;
    const startTime = Date.now();
    const startScale = sprite.scale.x;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      sprite.scale.set(startScale * (1 + progress * 2));
      sprite.alpha = 1 - progress;
      // Increase blur to simulate stronger glow during explosion
      orb.glowFilter.blur = 2 + progress * 8;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.app.stage.removeChild(sprite);
        sprite.destroy();
        // Mark explosion as finished then check for end condition
        orb.exploding = false;
        this.checkAllOrbsPopped();
      }
    };

    animate();

    // Chain reaction
    setTimeout(() => {
      this.chainReaction(orb);
    }, 100);
  }

  private checkAllOrbsPopped() {
    if (this.gameOver) return;
    const allPopped = this.orbs.every((o) => !o.active && !o.exploding);
    if (allPopped) {
      this.endGame();
    }
  }

  private chainReaction(sourceOrb: Orb) {
    // Keep explosion radius proportional to orb size (~120 for radius 35)
    const explosionRadius = (120 / 35) * this.currentOrbRadius;

    for (const orb of this.orbs) {
      if (!orb.active || orb.exploding || orb === sourceOrb) continue;

      const dx = orb.x - sourceOrb.x;
      const dy = orb.y - sourceOrb.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < explosionRadius && orb.color === sourceOrb.color) {
        setTimeout(() => {
          this.explodeOrb(orb, false);
        }, 100);
      }
    }
  }

  private createExplosionParticles(x: number, y: number, color: number) {
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const particle = new PIXI.Graphics();
      particle.beginFill(color);
      particle.drawCircle(0, 0, Math.random() * 4 + 2);
      particle.endFill();
      particle.position.set(x, y);

      const glowFilter = new BlurFilter(2, 1);
      particle.filters = [glowFilter];

      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Math.random() * 3 + 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.app.stage.addChild(particle);
      this.particles.push(particle);

      this.animateParticle(particle, vx, vy);
    }
  }

  private animateParticle(particle: PIXI.Graphics, vx: number, vy: number) {
    const duration = 800;
    const startTime = Date.now();
    const startX = particle.x;
    const startY = particle.y;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      particle.x = startX + vx * elapsed * 0.1;
      particle.y = startY + vy * elapsed * 0.1;
      particle.alpha = 1 - progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.app.stage.removeChild(particle);
        particle.destroy();
        const index = this.particles.indexOf(particle);
        if (index > -1) this.particles.splice(index, 1);
      }
    };

    animate();
  }

  private showCombo() {
    this.comboText.text = `COMBO x${this.currentCombo}!`;
    this.comboText.alpha = 1;
    this.comboText.scale.set(0.5);

    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.3) {
        this.comboText.scale.set(0.5 + progress * 2);
      } else {
        this.comboText.alpha = 1 - (progress - 0.3) / 0.7;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private updateScore() {
    this.scoreText.text = `SCORE: ${this.score}`;
  }

  private startTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
    this.timerId = window.setInterval(() => {
      if (this.gameOver) {
        if (this.timerId) {
          clearInterval(this.timerId);
          this.timerId = undefined;
        }
        return;
      }

      this.timeLeft--;
      this.timerText.text = `TIME: ${this.timeLeft}`;

      if (this.timeLeft <= 0) {
        this.endGame();
        if (this.timerId) {
          clearInterval(this.timerId);
          this.timerId = undefined;
        }
      }
    }, 1000);
  }

  private endGame() {
    this.gameOver = true;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
    this.showGameOver();
  }

  private showGameOver() {
    // Create game over container
    this.gameOverContainer = new PIXI.Container();
    this.app.stage.addChild(this.gameOverContainer);

    // Semi-transparent background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.8);
    bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.endFill();
    this.gameOverContainer.addChild(bg);

    // Game Over text
    const s = this.app.screen.width / 800;
    const gameOverText = new PIXI.Text("GAME OVER", {
      fontFamily: "Arial",
      fontSize: Math.max(32, Math.round(64 * s)),
      fontWeight: "bold",
      fill: 0xff1744,
      dropShadow: true,
      dropShadowColor: 0xff1744,
      dropShadowBlur: 20,
      dropShadowDistance: 0,
    });
    gameOverText.anchor.set(0.5);
    gameOverText.position.set(this.app.screen.width / 2, Math.round(150 * s));
    this.gameOverContainer.addChild(gameOverText);

    // Final score
    const finalScore = new PIXI.Text(`FINAL SCORE: ${this.score}`, {
      fontFamily: "Arial",
      fontSize: Math.max(18, Math.round(36 * s)),
      fontWeight: "bold",
      fill: 0x00e5ff,
      dropShadow: true,
      dropShadowColor: 0x00e5ff,
      dropShadowBlur: 15,
      dropShadowDistance: 0,
    });
    finalScore.anchor.set(0.5);
    finalScore.position.set(this.app.screen.width / 2, Math.round(250 * s));
    this.gameOverContainer.addChild(finalScore);

    // Restart button
    this.createButton(
      "RESTART",
      this.app.screen.width / 2,
      Math.round(350 * s),
      () => this.restart(),
      s,
    );

    // Download button
    this.createButton(
      "DOWNLOAD",
      this.app.screen.width / 2,
      Math.round(450 * s),
      () => this.download(),
      s,
    );
  }

  private createButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
    scale: number = 1,
  ) {
    const button = new PIXI.Container();
    button.position.set(x, y);
    button.interactive = true;
    button.cursor = "pointer";

    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a1a);
    bg.lineStyle(3, text === "RESTART" ? 0x76ff03 : 0xe040fb);
    bg.drawRoundedRect(-100, -30, 200, 60, 10);
    bg.endFill();
    button.addChild(bg);

    const glowFilter = new BlurFilter(1.5, 1);
    bg.filters = [glowFilter];

    const buttonText = new PIXI.Text(text, {
      fontFamily: "Arial",
      fontSize: Math.max(14, Math.round(28 * scale)),
      fontWeight: "bold",
      fill: text === "RESTART" ? 0x76ff03 : 0xe040fb,
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);

    const clampedScale = Math.max(0.6, Math.min(1.5, scale));
    button.scale.set(clampedScale);

    button.on("pointerdown", onClick);
    button.on("pointerover", () => {
      bg.scale.set(1.1);
      glowFilter.blur = 3;
    });
    button.on("pointerout", () => {
      bg.scale.set(1);
      glowFilter.blur = 1.5;
    });

    this.gameOverContainer.addChild(button);
  }

  private restart() {
    // Clear everything
    this.app.stage.removeChildren();
    this.orbs = [];
    this.particles = [];
    this.score = 0;
    this.timeLeft = 60;
    this.gameOver = false;
    this.currentCombo = 0;

    // Reinitialize
    this.init();
  }

  private download() {
    // Open external site instead of downloading a screenshot
    window.open("https://example.com", "_blank");
  }

  private startGameLoop() {
    // Prevent multiple ticker callbacks on restart
    if (this.tickerCb) {
      this.app.ticker.remove(this.tickerCb);
      this.tickerCb = undefined;
    }

    this.tickerCb = () => {
      // Update glow effects
      this.orbs.forEach((orb) => {
        if (orb.active && !orb.exploding) {
          const time = Date.now() * 0.002;
          // Subtle breathing glow effect via blur
          orb.glowFilter.blur = 2 + Math.sin(time + orb.x) * 0.5;
        }
      });
    };

    this.app.ticker.add(this.tickerCb);
  }
}
