export const ASSETS = {
  font: {
    key: "arcade",
    png: "assets/fonts/arcade.png",
    xml: "assets/fonts/arcade.xml",
  },
  sprites: {
    room: { key: "room-bg", path: "assets/sprites/world/room_topdown_960x540.png" },
    walkmask: { key: "walk-mask", path: "assets/sprites/world/walkmask_960x540.png" },
    player: { key: "player-sheet", path: "assets/sprites/character/player_topdown_8dir_68x68_sheet.png" },
    fridge: { key: "fridge-states", path: "assets/sprites/appliances/fridge_states_48x48.png" },
    heater: { key: "heater-states", path: "assets/sprites/appliances/heater_states_48x48.png" },
    washer: { key: "washer-states", path: "assets/sprites/appliances/washer_states_48x48.png" },
    door: { key: "door-states", path: "assets/sprites/world/door_states_48x48.png" },
    vendor: { key: "vendor", path: "assets/sprites/props/vendor_don_jose_4dir_64x64_sheet.png" },
    coin: { key: "coin-strip", path: "assets/sprites/props/coin_32x32_strip.png" },
    icons: { key: "ui-icons", path: "assets/sprites/ui/icons_32x32_sheet.png" },
    cart: { key: "vendor-cart", path: "assets/sprites/props/vendor_cart_32x32.png" },
  },
} as const;

