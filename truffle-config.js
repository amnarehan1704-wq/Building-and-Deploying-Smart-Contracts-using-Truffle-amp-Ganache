// Truffle config - connects to a local Ganache blockchain
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,        // Ganache default (GUI and "npm run ganache")
      network_id: "*"    // match any network id
    }
  },

  mocha: { timeout: 100000 },

  compilers: {
    solc: {
      version: "0.8.20",
      settings: { optimizer: { enabled: true, runs: 200 } }
    }
  }
};
