# Minecraft-style Map Game

## Struttura
- `index.html` – entry point con menu, editor e gioco
- `css/style.css` – stili full-screen
- `js/app.js` – navigazione tra schermate
- `js/editor.js` – logica configuratore mappe
- `js/game.js` – logica gioco (loading, movement)
- `assets/` – texture e sprite
- `maps/` – directory opzionale per salvare mappe JSON

## Uso
1. Apri `index.html`.
2. **Menu**: scegli “Editor” o “Gioca”.
3. **Editor**: dipingi la mappa, salva o carica JSON.
4. **Gioca**: seleziona una mappa salvata, poi “Carica” e “Esegui” per giocare.

## Formato Mappa
JSON 2D array 20×20 di stringhe:
```json
[
  ["G","G","T",...],
  [...],
  ...
]# pixel-game
