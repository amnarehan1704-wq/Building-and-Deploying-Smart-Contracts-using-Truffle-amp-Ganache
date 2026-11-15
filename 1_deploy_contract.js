const fs = require("fs");
const path = require("path");

const Reputation = artifacts.require("Reputation");
const CampusLostFound = artifacts.require("CampusLostFound");

module.exports = async function (deployer, network) {
  // 1) deploy the helper contract first
  await deployer.deploy(Reputation);
  const rep = await Reputation.deployed();

  // 2) deploy the main contract and give it the Reputation address
  await deployer.deploy(CampusLostFound, rep.address);
  const app = await CampusLostFound.deployed();

  // 3) allow the main contract to award points
  await rep.setLostFound(app.address);

  // 4) write addresses + ABIs for the frontend (frontend/contract-config.js)
  const cfg = {
    network,
    lostFoundAddress: app.address,
    reputationAddress: rep.address,
    lostFoundAbi: CampusLostFound.abi,
    reputationAbi: Reputation.abi
  };
  const out = "window.APP_CONFIG = " + JSON.stringify(cfg, null, 2) + ";\n";
  fs.writeFileSync(path.join(__dirname, "..", "frontend", "contract-config.js"), out);
  console.log("   > frontend/contract-config.js updated");
};
