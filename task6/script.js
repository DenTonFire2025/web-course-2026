(function () {
  "use strict";

  const CONFIG = Object.freeze({
    gridSize: 20,
    cellSize: 20,
    moveInterval: 150,
    initialLength: 3,
    maxQueuedTurns: 2,
    colors: Object.freeze({
      background: "#0f172a",
      grid: "#1e293b",
      snakeBody: "#22c55e",
      snakeHead: "#86efac",
      apple: "#ef4444",
    }),
  });

  const DIRECTIONS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 }),
  });

  const KEY_TO_DIRECTION = new Map([
    ["ArrowUp", DIRECTIONS.up],
    ["ArrowDown", DIRECTIONS.down],
    ["ArrowLeft", DIRECTIONS.left],
    ["ArrowRight", DIRECTIONS.right],
  ]);

  function isSamePoint(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function isOppositeDirection(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  function toKey(point) {
    return point.x + "," + point.y;
  }

  class GameModel {
    constructor(config) {
      this.gridSize = config.gridSize;
      this.initialLength = config.initialLength;
      this.maxQueuedTurns = config.maxQueuedTurns;
      this.reset();
    }

    reset() {
      const startX = Math.floor(this.gridSize / 2);
      const startY = Math.floor(this.gridSize / 2);

      this.snake = [];
      for (let i = 0; i < this.initialLength; i++) {
        this.snake.push({ x: startX - i, y: startY });
      }

      this.direction = DIRECTIONS.right;
      this.turnQueue = [];
      this.score = 0;
      this.gameOver = false;
      this.apple = null;
      this.spawnApple();
    }

    queueTurn(direction) {
      if (this.gameOver || this.turnQueue.length >= this.maxQueuedTurns) {
        return;
      }
      const lastDirection =
        this.turnQueue.length > 0
          ? this.turnQueue[this.turnQueue.length - 1]
          : this.direction;

      if (
        isSamePoint(direction, lastDirection) ||
        isOppositeDirection(direction, lastDirection)
      ) {
        return;
      }
      this.turnQueue.push(direction);
    }

    update() {
      if (this.gameOver) {
        return;
      }
      this.applyQueuedTurn();

      const nextHead = this.getNextHead();
      const willEatApple =
        this.apple !== null && isSamePoint(nextHead, this.apple);

      if (this.checkCollision(nextHead, willEatApple)) {
        this.gameOver = true;
        return;
      }
      this.moveSnake(nextHead, willEatApple);
    }

    applyQueuedTurn() {
      if (this.turnQueue.length > 0) {
        this.direction = this.turnQueue.shift();
      }
    }

    getNextHead() {
      const head = this.snake[0];
      return { x: head.x + this.direction.x, y: head.y + this.direction.y };
    }

    checkCollision(point, willGrow) {
      const isOutOfField =
        point.x < 0 ||
        point.y < 0 ||
        point.x >= this.gridSize ||
        point.y >= this.gridSize;
      if (isOutOfField) {
        return true;
      }
      const bodyToCheck = willGrow ? this.snake : this.snake.slice(0, -1);
      return bodyToCheck.some(function (segment) {
        return isSamePoint(segment, point);
      });
    }

    moveSnake(nextHead, grow) {
      this.snake.unshift(nextHead);
      if (grow) {
        this.score += 1;
        this.spawnApple();
      } else {
        this.snake.pop();
      }
    }

    spawnApple() {
      const occupied = new Set(this.snake.map(toKey));
      const freeCells = [];

      for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
          if (!occupied.has(x + "," + y)) {
            freeCells.push({ x: x, y: y });
          }
        }
      }

      if (freeCells.length === 0) {
        this.apple = null;
        this.gameOver = true;
        return;
      }
      this.apple = freeCells[Math.floor(Math.random() * freeCells.length)];
    }

    isGameOver() {
      return this.gameOver;
    }

    getState() {
      return {
        gridSize: this.gridSize,
        snake: this.snake.map(function (segment) {
          return { x: segment.x, y: segment.y };
        }),
        apple: this.apple ? { x: this.apple.x, y: this.apple.y } : null,
        score: this.score,
        gameOver: this.gameOver,
      };
    }
  }

  class GameView {
    constructor(elements, config) {
      this.canvas = elements.canvas;
      this.ctx = this.canvas.getContext("2d");
      this.scoreElement = elements.score;
      this.overlay = elements.overlay;
      this.finalScoreElement = elements.finalScore;
      this.restartButton = elements.restartButton;

      this.gridSize = config.gridSize;
      this.cellSize = config.cellSize;
      this.colors = config.colors;
      this.size = config.gridSize * config.cellSize;
      this.renderedScore = null;

      this.canvas.width = this.size;
      this.canvas.height = this.size;
    }

    draw(state) {
      this.drawBackground();
      this.drawGrid();
      if (state.apple) {
        this.drawApple(state.apple);
      }
      this.drawSnake(state.snake);
      this.drawScore(state.score);
    }

    drawBackground() {
      this.ctx.fillStyle = this.colors.background;
      this.ctx.fillRect(0, 0, this.size, this.size);
    }

    drawGrid() {
      const ctx = this.ctx;
      ctx.strokeStyle = this.colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= this.gridSize; i++) {
        const offset = i * this.cellSize + 0.5;
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, this.size);
        ctx.moveTo(0, offset);
        ctx.lineTo(this.size, offset);
      }
      ctx.stroke();
    }

    drawCell(point, color) {
      const gap = 1;
      this.ctx.fillStyle = color;
      this.ctx.fillRect(
        point.x * this.cellSize + gap,
        point.y * this.cellSize + gap,
        this.cellSize - gap * 2,
        this.cellSize - gap * 2,
      );
    }

    drawSnake(snake) {
      for (let i = snake.length - 1; i >= 0; i--) {
        const color = i === 0 ? this.colors.snakeHead : this.colors.snakeBody;
        this.drawCell(snake[i], color);
      }
    }

    drawApple(apple) {
      const centerX = apple.x * this.cellSize + this.cellSize / 2;
      const centerY = apple.y * this.cellSize + this.cellSize / 2;
      const radius = this.cellSize / 2 - 2;

      this.ctx.fillStyle = this.colors.apple;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    drawScore(score) {
      if (score === this.renderedScore) {
        return;
      }
      this.scoreElement.textContent = score;
      this.renderedScore = score;
    }

    showGameOver(score) {
      this.finalScoreElement.textContent = score;
      this.overlay.hidden = false;
      this.restartButton.focus();
    }

    hideGameOver() {
      this.overlay.hidden = true;
    }

    onRestartClick(handler) {
      this.restartButton.addEventListener("click", handler);
    }
  }

  class GameController {
    constructor(model, view, config) {
      this.model = model;
      this.view = view;
      this.moveInterval = config.moveInterval;
      this.lastMoveTime = null;
      this.frameId = null;

      this.loop = this.loop.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.startGame = this.startGame.bind(this);
    }

    init() {
      document.addEventListener("keydown", this.handleKeyDown);
      this.view.onRestartClick(this.startGame);
      this.startGame();
    }

    startGame() {
      this.stopLoop();
      this.model.reset();
      this.view.hideGameOver();
      this.lastMoveTime = null;
      this.draw();
      this.frameId = requestAnimationFrame(this.loop);
    }

    stopLoop() {
      if (this.frameId !== null) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
    }

    finishGame() {
      this.stopLoop();
      this.view.showGameOver(this.model.getState().score);
    }

    handleKeyDown(event) {
      const direction = KEY_TO_DIRECTION.get(event.key);
      if (!direction) {
        return;
      }
      event.preventDefault();
      this.model.queueTurn(direction);
    }

    loop(timestamp) {
      this.update(timestamp);
      this.draw();

      if (this.model.isGameOver()) {
        this.finishGame();
        return;
      }
      this.frameId = requestAnimationFrame(this.loop);
    }

    update(timestamp) {
      if (this.lastMoveTime === null) {
        this.lastMoveTime = timestamp;
        return;
      }
      const elapsed = timestamp - this.lastMoveTime;
      if (elapsed < this.moveInterval) {
        return;
      }
      this.lastMoveTime = timestamp - (elapsed % this.moveInterval);
      this.model.update();
    }

    draw() {
      this.view.draw(this.model.getState());
    }
  }

  function main() {
    const model = new GameModel(CONFIG);
    const view = new GameView(
      {
        canvas: document.getElementById("game-canvas"),
        score: document.getElementById("score"),
        overlay: document.getElementById("game-over"),
        finalScore: document.getElementById("final-score"),
        restartButton: document.getElementById("restart-btn"),
      },
      CONFIG,
    );
    const controller = new GameController(model, view, CONFIG);

    controller.init();
  }

  main();
})();
