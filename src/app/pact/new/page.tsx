'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ShoppingBag, Landmark, Users, Calendar, User, Tag } from 'lucide-react';
import { db, encodePactToUrl } from '@/lib/db';

const TEMPLATES = [
  {
    name: 'Water Cans',
    icon: '🪣',
    productName: '20L Pure Mineral Water Can',
    description: 'Bisleri/Kinley mineral water cans. Delivered directly to hostel block reception.',
    currentPrice: '110',
    targetPrice: '90',
    minParticipants: '15',
    targetQuantity: '50',
    location: 'Gokul Hostel (Block A)',
  },
  {
    name: 'Organic Eggs',
    icon: '🥚',
    productName: 'Fresh Organic Eggs (Pack of 30)',
    description: 'Farm-fresh organic brown eggs. Single drop delivery for apartment complex.',
    currentPrice: '220',
    targetPrice: '180',
    minParticipants: '10',
    targetQuantity: '30',
    location: 'Prestige Heights Block B',
  },
  {
    name: 'Pest Control',
    icon: '🐜',
    productName: 'Professional Home Pest Control Service',
    description: 'General insecticide and termite spraying. Combined visits waive transport fee.',
    currentPrice: '1800',
    targetPrice: '1450',
    minParticipants: '8',
    targetQuantity: '',
    location: 'Prestige Heights Block C',
  },
  {
    name: 'Copier Paper',
    icon: '📄',
    productName: 'Premium A4 Copier Paper (75GSM)',
    description: 'Reams of high-grade A4 printing paper bundles for project assignments.',
    currentPrice: '320',
    targetPrice: '250',
    minParticipants: '10',
    targetQuantity: '45',
    location: 'CBIT College Campus',
  },
  {
    name: 'Laundry',
    icon: '👕',
    productName: 'Bulk Wash & Iron Laundry Service (Per kg)',
    description: 'Coordinated laundry pickup and drop-off to unlock commercial rates.',
    currentPrice: '80',
    targetPrice: '60',
    minParticipants: '12',
    targetQuantity: '60',
    location: 'Student Hostels Block D',
  }
];

