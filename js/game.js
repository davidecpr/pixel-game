// js/game.js - Versione patchata: fix resize iniziale e centratura con sfondo bianco
const game = (() => {
    // Elementi DOM
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const gameOverlay = document.getElementById('game-overlay');
    const overlayMessage = document.getElementById('overlay-message');
    let restartGameBtn = document.getElementById('restart-game-btn');
    const backMenuButton = document.getElementById('back-menu-from-game');

    // Stato di gioco
    let currentMapData = null;
    let player = { x: 0, y: 0, direction: 0 };
    let trophy = { x: 0, y: 0 };
    let cellWidth = 20;
    let cellHeight = 20;
    let gameWon = false;
    let gameLost = false;
    let isExecutingCommands = false;

    const victorySound = new Audio('assets/vittoria.mp3');
    const defeatSound  = new Audio('assets/sconfitta.mp3');
    const press = new Audio('assets/press.mp3');
    const moveSound = new Audio('assets/boing.mp3');

    const assets = {};
    window.assetList.forEach(a => {
        const img = new Image();
        img.src = a.url;
        assets[a.key] = img;
    });
    const playerImg = new Image();
    playerImg.src = 'https://art.pixilart.com/sr2b2528d58f1aws3.png';

    function drawGame() {
        if (!ctx || !currentMapData || !currentMapData.mapData || !player) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const offsetX = (canvas.width - cellWidth * currentMapData.cols) / 2;
        const offsetY = (canvas.height - cellHeight * currentMapData.rows) / 2;

        for (let r = 0; r < currentMapData.rows; r++) {
            for (let c = 0; c < currentMapData.cols; c++) {
                const assetKey = currentMapData.mapData[r][c];
                const x = offsetX + c * cellWidth;
                const y = offsetY + r * cellHeight;

                if (['T', 'W', 'X'].includes(assetKey) && assets['G']?.complete) {
                    ctx.drawImage(assets['G'], x, y, cellWidth, cellHeight);
                }

                if (assets[assetKey]?.complete) {
                    ctx.drawImage(assets[assetKey], x, y, cellWidth, cellHeight);
                } else {
                    ctx.fillStyle = '#777';
                    ctx.fillRect(x, y, cellWidth, cellHeight);
                }
            }
        }

        if (trophy && assets['X']?.complete) {
            ctx.drawImage(
                assets['X'],
                offsetX + trophy.x * cellWidth,
                offsetY + trophy.y * cellHeight,
                cellWidth,
                cellHeight
            );
        }

        if (playerImg.complete) {
            ctx.save();
            const centerX = offsetX + player.x * cellWidth + cellWidth / 2;
            const centerY = offsetY + player.y * cellHeight + cellHeight / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(player.direction * 90 * Math.PI / 180);
            ctx.drawImage(playerImg, -cellWidth / 2, -cellHeight / 2, cellWidth, cellHeight);
            ctx.restore();
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(
                offsetX + player.x * cellWidth + cellWidth * 0.2,
                offsetY + player.y * cellHeight + cellHeight * 0.2,
                cellWidth * 0.6,
                cellHeight * 0.6
            );
        }
    }

    function updateCanvasResolution() {
        if (canvas?.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
    }

    function calculateCellSizeAndDraw() {
        if (!currentMapData) return;

        const tentativeCellWidth = Math.floor(canvas.width / currentMapData.cols);
        const tentativeCellHeight = Math.floor(canvas.height / currentMapData.rows);
        const finalCellSize = Math.min(tentativeCellWidth, tentativeCellHeight);

        cellWidth = finalCellSize;
        cellHeight = finalCellSize;

        drawGame();
    }

    function loadMapData(mapData) {
        if (!mapData?.mapData) {
            console.error("Dati della mappa non validi");
            return false;
        }

        updateCanvasResolution();
        currentMapData = mapData;
        player = { x: mapData.cols - 1, y: mapData.rows - 1, direction: 0 };
        gameWon = false;
        gameLost = false;

        if (gameOverlay) {
            gameOverlay.classList.add('hidden');
        }

        for (let r = 0; r < mapData.rows; r++) {
            for (let c = 0; c < mapData.cols; c++) {
                if (mapData.mapData[r][c] === 'X') {
                    trophy = { x: c, y: r };
                }
            }
        }

        const checkInterval = setInterval(() => {
            const allLoaded = Object.values(assets).every(img => img.complete) && playerImg.complete;
            if (allLoaded) {
                clearInterval(checkInterval);
                calculateCellSizeAndDraw();
            }
        }, 100);

        return true;
    }

    function startGame() {}
    function startGameWithMapData(mapData) {
        if (loadMapData(mapData)) return startGame();
        return false;
    }

    window.addEventListener('resize', () => {
        updateCanvasResolution();
        if (currentMapData) calculateCellSizeAndDraw();
    });

    function executeCommands(commands, callback) {
        // Imposta il flag per bloccare l'input da tastiera durante l'esecuzione automatica
        isExecutingCommands = true;
        console.log('Inizio esecuzione automatica comandi');
        
        // Salva la sequenza di comandi corrente per poterla ri-eseguire
        window.commandQueue = [...commands];
        
        if (!commands || !Array.isArray(commands) || commands.length === 0) {
            console.warn("Nessun comando da eseguire");
            isExecutingCommands = false; // Reset del flag se non ci sono comandi
            if (callback) callback({success: false, reason: "no_commands"});
            return;
        }

        // Nascondi l'overlay se è visibile (ad esempio se stiamo ricominciando)
        if (gameOverlay && !gameOverlay.classList.contains('hidden')) {
            gameOverlay.classList.add('hidden');
        }

        // Verifica che ci sia una mappa caricata
        if (!currentMapData) {
            console.error("Devi prima caricare una mappa con loadMapData()");
            if (callback) callback({success: false, reason: "no_map_data"});
            return;
        }

        // Reset dello stato di gioco prima di eseguire i comandi
        gameWon = false;
        gameLost = false;

        let currentIndex = 0;
        const commandDelay = 1000; // Ritardo tra un comando e l'altro (ms)
        
        function executeNextCommand() {
            if (currentIndex >= commands.length) {
                // Tutti i comandi sono stati eseguiti, verifica la vittoria
                if (!gameWon && !gameLost) {
                    // Se non abbiamo né vinto né perso, ma la sequenza è finita, abbiamo perso
                    gameLost = true;
                    showGameOverMessage("Non hai raggiunto il trofeo!");
                }
                
                // Reset del flag quando l'esecuzione è completata
                isExecutingCommands = false;
                console.log('Esecuzione automatica comandi completata');
                
                if (callback) {
                    callback({
                        success: true, 
                        gameWon: gameWon, 
                        gameLost: gameLost, 
                        reason: gameWon ? "victory" : "sequence_ended"
                    });
                }
                return;
            }
            
            const command = commands[currentIndex];
            currentIndex++;
            
            // Esegui il comando
            executeSingleCommand(command);
            
            // Se la partita è finita (vittoria o sconfitta), interrompi la sequenza
            if (gameWon || gameLost) {
                if (callback) {
                    callback({
                        success: true, 
                        gameWon: gameWon, 
                        gameLost: gameLost, 
                        reason: gameWon ? "victory" : "game_lost"
                    });
                }
                return;
            }
            
            // Altrimenti, programma il prossimo comando
            setTimeout(executeNextCommand, commandDelay); 
        }
        
        // Avvia l'esecuzione della sequenza con un breve ritardo iniziale
        setTimeout(executeNextCommand, 200);
    }

    function executeSingleCommand(command) {
        console.log(`Esecuzione comando: ${command}`);
        
        switch (command) {
            case 'forward':
                // Muovi avanti nella direzione attuale
                switch(player.direction) {
                    case 0: movePlayer(0, -1); break; // Su
                    case 1: movePlayer(1, 0); break; // Destra
                    case 2: movePlayer(0, 1); break; // Giù
                    case 3: movePlayer(-1, 0); break; // Sinistra
                }
                break;
            case 'left':
                // Ruota a sinistra
                player.direction = (player.direction + 3) % 4; // +3 mod 4 equivale a -1 mod 4
                drawGame(); // Ridisegna per mostrare la rotazione
                break;
            case 'right':
                // Ruota a destra
                player.direction = (player.direction + 1) % 4;
                drawGame(); // Ridisegna per mostrare la rotazione
                break;
            case 'jump':
                // Salto di due celle in avanti nella direzione attuale
                switch(player.direction) {
                    case 0: movePlayer(0, -2); break; // Su
                    case 1: movePlayer(2, 0); break; // Destra
                    case 2: movePlayer(0, 2); break; // Giù
                    case 3: movePlayer(-2, 0); break; // Sinistra
                }
                break;
            default:
                console.warn(`Comando sconosciuto: ${command}`);
        }
    }

    function showGameOverMessage(message) {
        console.log("message: ", message)
        if (message === "Hai perso!" || message === "Non hai raggiunto il trofeo!") {
            defeatSound.play();
        } else if (message === "Hai vinto!") {
            victorySound.play();
        }
        if (gameOverlay && overlayMessage) {
            overlayMessage.textContent = message;
            gameOverlay.classList.remove('hidden');
        }
    }

    function delayed(fn) {
        setTimeout(fn, DELAY);
    }
    

    function movePlayer(dx, dy) {
        moveSound.currentTime = 0;
        moveSound.play();
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

    function showOverlay(message) {
        console.log("message: ", message)
        if (message === "Hai perso!" || message === "Non hai raggiunto il trofeo!") {
            defeatSound.play();
        } else if (message === "Hai vinto!") {
            victorySound.play();
            confetti({
                particleCount: 150,
                spread: 120,
                origin: { y: 0.6 }
              });
            
              // Confetti multipli da più angolazioni
              const duration = 2 * 1000;
              const animationEnd = Date.now() + duration;
              const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };
            
              const interval = setInterval(() => {
                const timeLeft = animationEnd - Date.now();
            
                if (timeLeft <= 0) {
                  return clearInterval(interval);
                }
            
                const angle = Math.random() * 360;
                const x = Math.random();
                const y = Math.random() * 0.6;
            
                confetti(Object.assign({}, defaults, {
                  angle,
                  origin: { x, y }
                }));
              }, 200);
        }

        if (gameOverlay) {
            overlayMessage.textContent = message;
            gameOverlay.classList.remove('hidden');
        }
    }

    function handleKeydown(e) {
        // Ignora l'input se il gioco è vinto/perso o durante l'esecuzione automatica
        if (gameWon || gameLost || isExecutingCommands) {
            console.log('Input ignorato:', isExecutingCommands ? 'esecuzione automatica in corso' : 'gioco terminato');
            return;
        }
        
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

        return {
        calculateCellSizeAndDraw,
        executeCommands,
        loadMapData,
        startGame,
        startGameWithMapData,
        updateCanvasResolution,
        redrawGameCanvas: drawGame
    };
})();
