import { createClient } from '@supabase/supabase-js';

// Types
export interface Participant {
  id: string;
  pactId: string;
  name: string;
  quantity: number;
  joinedAt: string;
}

export interface Pact {
  id: string;
  productName: string;
  description: string;
  currentPrice: number;
  targetPrice: number;
  minParticipants: number;
  targetQuantity?: number;
  deadline: string;
  location: string;
  creatorName: string;
  createdAt: string;
  status: 'active' | 'negotiating' | 'completed' | 'expired';
  distance?: number;
  participants: Participant[];
}

// Deterministic distance generator based on pact ID (returns a stable distance between 0.1 and 3.0 km)
export function getDeterministicDistance(id: string): number {
  if (id.startsWith('sample-water-cans')) return 0.1;
  if (id.startsWith('sample-printing-paper')) return 0.5;
  if (id.startsWith('sample-pest-control')) return 1.2;
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rawDist = Math.abs(hash % 29) / 10 + 0.1;
  return parseFloat(rawDist.toFixed(1));
}

// Initialize Supabase if keys exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Helper: Compress/Decompress Pact State for URL Sharing in Mock Mode
export function encodePactToUrl(pact: Pact): string {
  try {
    const data = {
      id: pact.id,
      p: pact.productName,
      d: pact.description,
      cp: pact.currentPrice,
      tp: pact.targetPrice,
      mp: pact.minParticipants,
      tq: pact.targetQuantity,
      dl: pact.deadline,
      l: pact.location,
      c: pact.creatorName,
      ca: pact.createdAt,
      s: pact.status,
      dist: pact.distance,
      pt: pact.participants.map(part => ({
        id: part.id,
        n: part.name,
        q: part.quantity,
        j: part.joinedAt
      }))
    };
    return btoa(encodeURIComponent(JSON.stringify(data)));
  } catch (e) {
    console.error('Failed to encode pact data', e);
    return '';
  }
}

export function decodePactFromUrl(encoded: string): Pact | null {
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
    return {
      id: decoded.id,
      productName: decoded.p,
      description: decoded.d,
      currentPrice: decoded.cp,
      targetPrice: decoded.tp,
      minParticipants: decoded.mp,
      targetQuantity: decoded.tq,
      deadline: decoded.dl,
      location: decoded.l,
      creatorName: decoded.c,
      createdAt: decoded.ca,
      status: decoded.s,
      distance: decoded.dist,
      participants: decoded.pt.map((p: any) => ({
        id: p.id,
        pactId: decoded.id,
        name: p.n,
        quantity: p.q,
        joinedAt: p.j
      }))
    };
  } catch (e) {
    console.error('Failed to decode pact data', e);
    return null;
  }
}

// LocalStorage helpers
const LOCAL_STORAGE_KEY = 'pricepact_pacts';

function getLocalPacts(): Pact[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

function saveLocalPacts(pacts: Pact[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pacts));
}

