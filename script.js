// Frontend for Campus Lost & Found (Truffle + Ganache). Uses ethers.js v6 + MetaMask.
// Addresses and ABIs come from contract-config.js (created by `truffle migrate`).

const GANACHE_CHAIN_ID = "0x539"; // 1337
const GANACHE_NETWORK = {
  chainId: GANACHE_CHAIN_ID,
  chainName: "Ganache Local",
  rpcUrls: ["http://127.0.0.1:7545"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
};
const STATUS = ["Open", "Claimed", "Returned"];

let provider, signer, contract, reputation, userAddress;

const $ = (id) => document.getElementById(id);

function showTx(html) {
  const box = $("txResult");
  box.style.display = "block";
  box.innerHTML = html;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ---------- Connect MetaMask ----------
async function connect() {
  if (!window.ethereum) { alert("MetaMask not found. Please install it first."); return; }
  if (!window.APP_CONFIG) {
    alert("contract-config.js is empty. Run `npx truffle migrate --reset` first.");
    return;
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await switchToGanache();

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    contract = new ethers.Contract(APP_CONFIG.lostFoundAddress, APP_CONFIG.lostFoundAbi, signer);
    reputation = new ethers.Contract(APP_CONFIG.reputationAddress, APP_CONFIG.reputationAbi, signer);

    $("status").textContent = "Connected (Ganache)";
    $("status").style.color = "#2f9e44";
    $("account").textContent = userAddress;
    $("contractAddr").textContent = APP_CONFIG.lostFoundAddress;
    $("repAddr").textContent = APP_CONFIG.reputationAddress;
    $("reportBtn").disabled = false;
    $("refreshBtn").disabled = false;

    await loadItems();
  } catch (err) {
    console.error(err);
    $("status").textContent = "Connection failed: " + (err.shortMessage || err.message);
    $("status").style.color = "#e03131";
  }
}

// switch MetaMask to Ganache, adding the network if it is missing
async function switchToGanache() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId === GANACHE_CHAIN_ID) return;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: GANACHE_CHAIN_ID }] });
  } catch (e) {
    if (e.code === 4902 || (e.data && e.data.originalError && e.data.originalError.code === 4902)) {
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [GANACHE_NETWORK] });
    } else { throw e; }
  }
}

// ---------- Write: report item ----------
async function reportItem() {
  const title = $("title").value.trim();
  const desc = $("description").value.trim();
  const loc = $("location").value.trim();
  const isLost = $("itemType").value === "lost";

  if (!title) { alert("Please enter a title."); return; }

  await sendTx(() => contract.reportItem(title, desc, loc, isLost), "Reporting item");
  $("title").value = ""; $("description").value = ""; $("location").value = "";
}

// ---------- Write: claim / return ----------
async function claimItem(id)    { await sendTx(() => contract.claimItem(id), "Claiming item #" + id); }
async function markReturned(id) { await sendTx(() => contract.markReturned(id), "Confirming return of item #" + id); }

// Shared helper: send tx, show hash, wait for confirmation, refresh list
async function sendTx(fn, label) {
  try {
    showTx(label + "... please confirm in MetaMask.");
    const tx = await fn();
    showTx(label + "... pending.<br>Tx hash: " + tx.hash);
    const receipt = await tx.wait();
    showTx("✅ Confirmed in block " + receipt.blockNumber + "<br>Tx hash: " + tx.hash);
    await loadItems();
  } catch (err) {
    console.error(err);
    showTx("❌ Failed: " + esc(err.reason || err.shortMessage || err.message));
  }
}

// ---------- Read: load all items ----------
async function loadItems() {
  try {
    const count = Number(await contract.getItemCount());
    $("count").textContent = count;
    $("myPoints").textContent = (await reputation.getPoints(userAddress)).toString();

    const list = $("itemList");
    list.innerHTML = "";
    if (count === 0) {
      list.innerHTML = "<p class='muted'>No items yet. Be the first to report one!</p>";
      return;
    }

    for (let i = count; i >= 1; i--) {
      const it = await contract.getItem(i);
      const status = Number(it.status);
      const isReporter = it.reporter.toLowerCase() === userAddress.toLowerCase();
      const date = new Date(Number(it.timestamp) * 1000).toLocaleString();

      let actions = "";
      if (status === 0 && !isReporter) actions += "<button onclick='claimItem(" + i + ")'>Claim</button>";
      if (status === 1 && isReporter)  actions += "<button onclick='markReturned(" + i + ")'>Mark as Returned</button>";

      list.innerHTML +=
        "<div class='item'>" +
          "<h3>#" + i + " " + esc(it.title) + "</h3>" +
          "<span class='badge " + (it.isLost ? "lost" : "found") + "'>" + (it.isLost ? "LOST" : "FOUND") + "</span>" +
          "<span class='badge status'>" + STATUS[status] + "</span>" +
          "<p>" + esc(it.description) + "</p>" +
          "<p class='muted'>📍 " + esc(it.location) + " &middot; " + date + "</p>" +
          "<p class='muted'>Reporter: " + it.reporter.slice(0, 8) + "..." + it.reporter.slice(-4) + "</p>" +
          "<div class='actions'>" + actions + "</div>" +
        "</div>";
    }
  } catch (err) {
    console.error(err);
    $("itemList").innerHTML = "<p>Could not load items: " + esc(err.shortMessage || err.message) + "</p>";
  }
}

$("connectBtn").addEventListener("click", connect);
$("reportBtn").addEventListener("click", reportItem);
$("refreshBtn").addEventListener("click", loadItems);

// reload if user switches account or network
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}
