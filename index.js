// THIS IS THE GOOD VERSION
// ALL THE OTHER VERSIONS ARE THE WORSE ONES

// import the dungeon generator class as require
import Dungeon from './dungeonGen.js';
import * as PIXI from 'pixi.js';

document.addEventListener('input', (event) => {
  // ignore toggle switches
  console.log('addEventListener(\'input\')');
  if (event.target.type === 'checkbox') {
    // we do want to store the options if the autoClearSwitch is toggled
    if (event.target.id === 'autoClearSwitch') {
      storeAllOptions();
    }
    // if it's drawRoomLinks, we need to store the options and redraw the dungeon
    if (event.target.id === 'drawRoomLinks') {
      storeAllOptions();
      dungeon.regenerate();
      drawBoard(dungeon);
    }
    return;
  }
  // ignore the log container
  if (event.target.id === 'logContainer') {
    return;
  }
  // ignore the log clear button
  if (event.target.id === 'logClear') {
    return;
  }
  // if autoClear is checked, clear the log
  if (document.querySelector('#autoClearSwitch').checked) {
    const logContainer = document.querySelector('#logContainer');
    logContainer.innerHTML = '';
  }
  storeAllOptions();
  const options = loadAllOptions();
  dungeon = createDungeon(options);
  drawBoard(dungeon);
});
document.querySelector('#regenerate').addEventListener('click', () => {
  console.log('regenerate');
  // if autoClear is checked, clear the log
  if (document.querySelector('#autoClearSwitch').checked) {
    const logContainer = document.querySelector('#logContainer');
    logContainer.innerHTML = '';
  }
  const options = loadAllOptions();
  dungeon = createDungeon(options);
  drawBoard(dungeon);
});

document.querySelector('#logClear').addEventListener('click', () => {
  const logContainer = document.querySelector('#logContainer');
  logContainer.innerHTML = '';
});

function storeAllOptions() {
  const options = {
    rowCount: document.querySelector('#dungeonRow').value,
    colCount: document.querySelector('#dungeonCol').value,
    roomCountMin: document.querySelector('#dungeonRoomMin').value,
    roomCountMax: document.querySelector('#dungeonRoomMax').value,
    minRoomSizeX: document.querySelector('#dungeonRoomMinX').value,
    minRoomSizeY: document.querySelector('#dungeonRoomMinY').value,
    maxRoomSizeX: document.querySelector('#dungeonRoomMaxX').value,
    maxRoomSizeY: document.querySelector('#dungeonRoomMaxY').value,
    autoClearLog: document.querySelector('#autoClearSwitch').checked,
    drawRoomLinks: document.querySelector('#drawRoomLinks').checked,
    seed: document.querySelector('#dungeonSeed').value,
  };
  localStorage.setItem('options', JSON.stringify(options));
}

function loadAllOptions() {
  const options = JSON.parse(localStorage.getItem('options'));
  if (!options) {
    returnDefaultOptions();
    return loadAllOptions();
  }
  if (options) {
    document.querySelector('#dungeonRow').value = options.rowCount;
    document.querySelector('#dungeonCol').value = options.colCount;
    document.querySelector('#dungeonRoomMin').value = options.roomCountMin;
    document.querySelector('#dungeonRoomMax').value = options.roomCountMax;
    document.querySelector('#dungeonRoomMinX').value = options.minRoomSizeX;
    document.querySelector('#dungeonRoomMinY').value = options.minRoomSizeY;
    document.querySelector('#dungeonRoomMaxX').value = options.maxRoomSizeX;
    document.querySelector('#dungeonRoomMaxY').value = options.maxRoomSizeY;
    document.querySelector('#autoClearSwitch').checked = options.autoClearLog;
    document.querySelector('#drawRoomLinks').checked = options.drawRoomLinks;
    document.querySelector('#dungeonSeed').value = options.seed || '';
  }
  return options;
}

function returnDefaultOptions() {
  const options = {
    rowCount: 32,
    colCount: 40,
    roomCountMin: 8,
    roomCountMax: 14,
    minRoomSizeX: 3,
    minRoomSizeY: 3,
    maxRoomSizeX: 7,
    maxRoomSizeY: 7,
    autoClearLog: false,
    drawRoomLinks: false,
    seed: '',
  };
  localStorage.setItem('options', JSON.stringify(options));
  loadAllOptions();
}
document.querySelector('#defaultOptions').addEventListener('click', () => {
  returnDefaultOptions();
  //   generateDungeon();
});

// load the options from local storage
const options = loadAllOptions();
let dungeon = createDungeon(options);
console.log(dungeon);

const app = new PIXI.Application();
app.stage.sortableChildren = true; // enable render layer sorting

// Replace tooltip creation section with container setup
const tooltipContainer = new PIXI.Container();
tooltipContainer.zIndex = 1000;

const tooltipBackground = new PIXI.Graphics();
tooltipBackground.roundRect(0, 0, 200, 30, 16).fill({ color: 0x000000, alpha: 0.7 });


const tooltipStyle = new PIXI.TextStyle({
  fontFamily: 'Arial',
  fontSize: 14,
  fill: 0xffffff,
  wordWrap: true,
  wordWrapWidth: 190,
});

const tooltipText = new PIXI.Text({ text: '', style: tooltipStyle });
tooltipText.x = 5;
tooltipText.y = 5;

tooltipContainer.addChild(tooltipBackground);
tooltipContainer.addChild(tooltipText);
tooltipContainer.visible = false;

app.stage.addChild(tooltipContainer);
app.stage.sortChildren();

