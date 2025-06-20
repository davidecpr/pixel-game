// js/editor.js
(() => {
    const ROWS = 20, COLS = 20;
    let CELL = 40; // Dimensione iniziale, sarà ricalcolata
    const canvas = document.getElementById('editor-canvas');
    const ctx    = canvas.getContext('2d');
    let mapData = Array.from({ length: ROWS }, () => Array(COLS).fill('G'));
    let selectedAsset = 'G';

    // Carica e mantiene le immagini nella mappa assets[key]
    const assets = {};
    window.assetList.forEach(a => {
        const img = new Image();
        img.src = a.url;
        assets[a.key] = img;
    });

    // Genera dinamicamente la palette
    const palette = document.getElementById('palette');
    window.assetList.forEach(a => {
        const btn = document.createElement('div');
        btn.className = 'asset-btn';
        btn.dataset.asset = a.key;
        btn.innerHTML = `<img src="${a.url}" alt="${a.name}">${a.name}`;
        palette.appendChild(btn);
    });

    // Palette click
    document.querySelectorAll('.asset-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.asset-btn').forEach(b=>b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAsset = btn.dataset.asset;
        };
    });
    palette.firstElementChild.classList.add('selected');

    // Disegna griglia
    function draw() {
        if (!canvas || !ctx) return; // Assicurati che canvas e ctx siano pronti
        ctx.clearRect(0,0, canvas.width, canvas.height);
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                ctx.drawImage(assets[mapData[y][x]], x*CELL, y*CELL, CELL, CELL);
                ctx.strokeStyle = '#888';
                ctx.strokeRect(x*CELL, y*CELL, CELL, CELL);
            }
        }
    }

    // Click sulla griglia
    canvas.onclick = e => {
        const rect = canvas.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        const calculatedX = Math.floor(offsetX / CELL);
        const calculatedY = Math.floor(offsetY / CELL);

        if (calculatedX>=0 && calculatedX<COLS && calculatedY>=0 && calculatedY<ROWS) {
            mapData[calculatedY][calculatedX] = selectedAsset;
            draw();
        }
    };

    // Pulisci mappa
    document.getElementById('clear-map').onclick = () => {
        mapData = Array.from({ length: ROWS }, () => Array(COLS).fill('G'));
        draw();
    };

    // Salva su file e localStorage
    document.getElementById('save-map').onclick = async () => {
        const mapNameInput = prompt("Inserisci il nome della mappa (senza .json):", "mappa_gioco");
        if (!mapNameInput || mapNameInput.trim() === "") {
            alert("Nome mappa non valido. Salvataggio annullato.");
            return;
        }
        const mapName = mapNameInput.trim(); // Rimuove spazi bianchi

        const mapToSave = {
            name: mapName,
            rows: ROWS,
            cols: COLS,
            mapData: mapData
        };
        const dataStr = JSON.stringify(mapToSave, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});

        if (window.showSaveFilePicker) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: `${mapName}.json`,
                    types: [
                        {
                            description: 'JSON Files',
                            accept: {'application/json': ['.json']},
                        },
                    ],
                });
                const writableStream = await fileHandle.createWritable();
                await writableStream.write(blob);
                await writableStream.close();
                alert(`Mappa '${mapName}.json' salvata con successo!`);
            } catch (err) {
                // L'utente potrebbe aver annullato il picker o potrebbe esserci stato un errore
                if (err.name !== 'AbortError') {
                    console.error("Errore durante il salvataggio con File System Access API:", err);
                    alert("Errore durante il salvataggio del file.");
                } else {
                    console.log("Salvataggio annullato dall'utente.");
                }
                return; // Non procedere con il salvataggio localStorage se il salvataggio file è annullato o fallito
            }
        } else {
            // Fallback per browser che non supportano showSaveFilePicker
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${mapName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`Download della mappa '${mapName}.json' avviato.\nRicorda di spostare il file nella cartella 'maps' del progetto.`);
        }

        // Salva anche su localStorage (opzionale, ma utile per un rapido accesso futuro)
        try {
            localStorage.setItem(`map_${mapName}`, dataStr);
            console.log(`Mappa '${mapName}' salvata anche su localStorage.`);
        } catch (e) {
            console.error("Errore nel salvataggio su localStorage:", e);
        }
    };

    // Carica file selezionato
    document.getElementById('load-map').onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            mapData = JSON.parse(ev.target.result);
            draw();
        };
        reader.readAsText(file);
    };

    function calculateCellSizeAndDraw() {
        if (!canvas || !ctx) return;
        // Calcola la dimensione della cella per adattarsi al canvas
        // mantenendo le proporzioni della griglia (ROWS x COLS)

        if (!canvas || !ctx) { // Controllo duplicato per sicurezza, ma dovrebbe essere già gestito sopra
            
            return;
        }
        if (canvas.width <= 0 || canvas.height <= 0) {
            
            return; // Non procedere se le dimensioni non sono valide
        }

        const availableWidth = canvas.width;
        const availableHeight = canvas.height;
        CELL = Math.floor(Math.min(availableWidth / COLS, availableHeight / ROWS));
        
        // Assicurati che CELL sia almeno 1 per evitare divisioni per zero o valori negativi
        CELL = Math.max(1, CELL);
        
        draw();
    }

    // Esponi la funzione per il ridimensionamento da app.js
    window.redrawEditorCanvas = calculateCellSizeAndDraw;

    // Alla fine carica tutto e poi disegna
    let loaded = 0, total = window.assetList.length;
    if (total === 0) { // Se non ci sono asset, disegna subito
        calculateCellSizeAndDraw();
    } else {
        window.assetList.forEach(a => {
            assets[a.key].onload = () => {
                if (++loaded === total) {
                    calculateCellSizeAndDraw();
                }
            };
            // Gestione errore caricamento immagine (opzionale ma buona pratica)
            assets[a.key].onerror = () => {
                console.error(`Errore caricamento asset: ${a.name} (${a.url})`);
                if (++loaded === total) {
                    calculateCellSizeAndDraw(); // Prova a disegnare comunque
                }
            };
        });
    }

    // Chiamata iniziale in caso app.js non la faccia subito o per sicurezza
    // setTimeout(calculateCellSizeAndDraw, 50); // Un piccolo timeout per assicurare che le dimensioni del canvas siano stabili
    // La prima chiamata a calculateCellSizeAndDraw è gestita dal caricamento degli asset
    // o da app.js tramite setTimeout(resizeCanvases, 0) che a sua volta
    // dovrebbe triggerare redrawEditorCanvas se implementato in app.js.
    // Per sicurezza, se app.js non chiama resizeCanvases subito, 
    // assicuriamoci che venga chiamato dopo un breve ritardo se gli asset sono già caricati.
    if (window.assetList.length === 0 || Object.values(assets).every(img => img.complete)) {
      setTimeout(calculateCellSizeAndDraw, 100); // Ritardo per consentire al layout di stabilizzarsi
    }
})();