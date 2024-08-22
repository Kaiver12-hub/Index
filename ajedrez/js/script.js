//------------------- Seccion variables:----------------------

var board1;
var game = new Chess();
var timer = {
    white: 0,
    black: 0,
};
var initialTime = 3600; // Default al tiempo clasico (60 mins)
var currentPlayer = 'w';
var timerInterval;

//Colores para las casillas sombreadas.
var whiteSquareGrey = '#a9a9a9';
var blackSquareGrey = '#696969';

//-----------------------------------------------Seccion funciones-------------------------------

//Eliminar sombreado de las casillas.
function removeGreySquares() {
    $('#board1 .square-55d63').css('background', '');
}

// Sombrear una casilla.
function greySquare(square) {
    var $square = $('#board1 .square-' + square);

    var background = whiteSquareGrey;
    if ($square.hasClass('black-3c85d')) {
        background = blackSquareGrey;
    }

    $square.css('background', background);
}

// Inicializador el juego y el tablero.
function initializeGame() {
    game = new Chess();

    var selectedColor = document.getElementById('player-color').value;

    board1 = ChessBoard('board1', {
        draggable: true,
        position: 'start',
        orientation: selectedColor === 'w' ? 'white' : 'black', // Ajustar la orientación del tablero
        onDragStart: onDragStart,
        onDrop: onDrop,
        onMouseoverSquare: onMouseoverSquare,
        onMouseoutSquare: onMouseoutSquare,
        onSnapEnd: onSnapEnd
    });

    currentPlayer = selectedColor === 'w' ? 'w' : 'b'; // Ajustar el jugador inicial según la elección 
    updateMoveHistory();
    startTimer();

    // Si se elige jugar contra la IA y el jugador selecciona negras, la IA hace el primer movimiento
    var gameMode = document.getElementById('game-mode').value;
    if (gameMode === 'ai' && selectedColor === 'b') {
        setTimeout(makeBestMove, 250);
    }
}

// Inicia el temporizador del juego.
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    var selectedTimeControl = document.getElementById('time-control').value;
    if (selectedTimeControl === 'classic') {
        initialTime = 3600; // 60 mins 60x60
    } else if (selectedTimeControl === 'ten-min') {
        initialTime = 600; // 10 mins  10*60
    } else if (selectedTimeControl === 'blitz') {
        initialTime = 300; // 5 mins   5*60
    }

    timer.white = initialTime;
    timer.black = initialTime;

    document.getElementById('white-timer').innerText = `White: ${formatTime(timer.white)}`;
    document.getElementById('black-timer').innerText = `Black: ${formatTime(timer.black)}`;

    timerInterval = setInterval(function() {
        if (currentPlayer === 'w') {
            timer.white--;
            document.getElementById('white-timer').innerText = `White: ${formatTime(timer.white)}`;
        } else {
            timer.black--;
            document.getElementById('black-timer').innerText = `Black: ${formatTime(timer.black)}`;
        }

        if (timer.white <= 0 || timer.black <= 0) {
            clearInterval(timerInterval);
             // Mostrar el mensaje en el archivo HTML
            var gameOverMessage = document.getElementById('game-over-message');
            gameOverMessage.style.display = 'block';
            gameOverMessage.innerText = '¡Game Over! El tiempo se ha terminado.';
        }
    }, 1000);
}

// Formatear el tiempo para mostrar.
function formatTime(seconds) {
    var minutes = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return `${pad(minutes)}:${pad(secs)}`;
}

function pad(number) {
    return number < 10 ? '0' + number : number;
}

// Manejar el arrastre de piezas.
function onDragStart(source, piece, position, orientation) {
    if (game.game_over() || 
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

// Manejar la colocacion de la piezas.
function onDrop(source, target) {
    removeGreySquares();

    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' 
    });

    if (move === null) return 'snapback';

    updateMoveHistory();
    currentPlayer = (currentPlayer === 'w') ? 'b' : 'w';

    var gameMode = document.getElementById('game-mode').value;
    if (gameMode === 'ai') {
        board1.position(game.fen());
        setTimeout(makeBestMove, 250);
    } else {
        board1.position(game.fen());
    }

    // Verificar si el juego ha terminado
    var resultElement = document.getElementById('game-result');
    if (game.in_checkmate()) {
        if (game.turn() === 'b') {
            resultElement.innerText = '¡Juego terminado! Ganó el blanco.';
        } else {
            resultElement.innerText = '¡Juego terminado! Ganó el negro.';
        }
        clearInterval(timerInterval); // Detener el temporizador
    } else if (game.in_draw()) {
        // Verificaciones adicionales para determinar el tipo de empate
        if (game.insufficient_material()) {
            resultElement.innerText = '¡Juego terminado! Empate por material insuficiente.';
        } else if (game.in_stalemate()) {
            resultElement.innerText = '¡Juego terminado! Empate por rey ahogado.';
        } else if (game.in_threefold_repetition()) {
            resultElement.innerText = '¡Juego terminado! Empate por repetición de posición.';
        } else if (game.in_fifty_moves()) {
            resultElement.innerText = '¡Juego terminado! Empate por regla de los 50 movimientos.';
        } else {
            // Caso general de empate (en caso de que se agregue una nueva regla en el futuro)
        resultElement.innerText = '¡Juego terminado! Es un empate.';
        }
        clearInterval(timerInterval); // Detener el temporizador
    } else{
        resultElement.innerText = ''; // Limpiar el mensaje si el juego no ha terminado
    }
}

// Resaltar posibles movimientos al pasar el ratón por encima de una casilla
function onMouseoverSquare(square, piece) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    greySquare(square);

    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
}