export default function NewPact() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    currentPrice: '',
    targetPrice: '',
    minParticipants: '5',
    targetQuantity: '',
    deadline: '',
    location: '',
    creatorName: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.productName || !formData.currentPrice || !formData.targetPrice || !formData.minParticipants || !formData.location || !formData.creatorName || !formData.deadline) {
      setError('Please fill in all required fields.');
      return;
    }

    const current = parseFloat(formData.currentPrice);
    const target = parseFloat(formData.targetPrice);

    if (isNaN(current) || current <= 0) {
      setError('Current price must be a valid positive number.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setError('Target price must be a valid positive number.');
      return;
    }
    if (target >= current) {
      setError('Target price must be lower than the current retail price.');
      return;
    }

    const minParts = parseInt(formData.minParticipants);
    if (isNaN(minParts) || minParts < 2) {
      setError('Minimum participants must be at least 2.');
      return;
    }

    setLoading(true);
    try {
      const createdPact = await db.createPact({
        productName: formData.productName,
        description: formData.description,
        currentPrice: current,
        targetPrice: target,
        minParticipants: minParts,
        targetQuantity: formData.targetQuantity ? parseFloat(formData.targetQuantity) : undefined,
        deadline: new Date(formData.deadline).toISOString(),
        location: formData.location,
        creatorName: formData.creatorName
      });

      // Redirect using fallback query parameters for serverless/local sharing
      const encoded = encodePactToUrl(createdPact);
      router.push(`/pact/${createdPact.id}?pactData=${encoded}`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to create Pact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Live Math calculation for styling
  const currentVal = parseFloat(formData.currentPrice);
  const targetVal = parseFloat(formData.targetPrice);
  const pctSavings = currentVal && targetVal && currentVal > targetVal 
    ? Math.round(((currentVal - targetVal) / currentVal) * 100) 
    : 0;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 relative">
      <div className="mesh-bg" />
      
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center text-sm text-brand-muted hover:text-brand-text mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Dashboard
        </Link>

        {/* Title */}
        <div className="mb-8">
          <span className="px-3 py-1 text-xs font-semibold tracking-wider text-brand-secondary uppercase bg-brand-secondary/10 rounded-full border border-brand-secondary/20">
            Create a Pact
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-brand-text">
            Start a <span className="gradient-text">Buying Pact</span>
          </h1>
          <p className="mt-2 text-brand-muted text-sm sm:text-base">
            Gather your neighborhood, office, or college group to unlock massive local discount pricing.
          </p>
        </div>

        {/* Quick-Start Templates */}
        <div className="mb-8 glass-panel p-5 rounded-2xl border-white/5 relative overflow-hidden">
          <h3 className="text-xs font-extrabold text-brand-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Quick-Start Templates
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => {
                  setFormData({
                    productName: tmpl.productName,
                    description: tmpl.description,
                    currentPrice: tmpl.currentPrice,
                    targetPrice: tmpl.targetPrice,
                    minParticipants: tmpl.minParticipants,
                    targetQuantity: tmpl.targetQuantity,
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    location: tmpl.location,
                    creatorName: formData.creatorName
                  });
                }}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-brand-surface/40 hover:bg-brand-surface-light border border-white/5 hover:border-brand-primary/50 text-center transition-all cursor-pointer group active:scale-95"
              >
                <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">{tmpl.icon}</span>
                <span className="text-[11px] font-bold text-brand-text group-hover:text-brand-primary transition-colors">{tmpl.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Panel */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 animate-fade-in shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-brand-danger text-sm">
                {error}
              </div>
            )}

            {/* Product Name */}
            <div>
              <label htmlFor="productName" className="block text-sm font-semibold text-brand-text mb-2 flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2 text-brand-primary" />
                Product or Service Name *
              </label>
              <input
                type="text"
                id="productName"
                name="productName"
                required
                className="glass-input w-full rounded-lg px-4 py-3 text-sm focus:border-brand-primary"
                placeholder="e.g. 20L Water Can, A4 Printing Paper, Pest Control Service"
                value={formData.productName}
                onChange={handleChange}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-brand-text mb-2 flex items-center">
                <Tag className="w-4 h-4 mr-2 text-brand-primary" />
                Details or Specification (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                className="glass-input w-full rounded-lg px-4 py-3 text-sm focus:border-brand-primary resize-none"
                placeholder="Specify preferred brand, delivery arrangements, or details."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Grid for prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Current Price */}
              <div>
                <label htmlFor="currentPrice" className="block text-sm font-semibold text-brand-text mb-2">
                  Current Retail Price (₹/unit) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted text-sm font-semibold">₹</span>
                  <input
                    type="number"
                    id="currentPrice"
                    name="currentPrice"
                    required
                    min="1"
                    step="0.01"
                    className="glass-input w-full rounded-lg pl-8 pr-4 py-3 text-sm focus:border-brand-primary"
                    placeholder="110"
                    value={formData.currentPrice}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-1 text-xs text-brand-muted">Standard price you pay individually.</p>
              </div>

              {/* Target Price */}
              <div>
                <label htmlFor="targetPrice" className="block text-sm font-semibold text-brand-text mb-2 flex items-center justify-between">
                  <span>Target Discount Price (₹/unit) *</span>
                  {pctSavings > 0 && (
                    <span className="text-xs text-brand-success font-semibold px-2 py-0.5 bg-brand-success/15 border border-brand-success/20 rounded-md">
                      -{pctSavings}% Savings
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted text-sm font-semibold">₹</span>
                  <input
                    type="number"
                    id="targetPrice"
                    name="targetPrice"
                    required
                    min="0.1"
                    step="0.01"
                    className="glass-input w-full rounded-lg pl-8 pr-4 py-3 text-sm focus:border-brand-primary"
                    placeholder="95"
                    value={formData.targetPrice}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-1 text-xs text-brand-muted">Target rate to propose to the vendor.</p>
              </div>
            </div>

            {/* Grid for Thresholds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Min Participants */}
              <div>
                <label htmlFor="minParticipants" className="block text-sm font-semibold text-brand-text mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-brand-primary" />
                  Min. Buyers Required *
                </label>
                <input
                  type="number"
                  id="minParticipants"
                  name="minParticipants"
                  required
                  min="2"
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm focus:border-brand-primary"
                  placeholder="5"
                  value={formData.minParticipants}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-brand-muted">Minimum number of people to activate negotiation.</p>
              </div>

              {/* Target/Est. Quantity (Optional) */}
              <div>
                <label htmlFor="targetQuantity" className="block text-sm font-semibold text-brand-text mb-2">
                  Minimum Total Volume (Units) (Optional)
                </label>
                <input
                  type="number"
                  id="targetQuantity"
                  name="targetQuantity"
                  min="1"
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm focus:border-brand-primary"
                  placeholder="e.g. 50"
                  value={formData.targetQuantity}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-brand-muted">Minimum volume target across all buyers.</p>
              </div>
            </div>

            {/* Grid for Location & Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Community Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-brand-text mb-2 flex items-center">
                  <Landmark className="w-4 h-4 mr-2 text-brand-primary" />
                  Community / Location *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  required
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm focus:border-brand-primary"
                  placeholder="e.g. Gokul Hostel, Prestige Apt Block A"
                  value={formData.location}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-brand-muted">Define the local boundary for group delivery.</p>
              </div>

              {/* Deadline */}
              <div>
                <label htmlFor="deadline" className="block text-sm font-semibold text-brand-text mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-brand-primary" />
                  Pact Expiry Date *
                </label>
                <input
                  type="date"
                  id="deadline"
                  name="deadline"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm focus:border-brand-primary"
                  value={formData.deadline}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-brand-muted">Date when the Pact expires or concludes.</p>
              </div>
            </div>

            {/* Creator name */}
            <div>
              <label htmlFor="creatorName" className="block text-sm font-semibold text-brand-text mb-2 flex items-center">
                <User className="w-4 h-4 mr-2 text-brand-primary" />
                Your Name (Organizer) *
              </label>
              <input
                type="text"
                id="creatorName"
                name="creatorName"
                required
                className="glass-input w-full rounded-lg px-4 py-3 text-sm focus:border-brand-primary"
                placeholder="e.g. Abhinand"
                value={formData.creatorName}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-brand-muted">Your name will be visible as the pact organizer.</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-8 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Initializing Pact...
                </span>
              ) : (
                <span className="flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Launch Pact & Share
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
