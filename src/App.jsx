import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, Plus, Wallet, Users, Calendar, X, 
  Hourglass, AlertTriangle, Loader2, LogOut, Copy, 
  CheckCircle2, Info, ArrowRight, ShieldCheck, Handshake, ExternalLink, Save, Github, Database, BookUser, Check, Trash2, Smartphone
} from 'lucide-react';
import { ethers } from 'ethers';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION (AEON COOP OFFICIAL) ---
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCefsEdH5gkIv9H-ENdsPUa93MWti4E1MM",
  authDomain: "aeon-coop.firebaseapp.com",
  projectId: "aeon-coop",
  storageBucket: "aeon-coop.firebasestorage.app",
  messagingSenderId: "1074316136798",
  appId: "1:1074316136798:web:db6e72246d4518aec13fcf"
};

// --- ARC NETWORK & CONTRACTS ---
const ARC_CONFIG = {
  chainId: 5042002,
  chainName: "Arc Testnet",
  currency: "USDC",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app"
};

const CONTRACTS = {
    COOP: "0x84D371d042139c63dc77a5E60b90193BE2be1850",
    USDC: "0x3600000000000000000000000000000000000000",
    EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"
};

// --- ABIs ---
const COOP_ABI = [
    "function createCoop(string _name, address _asset, uint256 _deadline, address[] _participants, uint256[] _allocations) external",
    "function deposit(uint256 _id, uint256 _amount) external",
    "function withdraw(uint256 _id, uint256 _amount) external",
    "function getMyCoops(address _user) external view returns (uint256[])",
    "function coops(uint256) view returns (uint256 id, string name, address owner, address asset, uint256 goalAmount, uint256 totalDeposited, uint256 deadline, bool isClosed)",
    "function getParticipantInfo(uint256 _id, address _user) external view returns (uint256 goal, uint256 balance)",
    "event ParticipantAdded(uint256 indexed id, address indexed participant, uint256 allocation)",
    "event Withdrawn(uint256 indexed id, address indexed user, uint256 amount, uint256 penalty)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function decimals() view returns (uint8)"
];

