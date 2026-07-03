# Worn Out — Design Document v3

> Design document for the itch.io mini-jam.
> Game name: **Worn Out**.
> Jam theme: **machines**.
> Constraint: the game must export to HTML for web (browser-playable on itch.io).
> **Engine chosen: Phaser 3 + TypeScript + Vite** (native HTML5, tiny static build, fast iteration — see §23).
> Trimmed version for a 3-day scope, built as a **vertical slice first** (see §19).
> Core metaphor: **planned obsolescence** (kept as the thematic backbone, not the title).

---

## Changelog (v2 → v3) — applied build decisions

This version reflects decisions made when the slice was implemented. Key changes:

- **Engine picked:** Phaser 3 + TypeScript + Vite (was intentionally open). See §23.
- **Stat decay retuned to per-second** so stats are the real clock that forces you to use appliances (v2's `−2/30s` made stats cosmetic). See §4.
- **Parts simplified to a single resource** — no specific/generic/universal tiers, no separate "tools" resource for the slice. See §6–§7. (Tiered parts return as a v2 stretch.)
- **Anti-arbitrage rule added:** a freshly bought appliance can't be scrapped for a lock period, so you can't farm buy→scrap for parts. See §6/§7.
- **Input reworked to top-down movement:** WASD movement, `E` contextual interact, `1-N` action selection, `P` pickup. Action menu appears only in range. See §6.
- **Pixel rendering hardened:** bitmap pixel font + anti-alias disabled + rounded pixel scaling.
- **Clean now costs money** (`$5`) instead of a rag item (inventory simplification). See §8.
- **All balance numbers live in one `src/config.ts`** so the whole game retunes in one place.
- **Vertical-slice scope** for the first build: 2 appliances (fridge, water heater) + 2 stats (hunger, hygiene). Stove/mood deferred; **washing machine + mini-cycle now in build** (post-slice expansion). See §19.
- **Target run length** raised to ~2–4 min with at least one appliance-death crisis (was "survive 60s"). See §22.

---

## 0. Constraints

- **Hard constraint:** final build must be an HTML web export that runs in the browser on itch.io without installation.
- **Engine (decided):** Phaser 3 + TypeScript + Vite — native HTML5, no WASM, tiny static bundle, instant itch deploy (see §23).
- **Development window:** 3 days.
- **Team:** 3 people (designer, artist, implementer).

---

## 1. Pitch

You own a small apartment with 4 appliances. The machines break on their own (planned obsolescence), and to survive you have to use them — but using them kills them faster. Every bill you pay, every new machine you buy, **adds to the system's score**. Your high score is not your achievement: it's your quantified level of exploitation.

You play until you're **worn out** — out of hunger, hygiene, mood, money, or appliances.

Endless loop. Game over when any stat hits 0, your debt explodes, or the apartment becomes uninhabitable. No victory — only different ways of losing with varying dignity.

---

## 2. Theme & "machines" fit

**Planned obsolescence** as a critique of consumer capitalism. The appliances ARE machines, the protagonists of the game, designed to fail. The system forces you to use what kills you. The store offers you the replacement — but it's the same model, with the same problems.

The title **Worn Out** names the player condition and the machine condition in one breath: you and the appliances wear out together, the system measures the speed.

**No pivot needed** for the "machines" theme. It's a perfect fit.

---

## 3. Core loop

```
A MACHINE FAILS (HP reaches 0)
        ↓
DECISION: repair / cannibalize / buy new?
        ↓
IMMEDIATE CONSEQUENCE:
  • Repair → spend parts + tools, machine returns
  • Cannibalize → gain parts, lose the machine forever
  • Buy new → spend $$, full HP machine (shady)
        ↓
PLAYER STAT AFFECTED (hunger/hygiene/mood)
        ↓
BILL ARRIVES (line items based on machine state)
        ↓
SCORE RISES (bill paid + new purchase = +score)
        ↓
Loop continues until game over
```

**The core trap loop:** the only way to not die of hunger is to open the fridge. But opening the fridge kills it faster. **To survive, you use. To use, you die.** Planned obsolescence made mechanical.

---

## 4. Player stats

Each stat is 0-100. **Reaches 0 = game over.**

**RETUNED (v3):** decay is now **per second**, not per 30–60s. In v2 a stat took ~25–50 min to empty untouched, so stats were cosmetic and appliances were the only real clock — which quietly killed the headline mechanic. Now stats are the pressure that *forces* you to use the machines that are dying.

**Full design (3 stats):**

| Stat | Passive decay | Extra decay if appliance dead | Boost action | Restore on use |
|---|---|---|---|---|
| **Hunger** | −1.3 / s (~77s to empty) | +1.1 / s (food rots) | Eat (fridge) | +42 |
| **Hygiene** | −1.0 / s (~100s to empty) | +1.0 / s (cold water) | Shower (water heater) | +48 |
| **Mood** *(deferred to post-slice)* | −0.8 / s | +1.0 / s | Cook (stove) | +45 |

> **Slice build:** only **Hunger** and **Hygiene** are implemented (both critical). Mood + stove come after the slice proves the loop.

**Multipliers on low stats** (side effects, post-slice polish):

- Mood < 30 → repair speed × 0.8
- Hygiene < 30 → side-task reward × 0.85
- Hunger < 30 → event mitigation speed × 0.7

All values live in `src/config.ts` (`stats.*`).

---

## 5. Appliances (4)

**Use model (v3):** "use" is a **discrete action** (one eat / one shower) that costs a fixed HP chunk, rather than a hold-to-use HP/s drain. Cleaner to read in the slice while preserving the trap loop — every use still chips HP. (Hold-to-use can return as polish.)

| Appliance | Critical | Main function | Passive decay | Use HP cost | In slice? | Side-task |
|---|---|---|---|---|---|---|
| **Fridge** | yes | Eat | 0.8 HP/s (~125s) | −9 HP / eat | ✅ | — |
| **Water heater** | yes | Hot shower | 0.9 HP/s (~110s) | −13 HP / shower | ✅ | — |
| **Stove** | yes | Cook | 0.7 HP/s | −11 HP / cook | ⏳ post-slice | — |
| **Washing machine** | no | Wash clothes | 0.2 HP/s | cycle | ✅ (mini-cycle) | Wash = +$15 |

**Visual state:**

- HP 100-50% → normal sprite
- HP 49-20% → sprite with cracks/sparks
- HP 19-1% → sprite blinking
- HP 0% → dead sprite, greyed out

**Classification:**

- **Critical** (death if all 3 are dead): fridge, water heater, stove
- **Non-critical** (losing it hurts, doesn't kill): washing machine

---

## 6. Player actions

**Input model (top-down v4):**

- `WASD` = move player
- `E` = interact with nearest machine/door in range
- `1-N` = choose action from the opened contextual menu
- `P` = pick up money in range
- If player exits interaction range, the action menu closes automatically.

**Parts is a single resource (v3):** no specific/generic/universal tiers and no separate "tools" resource for the slice — repair just costs Parts. (The tiered economy is a documented v2 stretch.)

| Action | Trigger | Cost | Result |
|---|---|---|---|
| **Use** (eat/shower) | `E` menu → number | Appliance HP (fixed chunk) | +stat, −appliance HP |
| **Repair** | `E` menu → number | 1 Part | HP restored to 90% (also revives a dead machine) |
| **Clean** | `E` menu → number | $5 | HP +10, decay rate ×0.7 for 10s, 8s cooldown |
| **Unplug / Plug** | `E` menu → number | free | Manual toggle only; no auto re-plug |
| **Cannibalize** | `E` menu → number | Appliance lost forever | Parts based on HP at scrap (see §7); blocked while scrap-locked |
| **Buy new** | `E` on empty slot → number | $35 | Full HP appliance, shady; 25s scrap-lock (anti-arbitrage) |

---

## 7. Cannibalization curve (HP → parts)

**Simplified to a single Parts resource (v3):** amount scales with HP at scrap. No quality tiers in the slice.

| HP at scrap | Parts |
|---|---|
| ≥ 70% | 3 parts |
| 40–69% | 2 parts |
| 15–39% | 1 part |
| < 15% | 0 parts |

**Anti-arbitrage:** a machine bought new is **scrap-locked for 25s**, so you can't buy a full-HP machine ($35) and immediately scrap it for 3 parts. Scrapping is for machines you already own and are giving up on.

**Key decision:** is the fridge worth more alive (avoids the ×1.75 food bill line) or scrapped (parts to keep the water heater alive)?

> **v2 stretch:** reintroduce specific/generic/universal part tiers for deeper repair decisions.

---

## 8. Maintenance

One action only: **Clean**.

- Cost: **$5** (v3 — was "1 rag"; drops the rag inventory item to keep resources to Money + Parts)
- Immediate effect: +10 HP
- Temporary effect: decay rate ×0.7 for 10s
- Cooldown: 8s (prevents spam)

**Fundamental rule:** maintenance does NOT prevent the final failure. Planned obsolescence wins. It's a cushion, not a solution. This is the game's thesis made mechanical: **no matter how much you care for it, the machine will fail.**

---

## 9. Events (2 types)

| Event | Warning | Effect | Mitigable |
|---|---|---|---|
| **Power surge** | 8s | 1 random appliance −25% HP | Manually unplug target machine before timer ends |
| **Price hike** | 12s | Next bill × 1.5 | Not mitigable in slice (still telegraphed); prepaid item is post-slice |

**Rules:**

- Minimum 25s cooldown between events
- Only ONE warning active at a time (they don't stack)
- The warning is clear: countdown + audio cue + affected appliance blinks
- If not mitigated, effect applies at end of countdown

---

## 10. Vendor: Don José

- **Frequency:** every 60-90s (random)
- **Warning:** 12s in advance
- **Interaction:** when active, approach the door and press `E` to open Don José's menu
- **Pauses the global timer** only while you're in the door trade menu
- **Inventory:** 4-5 items
- **If you don't open in 10s, he leaves**

**Slice inventory:** to keep the repair economy alive, Don José sells **2 Parts for $6**. The fuller list below is the post-slice target.

**Post-slice Don José inventory:**

| Item | Price |
|---|---|
| Parts bundle | $6 |
| Used appliance (HP 40-60%) | $30 |
| Consumable (fire extinguisher / tape) | $3-5 |
| Maintenance contract (3 free "clean" actions) | $15 |

**Why the global timer pause:** the store distracts you from the problem. It's planned obsolescence made mechanical: the world's pressure makes you buy more than you need.

---

## 11. Side-tasks

- **Passive pickups (in slice):** 5 coins on the floor at a time, press `P` near them to collect, +$3-7 each, respawn every 6-12s. This is the main income that funds repairs and bills.
- **Washing machine mini-cycle:** 8s timing challenge at the washer; +$15 on success (implemented).

---

## 12. Bill system (daily invoice)

**Bill structure** (charged every **60s** = 1 "day", v3):

```
Rent ............. $20  (fixed)
Electricity ...... $12  (fixed in slice)
Water ............ $10  (×1.75 if water heater broken)
Food ............. $16  (×1.75 if fridge broken)
```

- Whole bill is **×1.5 if a price-hike event landed** that day.
- **Debt:** if you can't cover the bill, the shortfall becomes debt. Debt ≥ $100 = repossession (§14).
- **Typical total:** ~$58 calm, higher in crisis. Tuned so pickup income (~$25-40/day) makes bills a real squeeze.

---

## 13. Score system

**Formula:**

```
score = Σ (bills paid)
      + Σ (value of NEW appliances bought)
      + 0.5 × (debt accumulated at game over)
```

**Player type multiplier** (detected at game over):

| Style | Multiplier | Detection |
|---|---|---|
| **The Consumer** | × 1.2 | More NEW appliances bought than cannibalized |
| **The Cannibal** | × 1.0 | More cannibalized than new purchases |
| **The Technician** | × 0.8 | More repairs, zero new purchases |

**Thesis:** the system rewards you with score for feeding it. Your high score IS your quantified level of exploitation. The leaderboard of **Worn Out** is a leaderboard of who got exploited the most.

---

## 14. Game over (3 vectors)

1. **Any stat ≤ 0** → thematic death (variable text)
2. **Debt ≥ $100** → repossession
3. **All critical appliances dead** → apartment uninhabitable (in the slice: both fridge + water heater; full game: all three criticals)

**Warnings before losing:**

- Stat < 25 → red blink + audio cue + the fix action button highlights
- Stat < 10 → full overlay, the "eat/shower/cook" key glows
- This gives you 10-15s of margin to react

---

## 15. End screen (one screen, variable text)

```
─────────────────────────────
HIGH SCORE: $1,247
─────────────────────────────
  Bills paid: $890
  New appliances: $310
  Debt at break: $94
  Days survived: 14

PLAYER TYPE: "The Consumer"
(Bonus: +20% for your loyalty to the system)

STATISTICS:
  Meals eaten: 23
  Showers taken: 11
  Scrapped: 4
  Repairs: 17
  Maintenances: 8
  Unplugs: 3
  Failed unplugs: 5

MANUFACTURER MESSAGE:
"ElectroPlus: +12% sales of the FV-217.
CEO: 'Consumers have never been more satisfied.'"

[RETRY]  [MENU]
```

**Variable text based on game over cause** (3 variants):

- Hunger 0 → *"You died of hunger. The system won."*
- Hygiene 0 → *"The grime won."*
- Mood 0 → *"Total burnout. You can't anymore."*
- Debt → *"Repossessed. Your belongings go to auction. Starting price: $2."*
- Uninhabitable → *"The building was condemned."*

---

## 16. Audio (minimum viable)

**Essential SFX:**

- Electrical hum per appliance (fridge, stove) — cuts out when they fail
- Microwave crackles
- Running water (water heater)
- Vendor doorbell
- Cash register when earning
- Dry warning beep (not a melody)
- Selective silence: when something fails, its SFX cuts out

**Music:** optional, 1 tense chiptune loop if time allows. If not, silence + SFX works.

---

## 17. Visual

**Palette:** oppressive kitchen-grunge — locked to the style board in
`docs/style/` (`worn-out_palette-01.png` + refs). Cold olive/teal walls, warm
single-lamp glow, bone-cream appliances, mustard money, rust-red danger.

- Background / grime: shadow olive `#161a12`, `#1e2319`, `#3b4636`; forest olive `#505f3b`
- Metal / trim: slate blue-green `#47534c`
- Healthy / ok accent: muted olive green `#6e7b5a`
- Danger accent: saturated rust-red `#bf4130` (with terracotta weathering `#ab4630`)
- Money accent: mustard / ochre gold `#c7a24a`
- Lighting accent: warm lamp glow `#f2c65a`
- UI text: bone / cream `#e7e2cd`, dim `#9a9782`

**Sprites 32×32 px** (aligned to 8px grid):

| Category | Quantity | Total |
|---|---|---|
| Appliances (fridge, water heater, stove, washing machine) × 3 states | 4 × 3 | 12 |
| Character (idle + 1 action) | 2 | 2 |
| Coins/bills | 5 | 5 |
| Vendor / doorbell | 1 | 1 |
| Parts / scrap | 2 | 2 |
| Consumables (rag, fire extinguisher) | 2 | 2 |
| UI icons (3 stats + money) | 4 | 4 |
| Kitchen background (tileable) | 1 | 1 |
| **Estimated total** | | **~29 sprites** |

**Style:** classic pixel art, clear silhouettes, 1-2 frames per state. No complex animation.

---

## 18. Tone & Humor

**Worn Out** is satirical. The comedy is the point — without it, the game is just a management sim with a cynical message. With it, the player laughs, then notices the system is laughing back.

### Principles

- **Satirical, dark, ironic** — the game critiques capitalism through humor, not lectures.
- **Never preachy** — show the consequences, don't moralize.
- **The system is the comedian, not the narrator.** Punchlines come from the machine responses, the vendor pitches, the manufacturer messages.
- **Comedy = the gap between what you must do and what it costs you.**

### Phrase catalog

**On opening:**
> "Welcome to your new apartment. The machines are already failing. Or is it the other way around?"

**On use (hunger/hygiene/mood):**
> "Yes, eating costs useful life. Welcome to the system."

**On cannibalize:**
> "You scrapped the [appliance]. Its spirit will live on in the [other appliance]."

**On event (power surge):**
> "Power surge. You saw it coming, right?"

**On event (not mitigated):**
> "Bad luck. The insurance doesn't cover 'I didn't unplug it'."

**On vendor arrival:**
> "Don José at the door. He's here to 'help'. Take the offer."

**On vendor (after purchase):**
> "Don José: 'Come back soon.' (He knows you will.)"

**On bill:**
> "Bill of the day: $X. Pay up, or..."

**On game over (hunger):**
> "You died of hunger. The system won."

**On game over (hygiene):**
> "The grime won."

**On game over (mood):**
> "Total burnout. You can't anymore. The system can."

**On game over (debt):**
> "Repossessed. Your belongings go to auction. Starting price: $2."

**On end screen:**
> "ElectroPlus: +12% sales of the FV-217. CEO: 'Consumers have never been more satisfied.'"

**On maintenance:**
> "Deep clean. It doesn't help, but you feel better."

**On cleaning a critical machine:**
> "You dusted it off. It still doesn't work, but at least it's clean."

### Animations & visual punchlines

| Event | Animation | SFX |
|---|---|---|
| Appliance fails | White smoke puff + final spark + appliance "switches off" with a click | Short sad trombone (3 notes) |
| Vendor arrives | Doorbell fanfare (3-4 happy notes) | Long doorbell |
| Bill arrives | Bills rain briefly | Cash register + countdown beep |
| Cannibalize | Dust cloud + player's hand "waves goodbye" to the appliance | Dust + metal noise |
| Repair | Green sparks + the appliance "opens its eyes" | "Tink tink" metallic |
| Clean | Soap bubbles | Water sound + sparkle |
| Stat hits 0 | Character collapses dramatically with cartoon stars | Cartoon fall + sad sound |
| Buy new | Confetti + ironic "You did it!" | Cash register + distorted "yay!" |
| Game over | Screen with the responsible appliance in the background, thematic text | Silence + one long note |

### Visual personality

- **Sprites with personality:**
  - Fridge: old "MERRY CHRISTMAS" sticker (1987), tired face
  - Water heater: dripping pipe, thermometer at max
  - Stove: 4 burners, one always lit
  - Washing machine: "MYSTERY" sticker on the drum
- **Background details:**
  - Calendar stuck on the fridge, always the same month (2019)
  - Bills piling up on a table
  - A cockroach on the floor (1 sprite, doesn't move, ambient detail)
  - Half-open toolbox with stuff scattered
- **Vendor (Don José):**
  - Character with overalls, awkward smile
  - Tool cart he leaves at the door

### What we DON'T do

- ❌ Fourth-wall breaks ("as a player, you know this is just a game")
- ❌ Explicit political lessons ("capitalism is bad")
- ❌ Moralizing ("you did wrong to buy")
- ❌ Multiple endings / moralizing finales
- ❌ Jokes at the player's expense ("you're bad at this")
- ❌ Pop-ups with healthy-living tips
- ❌ Earnest "the system is bad" cutscenes — the *showing* is the message

---

## 19. Trimmed scope (3 days)

**Vertical slice (built first, to prove the trap loop):**

- 2 appliances: **fridge + water heater** (both critical)
- 2 stats: **hunger + hygiene**
- Actions: use / repair / clean / cannibalize / buy new
- Single **Parts** resource + **Money**
- Coin pickups, bills + debt, both events (surge mitigable, price hike telegraphed), Don José selling parts (pauses the clock)
- Score + 3 archetypes, all 3 game-over vectors, end screen with variable text
- Placeholder shape-art (real pixel sprites layered in after the loop feels right)

**Expand after the slice is fun:** stove + mood, tiered parts, pixel sprites, SFX, price-hike prepaid mitigation. (Washing machine + mini-cycle shipped.)

**Cut from the original design to make ship:**

- 7 themed days → linear difficulty curve
- 4-5 events with mitigation → 2 events
- 4 vendors → 1 vendor (Don José)
- 3-level maintenance → 1 action (clean)
- 4 side-tasks → 2 (passive pickups + washing machine)
- 5 game over screens → 1 screen with variable text
- 5 player archetypes → 3 archetypes
- Between-run skills → out
- Shareable seeds → out
- Full music audio → optional / minimum SFX

---

## 20. Team & roles

- **Designer (lead):** Game design, project coordination, balance, distribution
- **Artist:** Palette, sprites, visual FX, background
- **Implementer:** Code, build pipeline, HTML export, deploy help

---

## 21. Distribution

- **Platform:** itch.io
- **Build format:** HTML web export, browser-playable, no install
- **Team on itch:** 3 people
- **Page:** description, screenshots, controls, credits

---

## 22. Acceptance criteria (what "shipped" looks like)

- [x] Final build runs in a modern browser (Phaser HTML5 build, verified in dev)
- [ ] A normal run lasts ~2–4 min and includes at least one appliance-death crisis
- [x] Slice appliances are interactable (use, repair, cannibalize, clean, buy new)
- [x] Both events fire; power surge can be mitigated (price hike telegraphed)
- [x] Vendor arrives with warning and pauses the global timer
- [x] Bill is charged at end of each "day" (every 60s), shortfall → debt
- [x] Score is calculated with the player-type multiplier
- [x] All 3 game-over vectors are reachable
- [x] End screen shows variable text + score + stats + manufacturer message
- [ ] At least 6 phrases from the catalog appear during gameplay (catalog wired; verify coverage)
- [ ] At least 4 animations/juice moments implemented (bill flash + blink done; more post-slice)
- [ ] Full art pass: replace placeholder shapes with pixel sprites

---

## 23. Implementation & stack

- **Engine/stack:** Phaser 3 + TypeScript, bundled with Vite.
- **Why:** HTML5 is the hard constraint; Phaser is native to it (no WASM, ~340 KB gzip bundle, instant itch deploy). This game is a stateful 2D scene with clickable objects + a HUD — Phaser's sweet spot. Vite hot-reload makes balance tuning instant. (Godot 4 was the runner-up but adds WASM/web-audio friction with no payoff here.)
- **All balance numbers live in `src/config.ts`** — one file to retune the whole game.
- **Project layout:**
  - `src/config.ts` — every tunable number
  - `src/phrases.ts` — satirical phrase catalog (§18)
  - `src/model/Appliance.ts` — pure appliance logic (HP, decay, clean/scrap)
  - `src/scenes/GameScene.ts` — main loop, economy, events, vendor, HUD
  - `src/scenes/GameOverScene.ts` — end screen (§15)
  - `src/ui/` — `Button`, `ApplianceView` (placeholder shape-art)
- **Run:** `npm install`, then `npm run dev` (play at `localhost:5173`). **Ship:** `npm run build` → zip `dist/` → upload to itch as an HTML project.
