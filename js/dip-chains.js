/* Buy the Dip (?dip): the chains you can ride. Each one is its price file (js/dip-data*.js), the landmarks shown
   as you pass them, the script for the made-up future past the end of the data, and its colors. Adding a chain
   means adding one entry here and one price file, then listing it in the menu in js/dip.js.
   Runs in node too (tools/dip-sim.js). */
(function (root) {
  var CHAINS = {
    btc: {
      id: 'btc', name: 'Bitcoin', short: 'BTC', unit: 'sats', startYear: 2010, dataVar: 'POF_DIP_DATA',
      pitch: '2010 to today, the real chart',
      // Landmarks: [date, title, small print].
      events: [

    ['2010-07-18', 'BITCOIN GETS A PRICE', '9 cents'],
    ['2011-06-08', 'FIRST BUBBLE', '$30, then down 93%'],
    ['2012-11-28', 'HALVING #1', ''],
    ['2013-11-29', '$1,000', 'for the first time'],
    ['2014-02-24', 'MT. GOX COLLAPSES', ''],
    ['2015-01-14', 'CAPITULATION', 'down 85% from the top'],
    ['2016-07-09', 'HALVING #2', ''],
    ['2017-12-17', '$19,000', 'the 2017 top'],
    ['2018-12-15', 'CRYPTO WINTER', 'down 84%'],
    ['2020-03-12', 'COVID CRASH', 'down 40% in a day'],
    ['2020-05-11', 'HALVING #3', ''],
    ['2021-04-14', '$64,000', ''],
    ['2021-07-20', 'CHINA BANS MINING', ''],
    ['2021-11-10', '$69,000', 'the 2021 top'],
    ['2022-05-09', 'LUNA COLLAPSES', ''],
    ['2022-11-08', 'FTX COLLAPSES', ''],
    ['2024-01-10', 'SPOT ETFS APPROVED', ''],
    ['2024-04-20', 'HALVING #4', ''],
    ['2024-12-05', '$100,000', ''],
    ['2025-10-06', '$124,000', 'the all-time high']
      ],
      // After the last real day: the price never drops under $68,000; the next bull market tops near $200,000,
      // pulls back, runs to about $600,000, pulls back again, and the game ends at $1,000,000 (early 2035).
      // Waypoints are [days after the last real day, price]; the wobble around them is seeded.
      future: { seed: 42, floor: 68000, vol: 0.0078, pts: [[0, 74015], [60, 70500], [130, 79000], [210, 69500],
        [330, 96000], [450, 150000], [540, 200000], [620, 155000], [720, 114000], [820, 108000], [1000, 200000],
        [1250, 380000], [1500, 600000], [1580, 490000], [1720, 355000], [1820, 345000], [2100, 560000],
        [2500, 800000], [2900, 1000000], [3040, 1000000]] },
      theme: {
        up: '#1fe08f', upRGB: '31,224,143', upLine: '#7dffc9', upWord: 'green',
        down: '#ff3d5a', downRGB: '255,61,90', downLine: '#ff8aa0', downWord: 'red',
        coin: '#f7931a', coinRGB: '247,147,26', coinCore: '#ffe3bd',
        ballRGB: '255,196,120', holdRGB: '255,96,24', trail: '255,200,130', hue: 36,
        sky: { neutral: [96, 60, 150], bull: [255, 140, 20], bear: [220, 36, 70] },
        wallRGB: '255,61,90', btnBg: '#f7931a', btnInk: '#1d0f00', accent: '#f7931a'
      }
    },
    sol: {
      id: 'sol', name: 'Solana', short: 'SOL', unit: 'lamports', startYear: 2020, dataVar: 'POF_DIP_DATA_SOL',
      pitch: '2020 to today, the real chart',
      events: [
        ['2020-08-11', 'SOLANA ON THE CHART', 'about $3'],
        ['2020-12-23', 'THE FLOOR', '$1.20, its lowest close'],
        ['2021-05-19', 'MAY 19 CRASH', 'down 37% in a day'],
        ['2021-09-14', 'THE 17-HOUR OUTAGE', 'the network stalls'],
        ['2021-11-06', '$258', 'the 2021 top'],
        ['2022-05-11', 'LUNA COLLAPSES', ''],
        ['2022-11-09', 'FTX COLLAPSES', 'down 42% in a day'],
        ['2022-12-29', 'THE BOTTOM', '$9.64, down 96% from the top'],
        ['2025-01-18', 'TRUMP COIN LAUNCHES', '$262, the all-time high'],
        ['2025-03-02', 'CRYPTO RESERVE NEWS', 'up 24% in a day'],
        ['2025-10-10', 'OCT 10 LIQUIDATIONS', 'down 15% in a day'],
        ['2026-06-06', 'THE 2026 LOW', '$62']
      ],
      // After the last real day: the June 2026 low of $62 holds; the next bull market tops near $300, pulls back,
      // runs to about $700, pulls back again, and the game ends at $1,000.
      future: { seed: 7, floor: 62, vol: 0.0105, pts: [[0, 83], [60, 77], [130, 96], [210, 68], [330, 125],
        [450, 210], [540, 300], [620, 230], [720, 165], [820, 155], [1000, 310], [1250, 520], [1500, 700],
        [1580, 560], [1720, 400], [1820, 390], [2100, 640], [2500, 860], [2900, 1000], [3040, 1000]] },
      theme: {
        up: '#14f195', upRGB: '20,241,149', upLine: '#8dffd0', upWord: 'green',
        down: '#9945ff', downRGB: '153,69,255', downLine: '#c9a0ff', downWord: 'purple',
        coin: '#03e1ff', coinRGB: '3,225,255', coinCore: '#d9fbff',
        ballRGB: '190,150,255', holdRGB: '220,31,255', trail: '200,170,255', hue: 190,
        sky: { neutral: [60, 44, 190], bull: [20, 241, 149], bear: [153, 69, 255] },
        wallRGB: '220,31,255', btnBg: 'linear-gradient(100deg, #9945ff, #14f195)', btnInk: '#0a0620', accent: '#14f195'
      }
    }
  };
  var ORDER = ['btc', 'sol'];
  var api = { CHAINS: CHAINS, ORDER: ORDER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.POF_DIP_CHAINS = api;
})(this);
