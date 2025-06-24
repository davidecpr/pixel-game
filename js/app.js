// js/app.js
// Gestisce navigazione, full-screen e ridimensionamento
document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti alle sezioni principali
    const body = document.body;
    const menuScreenSection = document.getElementById('menu-screen-section');
    const editorScreenSection = document.getElementById('editor-screen-section');
    const mapSelectionSection = document.getElementById('map-selection-section');
    const commandScreenSection = document.getElementById('command-screen-section');
    const playScreenSection = document.getElementById('play-screen-section');
    
    // Contenitori e bottoni per la navigazione
    const btnEditor = document.getElementById('btn-editor');
    const btnPlay = document.getElementById('btn-play');
    const mapListContainer = document.getElementById('map-list-container');
    const btnStartGame = document.getElementById('btn-start-game');
    const btnBackToMapSelection = document.getElementById('back-to-map-selection');
    const btnExecute = document.getElementById('btn-execute');
    const btnBackFromGame = document.getElementById('back-menu-from-game');
    let selectedMapData = null;

    // Elementi del pannello comandi
    const commandPanel = document.getElementById('command-panel');
    const commandList = document.getElementById('command-list');
    const btnForward = document.getElementById('btn-forward');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump = document.getElementById('btn-jump');
    const btnClear = document.getElementById('btn-clear');
    
    // Array per memorizzare la sequenza di comandi
    let commandQueue = [];

    const editorCanvas = document.getElementById('editor-canvas');
    const gameCanvas = document.getElementById('game-canvas');

    const clickSound = new Audio('assets/press.mp3');

    // --- Funzioni di utility ---
    function requestFullScreen(element) {
        if (element.requestFullscreen) element.requestFullscreen();
        else if (element.mozRequestFullScreen) element.mozRequestFullScreen(); /* Firefox */
        else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen(); /* Chrome, Safari & Opera */
        else if (element.msRequestFullscreen) element.msRequestFullscreen(); /* IE/Edge */
    }

    // Mostra una schermata e nasconde le altre
    function showScreen(screenId) {
        // Nasconde tutte le schermate
        [menuScreenSection, editorScreenSection, mapSelectionSection, commandScreenSection, playScreenSection].forEach(section => {
            if (section) section.classList.add('hidden');
        });
        // Mostra la schermata richiesta
        const screenToShow = document.getElementById(screenId);
        if (screenToShow) screenToShow.classList.remove('hidden');
        else console.error(`Schermata ${screenId} non trovata!`);
    }

    // --- Gestione Canvas ---
    function updateCanvasResolution(canvas) {
        if (!canvas) return;
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        if ((canvas.width !== displayWidth || canvas.height !== displayHeight) && displayWidth > 0 && displayHeight > 0) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            // Chiama le funzioni di redraw specifiche se esistono globalmente
            if (canvas.id === 'editor-canvas' && typeof window.redrawEditorCanvas === 'function') {
                window.redrawEditorCanvas();
            }
            if (canvas.id === 'game-canvas' && typeof game !== 'undefined' && game.redrawGameCanvas) {
                game.redrawGameCanvas();
            }
        } else if (displayWidth <= 0 || displayHeight <= 0) {
            requestAnimationFrame(() => updateCanvasResolution(canvas));
        }
    }

    function resizeCanvases() { // Rinominata da scheduleCanvasResize per chiarezza
        [editorCanvas, gameCanvas].forEach(canvas => {
            if (canvas) {
                requestAnimationFrame(() => updateCanvasResolution(canvas));
            }
        });
    }

    window.addEventListener('resize', resizeCanvases);
    setTimeout(resizeCanvases, 50); // Chiamata iniziale

    // --- Navigazione tra schermate ---
    btnEditor.onclick = () => {
        showScreen('editor-screen-section');
        resizeCanvases();
    };

    btnPlay.onclick = () => {
        // Dal menù principale alla selezione mappa
        showScreen('map-selection-section');
        populateMapList();
        resizeCanvases(); 
    };

    // Dalla selezione mappa alla schermata di inserimento comandi
    btnStartGame.onclick = () => {
        // Passa i dati della mappa al gioco, ma senza iniziare immediatamente
        game.loadMapData(selectedMapData); 
        // Mostra la schermata di inserimento comandi
        showScreen('command-screen-section');
        // Pulisce la sequenza di comandi
        commandQueue = [];
        updateCommandList();
        resizeCanvases();
    };

    // Funzione per il countdown prima dell'esecuzione
    function startCountdown(seconds, onComplete) {
        const countdownOverlay = document.getElementById('countdown-overlay');
        const countdownElement = document.getElementById('countdown');
        
        if (!countdownOverlay || !countdownElement) {
            console.error('Elementi di countdown non trovati');
            onComplete(); // Procedi comunque
            return;
        }
        
        // Mostra l'overlay di countdown
        countdownOverlay.classList.remove('hidden');
        countdownElement.textContent = seconds;
        
        const countdownInterval = setInterval(() => {
            seconds--;
            
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                countdownOverlay.classList.add('hidden');
                onComplete();
                return;
            }
            
            countdownElement.textContent = seconds;
        }, 1000);
    }
    
    // Dall'inserimento comandi all'esecuzione del gioco
    btnExecute.onclick = () => {
        if (commandQueue.length === 0) {
            alert('Aggiungi almeno un comando alla sequenza!');
            return;
        }
        // Mostra la schermata di gioco
        showScreen('play-screen-section');
        
        // Diamo tempo al browser di renderizzare la nuova schermata prima di ridimensionare il canvas
        setTimeout(() => {
            // Assicuriamo che il canvas sia ridimensionato correttamente
            game.updateCanvasResolution();
            game.calculateCellSizeAndDraw();
        }, 50); // Un leggero ritardo per permettere al browser di completare il rendering
        resizeCanvases();
        
        // Avvia il countdown e poi inizia il gioco ed esegui la sequenza
        startCountdown(3, () => {
            // Avvia il gioco solo dopo che il countdown è terminato
            game.startGame();
            game.executeCommands(commandQueue);
        });
    };

    // Torna alla selezione mappa dalla schermata dei comandi
    btnBackToMapSelection.onclick = () => {
        showScreen('map-selection-section');
    };
    
    // Funzione per tornare alla schermata dei comandi (per il pulsante "Rigioca")
    window.backToCommandScreen = function() {
        commandQueue = []; // Reset comandi
        updateCommandList();
        
        if (typeof game !== 'undefined' && game.loadMapData && selectedMapData) {
            game.loadMapData(selectedMapData); // ricarica mappa pulita
        }
    
        showScreen('command-screen-section');
        resizeCanvases(); // ridisegna canvas correttamente
    };

    // Gestori per i pulsanti di ritorno al menu principale
    const btnBackMenu1 = document.getElementById('back-menu-1'); // Da editor
    const btnBackMenu2 = document.getElementById('back-menu-2'); // Da selezione mappa
    const btnBackMenuFromGame = document.getElementById('back-menu-from-game'); // Da gioco

    btnBackMenu1.onclick = btnBackMenu2.onclick = btnBackMenuFromGame.onclick = () => {
        showScreen('menu-screen-section');
    };

    // --- Logica Selezione Mappa ---
    function populateMapList() {
        mapListContainer.innerHTML = '';
        btnStartGame.disabled = true;
        selectedMapData = null;
        const maps = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('map_')) {
                try {
                    const mapData = JSON.parse(localStorage.getItem(key));
                    if (mapData && mapData.name && mapData.mapData) maps.push(mapData);
                } catch (e) { console.error(`Errore parsing mappa ${key}:`, e); }
            }
        }

        if (maps.length === 0) {
            mapListContainer.innerHTML = '<p>Nessuna mappa creata. Vai all\'editor!</p>';
            return;
        }

        maps.forEach(map => {
            const mapItem = document.createElement('div');
            mapItem.classList.add('map-list-item', 'btn');
            mapItem.textContent = map.name;
            mapItem.addEventListener('click', () => {
                document.querySelectorAll('.map-list-item.selected').forEach(item => item.classList.remove('selected'));
                mapItem.classList.add('selected');
                selectedMapData = map;
                btnStartGame.disabled = false;
            });
            mapListContainer.appendChild(mapItem);
        });
    }

    btnStartGame.addEventListener('click', () => {
        if (selectedMapData) {
            mapSelectionSection.classList.add('hidden');
            commandScreenSection.classList.remove('hidden'); // Mostra la schermata dei comandi
            
            // Resetta la sequenza di comandi quando si inizia una nuova partita
            commandQueue = [];
            updateCommandList();
            
            if (typeof game !== 'undefined' && game.startGameWithMapData) {
                game.startGameWithMapData(selectedMapData);
            } else {
                console.error('Funzione game.startGameWithMapData non trovata.');
                alert('Errore nell\'avviare il gioco. Controlla la console.');
            }
            resizeCanvases();
        } else {
            alert('Per favore, seleziona una mappa per iniziare.');
        }
    });
    
    // Funzione per aggiornare la visualizzazione della sequenza di comandi
    function updateCommandList() {
        commandList.innerHTML = '';
    
        if (commandQueue.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'command-empty';
            emptyMsg.textContent = 'Nessun comando. Aggiungi comandi alla sequenza.';
            commandList.appendChild(emptyMsg);
            return;
        }
    
        commandQueue.forEach((command, index) => {
            const cmdItem = document.createElement('div');
            cmdItem.className = `command-item command-${command}`;
    
            let icon = '';
            switch (command) {
                case 'forward': icon = '⬆️'; break;
                case 'left': icon = '⬅️'; break;
                case 'right': icon = '➡️'; break;
                case 'jump': icon = '⏫'; break;
            }

            let italianCommand = "";
            switch (command) {
                case 'forward': italianCommand = "Avanti"; break;
                case 'left': italianCommand = "Sinistra"; break;
                case 'right': italianCommand = "Destra"; break;
                case 'jump': italianCommand = "Salta"; break;
            }
    
            cmdItem.innerHTML = `
                <span class="command-name">${italianCommand}</span>
                <button class="remove-btn" title="Rimuovi comando">❌</button>
            `;
    
            // Rimozione singolo comando
            cmdItem.querySelector('.remove-btn').addEventListener('click', () => {
                commandQueue.splice(index, 1);
                updateCommandList();
            });
    
            commandList.appendChild(cmdItem);
        });
    }
    
    // Funzione per gestire l'aggiunta di un comando alla sequenza
    function addCommand(command) {
        commandQueue.push(command);
        updateCommandList();
        clickSound.currentTime = 0; // Riavvia il suono se già in riproduzione
        clickSound.play();
    }
    
    // Event listener per la tastiera (frecce e spazio)
    document.addEventListener('keydown', function(e) {
        // Esegui il comando solo se siamo nella schermata di comando (non nella schermata di gioco)
        if (commandScreenSection.classList.contains('hidden')) {
            return;
        }
        
        // Verifica che non ci sia un'esecuzione di comandi in corso
        if (document.querySelector('#command-panel button.disabled')) {
            return; // Non accettare input se i pulsanti sono disabilitati
        }
        
        switch(e.key) {
            case 'ArrowUp':
                addCommand('forward');
                break;
            case 'ArrowLeft':
                addCommand('left');
                break;
            case 'ArrowRight':
                addCommand('right');
                break;
            case 'ArrowDown':
                addCommand('jump');
                break;
            case ' ': // Spazio - esegue la sequenza
                if (btnExecute && !btnExecute.disabled) {
                    btnExecute.click(); // Attiva il click sul pulsante Esegui
                }
                break;
        }
    });
    
    // Nota: l'event listener per btnExecute è già definito sopra e non serve duplicarlo qui
    
    // Event listener per il pulsante Pulisci
    btnClear.addEventListener('click', () => {
        commandQueue = [];
        updateCommandList();
    });
    
    // Funzione per abilitare/disabilitare i pulsanti di controllo
    function setCommandButtonsEnabled(enabled) {
        const buttons = [btnExecute, btnClear];
        buttons.forEach(btn => {
            btn.disabled = !enabled;
            if (enabled) {
                btn.classList.remove('disabled');
            } else {
                btn.classList.add('disabled');
            }
        });
    }

});