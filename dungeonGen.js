/**
 * @typedef {Object} DungeonObj
 * @property {number} rowCount - the number of rows in the dungeon
 * @property {number} colCount - the number of columns in the dungeon
 * @property {number[][]} board - the dungeon board
 * @property {number} roomCount - the number of rooms in the dungeon
 * @property {number} minRoomSizeX - the minimum width of a room
 * @property {number} minRoomSizeY - the minimum height of a room
 * @property {number} maxRoomSizeX - the maximum width of a room
 * @property {number} maxRoomSizeY - the maximum height of a room
 * @property {GridObj[]} gridList - the list of grid objects
 * @property {RoomObj[]} roomList - the list of room objects
 * @property {PointObj[]} pointList - the list of point objects
 * @property {Object} specialPoints - Contains entry and exit points
 */

/**
 * @typedef GridObj
 * @type {object}
 * @property {number} x - the x coordinate of the grid
 * @property {number} y - the y coordinate of the grid
 * @property {number} width - the width of the grid
 * @property {number} height - the height of the grid
 * @property {number} index - the index of the grid
 *
 */

/**
 * @typedef {Object} PointObj
 * @property {number} x
 * @property {number} y
 * @property {number} gridIndex
 */

/**
 * @typedef {Object} TileType
 * @property {string} type - The type of tile (WALL, FLOOR, CORRIDOR, etc)
 * @property {Object} [metadata] - Additional tile metadata
 */

/**
 * @typedef {Object} RoomType
 * @property {string} type - The type of room (NORMAL, ITEM, BOSS, etc)
 * @property {Object} [metadata] - Additional room metadata
 */

/**
 * @typedef {Object} DungeonOptions
 * @property {number} [rowCount=32] - Number of rows in the dungeon
 * @property {number} [colCount=40] - Number of columns in the dungeon
 * @property {number} [roomCountMin=8] - Minimum number of rooms to generate
 * @property {number} [roomCountMax=14] - Maximum number of rooms to generate
 * @property {number} [minRoomSizeX=3] - Minimum room width
 * @property {number} [minRoomSizeY=3] - Minimum room height
 * @property {number} [maxRoomSizeX=7] - Maximum room width
 * @property {number} [maxRoomSizeY=7] - Maximum room height
 * @property {number} [pointLossChance=10] - Chance (%) that a connection point will be lost
 * @property {number} [roomLossChance=20] - Chance (%) that a room will be lost
 * @property {number} [randomPathMax=2] - Maximum number of random additional paths
 * @property {number} [seed=null] - Seed for random generation
 */

class Dungeon {
  static TileTypes = {
    WALL: 'WALL',
    FLOOR: 'FLOOR',
    CORRIDOR: 'CORRIDOR',
    ENTRY: 'ENTRY',
    EXIT: 'EXIT',
  };

  static RoomTypes = {
    NORMAL: 'NORMAL',
    ENTRY: 'ENTRY',
    EXIT: 'EXIT',
    SPECIAL: 'SPECIAL',
  };

  static DEFAULT_OPTIONS = {
    rowCount: 32,
    colCount: 40,
    roomCountMin: 8,
    roomCountMax: 14,
    minRoomSizeX: 3,
    minRoomSizeY: 3,
    maxRoomSizeX: 7,
    maxRoomSizeY: 7,
    pointLossChance: 10,
    roomLossChance: 20,
    randomPathMax: 2,
    seed: null,
  };

  // Move the PRNG methods into the class
  #seed = null;

  /**
   * Seeds the random number generator
   * @param {number} seed - The seed value to use for random generation
   * @private
   */
  seedRandom(seed) {
    this.#seed = seed;
  }

