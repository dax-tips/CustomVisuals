// Register all games here — add new imports + register calls to extend.
import { GameRegistry } from "./GameRegistry";
import { SnakeGame } from "./SnakeGame";
import { PongGame } from "./PongGame";
import { BreakoutGame } from "./BreakoutGame";
import { TetrisGame } from "./TetrisGame";

GameRegistry.register("snake", () => new SnakeGame());
GameRegistry.register("pong", () => new PongGame());
GameRegistry.register("breakout", () => new BreakoutGame());
GameRegistry.register("tetris", () => new TetrisGame());
