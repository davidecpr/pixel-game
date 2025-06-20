// js/game.js - Versione rifattorizzata con controllo diretto tramite frecce
const game = (() => {
    // Elementi DOM
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const gameOverlay = document.getElementById('game-overlay');
    const overlayMessage = document.getElementById('overlay-message');
    const restartGameBtn = document.getElementById('restart-game-btn');
    const backMenuButton = document.getElementById('back-menu-from-game');
    
    // Stato di gioco
    let currentMapData = null;
    let player = { x: 0, y: 0, direction: 0 }; // direction: 0=su, 1=destra, 2=giù, 3=sinistra
    let trophy = { x: 0, y: 0 };
    let CELL_SIZE = 20; // Valore di default, sarà ricalcolato
    let gameWon = false;
    let gameLost = false;
    
    // Carica immagini asset e player
    const assets = {};
    window.assetList.forEach(a => {
        const img = new Image();
        img.src = a.url;
        assets[a.key] = img;
    });
    const playerImg = new Image();
    playerImg.src = 'https://art.pixilart.com/sr2b2528d58f1aws3.png';

    // Gestore degli eventi per i tasti freccia
    function handleKeydown(e) {
        if (gameWon || gameLost) return;
        
        console.log('Tasto premuto:', e.key);
        console.log('Direzione attuale:', player.direction);
        console.log('Posizione attuale:', player.x, player.y);
        
        // Evita lo scrolling della pagina con i tasti freccia
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
        }
        
        switch(e.key) {
            case "ArrowLeft":
                // Ruota a sinistra
                player.direction = (player.direction + 3) % 4; // +3 mod 4 equivale a -1 mod 4
                console.log('Rotazione a sinistra, nuova direzione:', player.direction);
                drawGame(); // Ridisegna per mostrare la rotazione
                break;
            case "ArrowRight":
                // Ruota a destra
                player.direction = (player.direction + 1) % 4;
                console.log('Rotazione a destra, nuova direzione:', player.direction);
                drawGame(); // Ridisegna per mostrare la rotazione
                break;
            case "ArrowUp":
                // Muovi in avanti nella direzione attuale
                console.log('Movimento in avanti, direzione:', player.direction);
                switch(player.direction) {
                    case 0: 
                        console.log('Movimento verso l\'alto');
                        movePlayer(0, -1); 
                        break; // Su
                    case 1: 
                        console.log('Movimento verso destra');
                        movePlayer(1, 0); 
                        break;  // Destra
                    case 2: 
                        console.log('Movimento verso il basso');
                        movePlayer(0, 1); 
                        break;  // Giù
                    case 3: 
                        console.log('Movimento verso sinistra');
                        movePlayer(-1, 0); 
                        break; // Sinistra
                }
                break;
            case "ArrowDown":
                // Salto di due celle in avanti rispetto alla direzione attuale
                console.log('Salto in avanti, direzione:', player.direction);
                switch(player.direction) {
                    case 0: 
                        console.log('Salto di due celle verso l\'alto');
                        movePlayer(0, -2); 
                        break; // Su
                    case 1: 
                        console.log('Salto di due celle verso destra');
                        movePlayer(2, 0); 
                        break; // Destra
                    case 2: 
                        console.log('Salto di due celle verso il basso');
                        movePlayer(0, 2); 
                        break; // Giù
                    case 3: 
                        console.log('Salto di due celle verso sinistra');
                        movePlayer(-2, 0); 
                        break; // Sinistra
                }
                break;
        }
    }

    // Funzione per mostrare l'overlay di vittoria/sconfitta
    function showOverlay(message) {
        if (gameOverlay) {
            overlayMessage.textContent = message;
            gameOverlay.classList.remove('hidden');
        }
    }

    // Funzione per muovere il giocatore
    function movePlayer(dx, dy) {
        console.log('movePlayer chiamato con dx:', dx, 'dy:', dy);
        console.log('currentMapData:', currentMapData ? 'presente' : 'mancante');
        
        if (gameWon || gameLost || !currentMapData) {
            console.log('Movimento bloccato:', gameWon ? 'gioco vinto' : gameLost ? 'gioco perso' : 'dati mappa mancanti');
            return;
        }

        const newX = player.x + dx;
        const newY = player.y + dy;
        console.log('Nuove coordinate calcolate:', newX, newY);
        console.log('Dimensioni mappa:', currentMapData.cols, 'x', currentMapData.rows);

        // Controllo che la nuova posizione sia all'interno della mappa
        if (newX < 0 || newX >= currentMapData.cols || newY < 0 || newY >= currentMapData.rows) {
            console.log('Movimento bloccato: fuori dai limiti della mappa');
            return; // Fuori dai limiti della mappa
        }

        // Controllo il tipo di cella su cui si sta spostando il giocatore
        console.log('Accedo a mapData:', Boolean(currentMapData.mapData));
        try {
            const newCell = currentMapData.mapData[newY][newX];
            console.log('Tipo di cella di destinazione:', newCell);
            
            // Se è un muro, blocca il movimento
            if (newCell === 'wall') {
                console.log('Movimento bloccato: collisione con un muro');
                return; // Collisione con un muro
            }
            
            // Aggiorno la posizione del giocatore
            console.log('Posizione aggiornata da', player.x, player.y, 'a', newX, newY);
            player.x = newX;
            player.y = newY;
            
            // Controllo vittoria: se il giocatore ha raggiunto il trofeo
            if (player.x === trophy.x && player.y === trophy.y) {
                gameWon = true;
                showOverlay('Hai vinto!');
                
                // Rimuovi l'event listener quando il gioco è vinto
                window.removeEventListener('keydown', handleKeydown);
            }
            // Controllo sconfitta: se non è un percorso sicuro, allora fa perdere
            else if (newCell !== 'path' && newCell !== 'start' && newCell !== 'G') {
                gameLost = true;
                showOverlay('Hai perso!');
                
                // Rimuovi l'event listener quando il gioco è perso
                window.removeEventListener('keydown', handleKeydown);
            }
        } catch (error) {
            console.error('Errore nell\'accesso ai dati della mappa:', error);
            console.log('Dettagli:', {newY, newX, mapData: currentMapData.mapData});
        }

        // Ridisegno il gioco con la nuova posizione
        drawGame();
    }

    // Verifica se tutti gli asset sono caricati
    function checkAllAssetsLoaded() {
        const allLoaded = Object.values(assets).every(img => img.complete) && playerImg.complete;
        if (allLoaded && currentMapData) {
            calculateCellSizeAndDraw();
        }
        return allLoaded;
    }

    // Calcola la dimensione delle celle e disegna il gioco
    function calculateCellSizeAndDraw() {
        if (!currentMapData) return;

        // Calcoliamo la dimensione ottimale delle celle in base allo spazio disponibile
        const maxWidth = canvas.width * 0.95;
        const maxHeight = canvas.height * 0.95;
        
        const cellWidth = Math.floor(maxWidth / currentMapData.cols);
        const cellHeight = Math.floor(maxHeight / currentMapData.rows);
        
        // Prendiamo il valore minore per mantenere celle quadrate
        CELL_SIZE = Math.min(cellWidth, cellHeight);
        
        drawGame();
    }
    
    // Funzione per disegnare il gioco
    function drawGame() {
        if (!ctx || !currentMapData || !currentMapData.mapData || !player) {
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calcolo le dimensioni totali della mappa
        const mapWidth = currentMapData.cols * CELL_SIZE;
        const mapHeight = currentMapData.rows * CELL_SIZE;
        
        // Calcolo l'offset per centrare la mappa nel canvas
        const offsetX = Math.floor((canvas.width - mapWidth) / 2);
        const offsetY = Math.floor((canvas.height - mapHeight) / 2);
        
        // Disegno uno sfondo per la mappa
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(offsetX - 5, offsetY - 5, mapWidth + 10, mapHeight + 10);
        
        // Disegna la mappa
        for (let r = 0; r < currentMapData.rows; r++) {
            for (let c = 0; c < currentMapData.cols; c++) {
                const assetKey = currentMapData.mapData[r][c];
                const x = offsetX + c * CELL_SIZE;
                const y = offsetY + r * CELL_SIZE;
                
                // Se il blocco è di tipo T, W o X, disegna prima il blocco G (Terra) sotto
                if (['T', 'W', 'X'].includes(assetKey) && assets['G'] && assets['G'].complete) {
                    ctx.drawImage(assets['G'], x, y, CELL_SIZE, CELL_SIZE);
                }
                
                // Poi disegna il blocco effettivo
                if (assets[assetKey] && assets[assetKey].complete) {
                    ctx.drawImage(assets[assetKey], x, y, CELL_SIZE, CELL_SIZE);
                } else {
                    // Fallback se l'asset non è disponibile
                    ctx.fillStyle = '#777777';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                }
            }
        }

        // Disegna il trofeo se l'immagine è caricata
        if (trophy) {
            // In assetList, il trofeo è associato alla chiave 'X'
            const trophyImg = assets['X'];
            if (trophyImg && trophyImg.complete) {
                ctx.drawImage(
                    trophyImg,
                    offsetX + trophy.x * CELL_SIZE,
                    offsetY + trophy.y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                );
            }
            // Nessun fallback - se l'immagine non è caricata, non mostriamo nulla
        }

        // Disegna il giocatore con rotazione in base alla direzione
        if (playerImg && playerImg.complete) {
            // Salviamo lo stato attuale del canvas
            ctx.save();
            
            // Calcoliamo il centro della cella del giocatore
            const centerX = offsetX + player.x * CELL_SIZE + CELL_SIZE / 2;
            const centerY = offsetY + player.y * CELL_SIZE + CELL_SIZE / 2;
            
            // Spostiamo l'origine al centro della cella per poter ruotare
            ctx.translate(centerX, centerY);
            
            // Ruotiamo in base alla direzione (0=su, 1=destra, 2=giù, 3=sinistra)
            const rotation = player.direction * 90 * Math.PI / 180;
            ctx.rotate(rotation);
            
            // Disegniamo l'immagine centrata attorno all'origine
            ctx.drawImage(
                playerImg,
                -CELL_SIZE / 2,  // x negativo perché ora stiamo disegnando attorno al centro
                -CELL_SIZE / 2,  // y negativo perché ora stiamo disegnando attorno al centro
                CELL_SIZE,
                CELL_SIZE
            );
            
            // Ripristiniamo lo stato precedente del canvas
            ctx.restore();
        } else {
            // Fallback se l'immagine del player non è disponibile
            ctx.fillStyle = 'red';
            ctx.fillRect(
                offsetX + player.x * CELL_SIZE + CELL_SIZE * 0.2,
                offsetY + player.y * CELL_SIZE + CELL_SIZE * 0.2,
                CELL_SIZE * 0.6,
                CELL_SIZE * 0.6
            );
        }
    }

    // Inizializza il gioco con i dati della mappa
    function startGameWithMapData(mapData) {
        if (!mapData || !mapData.mapData) {
            console.error("Dati della mappa non validi");
            return;
        }

        // Reset dello stato di gioco
        currentMapData = mapData;
        gameWon = false;
        gameLost = false;
        
        // Nascondi l'overlay
        if (gameOverlay) {
            gameOverlay.classList.add('hidden');
        }

        // Posiziona il giocatore in basso a destra, imposta direzione iniziale (0 = su) e cerca il trofeo nella mappa
        player = { x: mapData.cols - 1, y: mapData.rows - 1, direction: 0 };
        
        // Cerca il trofeo nella mappa (identificato dalla chiave 'X')
        for (let r = 0; r < mapData.rows; r++) {
            for (let c = 0; c < mapData.cols; c++) {
                if (mapData.mapData[r][c] === 'X') {
                    trophy = { x: c, y: r };
                    console.log('Trofeo trovato in posizione:', c, r);
                }
            }
        }

        // Avvia il controllo con le frecce
        window.addEventListener('keydown', handleKeydown);
        
        // Preparazione bottone per ricominciare
        if (restartGameBtn) {
            restartGameBtn.addEventListener('click', () => {
                startGameWithMapData(currentMapData);
            });
        }
        
        // Bottone torna al menu
        if (backMenuButton) {
            backMenuButton.addEventListener('click', () => {
                window.removeEventListener('keydown', handleKeydown);
            });
        }

        // Aggiorna la dimensione delle celle e disegna
        calculateCellSizeAndDraw();
        
        // Monitora il caricamento degli asset
        const checkAssetInterval = setInterval(() => {
            if (checkAllAssetsLoaded()) {
                clearInterval(checkAssetInterval);
                drawGame();
            }
        }, 100);

        return true;
    }

    // Reset del canvas quando la finestra è ridimensionata
    function updateCanvasResolution() {
        if (canvas && canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            if (currentMapData) {
                calculateCellSizeAndDraw();
            }
        }
    }

    // Espongo pubblicamente le funzioni necessarie
    return {
        startGameWithMapData,
        updateCanvasResolution,
        drawGame
    };
})();
