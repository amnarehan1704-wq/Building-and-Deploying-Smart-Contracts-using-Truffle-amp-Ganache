const CampusLostFound = artifacts.require("CampusLostFound");
const Reputation = artifacts.require("Reputation");
const truffleAssert = require("truffle-assertions");

contract("CampusLostFound", (accounts) => {
  const [owner, reporter, claimer, stranger] = accounts;
  let app, rep;
  const Status = { Open: "0", Claimed: "1", Returned: "2" };

  beforeEach(async () => {
    rep = await Reputation.new({ from: owner });
    app = await CampusLostFound.new(rep.address, { from: owner });
    await rep.setLostFound(app.address, { from: owner });
  });

  it("starts with zero items", async () => {
    assert.equal((await app.getItemCount()).toString(), "0");
  });

  it("reports a lost item and stores the correct data", async () => {
    await app.reportItem("Black backpack", "Dell sticker", "Library 2nd floor", true, { from: reporter });
    const item = await app.getItem(1);
    assert.equal(item.title, "Black backpack");
    assert.equal(item.description, "Dell sticker");
    assert.equal(item.location, "Library 2nd floor");
    assert.equal(item.reporter, reporter);
    assert.equal(item.isLost, true);
    assert.equal(item.status.toString(), Status.Open);
    assert.equal((await app.getItemCount()).toString(), "1");
  });

  it("emits ItemReported event", async () => {
    const tx = await app.reportItem("ID card", "FAST card", "Cafeteria", false, { from: reporter });
    truffleAssert.eventEmitted(tx, "ItemReported", (ev) =>
      ev.id.toString() === "1" && ev.reporter === reporter && ev.title === "ID card" && ev.isLost === false);
  });

  it("rejects an empty title", async () => {
    await truffleAssert.reverts(app.reportItem("", "d", "l", true, { from: reporter }), "Title required");
  });

  it("lets another student claim an open item", async () => {
    await app.reportItem("Water bottle", "Blue", "Ground", false, { from: reporter });
    const tx = await app.claimItem(1, { from: claimer });
    truffleAssert.eventEmitted(tx, "ItemClaimed", (ev) => ev.claimer === claimer);
    const item = await app.getItem(1);
    assert.equal(item.status.toString(), Status.Claimed);
    assert.equal(item.claimer, claimer);
  });

  it("does not let the reporter claim their own item", async () => {
    await app.reportItem("Laptop", "HP", "Lab 3", true, { from: reporter });
    await truffleAssert.reverts(app.claimItem(1, { from: reporter }), "Reporter cannot claim own item");
  });

  it("does not let an item be claimed twice", async () => {
    await app.reportItem("Keys", "Honda key", "Parking", false, { from: reporter });
    await app.claimItem(1, { from: claimer });
    await truffleAssert.reverts(app.claimItem(1, { from: stranger }), "Item is not open");
  });

  it("reverts when claiming a non-existent item", async () => {
    await truffleAssert.reverts(app.claimItem(99, { from: claimer }), "Item does not exist");
  });

  it("only the reporter can mark an item as returned", async () => {
    await app.reportItem("Umbrella", "Black", "Gate", true, { from: reporter });
    await app.claimItem(1, { from: claimer });
    await truffleAssert.reverts(app.markReturned(1, { from: stranger }), "Only reporter can confirm");
    const tx = await app.markReturned(1, { from: reporter });
    truffleAssert.eventEmitted(tx, "ItemReturned", (ev) => ev.id.toString() === "1");
    assert.equal((await app.getItem(1)).status.toString(), Status.Returned);
  });

  it("cannot return an item that was never claimed", async () => {
    await app.reportItem("Notebook", "Stats", "Class", true, { from: reporter });
    await truffleAssert.reverts(app.markReturned(1, { from: reporter }), "Item must be claimed first");
  });

  it("keeps ids sequential for multiple items", async () => {
    await app.reportItem("A", "", "", true, { from: reporter });
    await app.reportItem("B", "", "", false, { from: claimer });
    assert.equal((await app.getItemCount()).toString(), "2");
    assert.equal((await app.getItem(2)).title, "B");
  });

  // ---- bonus: second contract ----
  it("awards a reputation point to the claimer when item is returned", async () => {
    await app.reportItem("Bag", "Red", "Gate", true, { from: reporter });
    await app.claimItem(1, { from: claimer });
    assert.equal((await rep.getPoints(claimer)).toString(), "0");
    await app.markReturned(1, { from: reporter });
    assert.equal((await rep.getPoints(claimer)).toString(), "1");
  });

  it("only CampusLostFound can add reputation points", async () => {
    await truffleAssert.reverts(rep.addPoint(stranger, { from: stranger }), "Only CampusLostFound");
  });

  it("Reputation link can be set only once and only by owner", async () => {
    await truffleAssert.reverts(rep.setLostFound(stranger, { from: owner }), "Already set");
    const rep2 = await Reputation.new({ from: owner });
    await truffleAssert.reverts(rep2.setLostFound(app.address, { from: stranger }), "Only owner");
  });
});
