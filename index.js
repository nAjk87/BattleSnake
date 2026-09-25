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
    color: "#ff69b4", // TODO: Choose color
    head: "replit-mark",  // TODO: Choose head
    tail: "replit-notmark",  // TODO: Choose tail
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

function getDangerousHeadToHeadPositions(gameState) {
  const dangerousPositions = new Set();
  const myLength = gameState.you.length;

  gameState.board.snakes.forEach(snake => {
    if (snake.id === gameState.you.id || snake.length < myLength) {
      return;
    }

    const opponentHead = snake.body[0];
    getNeighbors(opponentHead).forEach(position => {
      dangerousPositions.add(positionKey(position));
    });
  });

  return dangerousPositions;
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

function shortestPathDistance(startPosition, targetPosition, boardWidth, boardHeight, blockedPositions) {
  if (!isInBounds(startPosition, boardWidth, boardHeight)
    || !isInBounds(targetPosition, boardWidth, boardHeight)) {
    return Infinity;
  }

  const targetKey = positionKey(targetPosition);
  const visited = new Set([positionKey(startPosition)]);
  const queue = [{ position: startPosition, distance: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();

    if (positionKey(current.position) === targetKey) {
      return current.distance;
    }

    getNeighbors(current.position).forEach(neighbor => {
      const key = positionKey(neighbor);

      if (!isInBounds(neighbor, boardWidth, boardHeight)) {
        return;
      }
      if (visited.has(key) || blockedPositions.has(key)) {
        return;
      }

      visited.add(key);
      queue.push({ position: neighbor, distance: current.distance + 1 });
    });
  }

  return Infinity;
}

function countOpenNeighbors(position, boardWidth, boardHeight, blockedPositions) {
  return getNeighbors(position).filter(neighbor => {
    return isInBounds(neighbor, boardWidth, boardHeight)
      && !blockedPositions.has(positionKey(neighbor));
  }).length;
}

function corridorPenalty(startPosition, boardWidth, boardHeight, blockedPositions) {
  if (!isInBounds(startPosition, boardWidth, boardHeight)
    || blockedPositions.has(positionKey(startPosition))) {
    return 100;
  }

  const lookaheadDepth = 4;
  const visited = new Set([positionKey(startPosition)]);
  const queue = [{ position: startPosition, distance: 0 }];
  let penalty = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    const openNeighbors = countOpenNeighbors(
      current.position,
      boardWidth,
      boardHeight,
      blockedPositions
    );

    if (openNeighbors <= 1) {
      penalty += (lookaheadDepth - current.distance + 1) * 4;
    } else if (openNeighbors === 2) {
      penalty += (lookaheadDepth - current.distance + 1);
    }

    if (current.distance >= lookaheadDepth) {
      continue;
    }

    getNeighbors(current.position).forEach(neighbor => {
      const key = positionKey(neighbor);

      if (!isInBounds(neighbor, boardWidth, boardHeight)) {
        return;
      }
      if (visited.has(key) || blockedPositions.has(key)) {
        return;
      }

      visited.add(key);
      queue.push({ position: neighbor, distance: current.distance + 1 });
    });
  }

  return penalty;
}

function findBestFoodWeCanReachFirst(gameState, boardWidth, boardHeight, blockedPositions) {
  const myHead = gameState.you.body[0];
  const opponents = gameState.board.snakes.filter(snake => snake.id !== gameState.you.id);
  const reachableFirstFoods = gameState.board.food.map(foodPosition => {
    const myDistance = shortestPathDistance(
      myHead,
      foodPosition,
      boardWidth,
      boardHeight,
      blockedPositions
    );
    const closestOpponentDistance = Math.min(...opponents.map(opponent => {
      return shortestPathDistance(
        opponent.body[0],
        foodPosition,
        boardWidth,
        boardHeight,
        blockedPositions
      );
    }));

    return {
      position: foodPosition,
      myDistance: myDistance,
      closestOpponentDistance: closestOpponentDistance
    };
  }).filter(foodOption => {
    return Number.isFinite(foodOption.myDistance)
      && foodOption.myDistance < foodOption.closestOpponentDistance;
  });

  if (reachableFirstFoods.length === 0) {
    return null;
  }

  reachableFirstFoods.sort((foodA, foodB) => foodA.myDistance - foodB.myDistance);
  return reachableFirstFoods[0];
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
  const dangerousHeadToHeadPositions = getDangerousHeadToHeadPositions(gameState);

  // Prevent your Battlesnake from colliding with itself, other Battlesnakes, or risky heads.
  Object.keys(possibleMoves).forEach(move => {
    const nextPosition = possibleMoves[move];
    const nextPositionKey = positionKey(nextPosition);

    if (blockedPositions.has(nextPositionKey) || dangerousHeadToHeadPositions.has(nextPositionKey)) {
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
  const areaScores = {};
  const corridorPenalties = {};
  safeMoves.forEach(move => {
    areaScores[move] = floodFillArea(
      possibleMoves[move],
      boardWidth,
      boardHeight,
      blockedPositions
    );
    corridorPenalties[move] = corridorPenalty(
      possibleMoves[move],
      boardWidth,
      boardHeight,
      blockedPositions
    );
    moveScores[move] = areaScores[move] - corridorPenalties[move];
  });

  const bestScore = Math.max(...Object.values(moveScores));
  const food = gameState.board.food;
  const isHungry = gameState.you.health < 15;
  const bestHungryFood = isHungry
    ? findBestFoodWeCanReachFirst(gameState, boardWidth, boardHeight, blockedPositions)
    : null;

  if (bestHungryFood !== null) {
    const hungryMoves = safeMoves.map(move => {
      return {
        move: move,
        distance: shortestPathDistance(
          possibleMoves[move],
          bestHungryFood.position,
          boardWidth,
          boardHeight,
          blockedPositions
        ),
        area: areaScores[move]
      };
    }).filter(moveOption => Number.isFinite(moveOption.distance));

    if (hungryMoves.length > 0) {
      hungryMoves.sort((moveA, moveB) => {
        if (moveA.distance !== moveB.distance) {
          return moveA.distance - moveB.distance;
        }

        return moveB.area - moveA.area;
      });

      const nextMove = hungryMoves[0].move;
      console.log(`MOVE ${gameState.turn}: ${nextMove} (hungry, food: ${positionKey(bestHungryFood.position)}, distance: ${bestHungryFood.myDistance})`)
      return { move: nextMove };
    }
  }

  const closestFoodDistance = distanceToClosestFood(myHead, food);
  const isFoodNearby = closestFoodDistance <= 3;
  const minimumComfortableArea = Math.max(gameState.you.length + 2, bestScore * 0.6);
  const foodMoves = safeMoves.filter(move => {
    const nextPosition = possibleMoves[move];
    const moveGetsCloserToFood = distanceToClosestFood(nextPosition, food) < closestFoodDistance;
    const hasEnoughRoomAfterMove = areaScores[move] >= minimumComfortableArea;
    const isNotTooNarrow = corridorPenalties[move] <= 8;

    return isFoodNearby && moveGetsCloserToFood && hasEnoughRoomAfterMove && isNotTooNarrow;
  });

  const candidateMoves = foodMoves.length > 0
    ? foodMoves
    : safeMoves.filter(move => moveScores[move] === bestScore);
  const nextMove = candidateMoves[Math.floor(Math.random() * candidateMoves.length)];

  // TODO: Step 4 - Move towards food instead of random, to regain health and survive longer
  console.log(`MOVE ${gameState.turn}: ${nextMove} (${JSON.stringify(moveScores)}, area: ${JSON.stringify(areaScores)}, corridor: ${JSON.stringify(corridorPenalties)}, foodMoves: ${JSON.stringify(foodMoves)})`)
  return { move: nextMove };
}

runServer({
  info: info,
  start: start,
  move: move,
  end: end
});