// Database API
export const db = {
  async createPact(pactData: Omit<Pact, 'id' | 'createdAt' | 'status' | 'participants'> & { distance?: number }): Promise<Pact> {
    const pactId = typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
    const newPact: Pact = {
      ...pactData,
      id: pactId,
      createdAt: new Date().toISOString(),
      status: 'active',
      distance: pactData.distance ?? getDeterministicDistance(pactId),
      participants: [
        {
          id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
          pactId: '', // populated below
          name: pactData.creatorName,
          quantity: 1, // Creator starts with at least 1 unit by default (or custom)
          joinedAt: new Date().toISOString()
        }
      ]
    };
    newPact.participants[0].pactId = newPact.id;

    if (typeof window !== 'undefined') {
      localStorage.setItem(`pricepact_creator_${newPact.id}`, 'true');
    }

    if (supabase) {
      // Supabase write
      const { data: pact, error: pactError } = await supabase
        .from('pacts')
        .insert({
          id: newPact.id,
          product_name: newPact.productName,
          description: newPact.description,
          current_price: newPact.currentPrice,
          target_price: newPact.targetPrice,
          min_participants: newPact.minParticipants,
          target_quantity: newPact.targetQuantity,
          deadline: newPact.deadline,
          location: newPact.location,
          creator_name: newPact.creatorName,
          status: newPact.status
        })
        .select()
        .single();

      if (pactError) throw pactError;

      const { data: participant, error: partError } = await supabase
        .from('participants')
        .insert({
          id: newPact.participants[0].id,
          pact_id: newPact.id,
          name: newPact.creatorName,
          quantity: 1
        })
        .select()
        .single();

      if (partError) throw partError;

      return {
        id: pact.id,
        productName: pact.product_name,
        description: pact.description,
        currentPrice: pact.current_price,
        targetPrice: pact.target_price,
        minParticipants: pact.min_participants,
        targetQuantity: pact.target_quantity,
        deadline: pact.deadline,
        location: pact.location,
        creatorName: pact.creator_name,
        createdAt: pact.created_at,
        status: pact.status,
        distance: newPact.distance,
        participants: [{
          id: participant.id,
          pactId: participant.pact_id,
          name: participant.name,
          quantity: participant.quantity,
          joinedAt: participant.created_at
        }]
      };
    } else {
      // Fallback: LocalStorage
      const pacts = getLocalPacts();
      pacts.push(newPact);
      saveLocalPacts(pacts);
      return newPact;
    }
  },

  async getPact(id: string): Promise<Pact | null> {
    if (supabase) {
      const { data: pact, error: pactError } = await supabase
        .from('pacts')
        .select('*, participants(*)')
        .eq('id', id)
        .single();

      if (pactError || !pact) return null;

      return {
        id: pact.id,
        productName: pact.product_name,
        description: pact.description,
        currentPrice: pact.current_price,
        targetPrice: pact.target_price,
        minParticipants: pact.min_participants,
        targetQuantity: pact.target_quantity,
        deadline: pact.deadline,
        location: pact.location,
        creatorName: pact.creator_name,
        createdAt: pact.created_at,
        status: pact.status,
        distance: getDeterministicDistance(pact.id),
        participants: pact.participants.map((p: any) => ({
          id: p.id,
          pactId: p.pact_id,
          name: p.name,
          quantity: p.quantity,
          joinedAt: p.created_at
        }))
      };
    } else {
      // Fallback: LocalStorage
      const pacts = getLocalPacts();
      const pact = pacts.find(p => p.id === id);
      return pact || null;
    }
  },

  async joinPact(pactId: string, name: string, quantity: number): Promise<Participant> {
    const newParticipant: Participant = {
      id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      pactId,
      name,
      quantity,
      joinedAt: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('participants')
        .insert({
          id: newParticipant.id,
          pact_id: pactId,
          name,
          quantity
        })
        .select()
        .single();

      if (error) throw error;

      // Update status if participants count now reaches threshold
      const { data: pact, error: pactFetchErr } = await supabase
        .from('pacts')
        .select('*, participants(*)')
        .eq('id', pactId)
        .single();

      if (!pactFetchErr && pact) {
        const uniqueParticipants = pact.participants.length;
        if (uniqueParticipants >= pact.min_participants && pact.status === 'active') {
          await supabase.from('pacts').update({ status: 'negotiating' }).eq('id', pactId);
        }
      }

      return {
        id: data.id,
        pactId: data.pact_id,
        name: data.name,
        quantity: data.quantity,
        joinedAt: data.created_at
      };
    } else {
      // Fallback: LocalStorage
      const pacts = getLocalPacts();
      const pactIndex = pacts.findIndex(p => p.id === pactId);
      if (pactIndex === -1) throw new Error('Pact not found');

      const pact = pacts[pactIndex];
      
      // Prevent duplicate names in mock mode (just clean experience)
      const existing = pact.participants.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.quantity += quantity;
        newParticipant.id = existing.id;
        newParticipant.joinedAt = existing.joinedAt;
      } else {
        pact.participants.push(newParticipant);
      }

      // Check threshold activation
      if (pact.participants.length >= pact.minParticipants && pact.status === 'active') {
        pact.status = 'negotiating';
      }

      saveLocalPacts(pacts);
      return newParticipant;
    }
  },

  async getAllPacts(): Promise<Pact[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('pacts')
        .select('*, participants(*)');

      if (error) return [];

      return data.map((pact: any) => ({
        id: pact.id,
        productName: pact.product_name,
        description: pact.description,
        currentPrice: pact.current_price,
        targetPrice: pact.target_price,
        minParticipants: pact.min_participants,
        targetQuantity: pact.target_quantity,
        deadline: pact.deadline,
        location: pact.location,
        creatorName: pact.creator_name,
        createdAt: pact.created_at,
        status: pact.status,
        distance: getDeterministicDistance(pact.id),
        participants: pact.participants.map((p: any) => ({
          id: p.id,
          pactId: p.pact_id,
          name: p.name,
          quantity: p.quantity,
          joinedAt: p.created_at
        }))
      }));
    } else {
      return getLocalPacts();
    }
  },

  async updatePactStatus(pactId: string, status: Pact['status']): Promise<Pact> {
    if (supabase) {
      const { data, error } = await supabase
        .from('pacts')
        .update({ status })
        .eq('id', pactId)
        .select()
        .single();
      if (error) throw error;
      
      const updated = await this.getPact(pactId);
      if (!updated) throw new Error('Pact not found');
      return updated;
    } else {
      const pacts = getLocalPacts();
      const idx = pacts.findIndex(p => p.id === pactId);
      if (idx === -1) throw new Error('Pact not found');
      pacts[idx].status = status;
      saveLocalPacts(pacts);
      return pacts[idx];
    }
  },

  // Import external pact into local storage (for link-sharing fallback)
  importPact(pact: Pact) {
    if (supabase) return;
    const pacts = getLocalPacts();
    const index = pacts.findIndex(p => p.id === pact.id);
    if (index === -1) {
      pacts.push(pact);
    } else {
      // Merge: take whichever has more participants or is newer
      if (pact.participants.length >= pacts[index].participants.length) {
        pacts[index] = pact;
      }
    }
    saveLocalPacts(pacts);
  }
};
