import Phaser from "phaser";
import { CONFIG } from "./config";
import { BootScene } from "./scenes/BootScene";
import { MusicScene } from "./scenes/MusicScene";
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
    // FIT: keep 960×540 logic, scale display to parent (itch embed + fullscreen button).
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
    expandParent: true,
  },
  scene: [BootScene, MusicScene, MenuScene, GameScene, GameOverScene],
});

export default game;
