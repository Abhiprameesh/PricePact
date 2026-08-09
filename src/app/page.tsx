'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Plus, Search, MapPin, Users, ShoppingBag, 
  ArrowRight, ShieldCheck, HelpCircle, Flame, BadgePercent, CheckCircle2 
} from 'lucide-react';
import { db, encodePactToUrl, Pact } from '@/lib/db';

// Seed sample pacts if none exist
const SAMPLE_PACTS: Pact[] = [
  {
    id: 'sample-water-cans',
    productName: '20L Pure Mineral Water Can',
    description: 'Bulk order for hostel block A residents. Delivered directly to hostel reception.',
    currentPrice: 110,
    targetPrice: 90,
    minParticipants: 15,
    targetQuantity: 50,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Gokul Hostels (Block A)',
    creatorName: 'Karthik Rao',
    createdAt: new Date().toISOString(),
    status: 'active',
    participants: [
      { id: 'p1', pactId: 'sample-water-cans', name: 'Karthik Rao', quantity: 3, joinedAt: new Date().toISOString() },
      { id: 'p2', pactId: 'sample-water-cans', name: 'Sneha M.', quantity: 2, joinedAt: new Date().toISOString() },
      { id: 'p3', pactId: 'sample-water-cans', name: 'Abhinav Reddy', quantity: 5, joinedAt: new Date().toISOString() },
      { id: 'p4', pactId: 'sample-water-cans', name: 'Rohit K.', quantity: 2, joinedAt: new Date().toISOString() },
      { id: 'p5', pactId: 'sample-water-cans', name: 'Ananya S.', quantity: 4, joinedAt: new Date().toISOString() },
      { id: 'p6', pactId: 'sample-water-cans', name: 'Vikram Joshi', quantity: 3, joinedAt: new Date().toISOString() }
    ]
  },
  {
    id: 'sample-printing-paper',
    productName: 'Premium A4 Copier Paper (75GSM)',
    description: 'Procuring boxes of copier paper bundles for computer lab projects and assignments.',
    currentPrice: 320,
    targetPrice: 250,
    minParticipants: 10,
    targetQuantity: 40,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'CBIT College Campus',
    creatorName: 'Priya Sharma',
    createdAt: new Date().toISOString(),
    status: 'negotiating',
    participants: [
      { id: 'pp1', pactId: 'sample-printing-paper', name: 'Priya Sharma', quantity: 4, joinedAt: new Date().toISOString() },
      { id: 'pp2', pactId: 'sample-printing-paper', name: 'Aditya Sen', quantity: 6, joinedAt: new Date().toISOString() },
      { id: 'pp3', pactId: 'sample-printing-paper', name: 'Divya N.', quantity: 5, joinedAt: new Date().toISOString() },
      { id: 'pp4', pactId: 'sample-printing-paper', name: 'Rahul Varma', quantity: 3, joinedAt: new Date().toISOString() },
      { id: 'pp5', pactId: 'sample-printing-paper', name: 'Tanvi G.', quantity: 5, joinedAt: new Date().toISOString() },
      { id: 'pp6', pactId: 'sample-printing-paper', name: 'Harish M.', quantity: 4, joinedAt: new Date().toISOString() },
      { id: 'pp7', pactId: 'sample-printing-paper', name: 'Neha Chawla', quantity: 6, joinedAt: new Date().toISOString() },
      { id: 'pp8', pactId: 'sample-printing-paper', name: 'Samir Pal', quantity: 2, joinedAt: new Date().toISOString() },
      { id: 'pp9', pactId: 'sample-printing-paper', name: 'Asha K.', quantity: 5, joinedAt: new Date().toISOString() },
      { id: 'pp10', pactId: 'sample-printing-paper', name: 'Viktor D.', quantity: 8, joinedAt: new Date().toISOString() }
    ]
  },
  {
    id: 'sample-pest-control',
    productName: 'Professional Home Pest Control Service',
    description: 'Hiring vendor for pesticide spraying. Combined visit lowers service visit fee.',
    currentPrice: 1800,
    targetPrice: 1450,
    minParticipants: 8,
    deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Prestige Heights Block C',
    creatorName: 'Ramesh Krishnan',
    createdAt: new Date().toISOString(),
    status: 'active',
    participants: [
      { id: 'pc1', pactId: 'sample-pest-control', name: 'Ramesh Krishnan', quantity: 1, joinedAt: new Date().toISOString() },
      { id: 'pc2', pactId: 'sample-pest-control', name: 'Sunita Nair', quantity: 1, joinedAt: new Date().toISOString() },
      { id: 'pc3', pactId: 'sample-pest-control', name: 'George K.', quantity: 1, joinedAt: new Date().toISOString() },
      { id: 'pc4', pactId: 'sample-pest-control', name: 'Meera Deshmukh', quantity: 1, joinedAt: new Date().toISOString() }
    ]
  }
];