// Quitar resaltado de casillas cuando el ratón sale de la casilla
function onMouseoutSquare(square, piece) {
    removeGreySquares();
}

// ---------------------------------------- nivel de difilcutad de la IA---------------

// Hacer el mejor movimiento basado en la dificultad.
// makeBestMove ajusta el comportamiento de la IA según el nivel de dificultad seleccionado.
function makeBestMove() {
    var difficulty = document.getElementById('difficulty').value;

    if (difficulty === 'easy') {
        makeRandomMove();
    } else if (difficulty === 'medium') {
        makeBestCaptureMove();
    } 

    updateMoveHistory();
    currentPlayer = 'w';
    board1.position(game.fen());
}

// Hacer un movimiento aleatorio.
//Dificultad 'easy': selecciona un movimiento aleatorio de todos los posibles. Esto representa un nivel bajo de dificultad, ya que la IA no realiza ninguna evaluación estratégica.
function makeRandomMove() {
    var possibleMoves = game.moves();
    if (possibleMoves.length === 0) return;

    // Filtrar movimientos de captura
    var captureMoves = possibleMoves.filter(move => move.includes('x'));

    // Si hay movimientos de captura disponibles, elige uno al azar
    if (captureMoves.length > 0) {
        var randomIdx = Math.floor(Math.random() * captureMoves.length);
        game.move(captureMoves[randomIdx]);
    } else {
        // Si no hay movimientos de captura, elige cualquier otro movimiento al azar
        var randomIdx = Math.floor(Math.random() * possibleMoves.length);
        game.move(possibleMoves[randomIdx]);
    }

    board1.position(game.fen());
}

/*---------------------------------------------------------------------------------- */

// Hacer el mejor movimiento de captura.
// Dificultad 'medium': Selecciona el mejor movimiento de captura disponible. La IA evalúa las capturas posibles y elige la que captura la pieza de mayor valor. Esto representa un nivel intermedio de dificultad, ya que la IA considera el valor material de las piezas capturadas.
function makeBestCaptureMove() {
    var possibleMoves = game.moves({ verbose: true });
    var bestMove = null;
    var bestValue = -9999;

    possibleMoves.forEach(function(move) {
        if (move.flags.includes('c')) {
            var captureValue = getPieceValue(move.captured);
            if (captureValue > bestValue) {
                bestValue = captureValue;
                bestMove = move;
            }
        }
    });

    if (!bestMove) {
        makeRandomMove();
    } else {
        game.move(bestMove.san);
        board1.position(game.fen());
    }
}

// Obtener el valor de una pieza.
function getPieceValue(piece) {
    if (piece === null) {
        return 0;
    }
    var value;
    switch (piece.type) {
        case 'p': value = 10; break;
        case 'r': value = 50; break;
        case 'n': value = 30; break;
        case 'b': value = 30; break;
        case 'q': value = 90; break;
        case 'k': value = 900; break;
        default: value = 0;
    }
    return piece.color === 'w' ? value : -value;
}

/*---------------------------------------------------------------------------------- */

// Evalua el valor del tablero.
function evaluateBoard(board) {
    if (!board) return 0;  // Return 0 if the board is undefined

    var totalEvaluation = 0;
    board.forEach(function(row) {
        row.forEach(function(piece) {
            totalEvaluation += getPieceValue(piece);
        });
    });
    return totalEvaluation;
}

// Actualiza el historial de movimimientos.
function updateMoveHistory() {
    var history = game.history();
    var moveHistoryTable = document.querySelector('#move-history tbody');
    moveHistoryTable.innerHTML = '';

    for (var i = 0; i < history.length; i += 2) {
        var row = moveHistoryTable.insertRow();
        var moveNumberCell = row.insertCell(0);
        var whiteMoveCell = row.insertCell(1);
        var blackMoveCell = row.insertCell(2);

        moveNumberCell.innerHTML = (i / 2) + 1;
        whiteMoveCell.innerHTML = history[i];
        blackMoveCell.innerHTML = history[i + 1] || '';
    }

    // Scroll down automatically to show the latest move
    var moveHistoryContainer = document.getElementById('move-history-container');
    moveHistoryContainer.scrollTop = moveHistoryContainer.scrollHeight;
}

// Manejar la actualizacion de la posicion despues de un movimiento.
function onSnapEnd() {
    board1.position(game.fen());
}

// Configurar eventos para los botones de iniciar y reiniciar juego
document.getElementById('start-game').addEventListener('click', initializeGame);

// Configura el evento para el button de reseteo. resetea el juego desde el principio y su componentes que se encuentra dentro de la funcion.
document.getElementById('reset-game').addEventListener('click', function() {
    if (timerInterval) clearInterval(timerInterval);

    var selectedTimeControl = document.getElementById('time-control').value;
    if (selectedTimeControl === 'classic') {
        initialTime = 3600;
    } else if (selectedTimeControl === 'ten-min') {
        initialTime = 600;
    } else if (selectedTimeControl === 'blitz') {
        initialTime = 300;
    }

    timer.white = initialTime;
    timer.black = initialTime;

    document.getElementById('white-timer').innerText = `White: ${formatTime(timer.white)}`;
    document.getElementById('black-timer').innerText = `Black: ${formatTime(timer.black)}`;

    game.reset();
    board1 = ChessBoard('board1', {
        draggable: false,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    });

    document.querySelector('#move-history tbody').innerHTML = ''; // querySelector es un método en JavaScript que se utiliza para seleccionar el primer elemento en el documento que coincide con un selector CSS específico.
    currentPlayer = 'w';

    // Limpiar el mensaje de resultado
    document.getElementById('game-result').innerText = '';
});

var config = {
    draggable: false, // Initial state: draggable pieces are not allowed
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
};

board1 = ChessBoard('board1', config);