  /**
   * Generates a random integer between min and max (inclusive)
   * @param {number} min - The minimum value
   * @param {number} max - The maximum value
   * @returns {number} A random integer between min and max
   * @private
   */
  randomInt(min, max) {
    if (this.#seed === null) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Simple seeded random implementation
    this.#seed = (this.#seed * 9301 + 49297) % 233280;
    const rnd = this.#seed / 233280;
    return Math.floor(rnd * (max - min + 1)) + min;
  }

  /**
   * Prints a message to both the log container and console
   * @param {string} text - The text to log
   */
  printToLog(text) {
    const logContainer = document.querySelector('#logContainer');
    if (logContainer) {
      logContainer.innerHTML += `${text}<br>`;
    }
    console.log(text);
  }

  /**
   * Creates a new dungeon instance
   * @param {DungeonOptions} [options={}] - Configuration options for the dungeon
   */
  constructor(options = {}) {
    const config = { ...Dungeon.DEFAULT_OPTIONS, ...options };

    // Set the seed if provided
    if (config.seed !== null) {
      this.seedRandom(config.seed);
    }

    // Validate and set minimum dimensions
    this.rowCount = Math.max(20, config.rowCount);
    this.colCount = Math.max(20, config.colCount);

    this.board = [...Array(Number(this.colCount))].map(() =>
      Array(Number(this.rowCount)).fill().map(() => ({ type: 0 })),
    );

    this.roomCountMin = config.roomCountMin;
    this.roomCountMax = config.roomCountMax;
    this.roomCount = this.randomInt(this.roomCountMin, this.roomCountMax);
    this.pointLossChance = config.pointLossChance;
    this.roomLossChance = config.roomLossChance;
    this.randomPathMax = config.randomPathMax;
    this.validDungeon = false;

    // Validate and set room sizes
    this.minRoomSizeX = Math.max(3, config.minRoomSizeX);
    this.minRoomSizeY = Math.max(3, config.minRoomSizeY);
    this.maxRoomSizeX = Math.max(this.minRoomSizeX, config.maxRoomSizeX);
    this.maxRoomSizeY = Math.max(this.minRoomSizeY, config.maxRoomSizeY);

    // Ensure room count is divisible by 2 or 3
    while (this.roomCount % 2 !== 0 && this.roomCount % 3 !== 0) {
      this.roomCount++;
    }

    this.gridList = [];
    this.pointList = [];
    this.connectionList = [];
    this.roomList = [];
    this.specialPoints = {
      entry: null,
      exit: null,
    };

    let attempts = 0;
    while (!this.validDungeon && attempts < 10) {
      this.regenerate();
      attempts++;
    }
    while (!this.validDungeon && attempts >= 10) {
      // turn off point loss and room loss, emergency mode
      const previousPointLossChance = this.pointLossChance;
      const previousRoomLossChance = this.roomLossChance;
      this.pointLossChance = 0;
      this.roomLossChance = 0;
      this.regenerate();
      attempts++;
      this.pointLossChance = previousPointLossChance;
      this.roomLossChance = previousRoomLossChance;
    }
  }

  /**
   * Regenerates the dungeon with current settings
   * @returns {void}
   */
  regenerate() {
    this.board = [...Array(Number(this.colCount))].map(() =>
      Array(Number(this.rowCount)).fill().map(() => ({ type: 0 })),
    );
    this.roomCount = this.randomInt(this.roomCountMin, this.roomCountMax);
    while (this.roomCount % 2 !== 0 && this.roomCount % 3 !== 0) {
      this.roomCount++;
    }
    this.gridList = [];
    this.#createGrid();

    this.pointList = [];
    this.connectionList = [];
    this.#createPaths();

    this.roomList = [];
    this.#createRooms();

    this.#addRandomPaths();
    this.validDungeon = this.#validateDungeon();
  }

  /**
   * Creates the initial grid layout for room placement
   * @private
   * @returns {void}
   */
  #createGrid() {
    // if the roomCount is divisible by 2
    if (this.roomCount % 2 === 0) {
      // get the other divisor that the roomCount is divisible by
      const otherDivisor = this.roomCount / 2;
      // split the board horizontally into two equal parts
      const splitRow = Math.floor(this.rowCount / 2);
      // split each half vertically by the other divisor
      const splitCol = Math.floor(this.colCount / otherDivisor);

      // store the gridList
      for (let i = 0; i < otherDivisor; i++) {
        for (let j = 0; j < 2; j++) {
          const grid = {
            x: i * splitCol,
            y: j * splitRow,
            width: splitCol,
            height: splitRow,
            index: this.gridList.length,
          };
          this.gridList.push(grid);
        }
      }
    }
    // if it's not divisible by 2, then it's divisible by 3
    else {
      // get the other divisor that the roomCount is divisible by
      const otherDivisor = this.roomCount / 3;
      // split the board vertically into three equal parts
      const splitCol = Math.floor(this.colCount / 3);
      // split each third horizontally by the other divisor
      const splitRow = Math.floor(this.rowCount / otherDivisor);

      // store the gridList
      for (let i = 0; i < otherDivisor; i++) {
        for (let j = 0; j < 3; j++) {
          const grid = {
            x: j * splitCol,
            y: i * splitRow,
            width: splitCol,
            height: splitRow,
            index: this.gridList.length,
          };
          this.gridList.push(grid);
        }
      }
    }
  }