export default function Home() {
  const [pacts, setPacts] = useState<Pact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPacts() {
      try {
        let allPacts = await db.getAllPacts();
        
        // Seed if empty (usually first run in LocalStorage)
        if (allPacts.length === 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('pricepact_pacts', JSON.stringify(SAMPLE_PACTS));
            allPacts = SAMPLE_PACTS;
          }
        }
        
        setPacts(allPacts);
      } catch (err) {
        console.error('Failed to load pacts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPacts();
  }, []);

  // Filter pacts by search query
  const filteredPacts = pacts.filter(pact => {
    const query = searchQuery.toLowerCase();
    return (
      pact.productName.toLowerCase().includes(query) ||
      pact.location.toLowerCase().includes(query) ||
      pact.creatorName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen pb-16 relative">
      <div className="mesh-bg" />

      {/* Hero Header Section */}
      <header className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center border-b border-white/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-6 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> HackDevengers 1.0 Entry
        </span>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-brand-text">
          Negotiate as a <span className="gradient-text">Wholesaler</span>,<br />
          Buy as a <span className="gradient-text-success">Community</span>.
        </h1>
        
        <p className="mt-6 max-w-2xl mx-auto text-brand-muted text-base sm:text-lg leading-relaxed">
          PricePact turns fragmented individual demand into high-value group buying power. Organize your college, office, or apartment neighborhood and start saving today.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/pact/new"
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-extrabold rounded-lg shadow-lg cursor-pointer transition-all duration-150"
          >
            <Plus className="w-4 h-4 mr-2" /> Start a Buying Pact
          </Link>
          <a
            href="#active-pacts"
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3.5 bg-brand-surface-light border border-white/10 hover:border-brand-primary/50 text-brand-text text-sm font-bold rounded-lg cursor-pointer transition-all duration-150"
          >
            Explore Active Pacts
          </a>
        </div>
      </header>

      {/* Feature Value Cards Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden">
            <div className="w-10 h-10 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-center mb-4">
              <ShoppingBag className="w-5 h-5 text-brand-primary" />
            </div>
            <h3 className="text-lg font-bold text-brand-text">1. Setup a Pact</h3>
            <p className="mt-2 text-xs sm:text-sm text-brand-muted leading-relaxed">
              Define the item, retail cost, target price, minimum participants, and location. It takes less than 2 minutes.
            </p>
          </div>
          {/* Card 2 */}
          <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden">
            <div className="w-10 h-10 bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-brand-secondary" />
            </div>
            <h3 className="text-lg font-bold text-brand-text">2. Share & Join</h3>
            <p className="mt-2 text-xs sm:text-sm text-brand-muted leading-relaxed">
              Distribute your Pact URL to apartment WhatsApp groups, Slack channels, or dormitory group chats. Neighbors join instantly.
            </p>
          </div>
          {/* Card 3 */}
          <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden">
            <div className="w-10 h-10 bg-brand-success/10 border border-brand-success/20 rounded-xl flex items-center justify-center mb-4">
              <Flame className="w-5 h-5 text-brand-success" />
            </div>
            <h3 className="text-lg font-bold text-brand-text">3. AI Negotiator</h3>
            <p className="mt-2 text-xs sm:text-sm text-brand-muted leading-relaxed">
              Once threshold is met, the AI generates a customized, professional sales bid. Send it to vendors and split the savings.
            </p>
          </div>
        </div>
      </section>

      {/* Active Pacts Dashboard Section */}
      <section id="active-pacts" className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-brand-text tracking-tight">Active Community Pacts</h2>
            <p className="text-xs sm:text-sm text-brand-muted mt-1">Join active demands in your area to maximize local leverage.</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products or locations..."
              className="glass-input w-full rounded-lg pl-10 pr-4 py-2 text-xs focus:border-brand-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Pacts Grid */}
        {loading ? (
          <div className="text-center py-20">
            <svg className="animate-spin h-8 w-8 text-brand-primary mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs text-brand-muted font-bold">Querying local cluster database...</p>
          </div>
        ) : filteredPacts.length === 0 ? (
          <div className="glass-panel p-16 rounded-2xl text-center border-white/5 max-w-lg mx-auto shadow-lg">
            <HelpCircle className="w-12 h-12 text-brand-muted mx-auto mb-3" />
            <h3 className="text-lg font-bold text-brand-text">No active Pacts match your search</h3>
            <p className="text-xs text-brand-muted mt-2 mb-6">Create the first group-buying pact for this product or community!</p>
            <Link
              href="/pact/new"
              className="inline-flex justify-center items-center px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Start a Pact
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPacts.map((pact) => {
              const totalUnits = pact.participants.reduce((sum, p) => sum + p.quantity, 0);
              const progressPct = Math.min(Math.round((pact.participants.length / pact.minParticipants) * 100), 100);
              const savingsPerUnit = pact.currentPrice - pact.targetPrice;
              const totalPactSavings = savingsPerUnit * totalUnits;
              const encoded = encodePactToUrl(pact);
              const isMet = pact.participants.length >= pact.minParticipants;

              return (
                <Link 
                  key={pact.id} 
                  href={`/pact/${pact.id}?pactData=${encoded}`}
                  className="glass-panel glass-panel-hover rounded-xl p-5 border-white/5 flex flex-col justify-between h-72 shadow-md"
                >
                  <div>
                    {/* Location Badge */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 border border-white/5 text-brand-muted">
                        <MapPin className="w-3 h-3 mr-1 text-brand-primary" /> {pact.location}
                      </span>
                      
                      {isMet ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-success/15 border border-brand-success/20 text-brand-success">
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-accent/15 border border-brand-accent/20 text-brand-accent animate-pulse">
                          {progressPct}% Active
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold text-brand-text line-clamp-1 hover:text-brand-primary transition-colors">
                      {pact.productName}
                    </h3>
                    
                    {pact.description && (
                      <p className="text-brand-muted text-xs mt-1.5 line-clamp-2 leading-relaxed">
                        {pact.description}
                      </p>
                    )}
                  </div>

                  <div>
                    {/* Pricing grid */}
                    <div className="grid grid-cols-2 gap-3 py-2 border-y border-white/5 my-4 bg-brand-surface/20 px-2 rounded-lg text-center">
                      <div>
                        <span className="block text-[10px] text-brand-muted font-medium">Community Saving</span>
                        <span className="text-sm font-black text-brand-success">₹{totalPactSavings}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-brand-muted font-medium">Bargaining Ratio</span>
                        <span className="text-sm font-black text-brand-secondary">₹{pact.targetPrice} / ₹{pact.currentPrice}</span>
                      </div>
                    </div>

                    {/* Progress Bar and Users */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center text-brand-muted">
                        <Users className="w-3.5 h-3.5 mr-1 text-brand-secondary" />
                        <span className="font-bold text-brand-text">{pact.participants.length}</span>
                        <span className="mx-0.5">/</span>
                        <span>{pact.minParticipants} buyers</span>
                      </div>
                      
                      <span className="inline-flex items-center font-bold text-brand-primary group">
                        Enter Pact <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Layer Coordination Explanation */}
      <footer className="mt-20 border-t border-white/5 pt-10 text-center max-w-4xl mx-auto px-4 text-xs text-brand-muted space-y-4">
        <div className="flex justify-center gap-6">
          <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1 text-brand-success" /> No Inventory Required</span>
          <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1 text-brand-success" /> No Payment Middleman</span>
          <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1 text-brand-success" /> Zero Logistics Hassle</span>
        </div>
        <p className="max-w-2xl mx-auto leading-relaxed">
          PricePact is a lightweight coordination layer helping local communities aggregate demand and bargain with their own vendors. Transactions are completed directly between the community organizer and the merchant.
        </p>
        <p className="text-[10px] text-brand-muted/50">
          PricePact &copy; {new Date().getFullYear()}. HackDevengers Hackathon MVP. Developed by Pair Engineers.
        </p>
      </footer>
    </div>
  );
}
