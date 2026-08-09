'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Users, Share2, Copy, Send, Calendar, CheckCircle, 
  AlertTriangle, Flame, ShieldAlert, BadgePercent, Sparkles, 
  MessageSquareCode, HelpCircle, Check, MapPin, BadgeDollarSign,
  QrCode
} from 'lucide-react';
import { db, decodePactFromUrl, encodePactToUrl, Pact, Participant } from '@/lib/db';
import { generateNegotiationMessage } from '@/lib/gemini';

export default function PactDetails() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const router = useRouter();

  const [pact, setPact] = useState<Pact | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Join Form State
  const [joinName, setJoinName] = useState('');
  const [joinQty, setJoinQty] = useState('1');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  // AI Negotiation State
  const [aiPersona, setAiPersona] = useState<'professional' | 'warm' | 'aggressive'>('professional');
  const [aiMessage, setAiMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // AI Custom Negotiation inputs
  const [vendorName, setVendorName] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // QR Modal and Simulator states
  const [showQrModal, setShowQrModal] = useState(false);
  const [simulatedBuyers, setSimulatedBuyers] = useState(0);

  // Creator Role State
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    if (pact) {
      const creatorFlag = localStorage.getItem(`pricepact_creator_${pact.id}`);
      if (creatorFlag === 'true' || pact.id.startsWith('sample-')) {
        setIsCreator(true);
      }
      // Initialize simulated buyers from pact data
      if (simulatedBuyers === 0 && pact.participants.length > 0) {
        setSimulatedBuyers(pact.participants.length);
      }
    }
  }, [pact]);

  useEffect(() => {
    async function loadPact() {
      try {
        let currentPact = await db.getPact(id);
        
        // URL Fallback check
        const encodedData = searchParams.get('pactData');
        if (encodedData) {
          const decodedPact = decodePactFromUrl(encodedData);
          if (decodedPact) {
            // Import to localStorage if not exists or merge
            db.importPact(decodedPact);
            if (!currentPact || decodedPact.participants.length > currentPact.participants.length) {
              currentPact = decodedPact;
            }
          }
        }

        if (currentPact) {
          setPact(currentPact);
        }
      } catch (err) {
        console.error('Error loading pact details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadPact();
    }
  }, [id, searchParams]);

  // Load AI draft once Pact is ready
  useEffect(() => {
    if (pact) {
      triggerAiGeneration();
    }
  }, [pact?.participants.length, aiPersona, vendorName, deliveryOption, paymentMethod]); // regenerate on join or parameters change

  const triggerAiGeneration = async () => {
    if (!pact) return;
    setAiLoading(true);
    try {
      const totalQty = pact.participants.reduce((sum, p) => sum + p.quantity, 0);
      const msg = await generateNegotiationMessage({
        productName: pact.productName,
        currentPrice: pact.currentPrice,
        targetPrice: pact.targetPrice,
        minParticipants: pact.minParticipants,
        totalQuantity: totalQty,
        actualParticipants: pact.participants.length,
        location: pact.location,
        creatorName: pact.creatorName,
        persona: aiPersona,
        vendorName: vendorName || undefined,
        deliveryOption: deliveryOption || undefined,
        paymentMethod: paymentMethod || undefined
      });
      setAiMessage(msg);
    } catch (e) {
      console.error('Failed to compile negotiation message', e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess(false);

    if (!joinName.trim()) {
      setJoinError('Please enter your name.');
      return;
    }

    const qty = parseInt(joinQty);
    if (isNaN(qty) || qty <= 0) {
      setJoinError('Quantity must be a positive integer.');
      return;
    }

    setJoinLoading(true);
    try {
      await db.joinPact(id, joinName.trim(), qty);
      
      // Reload state
      const updatedPact = await db.getPact(id);
      if (updatedPact) {
        setPact(updatedPact);
        setJoinSuccess(true);
        setJoinName('');
        setJoinQty('1');

        // Update URL query state in address bar so if user refreshes, they keep local additions
        const newEncoded = encodePactToUrl(updatedPact);
        router.replace(`/pact/${id}?pactData=${newEncoded}`, { scroll: false });
      }
    } catch (err) {
      console.error(err);
      setJoinError('Failed to join Pact. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  const copyShareLink = () => {
    if (typeof window === 'undefined' || !pact) return;
    
    // Create shareable url containing the current local pact state encoded
    const encoded = encodePactToUrl(pact);
    const shareUrl = `${window.location.origin}/pact/${pact.id}?pactData=${encoded}`;
    
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyNegotiationMessage = () => {
    if (!aiMessage) return;
    navigator.clipboard.writeText(aiMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const handleStatusChange = async (newStatus: Pact['status']) => {
    if (!pact) return;
    try {
      const updated = await db.updatePactStatus(pact.id, newStatus);
      setPact(updated);
      const newEncoded = encodePactToUrl(updated);
      router.replace(`/pact/${id}?pactData=${newEncoded}`, { scroll: false });
    } catch (e) {
      console.error('Failed to change status:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="mesh-bg" />
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-brand-primary mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-brand-muted text-sm font-semibold">Retrieving Pact specifications...</p>
        </div>
      </div>
    );
  }

  if (!pact) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div className="mesh-bg" />
        <div className="glass-panel max-w-md w-full p-8 rounded-2xl text-center shadow-xl">
          <ShieldAlert className="w-16 h-16 text-brand-danger mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-brand-text mb-2">Pact Not Found</h2>
          <p className="text-brand-muted text-sm mb-6">
            The link you followed might be broken or this local database session doesn't contain this Pact.
          </p>
          <Link href="/" className="inline-flex items-center justify-center w-full px-4 py-3 bg-brand-primary hover:bg-brand-primary-hover text-sm font-bold text-white rounded-lg transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Math variables
  const participantsCount = pact.participants.length;
  const totalUnits = pact.participants.reduce((sum, p) => sum + p.quantity, 0);
  const isThresholdMet = participantsCount >= pact.minParticipants;
  const progressPercent = Math.min(Math.round((participantsCount / pact.minParticipants) * 100), 100);
  const savingsPerUnit = pact.currentPrice - pact.targetPrice;
  const savingsPct = Math.round((savingsPerUnit / pact.currentPrice) * 100);
  const totalPactSavings = savingsPerUnit * totalUnits;

  // Bargaining Power Tier calculations
  let bargainingPower: 'Weak' | 'Moderate' | 'Strong' = 'Weak';
  let bargainingColor = 'text-brand-danger';
  let bargainingBg = 'bg-brand-danger/10 border-brand-danger/20';
  let bargainingIcon = <ShieldAlert className="w-5 h-5 mr-2 text-brand-danger" />;
  
  if (participantsCount >= pact.minParticipants) {
    bargainingPower = 'Strong';
    bargainingColor = 'text-brand-success';
    bargainingBg = 'bg-brand-success/15 border-brand-success/20';
    bargainingIcon = <Flame className="w-5 h-5 mr-2 text-brand-success animate-pulse" />;
  } else if (progressPercent >= 40) {
    bargainingPower = 'Moderate';
    bargainingColor = 'text-brand-accent';
    bargainingBg = 'bg-brand-accent/10 border-brand-accent/20';
    bargainingIcon = <AlertTriangle className="w-5 h-5 mr-2 text-brand-accent" />;
  }

  // Days left calculation
  const getDaysLeft = () => {
    const diff = new Date(pact.deadline).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days left` : 'Pact expired';
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 relative">
      <div className="mesh-bg" />

      <div className="max-w-5xl mx-auto">
        {/* Navigation & Actions Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <Link href="/" className="inline-flex items-center text-sm text-brand-muted hover:text-brand-text transition-colors group">
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </Link>
        </div>

        {/* Pact Basic Info Hero Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-xl animate-fade-in border-b-4 border-b-brand-primary">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  <MapPin className="w-3.5 h-3.5 mr-1" /> {pact.location}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-surface-light text-brand-muted border border-white/5">
                  <Calendar className="w-3.5 h-3.5 mr-1" /> {getDaysLeft()}
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight">{pact.productName}</h1>
              {pact.description && (
                <p className="mt-2 text-brand-muted text-sm max-w-2xl">{pact.description}</p>
              )}
              
              <div className="mt-4 text-xs sm:text-sm text-brand-muted">
                Pact initiated by <span className="font-semibold text-brand-text">{pact.creatorName}</span>
              </div>

              {/* Prominent Invite / Copy Shareable Link Section */}
              <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={copyShareLink}
                  className="inline-flex items-center px-5 py-3 text-xs sm:text-sm font-extrabold text-white bg-brand-primary hover:bg-brand-primary-hover border border-transparent rounded-xl cursor-pointer transition-all duration-150 shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] group relative overflow-hidden active:scale-95"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-brand-success" />
                      Link Copied! Paste on WhatsApp
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2 text-white group-hover:scale-110 transition-transform" />
                      Copy Share Link & Invite Friends
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="inline-flex items-center px-4 py-3 text-xs sm:text-sm font-bold text-brand-text bg-brand-surface-light border border-white/10 hover:border-brand-primary/50 rounded-xl cursor-pointer transition-all duration-150 active:scale-95"
                >
                  <QrCode className="w-4 h-4 mr-2 text-brand-secondary" />
                  Show QR Code
                </button>
                <span className="text-[11px] text-brand-muted italic">
                  * Share links or QR codes in community chats to pool demand.
                </span>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="glass-panel rounded-xl px-5 py-4 flex items-center gap-6 border-white/5 w-full md:w-auto bg-brand-surface/40">
              <div className="text-center">
                <span className="block text-xs font-medium text-brand-muted">Standard</span>
                <span className="text-lg font-bold text-brand-muted line-through">₹{pact.currentPrice}</span>
              </div>
              <div className="w-[1px] h-10 bg-white/10" />
              <div className="text-center">
                <span className="block text-xs font-medium text-brand-secondary">Target Price</span>
                <span className="text-2xl font-black text-brand-secondary">₹{pact.targetPrice}</span>
              </div>
              <div className="w-[1px] h-10 bg-white/10" />
              <div className="text-center">
                <span className="block text-xs font-medium text-brand-success">Savings</span>
                <span className="text-lg font-black text-brand-success">-{savingsPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Stats and Participants list */}
          <div className="lg:col-span-2 space-y-8">
            
            {isCreator && (
              <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-md border-t-2 border-t-brand-accent animate-fade-in relative overflow-hidden bg-brand-surface/40">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-brand-text flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-brand-accent" />
                      Organizer Admin Controls
                    </h2>
                    <p className="text-xs text-brand-muted mt-1">Manage active outreach statuses to coordinate group negotiations.</p>
                  </div>
                  <span className="text-[10px] bg-brand-accent/15 text-brand-accent px-2 py-0.5 rounded border border-brand-accent/20 font-bold uppercase tracking-wider">
                    Organizer Mode
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                  <button 
                    onClick={() => handleStatusChange('active')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border ${
                      pact.status === 'active' 
                        ? 'bg-brand-primary border-brand-primary text-white shadow-sm' 
                        : 'bg-brand-surface-light border-white/5 text-brand-muted hover:text-brand-text'
                    }`}
                  >
                    Active (Collecting)
                  </button>
                  <button 
                    onClick={() => handleStatusChange('negotiating')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border ${
                      pact.status === 'negotiating' 
                        ? 'bg-brand-accent border-brand-accent text-white shadow-sm' 
                        : 'bg-brand-surface-light border-white/5 text-brand-muted hover:text-brand-text'
                    }`}
                  >
                    Negotiating (Outreach)
                  </button>
                  <button 
                    onClick={() => handleStatusChange('completed')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border ${
                      pact.status === 'completed' 
                        ? 'bg-brand-success border-brand-success text-white shadow-sm' 
                        : 'bg-brand-surface-light border-white/5 text-brand-muted hover:text-brand-text'
                    }`}
                  >
                    Savings Secured!
                  </button>
                  <button 
                    onClick={() => handleStatusChange('expired')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all border ${
                      pact.status === 'expired' 
                        ? 'bg-brand-danger border-brand-danger text-white shadow-sm' 
                        : 'bg-brand-surface-light border-white/5 text-brand-muted hover:text-brand-text'
                    }`}
                  >
                    Expired / Closed
                  </button>
                </div>
              </div>
            )}

            {/* Live Progress Card */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-md">
              <h2 className="text-lg font-bold text-brand-text mb-6 flex items-center">
                <BadgePercent className="w-5 h-5 mr-2 text-brand-primary" />
                Collective Bargaining Progress
              </h2>

              {/* Progress Gauges */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-brand-text">Threshold (Min. Buyers)</span>
                    <span className="text-sm font-black text-brand-primary">{participantsCount} / {pact.minParticipants} Joined</span>
                  </div>
                  {/* Progress Bar Container */}
                  <div className="w-full bg-brand-surface h-3.5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                    <div 
                      className="bg-gradient-to-r from-brand-primary to-brand-secondary h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Additional metrics stats grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                  <div className="bg-brand-surface/30 border border-white/5 rounded-xl p-4 text-center">
                    <span className="block text-xs font-medium text-brand-muted mb-1">Total Quantity</span>
                    <span className="text-lg font-extrabold text-brand-text">{totalUnits} units</span>
                  </div>

                  <div className="bg-brand-surface/30 border border-white/5 rounded-xl p-4 text-center">
                    <span className="block text-xs font-medium text-brand-muted mb-1">Savings/Unit</span>
                    <span className="text-lg font-extrabold text-brand-success">₹{savingsPerUnit}</span>
                  </div>

                  <div className="bg-brand-surface/30 border border-white/5 rounded-xl p-4 text-center">
                    <span className="block text-xs font-medium text-brand-muted mb-1">Total Saved</span>
                    <span className="text-lg font-extrabold text-brand-success flex items-center justify-center">
                      <BadgeDollarSign className="w-4 h-4 mr-1 text-brand-success" />
                      ₹{totalPactSavings}
                    </span>
                  </div>
                </div>

                {/* Bargaining Power Badge Banner */}
                <div className={`flex items-center p-4 border rounded-xl ${bargainingBg} ${bargainingColor} text-sm font-semibold transition-all duration-300`}>
                  {bargainingIcon}
                  <span>
                    Bargaining Power: <strong className="underline uppercase">{bargainingPower}</strong> — {
                      bargainingPower === 'Strong' 
                        ? 'We are ready! Use the AI Negotiation Assistant below to finalize deals.'
                        : bargainingPower === 'Moderate'
                        ? 'Negotiation is close. Share the link with neighbors to push to the threshold!'
                        : 'Gathering local numbers. Share this link to start saving.'
                    }
                  </span>
                </div>

                {/* Bargaining Simulator Slider */}
                <div className="mt-6 pt-6 border-t border-white/5 bg-brand-surface/20 p-4 rounded-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                    <div>
                      <span className="text-xs font-bold text-brand-text block">Bargaining Sandbox Simulator</span>
                      <span className="text-[10px] text-brand-muted">Drag slider to simulate collective savings growth.</span>
                    </div>
                    <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-xs font-black rounded border border-brand-primary/20">
                      {simulatedBuyers || participantsCount} buyers simulated
                    </span>
                  </div>
                  
                  <input
                    type="range"
                    min={participantsCount}
                    max={Math.max(50, pact.minParticipants * 2.5)}
                    className="w-full h-1.5 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-brand-secondary my-3"
                    value={simulatedBuyers || participantsCount}
                    onChange={(e) => setSimulatedBuyers(parseInt(e.target.value))}
                  />

                  {/* Sandbox Calculations */}
                  {(() => {
                    const simCount = simulatedBuyers || participantsCount;
                    const avgQty = totalUnits / (participantsCount || 1);
                    const simQty = Math.round(simCount * avgQty);
                    
                    let simPower: 'Weak' | 'Moderate' | 'Strong' | 'Supercharged' = 'Weak';
                    let simPowerColor = 'text-brand-danger';
                    if (simCount >= pact.minParticipants * 2) {
                      simPower = 'Supercharged';
                      simPowerColor = 'text-brand-secondary font-black animate-pulse';
                    } else if (simCount >= pact.minParticipants) {
                      simPower = 'Strong';
                      simPowerColor = 'text-brand-success';
                    } else if (simCount >= pact.minParticipants * 0.4) {
                      simPower = 'Moderate';
                      simPowerColor = 'text-brand-accent';
                    }

                    let discountTier = 1.0;
                    if (simCount >= pact.minParticipants * 2) {
                      discountTier = 1.25;
                    } else if (simCount >= pact.minParticipants) {
                      discountTier = 1.0;
                    } else {
                      discountTier = Math.max(0.4, simCount / pact.minParticipants);
                    }
                    const simSavingsPerUnit = Math.round((pact.currentPrice - pact.targetPrice) * discountTier);
                    const simTotalSavings = simSavingsPerUnit * simQty;

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-4 pt-4 border-t border-white/5 text-center">
                        <div className="p-2 bg-brand-surface/40 rounded-lg">
                          <span className="block text-[10px] text-brand-muted mb-0.5">Projected Volume</span>
                          <span className="text-xs font-bold text-brand-text">{simQty} units</span>
                        </div>
                        <div className="p-2 bg-brand-surface/40 rounded-lg">
                          <span className="block text-[10px] text-brand-muted mb-0.5">Simulated Tier</span>
                          <span className={`text-xs font-bold ${simPowerColor}`}>{simPower}</span>
                        </div>
                        <div className="p-2 bg-brand-surface/40 rounded-lg">
                          <span className="block text-[10px] text-brand-muted mb-0.5">Savings / Unit</span>
                          <span className="text-xs font-bold text-brand-success">₹{simSavingsPerUnit}</span>
                        </div>
                        <div className="p-2 bg-brand-surface/40 rounded-lg">
                          <span className="block text-[10px] text-brand-muted mb-0.5">Total Group Saving</span>
                          <span className="text-xs font-bold text-brand-success">₹{simTotalSavings}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Participants list */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-md">
              <h2 className="text-lg font-bold text-brand-text mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-brand-primary" />
                Active Co-Buyers ({participantsCount})
              </h2>

              <div className="overflow-hidden border border-white/5 rounded-xl bg-brand-surface/20">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-brand-surface/60">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-brand-muted uppercase tracking-wider">Buyer Name</th>
                      <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-brand-muted uppercase tracking-wider">Requested Quantity</th>
                      <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-brand-muted uppercase tracking-wider">Estimated Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pact.participants.map((participant, index) => (
                      <tr key={participant.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-text flex items-center">
                          <div className="w-7 h-7 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-xs font-black text-brand-primary mr-3">
                            {participant.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            {participant.name}
                            {index === 0 && <span className="text-[10px] text-brand-accent border border-brand-accent/20 bg-brand-accent/5 px-1.5 py-0.5 rounded ml-2 font-medium">Organizer</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-brand-text font-semibold">{participant.quantity} units</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-brand-success font-black">₹{participant.quantity * savingsPerUnit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Negotiation Assistant - Only unlocked/highlighted if threshold met or close */}
            <div className={`glass-panel rounded-2xl p-6 sm:p-8 shadow-md border ${isThresholdMet ? 'border-brand-success/30' : 'border-white/5 opacity-80'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-brand-text flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-brand-primary" />
                      AI Negotiation Script Generator
                    </h2>
                    {isThresholdMet ? (
                      <span className="text-[10px] bg-brand-success/15 text-brand-success px-2 py-0.5 rounded border border-brand-success/20 font-semibold uppercase animate-pulse">Unlocked</span>
                    ) : (
                      <span className="text-[10px] bg-brand-muted/15 text-brand-muted px-2 py-0.5 rounded border border-white/10 font-semibold uppercase">Pending Threshold</span>
                    )}
                  </div>
                  <p className="text-xs text-brand-muted mt-1">Generates a high-leverage bulk buyer inquiry letter for vendor outreach.</p>
                </div>

                {/* Tone Selectors */}
                <div className="flex bg-brand-surface p-1 rounded-lg border border-white/5 self-end sm:self-auto">
                  {(['professional', 'warm', 'aggressive'] as const).map((persona) => (
                    <button
                      key={persona}
                      onClick={() => setAiPersona(persona)}
                      className={`px-3 py-1 text-xs font-semibold capitalize rounded-md transition-all cursor-pointer ${
                        aiPersona === persona 
                          ? 'bg-brand-primary text-white shadow-sm' 
                          : 'text-brand-muted hover:text-brand-text'
                      }`}
                    >
                      {persona === 'warm' ? 'Friendly' : persona}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vendor Outreach Parameters Customizer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 p-4 rounded-xl bg-brand-surface/40 border border-white/5 text-xs">
                <div>
                  <label className="block font-semibold text-brand-text mb-1.5">
                    Vendor Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sri Sai Traders"
                    className="glass-input w-full rounded-lg px-2.5 py-2 text-xs focus:border-brand-primary"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-brand-text mb-1.5">
                    Delivery Preference
                  </label>
                  <select
                    className="glass-input w-full rounded-lg px-2.5 py-2 text-xs focus:border-brand-primary"
                    value={deliveryOption}
                    onChange={(e) => setDeliveryOption(e.target.value)}
                  >
                    <option value="">-- Select Option --</option>
                    <option value="Single central drop-off point">Single central drop-off point</option>
                    <option value="Door-to-door delivery inside community">Door-to-door delivery</option>
                    <option value="Coordinator self-pickup at store">Coordinator self-pickup</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-brand-text mb-1.5">
                    Proposed Payment Terms
                  </label>
                  <select
                    className="glass-input w-full rounded-lg px-2.5 py-2 text-xs focus:border-brand-primary"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="">-- Select Option --</option>
                    <option value="UPI / Online Transfer on Delivery">UPI / Online Transfer on Delivery</option>
                    <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                    <option value="50% Advance online / 50% on receipt">50% Advance / 50% Receipt</option>
                    <option value="100% Prepaid upfront billing">100% Upfront Prepaid</option>
                  </select>
                </div>
              </div>

              {/* Generated message text-box */}
              <div className="relative">
                {aiLoading ? (
                  <div className="h-48 bg-brand-surface/40 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-brand-primary mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs text-brand-muted font-medium">AI Agent compounding negotiation factors...</span>
                  </div>
                ) : (
                  <>
                    <textarea
                      readOnly
                      rows={8}
                      className="w-full bg-brand-surface/50 border border-white/10 rounded-xl p-4 text-sm text-brand-text font-mono focus:outline-none resize-none leading-relaxed"
                      value={aiMessage}
                    />
                    
                    {/* Copy and WhatsApp Buttons */}
                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        onClick={copyNegotiationMessage}
                        disabled={!aiMessage}
                        className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold bg-brand-surface-light hover:bg-brand-surface-light/80 border border-white/10 text-brand-text rounded-lg transition-all cursor-pointer"
                      >
                        {copiedMsg ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-2 text-brand-success" />
                            Copied to Clipboard
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-2 text-brand-muted" />
                            Copy Message Text
                          </>
                        )}
                      </button>

                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(aiMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg transition-all"
                      >
                        <Send className="w-3.5 h-3.5 mr-2" />
                        Send via WhatsApp
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Column 3: Join the Pact Form card */}
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-2xl p-6 shadow-md border-t-2 border-t-brand-secondary sticky top-6">
              <h2 className="text-lg font-black text-brand-text mb-2">Join this Pact</h2>
              <p className="text-xs text-brand-muted mb-6">No account registration required. Input your request to add to the group buying power.</p>

              {joinSuccess ? (
                <div className="p-4 bg-brand-success/15 border border-brand-success/20 rounded-xl text-brand-success text-center animate-scale-in">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-brand-success" />
                  <span className="block font-bold text-sm">Successfully Joined!</span>
                  <span className="block text-xs text-brand-success/80 mt-1">Your demand has been added to the collective metrics.</span>
                  <button 
                    onClick={() => setJoinSuccess(false)}
                    className="mt-4 px-4 py-1.5 bg-brand-success text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-brand-success/80"
                  >
                    Add Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  {joinError && (
                    <div className="p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-brand-danger text-xs">
                      {joinError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="joinName" className="block text-xs font-semibold text-brand-text mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="joinName"
                      placeholder="e.g. Abhinand"
                      className="glass-input w-full rounded-lg px-3 py-2.5 text-sm"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="joinQty" className="block text-xs font-semibold text-brand-text mb-1.5 flex justify-between">
                      <span>Quantity Needed *</span>
                      {parseFloat(joinQty) > 0 && (
                        <span className="text-brand-success font-semibold text-[10px]">
                          Est. Saving: ₹{parseInt(joinQty) * savingsPerUnit}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      id="joinQty"
                      min="1"
                      placeholder="1"
                      className="glass-input w-full rounded-lg px-3 py-2.5 text-sm"
                      value={joinQty}
                      onChange={(e) => setJoinQty(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={joinLoading}
                    className="w-full flex justify-center items-center py-2.5 px-4 bg-brand-secondary hover:bg-brand-secondary/90 text-sm font-bold text-white rounded-lg shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                  >
                    {joinLoading ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : null}
                    Join the PricePact
                  </button>
                </form>
              )}

              {/* Mini information tip */}
              <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-brand-muted flex items-start">
                <HelpCircle className="w-4 h-4 mr-2 text-brand-muted flex-shrink-0" />
                <span>
                  By joining, your requested quantity is combined with other members. When the threshold is met, the organizer can send the bulk offer.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* QR Code Share Modal */}
        {showQrModal && pact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090a0f]/85 backdrop-blur-sm animate-fade-in">
            <div className="glass-panel max-w-sm w-full p-6 rounded-2xl border-white/10 shadow-2xl relative animate-scale-in text-center">
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-lg text-brand-muted hover:text-brand-text transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>

              <h3 className="text-lg font-extrabold text-brand-text mb-2">Scan & Join</h3>
              <p className="text-xs text-brand-muted mb-6">Neighbors can scan this code with their phone cameras to instantly join the Pact.</p>
              
              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `${typeof window !== 'undefined' ? window.location.origin : ''}/pact/${pact.id}?pactData=${encodePactToUrl(pact)}`
                  )}`}
                  alt="PricePact Join Link QR Code"
                  className="w-44 h-44 mx-auto"
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/pact/${pact.id}?pactData=${encodePactToUrl(pact)}`;
                    navigator.clipboard.writeText(shareUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="w-full py-2.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-md"
                >
                  {copiedLink ? 'Link Copied!' : 'Copy Share Link'}
                </button>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="w-full py-2.5 px-4 bg-brand-surface-light hover:bg-brand-surface-light/80 text-brand-text text-xs font-bold rounded-lg transition-colors cursor-pointer border border-white/5"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
