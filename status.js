import http from "node:http";

const TEMPO_RPC = "http://localhost:8545";

async function rpc(method) {
  const res = await fetch(TEMPO_RPC, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ jsonrpc:"2.0", method, params:[], id:1 })
  });
  return res.json();
}

async function getStatus() {
  try {
    const syncing = await rpc("eth_syncing");
    const block = await rpc("eth_blockNumber");
    const peers = await rpc("net_peerCount");
    return {
      ok:true,
      syncing: syncing.result !== false,
      block: parseInt(block.result,16),
      peers: parseInt(peers.result,16)
    };
  } catch(e) {
    return { ok:false, error:e.message };
  }
}

function html(d) {
  return `
  <html><head><title>Tempo Status</title>
  <style>
    body{background:#0f1116;color:#fff;font-family:Arial;padding:40px;}
    h1{text-align:center;font-size:36px;}
    .card{background:#1a1d23;padding:20px;margin:20px auto;border-radius:12px;width:400px;}
    .label{color:#aaa;}
    .value{font-size:22px;margin-top:5px;}
  </style>
  </head><body>
  <h1>All Systems Operational</h1>
  <div class="card"><div class="label">Latest Block</div>
       <div class="value">${d.block}</div></div>
  <div class="card"><div class="label">Syncing</div>
       <div class="value">${d.syncing?"Yes":"No"}</div></div>
  <div class="card"><div class="label">Peers</div>
       <div class="value">${d.peers}</div></div>
  </body></html>`;
}

const server = http.createServer(async (req,res)=>{
  if(req.url==="/status"){
    const d = await getStatus();
    res.writeHead(200,{"Content-Type":"text/html"});
    return res.end(html(d));
  }
  res.writeHead(404); res.end("Not Found");
});

server.listen(3001,()=> 
  console.log("Status dashboard at http://localhost:3001/status")
);
