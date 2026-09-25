// Welcome to
// __________         __    __  .__                               __
// \______   \_____ _/  |__/  |_|  |   ____   ______ ____ _____  |  | __ ____
//  |    |  _/\__  \\   __\   __\  | _/ __ \ /  ___//    \\__  \ |  |/ // __ \
//  |    |   \ / __ \|  |  |  | |  |_\  ___/ \___ \|   |  \/ __ \|    <\  ___/
//  |________/(______/__|  |__| |____/\_____>______>___|__(______/__|__\\_____>
//
// This file can be a nice home for your Battlesnake logic and helper functions.
//
// To get you started we've included code to prevent your Battlesnake from moving backwards.
// For more info see docs.battlesnake.com

import runServer from './server.js';

// info is called when you create your Battlesnake on play.battlesnake.com
// and controls your Battlesnake's appearance
// TIP: If you open your Battlesnake URL in a browser you should see this data
function info() {
  console.log("INFO");

  return {
    apiversion: "1",
    author: "",       // TODO: Your Battlesnake Username
    color: "#888888", // TODO: Choose color
    head: "default",  // TODO: Choose head
    tail: "default",  // TODO: Choose tail
  };
}

// start is called when your Battlesnake begins a game
function start(gameState) {
  console.log("GAME START");
}

// end is called when your Battlesnake finishes a game
function end(gameState) {
  console.log("GAME OVER\n");
}

function positionKey(position) {
  return `${position.x},${position.y}`;
}

function isInBounds(position, boardWidth, boardHeight) {
  return position.x >= 0
    && position.x < boardWidth
    && position.y >= 0
    && position.y < boardHeight;
}

function getNeighbors(position) {
  return [
    { x: position.x, y: position.y + 1 },
    { x: position.x, y: position.y - 1 },
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y }
  ];
}

function getBlockedPositions(gameState) {
  const blockedPositions = new Set();

  gameState.board.snakes.forEach(snake => {
    snake.body.forEach(bodyPart => {
      blockedPositions.add(positionKey(bodyPart));
    });
  });

  return blockedPositions;
}

function distanceBetween(positionA, positionB) {
  return Math.abs(positionA.x - positionB.x) + Math.abs(positionA.y - positionB.y);
}

function distanceToClosestFood(position, food) {
  if (food.length === 0) {
    return Infinity;
  }

  return Math.min(...food.map(foodPosition => {
    return distanceBetween(position, foodPosition);
  }));
}

function floodFillArea(startPosition, boardWidth, boardHeight, blockedPositions) {
  if (!isInBounds(startPosition, boardWidth, boardHeight)) {
    return 0;
  }
  if (blockedPositions.has(positionKey(startPosition))) {
    return 0;
  }

  const visited = new Set([positionKey(startPosition)]);
  const queue = [startPosition];

  while (queue.length > 0) {
    const currentPosition = queue.shift();

    getNeighbors(currentPosition).forEach(neighbor => {
      const key = positionKey(neighbor);

      if (!isInBounds(neighbor, boardWidth, boardHeight)) {
        return;
      }
      if (blockedPositions.has(key) || visited.has(key)) {
        return;
      }

      visited.add(key);
      queue.push(neighbor);
    });
  }

  return visited.size;
}

// move is called on every turn and returns your next move
// Valid moves are "up", "down", "left", or "right"
// See https://docs.battlesnake.com/api/example-move for available data
function move(gameState) {
  console.log("GAME STATE:");
  console.log(JSON.stringify(gameState, null, 2));

  let isMoveSafe = {
    up: true,
    down: true,
    left: true,
    right: true
  };

  // We've included code to prevent your Battlesnake from moving backwards
  const myHead = gameState.you.body[0];
  const myNeck = gameState.you.body[1];

  if (myNeck.x < myHead.x) {        // Neck is left of head, don't move left
    isMoveSafe.left = false;

  } else if (myNeck.x > myHead.x) { // Neck is right of head, don't move right
    isMoveSafe.right = false;

  } else if (myNeck.y < myHead.y) { // Neck is below head, don't move down
    isMoveSafe.down = false;

  } else if (myNeck.y > myHead.y) { // Neck is above head, don't move up
    isMoveSafe.up = false;
  }

  // Prevent your Battlesnake from moving out of bounds
  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;

  if (myHead.x === 0) {
    isMoveSafe.left = false;
  }
  if (myHead.x === boardWidth - 1) {
    isMoveSafe.right = false;
  }
  if (myHead.y === 0) {
    isMoveSafe.down = false;
  }
  if (myHead.y === boardHeight - 1) {
    isMoveSafe.up = false;
  }

  const possibleMoves = {
    up: { x: myHead.x, y: myHead.y + 1 },
    down: { x: myHead.x, y: myHead.y - 1 },
    left: { x: myHead.x - 1, y: myHead.y },
    right: { x: myHead.x + 1, y: myHead.y }
  };
  const blockedPositions = getBlockedPositions(gameState);

  // Prevent your Battlesnake from colliding with itself or other Battlesnakes
  Object.keys(possibleMoves).forEach(move => {
    const nextPosition = possibleMoves[move];

    if (blockedPositions.has(positionKey(nextPosition))) {
      isMoveSafe[move] = false;
    }
  });

  // Are there any safe moves left?
  const safeMoves = Object.keys(isMoveSafe).filter(key => isMoveSafe[key]);
  if (safeMoves.length == 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
    return { move: "down" };
  }

  const moveScores = {};
  safeMoves.forEach(move => {
    moveScores[move] = floodFillArea(
      possibleMoves[move],
      boardWidth,
      boardHeight,
      blockedPositions
    );
  });

  const bestScore = Math.max(...Object.values(moveScores));
  const food = gameState.board.food;
  const closestFoodDistance = distanceToClosestFood(myHead, food);
  const isFoodNearby = closestFoodDistance <= 3;
  const minimumComfortableArea = Math.max(gameState.you.length + 2, bestScore * 0.6);
  const foodMoves = safeMoves.filter(move => {
    const nextPosition = possibleMoves[move];
    const moveGetsCloserToFood = distanceToClosestFood(nextPosition, food) < closestFoodDistance;
    const hasEnoughRoomAfterMove = moveScores[move] >= minimumComfortableArea;

    return isFoodNearby && moveGetsCloserToFood && hasEnoughRoomAfterMove;
  });

  const candidateMoves = foodMoves.length > 0
    ? foodMoves
    : safeMoves.filter(move => moveScores[move] === bestScore);
  const nextMove = candidateMoves[Math.floor(Math.random() * candidateMoves.length)];

  // TODO: Step 4 - Move towards food instead of random, to regain health and survive longer
  console.log(`MOVE ${gameState.turn}: ${nextMove} (${JSON.stringify(moveScores)}, foodMoves: ${JSON.stringify(foodMoves)})`)
  return { move: nextMove };
}

runServer({
  info: info,
  start: start,
  move: move,
  end: end
});
