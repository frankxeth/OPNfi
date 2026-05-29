import { useState, useCallback } from "react"
import { ethers } from "ethers"
import "./index.css"

const CA = "0x29c57355C070f27E54cF499114EeC8F3865f0321"
const CHAIN = {chainId:"0x3d8",chainName:"OPN Testnet",rpcUrls:["https://testnet-rpc.iopn.tech"],nativeCurrency:{name:"Test OPN",symbol:"OPN",decimals:18},blockExplorerUrls:["https://testnet.iopn.tech"]}
const ABI = ["function nextPropertyId() view returns(uint256)","function getProperty(uint256) view returns(tuple(string name,string location,uint256 totalValue,uint256 totalShares,uint256 pricePerShare,bool active))","function balanceOf(address,uint256) view returns(uint256)","function buyShares(uint256,uint256) payable","function listProperty(string,string,uint256,uint256,uint256) returns(uint256)","function owner() view returns(address)"]
const IMGS = ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80","https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80","https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600&q=80","https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80"]

export default function App() {
  const [wallet,setWallet]=useState(null)
  const [contract,setContract]=useState(null)
  const [props,setProps]=useState([])
  const [loading,setLoading]=useState(false)
  const [tx,setTx]=useState({})
  const [shares,setShares]=useState({})
  const [tab,setTab]=useState("market")
  const [isOwner,setIsOwner]=useState(false)
  const [form,setForm]=useState({name:"",location:"",totalValue:"",totalShares:"",pricePerShare:""})
  const [amt,setAmt]=useState({})

  const load = useCallback(async(c,addr)=>{
    setLoading(true)
    try{
      const total=Number(await c.nextPropertyId())
      const ps=[],sh={}
      for(let i=0;i<total;i++){
        const p=await c.getProperty(i)
        ps.push({id:i,name:p.name,location:p.location,totalValue:p.totalValue,totalShares:p.totalShares,pricePerShare:p.pricePerShare,active:p.active})
        if(addr) sh[i]=Number(await c.balanceOf(addr,i))
      }
      setProps(ps);setShares(sh)
    }catch(e){console.error(e)}
    setLoading(false)
  },[])

  async function connect(){
    if(!window.ethereum) return alert("Please install MetaMask!")
    try{
      await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x3d8"}]}).catch(async()=>window.ethereum.request({method:"wallet_addEthereumChain",params:[CHAIN]}))
      const p=new ethers.BrowserProvider(window.ethereum)
      const s=await p.getSigner()
      const addr=await s.getAddress()
      const c=new ethers.Contract(CA,ABI,s)
      setWallet(addr);setContract(c)
      setIsOwner((await c.owner()).toLowerCase()===addr.toLowerCase())
      load(c,addr)
    }catch(e){console.error(e)}
  }

  async function buy(id,a){
    if(!contract||!a||a<=0) return
    const prop=props.find(p=>p.id===id)
    const cost=prop.pricePerShare*BigInt(a)
    setTx(t=>({...t,[id]:"pending"}))
    try{
      const t=await contract.buyShares(id,a,{value:cost})
      setTx(s=>({...s,[id]:"waiting"}));await t.wait()
      setTx(s=>({...s,[id]:"success"}));load(contract,wallet)
    }catch(e){setTx(s=>({...s,[id]:"error"}))}
    setTimeout(()=>setTx(s=>({...s,[id]:""})),3000)
  }

  async function listProp(){
    if(!contract||!isOwner) return
    const{name,location,totalValue,totalShares,pricePerShare}=form
    if(!name||!location||!totalValue||!totalShares||!pricePerShare) return alert("Please fill in all fields")
    setTx(t=>({...t,list:"pending"}))
    try{
      const t=await contract.listProperty(name,location,ethers.parseEther(totalValue),BigInt(totalShares),ethers.parseEther(pricePerShare))
      await t.wait();setTx(s=>({...s,list:"success"}))
      setForm({name:"",location:"",totalValue:"",totalShares:"",pricePerShare:""});load(contract,wallet)
    }catch(e){setTx(s=>({...s,list:"error"}))}
    setTimeout(()=>setTx(s=>({...s,list:""})),3000)
  }

  const fmt=wei=>parseFloat(ethers.formatEther(wei)).toFixed(4)
  const totalOwned=Object.values(shares).reduce((a,b)=>a+b,0)

  return(
    <div className="content">
      <div className="hero-glow"/>
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo">
            <div className="logo-icon">OF</div>
            <span className="logo-text">OPN<span>fi</span></span>
          </div>
          <div className="nav-links">
            <button className={"nav-link"+(tab==="market"?" active":"")} onClick={()=>setTab("market")}>Market</button>
            <button className={"nav-link"+(tab==="portfolio"?" active":"")} onClick={()=>setTab("portfolio")}>Portfolio</button>
            {isOwner&&<button className={"nav-link admin"+(tab==="admin"?" active":"")} onClick={()=>setTab("admin")}>Admin</button>}
          </div>
          <button className={"btn-connect"+(wallet?" connected":"")} onClick={connect}>
            {wallet?wallet.slice(0,6)+"..."+wallet.slice(-4):"Connect Wallet"}
          </button>
        </div>
      </nav>

      {tab==="market"&&<>
        <div className="hero">
          <div className="badge"><span className="badge-dot"/>{CA.slice(0,10)}... · OPN Testnet</div>
          <h1>Real World Assets<br/><span className="grad">On-Chain</span></h1>
          <p>Tokenize real properties on OPN Chain. Buy fractional ownership — fully transparent and verifiable on the blockchain.</p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={()=>document.getElementById("props")?.scrollIntoView({behavior:"smooth"})}>View Properties</button>
            <a className="btn-secondary" href={"https://testnet.iopn.tech/address/"+CA} target="_blank">View Contract ↗</a>
          </div>
        </div>
        <div className="stats">
          <div className="stats-inner">
            {[{l:"Properties Listed",v:props.length},{l:"Your Shares",v:totalOwned},{l:"Network",v:"OPN Testnet"},{l:"Chain ID",v:"984"}].map(s=>(
              <div className="stat" key={s.l}><div className="stat-val">{s.v}</div><div className="stat-label">{s.l}</div></div>
            ))}
          </div>
        </div>
        <div className="section" id="props">
          <div className="section-head section-head-row">
            <div><h2>Available Properties</h2><p>Buy shares directly via smart contract on-chain</p></div>
            {wallet&&<button className="btn-secondary" style={{fontSize:13}} onClick={()=>load(contract,wallet)}>Refresh</button>}
          </div>
          {loading&&<div className="empty"><div className="empty-title">Loading from blockchain...</div></div>}
          {!loading&&props.length===0&&<div className="empty"><div className="empty-title">{wallet?(isOwner?"Add properties in the Admin panel":"No properties listed yet"):"Connect your wallet to view data"}</div></div>}
          <div className="grid3">
            {props.map((p,i)=>(
              <div className="card" key={p.id}>
                <div className="card-img"><img src={IMGS[i%4]} alt={p.name}/></div>
                <div className="card-body">
                  <span className="card-tag">Property #{p.id}</span>
                  <div className="card-title">{p.name||"—"}</div>
                  <div className="card-loc">{p.location||"—"}</div>
                  <div className="card-rows">
                    <div className="card-row"><span className="card-row-key">Total Value</span><span className="card-row-val">{fmt(p.totalValue)} OPN</span></div>
                    <div className="card-row"><span className="card-row-key">Price / Share</span><span className="card-row-val accent">{fmt(p.pricePerShare)} OPN</span></div>
                    <div className="card-row"><span className="card-row-key">Total Shares</span><span className="card-row-val">{Number(p.totalShares).toLocaleString()}</span></div>
                    {shares[p.id]>0&&<div className="card-row"><span className="card-row-key">Your Shares</span><span className="card-row-val green">{shares[p.id]}</span></div>}
                  </div>
                  {p.active&&<div className="buy-row">
                    <input className="input-sm" type="number" min="1" placeholder="Number of shares" value={amt[p.id]||""} onChange={e=>setAmt(a=>({...a,[p.id]:e.target.value}))}/>
                    <button className={"btn-buy"+(tx[p.id]==="success"?" success":tx[p.id]==="error"?" error":"")} onClick={()=>buy(p.id,Number(amt[p.id]))} disabled={tx[p.id]==="pending"||tx[p.id]==="waiting"}>
                      {tx[p.id]==="pending"?"...":(tx[p.id]==="waiting"?"⏳":(tx[p.id]==="success"?"✓":(tx[p.id]==="error"?"✗":"Buy")))}
                    </button>
                  </div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>}

      {tab==="portfolio"&&<div className="page">
        <div className="page-inner">
          <div className="page-title">Portfolio</div>
          <div className="page-sub">Property shares you own on-chain</div>
          {!wallet&&<div className="empty"><div className="empty-title">Please connect your wallet first</div></div>}
          <div className="grid2">
            {props.filter(p=>shares[p.id]>0).map(p=>(
              <div className="port-card" key={p.id}>
                <div className="port-head">
                  <div><div className="card-title">{p.name}</div><div className="card-loc">{p.location}</div></div>
                  <div><div className="port-num">{shares[p.id]}</div><div className="port-num-label">shares</div></div>
                </div>
                <div className="port-info">
                  <div className="port-info-row"><span className="port-info-key">Investment Value</span><span>{(parseFloat(fmt(p.pricePerShare))*shares[p.id]).toFixed(4)} OPN</span></div>
                  <div className="port-info-row"><span className="port-info-key">Ownership</span><span>{((shares[p.id]/Number(p.totalShares))*100).toFixed(2)}%</span></div>
                </div>
                <a className="link-explorer" href={"https://testnet.iopn.tech/address/"+CA} target="_blank">View on Explorer ↗</a>
              </div>
            ))}
            {wallet&&props.filter(p=>shares[p.id]>0).length===0&&<div className="empty" style={{gridColumn:"span 2"}}><div className="empty-title">No shares yet</div><div className="empty-sub">Buy some in the Market tab!</div></div>}
          </div>
        </div>
      </div>}

      {tab==="admin"&&isOwner&&<div className="page">
        <div className="page-inner" style={{maxWidth:560}}>
          <div className="page-title">Admin Panel</div>
          <div className="page-sub">List a new property to the smart contract on-chain</div>
          <div className="admin-card">
            {[{k:"name",l:"Property Name",p:"Menteng Residence"},{k:"location",l:"Location",p:"Central Jakarta"},{k:"totalValue",l:"Total Value (OPN)",p:"100"},{k:"totalShares",l:"Total Shares",p:"1000"},{k:"pricePerShare",l:"Price per Share (OPN)",p:"0.1"}].map(f=>(
              <div className="form-group" key={f.k}>
                <label className="form-label">{f.l}</label>
                <input className="form-input" type="text" placeholder={f.p} value={form[f.k]} onChange={e=>setForm(lf=>({...lf,[f.k]:e.target.value}))}/>
              </div>
            ))}
            <button className="btn-list" onClick={listProp} disabled={tx.list==="pending"}>
              {tx.list==="pending"?"Submitting...":(tx.list==="success"?"✓ Listed!":(tx.list==="error"?"✗ Failed":"List Property On-Chain"))}
            </button>
          </div>
        </div>
      </div>}

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="footer-logo">opn<span>fi</span></span>
              <span className="footer-tagline">Real World Assets on OPN Chain</span>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <div className="footer-col-title">Contract</div>
                <a className="footer-link" href={"https://testnet.iopn.tech/address/"+CA} target="_blank">{CA.slice(0,10)}...{CA.slice(-6)}</a>
              </div>
              <div className="footer-col">
                <div className="footer-col-title">Network</div>
                <span className="footer-link-plain">OPN Testnet · Chain ID 984</span>
              </div>
              <div className="footer-col">
                <div className="footer-col-title">Community</div>
                <div className="footer-socials">
                  <a className="footer-social" href="https://x.com/l1luna_" target="_blank" title="Twitter / X">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Build by @l1luna_</span>
                  </a>
                  <a className="footer-social" href="https://t.me/iopn_io" target="_blank" title="Telegram">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    <span>Telegram</span>
                  </a>
                  <a className="footer-social" href="https://discord.gg/iopn" target="_blank" title="Discord">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055A19.9 19.9 0 0 0 5.9 21.9a.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span>Discord</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 OPNfi · Built on IOPn</span>
            <span>One chain. One identity. Fully sovereign.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}