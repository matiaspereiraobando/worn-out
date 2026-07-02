export const ASSETS = {
  font: {
    key: "arcade",
    png: "assets/fonts/arcade.png",
    xml: "assets/fonts/arcade.xml",
  },
  sprites: {
    room: { key: "room-bg", path: "assets/sprites/world/room_topdown_640x360.png" },
    player: { key: "player-sheet", path: "assets/sprites/character/player_topdown_32x32_sheet.png" },
    fridge: { key: "fridge-states", path: "assets/sprites/appliances/fridge_states_32x48.png" },
    heater: { key: "heater-states", path: "assets/sprites/appliances/heater_states_32x48.png" },
    door: { key: "door-states", path: "assets/sprites/world/door_states_32x48.png" },
    vendor: { key: "vendor", path: "assets/sprites/props/vendor_don_jose_32x48.png" },
    coin: { key: "coin-strip", path: "assets/sprites/props/coin_16x16_strip.png" },
    icons: { key: "ui-icons", path: "assets/sprites/ui/icons_16x16_sheet.png" },
  },
} as const;