// --- HELPER FUNCTIONS ---
const getDaysLeft = (deadline) => {
  const diff = deadline - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const calculateProgress = (current, goal) => {
  if (!goal || goal === 0) return 0;
  return Math.min(Math.round((current / goal) * 100), 100);
};

const shortenAddress = (addr) => {
    if (!addr) return '';
    if (addr.length < 10) return addr;
    return `${addr.substring(0,6)}...${addr.substring(addr.length-4)}`;
};

const getProgressColor = (percent, hasWithdrawn) => {
    if (hasWithdrawn) return "bg-slate-700";
    if (percent < 30) return "bg-red-500";
    if (percent < 70) return "bg-yellow-500";
    return "bg-emerald-500";
};

// --- COMPONENTS ---

const CircleCard = ({ circle, onClick, contactMap, account }) => {
    const progress = calculateProgress(circle.totalDeposited, circle.goalAmount);
    const isExpired = Date.now() > circle.deadline;
    const daysLeft = getDaysLeft(circle.deadline);
    
    const borderColor = progress < 30 ? "border-red-900/50 hover:border-red-500/50" : progress < 70 ? "border-yellow-900/50 hover:border-yellow-500/50" : "border-emerald-900/50 hover:border-emerald-500/50";
    const bgColor = progress < 30 ? "bg-gradient-to-b from-red-950/20 to-slate-900" : progress < 70 ? "bg-gradient-to-b from-yellow-950/20 to-slate-900" : "bg-gradient-to-b from-emerald-950/20 to-slate-900";
    const barColor = getProgressColor(progress, false);

    const assetSymbol = circle.assetAddress.toLowerCase() === CONTRACTS.USDC.toLowerCase() ? 'USDC' : 'EURC';
    const assetIcon = assetSymbol === 'USDC' ? '$' : '€';

    return (
        <div onClick={onClick} className={`border rounded-2xl p-5 cursor-pointer transition-all group relative overflow-hidden ${borderColor} ${bgColor}`}>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${assetSymbol === 'USDC' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30'}`}>
                        <span className="text-lg font-bold">{assetIcon}</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-lg leading-tight group-hover:text-white/90 transition-colors">{circle.name}</h4>
                        <div className="text-xs font-medium mt-1 flex items-center gap-2">
                            {isExpired ? 
                                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1"><Unlock size={10}/> Unlocked</span> : 
                                <span className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded flex items-center gap-1"><Hourglass size={10}/> {daysLeft} days left</span>
                            }
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-white tracking-tight">{Number(circle.totalDeposited).toLocaleString()}</div>
                    <div className="text-xs text-slate-400 font-medium">Target: {Number(circle.goalAmount).toLocaleString()} {assetSymbol}</div>
                </div>
            </div>
            
            <div className="relative w-full bg-slate-800/50 h-3 rounded-full overflow-hidden mb-6">
                <div className={`h-full rounded-full transition-all duration-1000 ${barColor} shadow-[0_0_10px_currentColor] opacity-80`} style={{ width: `${progress}%` }}></div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1"><Users size={10}/> Member Contributions</div>
                {circle.participants.map((p, i) => {
                    const pProgress = calculateProgress(p.balance, p.goal);
                    const pColor = getProgressColor(pProgress, p.hasWithdrawn);
                    const isMe = p.address.toLowerCase() === account?.toLowerCase();
                    const name = isMe ? "You" : (contactMap?.[p.address.toLowerCase()] || shortenAddress(p.address));
                    
                    return (
                        <div key={i} className="flex items-center gap-3 text-xs">
                            <div className={`w-16 font-medium truncate ${isMe ? 'text-purple-400 font-bold' : 'text-slate-300'} ${p.hasWithdrawn ? 'line-through opacity-50' : ''}`}>{name}</div>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                                <div className={`h-full rounded-full ${pColor}`} style={{ width: p.hasWithdrawn ? '100%' : `${pProgress}%` }}></div>
                            </div>
                            <div className={`w-20 text-right font-mono flex justify-end items-center gap-1 ${p.hasWithdrawn ? 'text-slate-500 italic' : pProgress >= 100 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {p.hasWithdrawn ? <><CheckCircle2 size={10}/> Out</> : `${Math.round(pProgress)}%`}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Dashboard = ({ circles, account, onNavigate, onSelectCircle, contactMap }) => {
    // Safety check for circles
    const safeCircles = Array.isArray(circles) ? circles : [];

    const myOwned = safeCircles.filter(c => c.owner.toLowerCase() === account?.toLowerCase());
    const myJoined = safeCircles.filter(c => c.owner.toLowerCase() !== account?.toLowerCase());
    
    const totalUSDC = safeCircles.filter(c => c.assetAddress.toLowerCase() === CONTRACTS.USDC.toLowerCase()).reduce((acc, c) => acc + Number(c.totalDeposited), 0);
    const totalEURC = safeCircles.filter(c => c.assetAddress.toLowerCase() === CONTRACTS.EURC.toLowerCase()).reduce((acc, c) => acc + Number(c.totalDeposited), 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Lock size={48}/></div>
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Value Locked</div>
                    <div className="flex flex-col gap-1">
                        <div className="text-2xl font-bold text-white">${totalUSDC.toLocaleString()}<span className="text-sm text-slate-500 font-normal">.00</span></div>
                        <div className="text-2xl font-bold text-white">€{totalEURC.toLocaleString()}<span className="text-sm text-slate-500 font-normal">.00</span></div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={48}/></div>
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Active Coops</div>
                    <div className="text-3xl font-bold text-white">{safeCircles.length}</div>
                    <div className="mt-4 text-xs text-slate-500">Participating</div>
                </div>

                <div onClick={() => onNavigate('contacts')} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-all hover:bg-slate-800">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><BookUser size={48}/></div>
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Address Book</div>
                    <div className="text-xl font-bold text-white">Manage Contacts</div>
                    <div className="mt-4 text-xs text-purple-400 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        View List <ArrowRight size={12}/>
                    </div>
                </div>

                <div onClick={() => onNavigate('create')} className="bg-gradient-to-br from-purple-600 to-indigo-600 p-6 rounded-2xl text-white relative overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-purple-500/20 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Plus size={48}/></div>
                    <div className="text-purple-100 text-sm font-medium mb-1">New Goal</div>
                    <div className="text-2xl font-bold">Create Coop</div>
                    <div className="mt-2 text-xs bg-white/20 w-fit px-2 py-1 rounded">No setup fees</div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><ShieldCheck className="text-emerald-400" size={20}/> Coops I Manage</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myOwned.length > 0 ? myOwned.map(circle => (
                        <CircleCard key={circle.id} circle={circle} onClick={() => onSelectCircle(circle)} contactMap={contactMap} account={account} />
                    )) : <div className="text-slate-500 text-sm italic border border-slate-800 rounded-xl p-8 text-center bg-slate-900/50">No coops found. Create one to start!</div>}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Users className="text-blue-400" size={20}/> Coops I Joined</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myJoined.length > 0 ? myJoined.map(circle => (
                         <CircleCard key={circle.id} circle={circle} onClick={() => onSelectCircle(circle)} contactMap={contactMap} account={account} />
                    )) : <div className="text-slate-500 text-sm italic border border-slate-800 rounded-xl p-8 text-center bg-slate-900/50">You haven't joined any coops yet.</div>}
                </div>
            </div>
        </div>
    );
};

const CircleDetails = ({ circle, account, onBack, onDeposit, onWithdraw, processingId, contactMap }) => {
    const [depositInput, setDepositInput] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    
    // Find ME in participants
    const meParticipant = circle.participants.find(p => p.address.toLowerCase() === account?.toLowerCase());
    const myBalance = meParticipant ? meParticipant.balance : 0;
    const hasWithdrawn = meParticipant ? meParticipant.hasWithdrawn : false;

    const isExpired = Date.now() > circle.deadline;
    const assetSymbol = circle.assetAddress.toLowerCase() === CONTRACTS.USDC.toLowerCase() ? 'USDC' : 'EURC';

    const penalty = myBalance <= 50 ? (myBalance * 0.1) : 50;
    const netReceive = myBalance - penalty;

    const resolveName = (addr) => {
        if (!addr) return "";
        if (addr.toLowerCase() === account?.toLowerCase()) return "You";
        if (contactMap && contactMap[addr.toLowerCase()]) return contactMap[addr.toLowerCase()]; 
        return shortenAddress(addr);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 relative">
            {showConfirm && (
                <div className="absolute inset-0 bg-black/80 z-50 rounded-2xl flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-red-500/50 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                        <button onClick={() => setShowConfirm(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500"><AlertTriangle size={32}/></div>
                            <h3 className="text-xl font-bold text-white">Emergency Withdrawal</h3>
                            <p className="text-slate-400 text-sm mt-2">You are withdrawing before the unlock date. A penalty fee applies.</p>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-4 space-y-3 mb-6 border border-slate-800">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Total Balance</span>
                                <span className="text-white font-mono">{Number(myBalance).toFixed(2)} {assetSymbol}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-400">
                                <span>Penalty Fee</span>
                                <span className="font-mono">- {penalty.toFixed(2)} {assetSymbol}</span>
                            </div>
                            <div className="border-t border-slate-800 pt-3 flex justify-between font-bold">
                                <span className="text-white">You Receive</span>
                                <span className="text-emerald-400 font-mono">{netReceive.toFixed(2)} {assetSymbol}</span>
                            </div>
                        </div>
                        <button onClick={() => { onWithdraw(true); setShowConfirm(false); }} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">Confirm Withdrawal</button>
                    </div>
                </div>
            )}

            <button onClick={onBack} className="mb-4 text-slate-500 hover:text-white flex items-center gap-2 text-sm"><ArrowRight className="rotate-180" size={16}/> Back to Dashboard</button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">{circle.name}</h2>
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"><Users size={14}/> {circle.participants.length} Participants</span>
                                    <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"><Calendar size={14}/> Unlock: {new Date(circle.deadline).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-500 uppercase font-bold">Total Raised</div>
                                <div className="text-3xl font-mono font-bold text-white">{Number(circle.totalDeposited)} <span className="text-lg text-slate-500">{assetSymbol}</span></div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Save size={14}/> Contributors</h3>
                            <div className="space-y-3">
                                {circle.participants.map((p, i) => {
                                    const displayName = resolveName(p.address);
                                    const progress = calculateProgress(p.balance, p.goal);
                                    const barColor = getProgressColor(progress, p.hasWithdrawn);

                                    return (
                                        <div key={i} className={`p-4 rounded-xl border border-slate-800/50 ${p.hasWithdrawn ? 'bg-slate-900/30 opacity-60' : 'bg-slate-950/50'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold uppercase ${p.hasWithdrawn ? 'bg-slate-700' : 'bg-gradient-to-br from-slate-700 to-slate-800'}`}>
                                                        {displayName[0] && displayName[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-medium ${p.hasWithdrawn ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{displayName}</span>
                                                    </div>
                                                    {circle.owner.toLowerCase() === p.address.toLowerCase() && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Owner</span>}
                                                    {p.hasWithdrawn && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1"><LogOut size={8}/> Paid Out</span>}
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono text-white text-sm">{Number(p.balance)} / {Number(p.goal)} {assetSymbol}</div>
                                                </div>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: p.hasWithdrawn ? '100%' : `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <div className="text-slate-500 text-sm font-medium mb-1">My Contribution</div>
                        <div className="flex items-baseline justify-between mb-4">
                            <div className="text-4xl font-bold text-white">{Number(myBalance)} <span className="text-lg text-slate-600">{assetSymbol}</span></div>
                            <div className="text-xs text-slate-500">Goal: {Number(meParticipant?.goal || 0)}</div>
                        </div>
                        
                        {hasWithdrawn ? (
                            <div className="w-full py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl flex flex-col items-center justify-center text-emerald-500 gap-2">
                                <CheckCircle2 size={24} className="text-emerald-500"/>
                                <span className="font-bold text-sm">Withdrawal Confirmed</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input type="number" value={depositInput} onChange={(e) => setDepositInput(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 text-white outline-none focus:border-purple-500" placeholder="0.00" disabled={hasWithdrawn} />
                                    <button onClick={() => { onDeposit(depositInput); setDepositInput(''); }} disabled={processingId || hasWithdrawn} className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-xl font-bold flex items-center justify-center disabled:opacity-50">
                                        {processingId === 'deposit' ? <Loader2 className="animate-spin"/> : <><Plus/></>}
                                    </button>
                                </div>

                                {isExpired ? (
                                    <div className="space-y-2">
                                        <button onClick={() => onWithdraw(false)} disabled={processingId || myBalance <= 0} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {processingId === 'withdraw' ? <Loader2 className="animate-spin"/> : <><Unlock size={18}/> Withdraw (Unlocked)</>}
                                        </button>
                                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/80 bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/20">
                                            <CheckCircle2 size={12}/>
                                            <span>No fees applied • Goal status ignored</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-t border-slate-800 pt-4 mt-4">
                                         <button onClick={() => setShowConfirm(true)} disabled={processingId || myBalance <= 0} className="w-full py-3 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 border border-slate-700 text-slate-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed">
                                            {processingId === 'emergency' ? <Loader2 className="animate-spin"/> : <><AlertTriangle size={18} className="group-hover:text-red-500"/> Emergency Withdraw</>}
                                         </button>
                                         <p className="text-[10px] text-center text-slate-600 mt-2">Penalty: 10% for ≤ 50 {assetSymbol}, Fixed 50 {assetSymbol} for {'>'} 50 {assetSymbol}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Contacts = ({ account, db, contactMap, refreshContacts, onBack, showFeedback }) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if(!name || !address || !account) return;
        setIsLoading(true);
        try {
            if (!db) throw new Error("Database not connected. Please refresh or check connection.");
            
            // Validate inputs before saving
            if (typeof name !== 'string' || name.trim() === '') throw new Error("Invalid name");
            
            await setDoc(doc(db, "users", account, "contacts", address.toLowerCase()), {
                name: name.trim(), 
                updatedAt: new Date().toISOString()
            });
            setName('');
            setAddress('');
            refreshContacts();
            showFeedback('success', 'Contact saved!');
        } catch(e) {
            console.error("Save error:", e);
            showFeedback('error', 'Failed to save contact.');
        }
        setIsLoading(false);
    };

    const handleDelete = async (addr) => {
        if(!account || !db) return;
        try {
            await deleteDoc(doc(db, "users", account, "contacts", addr));
            refreshContacts();
            showFeedback('success', 'Contact deleted');
        } catch(e) { 
            console.error(e);
            showFeedback('error', 'Failed to delete contact');
        }
    };

    const renderRow = (addr, name) => {
        try {
            const displayName = (name && typeof name === 'string' && name.trim().length > 0) ? name : 'Unknown';
            const initial = displayName.charAt(0).toUpperCase() || '?';
            
            return (
                <div key={addr} className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                            {initial}
                        </div>
                        <div>
                            <div className="font-bold text-white">{displayName}</div>
                            <div className="text-xs text-slate-500 font-mono">{addr}</div>
                        </div>
                    </div>
                    <button onClick={() => handleDelete(addr)} className="text-slate-600 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                </div>
            );
        } catch(err) {
            return null;
        }
    };

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <button onClick={onBack} className="mb-4 text-slate-500 hover:text-white flex items-center gap-2 text-sm"><ArrowRight className="rotate-180" size={16}/> Back to Dashboard</button>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><BookUser className="text-purple-500"/> Address Book</h2>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Add New Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Friend Name" className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-purple-500"/>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Wallet Address (0x...)" className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono outline-none focus:border-purple-500"/>
                </div>
                <button onClick={handleSave} disabled={isLoading || !db || !account} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold text-sm w-full md:w-auto flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? <Loader2 className="animate-spin" size={16}/> : <><Plus size={16}/> Save Contact</>}
                </button>
                {!db && <p className="text-xs text-red-500 mt-2">Database not connected.</p>}
                {!account && <p className="text-xs text-orange-500 mt-2">Connect wallet to save contacts.</p>}
            </div>

            <div className="space-y-3">
                {(!contactMap || Object.keys(contactMap).length === 0) ? (
                    <div className="text-center text-slate-600 py-10">No contacts saved yet.</div>
                ) : (
                    Object.entries(contactMap).map(([addr, name]) => renderRow(addr, name))
                )}
            </div>
        </div>
    );
};

const CreateCircle = ({ account, onCancel, onCreate, isLoading, db, contactMap }) => {
    const [newName, setNewName] = useState('');
    const [newAsset, setNewAsset] = useState('USDC');
    const [newDate, setNewDate] = useState('');
    const [selectedContact, setSelectedContact] = useState('');
    const [amountRequired, setAmountRequired] = useState('');
    const [myAmount, setMyAmount] = useState('');
    const [participantsList, setParticipantsList] = useState([]);

    const handleAddParticipant = () => {
        if (!selectedContact || !amountRequired) return;
        const name = contactMap[selectedContact] || shortenAddress(selectedContact);
        if (!participantsList.some(p => p.address === selectedContact)) {
            setParticipantsList([...participantsList, { address: selectedContact, goal: Number(amountRequired), name }]);
        }
        setSelectedContact('');
        setAmountRequired('');
    };

    const calculateTotalGoal = () => {
        const othersTotal = participantsList.reduce((acc, p) => acc + p.goal, 0);
        const myTotal = Number(myAmount) || 0;
        return othersTotal + myTotal;
    };

    const handleSubmit = () => {
        if (!account) return;
        // Include creator
        const finalParticipants = [
            { address: account, goal: Number(myAmount) || 0 },
            ...participantsList.map(p => ({ address: p.address, goal: p.goal }))
        ];

        onCreate({
            name: newName,
            asset: newAsset,
            goal: calculateTotalGoal(),
            date: newDate,
            participants: finalParticipants.map(p => p.address),
            allocations: finalParticipants.map(p => p.goal)
        });
    };

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <button onClick={onCancel} className="mb-4 text-slate-500 hover:text-white flex items-center gap-2 text-sm"><ArrowRight className="rotate-180" size={16}/> Back to Dashboard</button>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <h2 className="text-2xl font-bold text-white mb-1">Create Aeon Coop</h2>
                <p className="text-slate-500 mb-6 text-sm">Define a goal and invite friends to contribute.</p>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Coop Name</label>
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white mt-1 focus:border-purple-500 outline-none" placeholder="e.g. Summer Trip" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Asset</label>
                            <div className="flex gap-2 mt-1">
                                <button onClick={() => setNewAsset('USDC')} className={`flex-1 py-3 rounded-xl border text-sm font-bold ${newAsset === 'USDC' ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>USDC</button>
                                <button onClick={() => setNewAsset('EURC')} className={`flex-1 py-3 rounded-xl border text-sm font-bold ${newAsset === 'EURC' ? 'bg-indigo-900/20 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>EURC</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Unlock Date</label>
                        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white mt-1 focus:border-purple-500 outline-none color-scheme-dark" />
                    </div>

                    <div className="border-t border-slate-800 my-4"></div>
                    <h3 className="font-bold text-white flex items-center gap-2"><Users size={18}/> Participants & Contributions</h3>
                    
                    <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white text-xs">ME</div>
                            <span className="text-purple-200 font-bold text-sm">Your Contribution</span>
                        </div>
                        <input type="number" value={myAmount} onChange={e => setMyAmount(e.target.value)} placeholder="0.00" className="w-32 bg-slate-950 border border-slate-700 rounded-lg p-2 text-right text-white focus:border-purple-500 outline-none" />
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Add From Contacts</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <select value={selectedContact} onChange={e => setSelectedContact(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none">
                                <option value="">Select a friend...</option>
                                {Object.entries(contactMap).map(([addr, name]) => (
                                    <option key={addr} value={addr}>{name}</option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <input type="number" value={amountRequired} onChange={e => setAmountRequired(e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-sm font-mono focus:border-purple-500 outline-none" placeholder="Amount" />
                                <button onClick={handleAddParticipant} className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl"><Plus/></button>
                            </div>
                        </div>

                        {participantsList.length > 0 && (
                            <div className="space-y-2 mt-3">
                                {participantsList.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                        <span className="text-slate-300 font-bold">{p.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-slate-400">{p.goal} {newAsset}</span>
                                            <X size={14} className="cursor-pointer hover:text-red-500 text-slate-600" onClick={() => setParticipantsList(participantsList.filter(x => x.address !== p.address))} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                        <span className="text-slate-400 text-sm">Total Coop Goal</span>
                        <span className="text-xl font-bold text-white">{calculateTotalGoal().toLocaleString()} <span className="text-sm text-slate-500">{newAsset}</span></span>
                    </div>

                    <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2">
                        {isLoading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> Deploy Aeon Coop</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function AeonCoop() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [db, setDb] = useState(null);
  const [contacts, setContacts] = useState({});
  const [showMobileInstructions, setShowMobileInstructions] = useState(false);

  useEffect(() => {
    try {
        const app = initializeApp(FIREBASE_CONFIG);
        const database = getFirestore(app);
        setDb(database);
        console.log("Firebase connected");
    } catch(e) { console.error("Firebase init failed:", e); }
  }, []);

  const showFeedback = (type, msg) => {
    setFeedback({ type, message: msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const copyUrl = () => {
      const url = window.location.href;
      if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(() => showFeedback('success', 'Link copied!'));
      } else {
          try {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showFeedback('success', 'Link copied!');
          } catch(e) {
            showFeedback('error', 'Failed to copy');
          }
      }
  };

  const fetchContacts = async () => {
    if (!account || !db) return;
    try {
        const querySnapshot = await getDocs(collection(db, "users", account, "contacts"));
        const loadedContacts = {};
        querySnapshot.forEach((doc) => { 
            const data = doc.data();
            // SAFETY FIX: force name to string or default "Unknown"
            loadedContacts[doc.id] = (data && data.name) ? String(data.name) : "Unknown"; 
        });
        setContacts(loadedContacts);
    } catch (e) { 
        console.error("Error fetching contacts:", e); 
    }
  };

  useEffect(() => { fetchContacts(); }, [account, db]);

  // Sync selectedCircle with updated circles data
  useEffect(() => {
    if (selectedCircle) {
      const updatedCircle = circles.find(c => c.id === selectedCircle.id);
      if (updatedCircle) {
        setSelectedCircle(updatedCircle);
      }
    }
  }, [circles]);

  // --- CONTRACT FETCHING LOGIC ---
  const fetchCoops = async () => {
    if (!account || !signer) return;
    setIsLoading(true);
    try {
        const contract = new ethers.Contract(CONTRACTS.COOP, COOP_ABI, signer);
        const coopIds = await contract.getMyCoops(account);
        
        const loadedCoops = await Promise.all(coopIds.map(async (id) => {
            // SAFETY WRAPPER & FALLBACK
            let details = null;
            let participants = [];
            let coopName = "Unknown Coop";

            try {
                // 1. Try to fetch from blockchain
                details = await contract.coops(id);
                coopName = details.name;

                // 2. Fetch events - with error handling
                try {
                    const filter = contract.filters.ParticipantAdded(id);
                    const events = await contract.queryFilter(filter);
                    const withdrawFilter = contract.filters.Withdrawn(id);
                    const withdrawEvents = await contract.queryFilter(withdrawFilter);

                    participants = await Promise.all(events.map(async (e) => {
                        const pAddr = e.args.participant;
                        const pInfo = await contract.getParticipantInfo(id, pAddr);
                        const userWithdrawals = withdrawEvents.filter(we => we.args.user.toLowerCase() === pAddr.toLowerCase());
                        const hasWithdrawn = userWithdrawals.length > 0 && Number(pInfo.balance) === 0;

                        return {
                            address: pAddr,
                            balance: Number(ethers.formatUnits(pInfo.balance, 6)), 
                            goal: Number(ethers.formatUnits(pInfo.goal, 6)),
                            hasWithdrawn
                        };
                    }));
                } catch(eventErr) {
                    console.warn(`Event fetch failed for ${id}, using Firebase backup if available`);
                }

            } catch(chainErr) {
                console.warn(`Blockchain read failed for ID ${id}`);
                if (!details) return null; 
            }

            // 3. Enrich with Firebase Data & Backup Participants
            if (db) {
                 try {
                    const docRef = doc(db, "coops", id.toString());
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.name) coopName = data.name;
                        
                        // IF BLOCKCHAIN EVENTS FAILED (participants empty), USE FIREBASE LIST
                        if (participants.length === 0 && data.participants) {
                            participants = await Promise.all(data.participants.map(async (pAddr) => {
                                // We still try to get balance from chain
                                let balance = 0; 
                                let goal = 0;
                                try {
                                    const pInfo = await contract.getParticipantInfo(id, pAddr);
                                    balance = Number(ethers.formatUnits(pInfo.balance, 6));
                                    goal = Number(ethers.formatUnits(pInfo.goal, 6));
                                } catch(e) {}
                                
                                return {
                                    address: pAddr,
                                    balance,
                                    goal,
                                    hasWithdrawn: false // Assume false if we can't read events
                                };
                            }));
                        }
                    }
                 } catch(err) { /* ignore read errors */ }
            }
            
            // Final safety fallback if everything failed
            if (participants.length === 0) {
                 participants = [{ address: account, balance: 0, goal: 0, hasWithdrawn: false }];
            }

            return {
                id: Number(id),
                name: coopName,
                owner: details.owner,
                assetAddress: details.asset,
                goalAmount: Number(ethers.formatUnits(details.goalAmount, 6)),
                totalDeposited: Number(ethers.formatUnits(details.totalDeposited, 6)),
                deadline: Number(details.deadline) * 1000,
                isClosed: details.isClosed,
                participants
            };
        }));
        
        setCircles(loadedCoops.filter(c => c !== null));

    } catch(e) {
        console.error("Fetch Error:", e);
        showFeedback('error', 'Failed to fetch Coops');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (account && signer) {
        fetchCoops();
    }
  }, [account, signer]);

  // 1. Auto-connect on Load
  useEffect(() => {
    const init = async () => {
        const shouldAutoConnect = localStorage.getItem('isWalletConnected') === 'true';
        if (shouldAutoConnect && window.ethereum) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await provider.send("eth_accounts", []);
                if (accounts.length > 0) {
                    const _signer = await provider.getSigner();
                    const _account = await _signer.getAddress();
                    setSigner(_signer);
                    setAccount(_account);
                }
            } catch (e) {
                console.error("Auto-connect failed:", e);
            }
        }
    };
    init();
  }, []);

  // 2. Manual Connect
  const connectWallet = async () => {
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobileDevice && !window.ethereum) {
        setShowMobileInstructions(true);
        return;
    }

    if (!window.ethereum) return alert("Install MetaMask");
    setIsLoading(true);
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        
        const _signer = await provider.getSigner();
        const _account = await _signer.getAddress();

        const { chainId } = await provider.getNetwork();
        if (Number(chainId) !== ARC_CONFIG.chainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x4cef52' }],
                });
            } catch(e) {
                 showFeedback('error', 'Please switch to Arc Testnet');
                 setIsLoading(false);
                 return;
            }
        }

        const message = `Welcome to Aeon Coop!\n\nPlease sign this message to confirm ownership.\n\nTime: ${new Date().toLocaleString()}`;
        try {
            await _signer.signMessage(message);
        } catch (signErr) {
            setIsLoading(false);
            return showFeedback('error', 'Signature rejected. Connection cancelled.');
        }

        setSigner(_signer);
        setAccount(_account);
        localStorage.setItem('isWalletConnected', 'true');
        showFeedback('success', 'Wallet Connected Successfully');
    } catch(e) {
        console.error(e);
        showFeedback('error', 'Connection Failed');
    }
    setIsLoading(false);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setCircles([]);
    localStorage.removeItem('isWalletConnected');
    showFeedback('success', 'Wallet Disconnected');
  };

  const handleCreateCircle = async (data) => {
    if (!signer) return;
    setIsLoading(true);
    try {
        const contract = new ethers.Contract(CONTRACTS.COOP, COOP_ABI, signer);
        const deadlineUnix = Math.floor(new Date(data.date).getTime() / 1000);
        const allocsWei = data.allocations.map(a => ethers.parseUnits(a.toString(), 6));
        const assetAddr = data.asset === 'USDC' ? CONTRACTS.USDC : CONTRACTS.EURC;

        const tx = await contract.createCoop(
            data.name,
            assetAddr,
            deadlineUnix,
            data.participants,
            allocsWei
        );
        const receipt = await tx.wait();

        // --- SAVE TO FIREBASE ---
        // Find CoopCreated event log to get the ID
        const event = receipt.logs.find(log => {
             try { return contract.interface.parseLog(log)?.name === 'CoopCreated'; } catch(e) { return false; }
        });
        
        if (event && db) {
             const parsedLog = contract.interface.parseLog(event);
             const newCoopId = parsedLog.args.id.toString();
             
             await setDoc(doc(db, "coops", newCoopId), {
                 name: data.name,
                 createdAt: new Date().toISOString(),
                 owner: account,
                 participants: data.participants
             });
        }
        
        showFeedback('success', 'Aeon Coop Created!');
        setActiveTab('dashboard');
        fetchCoops();
    } catch(e) {
        console.error(e);
        showFeedback('error', 'Creation Failed');
    }
    setIsLoading(false);
  };

  const handleDeposit = async (amount) => {
    if (!selectedCircle || !signer) return;
    setProcessingId('deposit');
    try {
        const tokenContract = new ethers.Contract(selectedCircle.assetAddress, ERC20_ABI, signer);
        const amountWei = ethers.parseUnits(amount.toString(), 6);
        
        const allowance = await tokenContract.allowance(account, CONTRACTS.COOP);
        if (allowance < amountWei) {
             const txApprove = await tokenContract.approve(CONTRACTS.COOP, amountWei);
             await txApprove.wait();
        }

        const contract = new ethers.Contract(CONTRACTS.COOP, COOP_ABI, signer);
        const tx = await contract.deposit(selectedCircle.id, amountWei);
        await tx.wait();

        showFeedback('success', 'Deposit successful');
        await fetchCoops(); // Wait for data refresh
    } catch(e) {
        console.error(e);
        showFeedback('error', 'Deposit Failed');
    }
    setProcessingId(null);
  };

  const handleWithdraw = async (isEmergency) => {
    if (!selectedCircle || !signer) return;
    setProcessingId(isEmergency ? 'emergency' : 'withdraw');
    try {
        const contract = new ethers.Contract(CONTRACTS.COOP, COOP_ABI, signer);
        const pInfo = await contract.getParticipantInfo(selectedCircle.id, account);
        const balanceWei = pInfo.balance;

        if (balanceWei === BigInt(0)) throw new Error("No balance");

        const tx = await contract.withdraw(selectedCircle.id, balanceWei);
        await tx.wait();

        showFeedback('success', isEmergency ? 'Emergency Withdrawal Complete' : 'Funds Withdrawn Successfully');
        await fetchCoops(); // Wait for data refresh
    } catch(e) {
        console.error(e);
        showFeedback('error', 'Withdrawal Failed');
    }
    setProcessingId(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans p-4 md:p-8 flex justify-center pb-20">
      <nav className="fixed top-0 left-0 right-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-50 h-20">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="bg-gradient-to-tr from-purple-500 to-pink-500 p-2 rounded-lg shadow-lg">
                <Handshake className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">Aeon<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Coop</span></span>
          </div>
          <div className="hidden md:flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/30 border border-emerald-500/30 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]"></div>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">LIVE ON ARC TESTNET</span>
             </div>
          </div>
          <div>
             {account ? (
                 <div className="flex items-center gap-3">
                     <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        {account.substring(0,6)}...{account.substring(38)}
                     </button>
                     <button onClick={disconnectWallet} className="bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-400 p-2 rounded-full transition-colors" title="Disconnect">
                        <LogOut size={18} />
                     </button>
                 </div>
             ) : (
                 <button onClick={connectWallet} disabled={isLoading} className="px-6 py-2.5 rounded-full text-sm font-bold bg-white text-slate-950 hover:bg-slate-200 transition-colors flex items-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={16}/> : <><Wallet size={16}/> Connect Wallet</>}
                 </button>
             )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl w-full mt-24 relative">
        {feedback && (
            <div className={`fixed top-24 right-4 px-6 py-4 rounded-xl border flex items-center gap-3 z-[100] shadow-2xl animate-in slide-in-from-right fade-in duration-300 ${feedback.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' : 'bg-red-950/90 border-red-500/50 text-red-200'}`}>
                {feedback.type === 'success' ? <CheckCircle2 size={20}/> : <Info size={20}/>}
                <span className="font-medium">{feedback.message}</span>
            </div>
        )}
        
        {showMobileInstructions && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                    <button onClick={() => setShowMobileInstructions(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"><X size={24} /></button>
                    <div className="bg-purple-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20"><Smartphone className="w-8 h-8 text-purple-400"/></div>
                    <h3 className="text-xl font-bold text-white mb-2">Connect Mobile Wallet</h3>
                    <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Aeon Coop works best inside your wallet's built-in browser (MetaMask, Rabby, etc).</p>
                    <button onClick={copyUrl} className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center justify-center gap-3 transition-all font-bold text-white shadow-lg shadow-purple-900/30"><Copy size={20}/> Copy Website Link</button>
                    <div className="mt-4 text-center text-xs text-zinc-500">1. Copy Link above<br/>2. Open MetaMask or Rabby App<br/>3. Paste in the internal Browser</div>
                </div>
            </div>
        )}

        {activeTab === 'dashboard' && (
            <Dashboard 
                circles={circles} 
                account={account} 
                onNavigate={setActiveTab} 
                contactMap={contacts}
                onSelectCircle={(circle) => { setSelectedCircle(circle); setActiveTab('details'); }} 
            />
        )}

        {activeTab === 'contacts' && (
            <Contacts
                account={account}
                db={db}
                contactMap={contacts}
                refreshContacts={fetchContacts}
                showFeedback={showFeedback}
                onBack={() => setActiveTab('dashboard')}
            />
        )}
        
        {activeTab === 'create' && (
            <CreateCircle 
                account={account} 
                db={db}
                contactMap={contacts}
                isLoading={isLoading}
                onCancel={() => setActiveTab('dashboard')} 
                onCreate={handleCreateCircle} 
            />
        )}
        
        {activeTab === 'details' && selectedCircle && (
            <CircleDetails 
                circle={selectedCircle}
                account={account}
                contactMap={contacts}
                processingId={processingId}
                onBack={() => { setSelectedCircle(null); setActiveTab('dashboard'); }}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
            />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-2 text-[10px] text-center text-slate-600 bg-[#020617]/90 backdrop-blur flex justify-center gap-4 z-50 border-t border-slate-900">
           <span>Network: {ARC_CONFIG.chainName}</span>
           <a 
             href="https://testnet.arcscan.app/address/0x84D371d042139c63dc77a5E60b90193BE2be1850" 
             target="_blank" 
             rel="noopener noreferrer"
             className="hover:text-purple-400 transition-colors underline decoration-slate-700 hover:decoration-purple-400 flex items-center gap-1"
           >
              View Contract on ArcScan <ExternalLink size={10} />
           </a>
           
           <a 
             href="https://github.com/brnodes-dev/aeon-coop" 
             target="_blank" 
             rel="noopener noreferrer"
             className="hover:text-purple-400 transition-colors underline decoration-slate-700 hover:decoration-purple-400 flex items-center gap-1"
           >
              User Guide <Github size={10} />
           </a>

           <span className={`flex items-center gap-1 ${db ? 'text-emerald-500' : 'text-slate-500'}`}>
              <Database size={10}/> {db ? 'Firebase Sync Active' : 'Local Mode'}
           </span>
      </div>
    </div>
  );
}