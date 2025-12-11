import http from "node:http";

const TEMPO_RPC = "http://localhost:8545";

async function rpc(method) {
  const res = await fetch(TEMPO_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc:"2.0", method, params:[], id:1 })
  });
  return res.json();
}

async function checkHealth() {
  try {
    const syncing = await rpc("eth_syncing");
    const block = await rpc("eth_blockNumber");
    return {
      status:"ok",
      syncing: syncing.result !== false,
      block: parseInt(block.result, 16)
    };
  } catch(e) {
    return { status:"error", reason:e.message };
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    const d = await checkHealth();
    res.writeHead(200, {"Content-Type":"application/json"});
    return res.end(JSON.stringify(d));
  }
  res.writeHead(404); res.end("Not Found");
});

server.listen(3000, () =>
  console.log("Health endpoint at http://localhost:3000/health")
);
