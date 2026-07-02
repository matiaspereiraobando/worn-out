# Worn Out

A jam game about **planned obsolescence**. You own an apartment full of machines designed to fail. Using them keeps you alive — and kills them faster. Your high score isn't an achievement; it's your quantified level of exploitation.

- **Theme:** machines · **Jam:** itch.io mini-jam · **Scope:** 3-day vertical slice
- **Stack:** [Phaser 3](https://phaser.io/) + TypeScript + [Vite](https://vitejs.dev/)
- **Design doc:** [`docs/Worn-Out-GDD.md`](docs/Worn-Out-GDD.md)

## Run it

```bash
npm install
npm run dev      # play at http://localhost:5173
```

## Ship it (itch.io)

```bash
npm run build    # outputs dist/
```

Zip the **contents** of `dist/` and upload to itch.io as an HTML project (tick "This file will be played in the browser").

## How to play

- **Move with `WASD`** in the top-down apartment.
- Press **`E`** near a machine (or the vendor door) to open a contextual action menu.
- Press **`1-N`** to execute one action from that menu.
- Press **`P`** to pick up money that's in range.
- If you move out of appliance range, the action menu closes automatically.
- Keep **Hunger** and **Hygiene** above 0 by using the fridge (eat) and water heater (shower) — but every use damages the machine.
- Grab **coins** off the floor to pay the **bill** every 60s. Can't pay → debt. Debt hits $100 → repossessed.
- When a machine dies: **repair** it (costs Parts), **cannibalize** it for Parts (gone forever), or **buy new** ($35).
- **Unplug/Plug** is a manual machine action. Unplugged machines are safe from surges and stop decaying, but cannot be used and still count as "off" for stat/bill penalties.
- **Don José** shows up at the door; interact with him to trade parts while the global timer is paused.
- You lose when a stat hits 0, debt hits $100, or all critical machines are dead.

## Tuning

Every balance number lives in **`src/config.ts`** — one file to retune the whole game.

## Project layout

```
src/
  assets.ts            sprite/font manifest keys and paths
  config.ts            all tunable numbers
  entities/Player.ts   top-down player movement
  phrases.ts           satirical phrase catalog
  model/Appliance.ts   pure appliance logic (HP, decay, clean, scrap)
  scenes/BootScene.ts  preload + fallback textures
  scenes/GameScene.ts  top-down loop: movement, interaction, economy, events
  scenes/GameOverScene.ts  end screen
  ui/                  Button, ApplianceView (world object view)
```
