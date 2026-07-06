import Phaser from "phaser";
import { CONFIG } from "../config";

const OUTLINE_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

/**
 * Solid bitmap tint. Prefer over setTint() — multiply tint breaks dark colors on
 * some itch.io WebGL paths (digits render as flat white).
 */
export function tintBitmapText(
  text: Phaser.GameObjects.BitmapText,
  color: number,
): Phaser.GameObjects.BitmapText {
  return text.setTintFill(color);
}

export function addOutlinedBitmapText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fill: number,
  outline: number = CONFIG.colors.bitmapOutline,
  size: number = CONFIG.font.sizeSm,
): Phaser.GameObjects.Container {
  const children: Phaser.GameObjects.GameObject[] = [];
  for (const [ox, oy] of OUTLINE_OFFSETS) {
    children.push(
      tintBitmapText(
        scene.add.bitmapText(ox, oy, CONFIG.font.key, text, size).setOrigin(0.5),
        outline,
      ),
    );
  }
  children.push(
    tintBitmapText(
      scene.add.bitmapText(0, 0, CONFIG.font.key, text, size).setOrigin(0.5),
      fill,
    ),
  );
  return scene.add.container(x, y, children);
}

export function setOutlinedBitmapText(container: Phaser.GameObjects.Container, text: string): void {
  for (const child of container.list) {
    if (child instanceof Phaser.GameObjects.BitmapText) child.setText(text);
  }
}
