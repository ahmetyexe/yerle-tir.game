import './style.css';
import { TetrominoType, Grid, Tetromino, Position } from './types';
import { COLS, ROWS, COLORS, SHAPES } from './constants';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: Grid;
  private activePiece: Tetromino | null = null;
  private nextPiece: TetrominoType;
  private holdPiece: TetrominoType | null = null;
  private canHold = true;
  private score = 0;
  private bestScore = 0;
  private level = 1;
  private lines = 0;
  private isPaused = false;
  private gameOver = false;
  private clearingLines: number[] = [];
  private lastTime = 0;
  private dropCounter = 0;
  private isSpawning = false;
  private logicalWidth = 200;
  private logicalHeight = 400;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    this.nextPiece = this.getRandomType();
    // Load best score from localStorage
    const saved = localStorage.getItem('tetris-best-score');
    this.bestScore = saved ? parseInt(saved, 10) : 0;
    this.init();
    // Show best score on start screen
    const startBest = document.getElementById('start-best-score');
    if (startBest) startBest.textContent = this.bestScore.toLocaleString();
  }

  private init() {
    this.setupControls();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    document.getElementById('start-btn')?.addEventListener('click', () => this.start());
    document.getElementById('restart-btn')?.addEventListener('click', () => this.start());
    document.getElementById('resume-btn')?.addEventListener('click', () => this.togglePause());
    document.getElementById('pause-toggle')?.addEventListener('click', () => this.togglePause());
  }

  private start() {
    document.getElementById('start-screen')?.classList.add('hidden');
    document.getElementById('game-over-overlay')?.classList.remove('active');
    // Recalculate canvas size now that the game container is fully visible
    requestAnimationFrame(() => this.resize());
    this.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.gameOver = false;
    this.isPaused = false;
    this.holdPiece = null;
    this.updateStats();
    this.spawnPiece();
    this.animate();
  }

  private togglePause() {
    if (this.gameOver) return;
    this.isPaused = !this.isPaused;
    document.getElementById('pause-overlay')?.classList.toggle('active', this.isPaused);
    const icon = document.querySelector('#pause-toggle svg use');
    if (icon) {
      icon.setAttribute('href', this.isPaused ? '#icon-play' : '#icon-pause');
    }
    if (!this.isPaused) {
      this.lastTime = performance.now();
      this.animate();
    }
  }

  private getRandomType(): TetrominoType {
    const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private spawnPiece() {
    const type = this.nextPiece;
    const shape = SHAPES[type];
    const piece: Tetromino = {
      type,
      shape,
      color: COLORS[type],
      position: { x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 }
    };

    this.nextPiece = this.getRandomType();

    if (this.checkCollision(piece.position, piece.shape)) {
      this.endGame();
      return;
    }

    this.activePiece = piece;
    this.canHold = true;
    this.isSpawning = true;
    this.canvas.parentElement?.classList.add('animate-spawn');
    setTimeout(() => {
      this.isSpawning = false;
      this.canvas.parentElement?.classList.remove('animate-spawn');
    }, 300);
    this.updateStats();
  }

  private checkCollision(pos: Position, shape: number[][], grid = this.grid) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && grid[newY][newX] !== null)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private rotate() {
    if (!this.activePiece || this.isPaused || this.gameOver) return;
    this.vibrate(10);
    const shape = this.activePiece.shape;
    const newShape = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
    if (!this.checkCollision(this.activePiece.position, newShape)) {
      this.activePiece.shape = newShape;
    }
  }

  private move(dir: number) {
    if (!this.activePiece || this.isPaused || this.gameOver) return;
    this.vibrate(5);
    const newPos = { ...this.activePiece.position, x: this.activePiece.position.x + dir };
    if (!this.checkCollision(newPos, this.activePiece.shape)) {
      this.activePiece.position = newPos;
    }
  }

  private drop() {
    if (!this.activePiece || this.isPaused || this.gameOver) return;
    const newPos = { ...this.activePiece.position, y: this.activePiece.position.y + 1 };
    if (!this.checkCollision(newPos, this.activePiece.shape)) {
      this.activePiece.position = newPos;
    } else {
      this.lockPiece();
    }
    this.dropCounter = 0;
  }

  private hardDrop() {
    if (!this.activePiece || this.isPaused || this.gameOver) return;
    this.vibrate(20);
    let newY = this.activePiece.position.y;
    while (!this.checkCollision({ ...this.activePiece.position, y: newY + 1 }, this.activePiece.shape)) {
      newY++;
    }
    this.activePiece.position.y = newY;
    this.lockPiece();
  }

  private lockPiece() {
    if (!this.activePiece) return;

    this.activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const gridY = this.activePiece!.position.y + y;
          const gridX = this.activePiece!.position.x + x;
          if (gridY >= 0) this.grid[gridY][gridX] = this.activePiece!.type;
        }
      });
    });

    const fullLines: number[] = [];
    this.grid.forEach((row, y) => {
      if (row.every(cell => cell !== null)) fullLines.push(y);
    });

    if (fullLines.length > 0) {
      this.clearingLines = fullLines;
      this.vibrate(50);
      this.canvas.classList.add('line-clear-flash');

      setTimeout(() => {
        this.grid = this.grid.filter((_, y) => !fullLines.includes(y));
        while (this.grid.length < ROWS) this.grid.unshift(Array(COLS).fill(null));

        const points = [0, 100, 300, 500, 800][fullLines.length] * this.level;
        this.score += points;
        this.lines += fullLines.length;
        if (Math.floor(this.lines / 10) >= this.level) this.level++;

        this.clearingLines = [];
        this.canvas.classList.remove('line-clear-flash');
        this.activePiece = null;
        this.spawnPiece();
        this.updateStats();
      }, 400);
    } else {
      this.activePiece = null;
      this.spawnPiece();
    }
  }

  private hold() {
    if (!this.activePiece || !this.canHold || this.isPaused || this.gameOver) return;
    this.vibrate(15);
    const currentType = this.activePiece.type;
    if (this.holdPiece === null) {
      this.holdPiece = currentType;
      this.spawnPiece();
    } else {
      const type = this.holdPiece;
      this.holdPiece = currentType;
      const shape = SHAPES[type];
      this.activePiece = {
        type,
        shape,
        color: COLORS[type],
        position: { x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 }
      };
    }
    this.canHold = false;
    this.updateStats();
  }

  private vibrate(ms: number) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  private updateStats() {
    document.getElementById('score-val')!.textContent = this.score.toLocaleString();
    document.getElementById('level-val')!.textContent = this.level.toString();
    // Live-update best score during gameplay
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('tetris-best-score', this.bestScore.toString());
    }
    document.getElementById('best-score-val')!.textContent = this.bestScore.toLocaleString();
    this.drawPreview('next-preview', this.nextPiece);
    this.drawPreview('hold-preview', this.holdPiece);
  }

  private drawPreview(canvasId: string, type: TetrominoType | null) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;

    const shape = SHAPES[type];
    const size = 12;
    const color = COLORS[type];
    const offsetX = (canvas.width - shape[0].length * size) / 2;
    const offsetY = (canvas.height - shape.length * size) / 2;

    shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          this.drawBlock(ctx, offsetX + x * size, offsetY + y * size, size, color);
        }
      });
    });
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;

    // Calculate available space from the canvas wrapper
    const wrapper = this.canvas.parentElement;
    let availableWidth: number;
    let availableHeight: number;

    if (wrapper) {
      const wrapperStyle = getComputedStyle(wrapper);
      const wrapperPaddingH = parseFloat(wrapperStyle.paddingLeft) + parseFloat(wrapperStyle.paddingRight);
      const wrapperPaddingV = parseFloat(wrapperStyle.paddingTop) + parseFloat(wrapperStyle.paddingBottom);
      const wrapperBorderH = parseFloat(wrapperStyle.borderLeftWidth) + parseFloat(wrapperStyle.borderRightWidth);
      const wrapperBorderV = parseFloat(wrapperStyle.borderTopWidth) + parseFloat(wrapperStyle.borderBottomWidth);
      availableWidth = wrapper.clientWidth - wrapperPaddingH;
      availableHeight = wrapper.clientHeight - wrapperPaddingV;
    } else {
      availableWidth = Math.min(window.innerWidth - 32, 400);
      availableHeight = window.innerHeight - 200;
    }

    // Tetris board is 10 cols x 20 rows → aspect ratio 1:2 (width:height)
    // Try width-first: fill available width, calculate height
    let width = Math.floor(availableWidth);
    let height = width * 2;

    // If height exceeds available height, constrain by height instead
    if (height > availableHeight) {
      height = Math.floor(availableHeight);
      width = Math.floor(height / 2);
    }

    // Cap maximum size for desktop
    if (width > 400) {
      width = 400;
      height = 800;
    }

    // Ensure minimum size
    width = Math.max(width, 100);
    height = Math.max(height, 200);

    // Store logical dimensions for drawing
    this.logicalWidth = width;
    this.logicalHeight = height;

    // Set actual pixel dimensions (for rendering)
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    // Set display dimensions (CSS size)
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    // Reset and scale canvas coordinate system for device pixel ratio
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  private animate = (time = 0) => {
    if (this.isPaused || this.gameOver) return;

    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    this.dropCounter += deltaTime;

    const dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
    if (this.dropCounter > dropInterval) this.drop();

    this.draw();
    requestAnimationFrame(this.animate);
  }

  private draw() {
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const blockSize = width / COLS;
    this.ctx.clearRect(0, 0, width, height);

    // Grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * blockSize, 0);
      this.ctx.lineTo(x * blockSize, height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * blockSize);
      this.ctx.lineTo(width, y * blockSize);
      this.ctx.stroke();
    }
    // Bu alan 
    // Locked
    this.grid.forEach((row, y) => {
      const isClearing = this.clearingLines.includes(y);
      row.forEach((type, x) => {
        if (type) {
          this.ctx.globalAlpha = isClearing ? 0.5 : 1.0;
          this.drawBlock(this.ctx, x * blockSize, y * blockSize, blockSize, COLORS[type], isClearing);
        }
      });
    });
    this.ctx.globalAlpha = 1.0;

    // Active
    if (this.activePiece && !this.clearingLines.length) {
      // Ghost
      let ghostY = this.activePiece.position.y;
      while (!this.checkCollision({ ...this.activePiece.position, y: ghostY + 1 }, this.activePiece.shape)) ghostY++;

      this.activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            this.ctx.globalAlpha = 0.15;
            this.drawBlock(this.ctx, (this.activePiece!.position.x + x) * blockSize, (ghostY + y) * blockSize, blockSize, this.activePiece!.color);
            this.ctx.globalAlpha = 1.0;
            this.drawBlock(this.ctx, (this.activePiece!.position.x + x) * blockSize, (this.activePiece!.position.y + y) * blockSize, blockSize, this.activePiece!.color);
          }
        });
      });
    }
  }

  private drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, isExploding = false) {
    const p = 1;
    const bx = x + p;
    const by = y + p;
    const bs = size - p * 2;
    const r = 4;

    ctx.fillStyle = color;
    ctx.shadowBlur = isExploding ? 30 : 15;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.roundRect(bx, by, bs, bs, r);
    ctx.fill();
    ctx.shadowBlur = 0;

    const g = ctx.createRadialGradient(bx + bs / 2, by + bs / 2, 0, bx + bs / 2, by + bs / 2, bs / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + r, by + 1);
    ctx.lineTo(bx + bs - r, by + 1);
    ctx.stroke();
  }

  private endGame() {
    this.gameOver = true;
    // Check and update best score
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('tetris-best-score', this.bestScore.toString());
    }
    document.getElementById('game-over-overlay')?.classList.add('active');
    document.getElementById('final-score')!.textContent = this.score.toLocaleString();
    document.getElementById('best-score')!.textContent = this.bestScore.toLocaleString();
    // Update start screen best score for next visit
    const startBest = document.getElementById('start-best-score');
    if (startBest) startBest.textContent = this.bestScore.toLocaleString();
  }

  private setupControls() {
    document.getElementById('btn-left')?.addEventListener('click', () => this.move(-1));
    document.getElementById('btn-right')?.addEventListener('click', () => this.move(1));
    document.getElementById('btn-down')?.addEventListener('click', () => this.drop());
    document.getElementById('btn-hard-drop')?.addEventListener('click', () => this.hardDrop());
    document.getElementById('btn-hold')?.addEventListener('click', () => this.hold());
    document.getElementById('btn-rotate')?.addEventListener('click', () => this.rotate());

    window.addEventListener('keydown', (e) => {
      if (this.isPaused || this.gameOver) return;
      switch (e.key) {
        case 'ArrowLeft': this.move(-1); break;
        case 'ArrowRight': this.move(1); break;
        case 'ArrowDown': this.drop(); break;
        case 'ArrowUp': this.rotate(); break;
        case ' ': this.hardDrop(); break;
        case 'c': case 'C': this.hold(); break;
        case 'p': case 'P': this.togglePause(); break;
      }
    });
  }
}

new Game();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