function drawBoard(dungeonBoard) {
  // Clear previous graphics and re-add tooltip
  app.stage.removeChildren();
  app.stage.addChild(tooltipContainer);

  // Calculate cell size
  const maxCellWidth = Math.floor(app.renderer.width / dungeonBoard.colCount);
  const maxCellHeight = Math.floor(app.renderer.height / dungeonBoard.rowCount);
  const cellSize = Math.min(maxCellWidth, maxCellHeight);

  // For each cell, create a Pixi Graphics
  for (let x = 0; x < dungeonBoard.board.length; x++) {
    for (let y = 0; y < dungeonBoard.board[x].length; y++) {
      const cellValue = dungeonBoard.board[x][y];
      const color = getCellColor(cellValue);
      const rect = new PIXI.Graphics();
      rect.rect(0, 0, cellSize - 2, cellSize - 2).fill({ color });
      rect.x = x * cellSize + 1;
      rect.y = y * cellSize + 1;
      rect.interactive = true;
      rect.on('pointerover', (e) => showTooltip(e, x, y, cellValue, dungeonBoard));
      rect.on('pointerout', () => hideTooltip());
      app.stage.addChild(rect);
    }
  }
}

// Simple helper to map cell values to colors
function getCellColor(cellValue) {
  const value = cellValue.type; // extract type
  switch (value) {
    case 0: return 0x7C7D7D; // wall
    case -1: return 0xE1E2E3; // empty
    case 'T':
    case 'B':
    case 'R':
    case 'L':
    case 'P': return 0x8EB6DF; // path
    case 'ENTRY': return 0x00FF00; // entry point in green
    case 'EXIT': return 0xFF0000; // exit point in red
    default: return typeof value === 'number' && value > 0 ? 0xE1E2E3 : 0xE1E2E3; // rooms and unknown
  }
}

function showTooltip(event, gridX, gridY, cellValue, dungeonInstance) {
  tooltipText.text = getTooltipContent(gridX, gridY, cellValue, dungeonInstance);
  tooltipBackground.width = tooltipText.width + 10;
  tooltipBackground.height = tooltipText.height + 10;
  tooltipContainer.visible = true;
}

function hideTooltip() {
  tooltipContainer.visible = false;
}

function getTooltipContent(x, y, cellValue, dungeonInstance) {
  const value = cellValue.type;
  let cellType = '';
  // Handle numbered cells (rooms) first
  if (typeof value === 'number' && value > 0) {
    cellType = `Room ${value}`;
  }
  else {
    switch (value) {
      case 0:
        cellType = 'Wall';
        break;
      case -1:
        cellType = 'Empty Space';
        break;
      case 'T':
        cellType = 'Path (Top)';
        break;
      case 'B':
        cellType = 'Path (Bottom)';
        break;
      case 'R':
        cellType = 'Path (Right)';
        break;
      case 'L':
        cellType = 'Path (Left)';
        break;
      case 'P':
        cellType = 'Path';
        break;
      case 'ENTRY':
        cellType = 'Entry Point';
        break;
      case 'EXIT':
        cellType = 'Exit Point';
        break;
      default:
        cellType = 'Unknown';
    }
  }

  // Check if this cell is part of a room
  const room = dungeonInstance.roomList?.find(r =>
    x >= r.x && x < r.x + r.width &&
    y >= r.y && y < r.y + r.height,
  );

  let tooltip = `Position: (${x}, ${y})\nType: ${cellType}`;
  if (room) {
    tooltip += `\nRoom Size: ${room.width}x${room.height}`;
  }

  return tooltip;
}

// Update startApp to call drawBoard once app is ready
async function startApp() {
  try {
    await app.init({ width: 1000, height: 800, backgroundColor: 0x1099bb });
    const dungeonContainer = document.querySelector('#dungeonContainer');
    dungeonContainer.appendChild(app.canvas);
    drawBoard(dungeon);
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.addEventListener('pointermove', (e) => {
      if (tooltipContainer.visible) {
        const padding = 10;
        let tooltipX = e.global.x + padding;
        let tooltipY = e.global.y + padding;

        // Check if tooltip would go off the right edge
        if (tooltipX + tooltipContainer.width > app.screen.width) {
          tooltipX = e.global.x - tooltipContainer.width - padding;
        }

        // Check if tooltip would go off the bottom edge
        if (tooltipY + tooltipContainer.height > app.screen.height) {
          tooltipY = e.global.y - tooltipContainer.height - padding;
        }

        tooltipContainer.position.set(tooltipX, tooltipY);
      }
    });
  }
  catch (err) {
    console.error('App initialization failed:', err);
  }
}

startApp();

function createDungeon(configOptions) {
  // Convert string seed to numeric value if provided
  const seed = configOptions.seed
    ? Array.from(configOptions.seed.toLowerCase()).reduce(
      (acc, char) => acc + char.charCodeAt(0), 0,
    )
    : Math.floor(Math.random() * 1000000);

  const dungeonOptions = {
    rowCount: parseInt(configOptions.rowCount),
    colCount: parseInt(configOptions.colCount),
    roomCountMin: parseInt(configOptions.roomCountMin),
    roomCountMax: parseInt(configOptions.roomCountMax),
    minRoomSizeX: parseInt(configOptions.minRoomSizeX),
    minRoomSizeY: parseInt(configOptions.minRoomSizeY),
    maxRoomSizeX: parseInt(configOptions.maxRoomSizeX),
    maxRoomSizeY: parseInt(configOptions.maxRoomSizeY),
    seed,
  };

  const newDungeon = new Dungeon(dungeonOptions);

  // Only update the value if it was a custom seed, otherwise just set the placeholder to the generated seed
  const seedInput = document.querySelector('#dungeonSeed');
  if (configOptions.seed) {
    seedInput.value = configOptions.seed;
  }
  else {
    seedInput.value = '';
    seedInput.placeholder = `${newDungeon.getSeed()}`; // Use the dungeon's seed getter
  }

  return newDungeon;
}