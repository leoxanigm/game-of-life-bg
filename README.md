# Game of Life Background

A dependency-free Conway's Game of Life animation rendered on a full-screen
HTML canvas. The simulation uses a flat grid, wraps at the viewport edges, and
keeps its existing state when the browser window is resized.

## Usage

Add a canvas to the page and load the script:

```html
<canvas id="game-of-life-bg" role="presentation"></canvas>
<script src="game-of-life.js"></script>
```

The included `index.html` contains the required full-screen canvas styling.
Page content should be placed on a layer above the canvas.

Create, seed, and start the simulation:

```js
const canvas = document.getElementById('game-of-life-bg');
const game = new GameOfLife(canvas, {
  cellSize: 10,
  stepInterval: 100,
  initialDensity: 0.2,
  fillStyle: '#383a41'
});

game.seed();
game.start();
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `cellSize` | Responsive, minimum `5` | Cell width and height in pixels. |
| `stepInterval` | `150` | Time in milliseconds between generations. |
| `initialDensity` | `0.3` | Probability that a cell starts alive, from `0` to `1`. |
| `fillStyle` | `white` | Canvas fill style used for live cells. |

## Public methods

- `seed()` randomly initializes the grid using `initialDensity`.
- `start()` renders the grid and starts the animation loop.
- `stop()` pauses the animation without clearing its state.
- `resize()` resizes the canvas and preserves the overlapping grid area.
- `clear()` clears the canvas without changing the simulation state.
- `destroy()` stops the animation, removes event listeners, and releases the grids.

Call `destroy()` when removing the background from a page. A destroyed instance
should not be started again.

## Implementation notes

The simulation stores the current and next generations in two `Uint8Array`
buffers. Each update calculates the next generation and swaps the buffers,
avoiding an array allocation or full-grid copy on every step.

`requestAnimationFrame` drives rendering, while an elapsed-time accumulator keeps
the simulation speed independent of the display refresh rate. The grid uses
wrapped boundaries, so cells at opposite viewport edges are neighbors.