  /**
   * Creates the initial paths between grid points
   * @private
   * @returns {void}
   */
  #createPaths() {
    // we're following a backwards approach to dungeon generation
    // generate the paths first, then place the rooms on the paths

    // pick a point per grid to start the path
    for (let i = 0; i < this.gridList.length; i++) {
      const grid = this.gridList[i];
      // both x and y need to make sure they are not on the edge of the grid (ideally by the minimum room size)
      const minX = grid.x + this.minRoomSizeX;
      const maxX = grid.x + grid.width - this.minRoomSizeX;
      const minY = grid.y + this.minRoomSizeY;
      const maxY = grid.y + grid.height - this.minRoomSizeY;

      const x = this.randomInt(minX, maxX);
      const y = this.randomInt(minY, maxY);
      const point = { x, y, gridIndex: i };
      this.pointList.push(point);
    }
    // points are placed on the board
    for (let i = 0; i < this.pointList.length; i++) {
      const point = this.pointList[i];
      this.board[point.x][point.y] = { type: point.gridIndex + 1 };
    }
    // get the paths we need to generate, based on adjacent grids
    for (let i = 0; i < this.gridList.length; i++) {
      const grid = this.gridList[i];
      // get the adjacent grids
      const adjacentGrids = this.#getAdjacentGrids(this.gridList, grid);
      // for each adjacent grid, get the path between the two grids
      for (let j = 0; j < adjacentGrids.length; j++) {
        const adjacentGrid = adjacentGrids[j];
        // get the points for each grid
        const point1 = this.pointList[grid.index];
        const point2 = this.pointList[adjacentGrid.index];
        // connect the two points
        const connection = {
          point1,
          point2,
        };
        // add the connection to the connectionList, if pointLossChance roll is successful
        if (this.randomInt(1, 100) > this.pointLossChance) {
          this.connectionList.push(connection);
        }
      }
    }
    // loop through the connectionList and generate the paths
    for (let i = 0; i < this.connectionList.length; i++) {
      const connection = this.connectionList[i];
      const path = this.#getPath(connection.point1, connection.point2);
      // add the path to the board
      for (let j = 0; j < path.length; j++) {
        const point = path[j];
        this.board[point.x][point.y] = { type: 'P' };
      }
    }
  }

  /**
   * Creates rooms within the grid sections
   * @private
   * @returns {void}
   */
  #createRooms() {
    // loop through the gridList
    for (let i = 0; i < this.gridList.length; i++) {
      const grid = this.gridList[i];
      // get the points for the grid - there should only be 1 point per grid
      const point = this.pointList.filter((p) => p.gridIndex === grid.index)[0];
      // check there's at least 1 valid connection
      const validConnections = this.connectionList.filter(
        (c) =>
          c.point1.gridIndex === grid.index || c.point2.gridIndex === grid.index,
      );
      if (validConnections.length == 0) {
        continue;
      }
      // loop until we find a valid position for the room
      let validPosition = false;
      let attempts = 0;
      let onPoint = false;
      let roomWidth = this.randomInt(this.minRoomSizeX, this.maxRoomSizeX);
      let roomHeight = this.randomInt(this.minRoomSizeY, this.maxRoomSizeY);
      // pick a starting point for the room
      let roomX = this.randomInt(grid.x, grid.x + grid.width - roomWidth);
      let roomY = this.randomInt(grid.y, grid.y + grid.height - roomHeight);
      while (!validPosition && attempts < 1000) {
        // check if the room is valid
        validPosition = true;
        onPoint = false;
        attempts++;
        for (let x = roomX; x < roomX + roomWidth; x++) {
          for (let y = roomY; y < roomY + roomHeight; y++) {
            // make sure the room is not out of bounds
            if (x < 0 || x >= this.colCount || y < 0 || y >= this.rowCount) {
              validPosition = false;
              break;
            }
            // make sure the room is not overlapping another room
            if (this.board[x][y].type > 0) {
              validPosition = false;
              break;
            }
            // make sure that it's not escaping the grid
            if (
              x === grid.x ||
              x === grid.x + grid.width - 1 ||
              y === grid.y ||
              y === grid.y + grid.height - 1
            ) {
              validPosition = false;
              break;
            }
            // track if the room has intersected with a point
            if (x === point.x && y === point.y) {
              onPoint = true;
            }
          }
        }
        if (!validPosition || !onPoint) {
          // regenerate the room size and position
          roomWidth = this.randomInt(this.minRoomSizeX, this.maxRoomSizeX);
          roomHeight = this.randomInt(this.minRoomSizeY, this.maxRoomSizeY);
          roomX = this.randomInt(grid.x, grid.x + grid.width - roomWidth);
          roomY = this.randomInt(grid.y, grid.y + grid.height - roomHeight);
          // start the loop over
          validPosition = false;
          onPoint = false;
        }
        else {
          break;
        }
      }
      // time for the dice roll! use this.roomLossChance to determine if the room is lost
      const diceRoll = this.randomInt(1, 100);
      if (diceRoll >= this.roomLossChance) {
        // draw the room on the board
        for (let x = roomX; x < roomX + roomWidth; x++) {
          for (let y = roomY; y < roomY + roomHeight; y++) {
            this.board[x][y] = { type: i + 1 };
          }
        }
        // add the room to the roomList
        const room = {
          x: roomX,
          y: roomY,
          width: roomWidth,
          height: roomHeight,
          grid: i,
          onPoint,
        };
        this.roomList.push(room);
        this.printToLog(
          `Room ${i + 1
          } - x: ${roomX}, y: ${roomY}, width: ${roomWidth}, height: ${roomHeight}, onPoint: ${onPoint}`,
        );
      }
    }
    // After all rooms are created, designate entry and exit rooms
    if (this.roomList.length >= 2) {
      // Simply pick two different random rooms for entry and exit
      const availableRooms = [...this.roomList];

      // Pick random entry room
      const entryIndex = this.randomInt(0, availableRooms.length - 1);
      const entryRoom = availableRooms[entryIndex];
      availableRooms.splice(entryIndex, 1);

      // Pick random exit room from remaining rooms
      const exitIndex = this.randomInt(0, availableRooms.length - 1);
      const exitRoom = availableRooms[exitIndex];

      // Set room types
      entryRoom.type = Dungeon.RoomTypes.ENTRY;
      exitRoom.type = Dungeon.RoomTypes.EXIT;

      // Place entry and exit points in random locations within their rooms
      this.specialPoints.entry = {
        x: this.randomInt(entryRoom.x + 1, entryRoom.x + entryRoom.width - 2),
        y: this.randomInt(entryRoom.y + 1, entryRoom.y + entryRoom.height - 2),
      };

      this.specialPoints.exit = {
        x: this.randomInt(exitRoom.x + 1, exitRoom.x + exitRoom.width - 2),
        y: this.randomInt(exitRoom.y + 1, exitRoom.y + exitRoom.height - 2),
      };

      // Update tile types
      this.board[this.specialPoints.entry.x][this.specialPoints.entry.y].type = Dungeon.TileTypes.ENTRY;
      this.board[this.specialPoints.exit.x][this.specialPoints.exit.y].type = Dungeon.TileTypes.EXIT;
    }
  }

  /**
   * Generates a path between two points
   * @private
   * @param {{x: number, y: number}} point1 - Starting point
   * @param {{x: number, y: number}} point2 - Ending point
   * @returns {Array<{x: number, y: number}>} Array of points forming the path
   */
  #getPath(point1, point2) {
    // get the start and end points
    const startPoint = point1;
    const endPoint = point2;
    // get the start and end x and y values
    const startX = startPoint.x;
    const startY = startPoint.y;
    const endX = endPoint.x;
    const endY = endPoint.y;
    // get the difference between the start and end x and y values
    const xDiff = endX - startX;
    const yDiff = endY - startY;
    // if the x difference is greater than the y difference, we move in the x direction
    // otherwise we move in the y direction
    const path = [];
    if (xDiff > yDiff) {
      // for the first half of the path, we move in the x direction
      for (let i = 0; i < Math.abs(xDiff) / 2; i++) {
        if (xDiff > 0) {
          path.push({ x: startX + i, y: startY });
        }
        else {
          path.push({ x: startX - i, y: startY });
        }
      }
      // we then do all needed y movements (assuming we're not moving in a straight line)
      if (yDiff !== 0) {
        for (let i = 1; i <= Math.abs(yDiff); i++) {
          // we're going to slightly cheat here and just use whatever was the last path entry to get the correct x value
          if (yDiff > 0) {
            path.push({ x: path[path.length - 1].x, y: startY + i });
          }
          else {
            path.push({ x: path[path.length - 1].x, y: startY - i });
          }
        }
      }
      // then we do the second half of the x movements
      for (let i = path[path.length - 1].x; i < Math.abs(endX); i++) {
        if (xDiff > 0) {
          path.push({ x: i + 1, y: endY });
        }
        else {
          path.push({ x: i - 1, y: endY });
        }
      }
      return path;
    }
    else {
      // for the first half of the path, we move in the y direction
      for (let i = 0; i < Math.abs(yDiff) / 2; i++) {
        if (yDiff > 0) {
          path.push({ x: startX, y: startY + i });
        }
        else {
          path.push({ x: startX, y: startY - i });
        }
      }
      // we then do all needed x movements (assuming we're not moving in a straight line)
      if (xDiff !== 0) {
        for (let i = 1; i <= Math.abs(xDiff); i++) {
          // we're going to slightly cheat here and just use whatever was the last path entry to get the correct y value
          if (xDiff > 0) {
            path.push({ x: startX + i, y: path[path.length - 1].y });
          }
          else {
            path.push({ x: startX - i, y: path[path.length - 1].y });
          }
        }
      }
      // then we do the second half of the y movements
      for (let i = path[path.length - 1].y; i < Math.abs(endY); i++) {
        if (yDiff > 0) {
          path.push({ x: endX, y: i + 1 });
        }
        else {
          path.push({ x: endX, y: i - 1 });
        }
      }
      // return the path
      return path;
    }
  }

  /**
   * Gets adjacent grid sections
   * @private
   * @param {Array<GridObj>} gridList - List of all grid sections
   * @param {GridObj} grid - Current grid section
   * @returns {Array<GridObj>} List of adjacent grid sections
   */
  #getAdjacentGrids(gridList, grid) {
    // adjacent grids will have the same x or y value as the grid
    const adjacentGrids = [];
    for (const selectedGrid of gridList) {
      const sameX = selectedGrid.x === grid.x;
      const sameY = selectedGrid.y === grid.y;

      const nextX = selectedGrid.x === grid.x + grid.width;
      const nextY = selectedGrid.y === grid.y + grid.height;
      // as all calcs are done both to the right and down for all grids, we don't need to check behind
      if ((sameX && nextY) || (sameY && nextX)) {
        adjacentGrids.push(selectedGrid);
      }
    }
    return adjacentGrids;
  }

  /**
   * Gets adjacent walkable tiles for a given point
   * @private
   * @param {{x: number, y: number}} point - The point to check around
   * @returns {Array<{x: number, y: number}>} List of adjacent walkable tile positions
   */
  #getAdjacentTiles(point) {
    // get the point's x and y values
    const x = point.x;
    const y = point.y;
    // get the adjacent tiles
    const adjacentTiles = [];
    // for loop this, as we want to check all 8 tiles
    for (let i = 0; i < 8; i++) {
      // get the x and y values for the current tile
      let tileX = x;
      let tileY = y;
      // set the x and y values based on the current iteration
      switch (i) {
        case 0:
          tileX--;
          tileY--;
          break;
        case 1:
          tileY--;
          break;
        case 2:
          tileX++;
          tileY--;
          break;
        case 3:
          tileX++;
          break;
        case 4:
          tileX++;
          tileY++;
          break;
        case 5:
          tileY++;
          break;
        case 6:
          tileX--;
          tileY++;
          break;
        case 7:
          tileX--;
          break;
      }
      // get the tile
      const tile = this.board[tileX][tileY];
      // if the tile isn't 0, it's a floor tile, so add it to the list
      if (tile?.type !== 0) {
        const foundTile = { x: tileX, y: tileY };
        adjacentTiles.push(foundTile);
      }
    }
    return adjacentTiles;
  }

  /**
   * Adds random additional paths between existing paths
   * @private
   * @returns {void}
   */
  #addRandomPaths() {
    // get a random number of paths to add
    const pathCount = this.randomInt(0, this.randomPathMax);
    // for each path, get a random start and end point, and add a path between them
    const pathableTiles = [];
    // get a list of all tiles in the board that are 'p' (pathable)
    for (let x = 0; x < this.board.length; x++) {
      for (let y = 0; y < this.board[x].length; y++) {
        if (this.board[x][y].type === 'P') {
          pathableTiles.push({ x, y });
        }
      }
    }
    for (let i = 0; i < pathCount; i++) {
      // pick a random start and end point
      const start = pathableTiles[this.randomInt(0, pathableTiles.length - 1)];
      const end = pathableTiles[this.randomInt(0, pathableTiles.length - 1)];
      // as long as the start and end points don't share an x or y value, we can add a path between them
      if (start.x === end.x || start.y === end.y) {
        continue;
      }
      // add a path between them
      const path = this.#getPath(start, end);
      console.log(`Adding path from ${start.x},${start.y} to ${end.x},${end.y}`);
      // add the path to the board
      for (const point of path) {
        if (this.board[point.x][point.y].type <= 0) {
          this.board[point.x][point.y] = { type: 'P' };
        }
      }
    }

  }

  /**
   * Validates that the dungeon is fully connected and meets room count requirements
   * @private
   * @returns {boolean} True if dungeon is valid, false otherwise
   */
  #validateDungeon() {
    // pick a random starting point, and from there, recursively check all adjacent floor tiles until all have been checked.
    // then compare the count of checked tiles to the count of floor tiles. if they match, the dungeon is valid, and all areas are accessible
    // if they don't match, the dungeon is invalid, and we need to start over
    let valid = false;
    const checkedTiles = new Set();
    const uncheckedTiles = [];
    // get the first floor tile (pick a point tile at random)
    const firstTile = this.pointList[this.randomInt(0, this.pointList.length - 1)];
    // add the first tile to the checked tiles
    console.log(firstTile);
    uncheckedTiles.push(firstTile);
    while (uncheckedTiles.length > 0) {
      for (const tile of uncheckedTiles) {
        // get the adjacent tiles
        const adjacentTiles = this.#getAdjacentTiles(tile);
        // add the current tile to the checked tiles (turn x and y into a string, and use that for the set)
        checkedTiles.add(`${tile.x},${tile.y}`);
        // remove the current tile from the unchecked tiles
        uncheckedTiles.splice(uncheckedTiles.indexOf(tile), 1);
        // add all adjacent tiles to the unchecked tiles, under the condition that they haven't already been checked
        for (const adjacentTile of adjacentTiles) {
          if (!checkedTiles.has(`${adjacentTile.x},${adjacentTile.y}`)) {
            uncheckedTiles.push(adjacentTile);
          }
        }
      }
    }
    // get the raw count of floor tiles, from the board
    const floorTileCount = this.board.flat().filter(tile => tile.type !== 0).length;
    // if the count of checked tiles matches the count of floor tiles, the dungeon is valid

    if (checkedTiles.size === floorTileCount) {
      valid = true;
    }
    else {
      console.log('invalid dungeon, not all areas are accessible');
      valid = false;
      return valid;
    }
    // next, make sure our roomcount is over half of the total grid count
    const gridCount = this.gridList.length;
    const roomCount = this.roomList.length;
    if (roomCount < gridCount / 2) {
      console.log('invalid dungeon, not enough rooms');
      valid = false;
      return valid;
    }

    return valid;
  }

  /**
   * Gets the tile type at the specified coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {?{type: string}} Tile type object or null if out of bounds
   */
  getTileAt(x, y) {
    if (x < 0 || x >= this.colCount || y < 0 || y >= this.rowCount) {
      return null;
    }
    const tile = this.board[x][y];
    if (tile.type === 0) {
      return { type: Dungeon.TileTypes.WALL };
    }
    else if (tile.type === 'P') {
      return { type: Dungeon.TileTypes.CORRIDOR };
    }
    else if (tile.type === Dungeon.TileTypes.ENTRY || tile.type === Dungeon.TileTypes.EXIT) {
      return { type: tile.type };
    }
    else {
      return { type: Dungeon.TileTypes.FLOOR };
    }
  }

  /**
   * Checks if a position is walkable
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if the position is walkable
   */
  isWalkable(x, y) {
    const tile = this.getTileAt(x, y);
    return tile && tile.type !== Dungeon.TileTypes.WALL;
  }

  /**
   * Gets the current random seed
   * @returns {number} The current seed value
   */
  getSeed() {
    return this.#seed;
  }
}

export default Dungeon;
