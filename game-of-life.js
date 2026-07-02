class GameOfLife {
  canvas;
  ctx;

  cellSize;
  stepInterval;
  initialDensity;
  fillStyle;

  columns;
  rows;
  currentGrid;
  nextGrid;

  lastTimestamp;
  accumulator;
  animationFrameId;
  running;

  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.cellSize =
      options.cellSize ?? Math.max(5, Math.floor(this.canvas.width / 200));
    this.stepInterval = options.stepInterval ?? 150;
    this.initialDensity = options.initialDensity ?? 0.3;
    this.fillStyle = options.fillStyle ?? 'white';

    this.columns = Math.ceil(this.canvas.width / this.cellSize);
    this.rows = Math.ceil(this.canvas.height / this.cellSize);
    this.currentGrid = new Uint8Array(this.columns * this.rows);
    this.nextGrid = new Uint8Array(this.columns * this.rows);

    this.lastTimestamp = null;
    this.accumulator = 0;
    this.animationFrameId = null;
    this.running = false;

    this.animate = this.animate.bind(this); // We're going to use 'this' in animate function
    this.resize = this.resize.bind(this);

    window.addEventListener('resize', this.resize);
  }

  start() {
    if (this.running) return;

    this.running = true;
    this.lastTimestamp = null;
    this.accumulator = 0;

    this.render();

    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  stop() {
    this.running = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.clear();

    this.currentGrid = null;
    this.nextGrid = null;
  }

  resize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    if (this.canvas.width === newWidth && this.canvas.height === newHeight) {
      return;
    }

    const oldColumns = this.columns;
    const oldRows = this.rows;
    const oldGrid = this.currentGrid;

    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    this.columns = Math.ceil(newWidth / this.cellSize);
    this.rows = Math.ceil(newHeight / this.cellSize);

    this.currentGrid = new Uint8Array(this.columns * this.rows);
    this.nextGrid = new Uint8Array(this.columns * this.rows);

    const copiedColumns = Math.min(oldColumns, this.columns);
    const copiedRows = Math.min(oldRows, this.rows);

    this.seed();

    // Copy previous grid to new one to preserve state of visible window
    for (let y = 0; y < copiedRows; y++) {
      for (let x = 0; x < copiedColumns; x++) {
        const oldIndex = y * oldColumns + x;
        const newIndex = y * this.columns + x;

        this.currentGrid[newIndex] = oldGrid[oldIndex];
      }
    }

    this.lastTimestamp = null;
    this.accumulator = 0;
    this.render();
  }

  seed() {
    // Init random currentGrid based on initial density
    for (let i = 0; i < this.columns * this.rows; i++) {
      this.currentGrid[i] = Math.random() < this.initialDensity;
    }

    this.nextGrid.fill(0);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Updates the next grid using Conway's rules:
   * - A live cell survives with two or three neighbors.
   * - A dead cell becomes alive with exactly three neighbors.
   * - Every other cell becomes or remains dead.
   */
  update() {
    let index, neighbors, isAlive;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        index = this.at(x, y);
        neighbors = this.countNeighbors(x, y);
        isAlive = this.currentGrid[index] === 1;

        this.nextGrid[index] =
          neighbors === 3 || (isAlive && neighbors === 2) ? 1 : 0;
      }
    }

    [this.currentGrid, this.nextGrid] = [this.nextGrid, this.currentGrid];
  }

  /**
   * Clears the canvas and draws every live cell in the current generation.
   * This method only visualizes state; it does not advance the simulation.
   */
  render() {
    this.clear();
    this.ctx.fillStyle = this.fillStyle;

    let index;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        index = y * this.columns + x; // No need for modulo operations, so we don't use 'at'

        if (this.currentGrid[index] === 1) {
          this.ctx.fillRect(
            x * this.cellSize,
            y * this.cellSize,
            this.cellSize,
            this.cellSize
          );
        }
      }
    }
  }

  /**
   * Calculates the amount of alive cells around a cell given by indices x, y
   * @param {int} x
   * @param {int} y
   * @returns {int} number of alive cells around cell at x, y
   */
  countNeighbors(x, y) {
    return (
      this.currentGrid[this.at(x - 1, y - 1)] +
      this.currentGrid[this.at(x, y - 1)] +
      this.currentGrid[this.at(x + 1, y - 1)] +
      this.currentGrid[this.at(x + 1, y)] +
      this.currentGrid[this.at(x + 1, y + 1)] +
      this.currentGrid[this.at(x, y + 1)] +
      this.currentGrid[this.at(x - 1, y + 1)] +
      this.currentGrid[this.at(x - 1, y)]
    );
  }

  /**
   * Calculates index for 1D grid based on col, row index.
   * It also wraps coordinates around for indices outside of grid for smooth animation.
   * Eg, (-1, -1) -> (3, 3) for a 4 by 4 grid
   * @param {int} x
   * @param {int} y
   * @returns 1D array index
   */
  at(x, y) {
    const wrappedX = (x + this.columns) % this.columns;
    const wrappedY = (y + this.rows) % this.rows;

    return wrappedY * this.columns + wrappedX;
  }

  /**
   * Runs the animation loop and advances the simulation at a fixed interval.
   * Elapsed frame time is accumulated so delayed frames can perform any missed
   * updates before the current generation is rendered.
   * @param {DOMHighResTimeStamp} timestamp Time supplied by requestAnimationFrame.
   */
  animate(timestamp) {
    if (!this.running) return;

    if (this.lastTimestamp === null) this.lastTimestamp = timestamp;

    const elapsed = Math.min(timestamp - this.lastTimestamp, 250);
    this.lastTimestamp = timestamp;
    this.accumulator += elapsed;

    let stateChanged = false;

    while (this.accumulator >= this.stepInterval) {
      this.update();
      this.accumulator -= this.stepInterval;
      stateChanged = true;
    }

    if (stateChanged) this.render();

    this.animationFrameId = requestAnimationFrame(this.animate);
  }
}

let gameOfLifeBg; // Globally declared in case we need to call destroy() for cleanup later.

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-of-life-bg');
  gameOfLifeBg = new GameOfLife(canvas, {
    cellSize: 10,
    stepInterval: 100,
    initialDensity: 0.2,
    fillStyle: '#383a41'
  });

  gameOfLifeBg.seed();
  gameOfLifeBg.start();
});
