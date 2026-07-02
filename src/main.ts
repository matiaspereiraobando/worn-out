import Phaser from "phaser";
import { CONFIG } from "./config";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: CONFIG.width,
  height: CONFIG.height,
  backgroundColor: CONFIG.colors.bg,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene, GameOverScene],
});

export default game;
