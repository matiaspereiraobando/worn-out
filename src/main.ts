import Phaser from "phaser";
import { CONFIG } from "./config";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: CONFIG.width,
  height: CONFIG.height,
  backgroundColor: CONFIG.colors.bg,
  pixelArt: true,
  render: {
    antialias: false,
    antialiasGL: false,
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
});

export default game;
