// Run with:  npx truffle exec scripts/interact.js --network development
const CampusLostFound = artifacts.require("CampusLostFound");
const Reputation = artifacts.require("Reputation");

module.exports = async function (callback) {
  try {
    const accounts = await web3.eth.getAccounts();
    const app = await CampusLostFound.deployed();
    const rep = await Reputation.deployed();
    console.log("CampusLostFound:", app.address);
    console.log("Reputation     :", rep.address);

    await app.reportItem("Black backpack", "Dell sticker on front", "Library 2nd floor", true, { from: accounts[0] });
    console.log("1) Reported item (lost) by", accounts[0]);
    const id = (await app.getItemCount()).toString();
    await app.claimItem(id, { from: accounts[1] });
    console.log("2) Item #" + id + " claimed by", accounts[1]);
    await app.markReturned(id, { from: accounts[0] });
    console.log("3) Item #" + id + " marked returned by reporter");

    const item = await app.getItem(id);
    console.log("Item #" + id, "->", item.title, "| status:", ["Open", "Claimed", "Returned"][Number(item.status)]);
    console.log("Reputation points of claimer:", (await rep.getPoints(accounts[1])).toString());
    callback();
  } catch (e) { callback(e); }
};
