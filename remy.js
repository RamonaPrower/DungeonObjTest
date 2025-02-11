// remy is a little helper for random functions that need to be used in multiple places
// he's just a little guy, so he's not very complicated

const remy = {
  seed: null,
  seedRandom: function (seed) {
    this.seed = seed;
  },
  randomInt(min, max) {
    if (this.seed === null) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Simple seeded random implementation
    this.seed = (this.seed * 9301 + 49297) % 233280;
    const rnd = this.seed / 233280;
    return Math.floor(rnd * (max - min + 1)) + min;
  },
  printToLog(text) {
    const logContainer = document.querySelector('#logContainer');
    logContainer.innerHTML += `${text}<br>`;
    console.log(text);
  },
};

export default remy;
