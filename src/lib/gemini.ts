export interface NegotiationPromptParams {
  productName: string;
  currentPrice: number;
  targetPrice: number;
  minParticipants: number;
  totalQuantity: number;
  actualParticipants: number;
  location: string;
  creatorName: string;
  persona: 'professional' | 'warm' | 'aggressive';
}

// Local generative fallback templates (highly tailored and high quality)
const LOCAL_TEMPLATES = {
  professional: (p: NegotiationPromptParams) => {
    const savings = (p.currentPrice - p.targetPrice) * p.totalQuantity;
    return `Subject: Bulk purchase inquiry for ${p.productName} - ${p.location} Group

Dear Vendor Partners,

I am writing to you on behalf of a buying group organized at ${p.location}. We have coordinates for a collective order of ${p.productName} and are looking to finalize a vendor.

Currently, we have ${p.actualParticipants} buyers committed to purchasing a total of ${p.totalQuantity} units immediately. 

Normally, these would be separate individual transactions at the retail rate of ₹${p.currentPrice} per unit. However, as we have consolidated this demand into a single bulk delivery and transaction, we are requesting a volume discount price of ₹${p.targetPrice} per unit.

We are ready to place this order immediately upon price agreement. Please let us know if you can accommodate this rate, or provide your best volume pricing for ${p.totalQuantity} units.

Best regards,
${p.creatorName}
Organizer, PricePact Community`;
  },

  warm: (p: NegotiationPromptParams) => {
    return `Hello! 

I'm reaching out from the ${p.location} community. A group of us (around ${p.actualParticipants} families/students) are looking to buy ${p.productName} together to save on delivery and coordinate locally.

In total, we are ready to purchase ${p.totalQuantity} units. Since we are ordering all at once and will have them delivered/picked up together, we were wondering if you could offer us a friendly community discount? 

We usually buy them individually for ₹${p.currentPrice} each, but we'd love to see if we can buy them from you for ₹${p.targetPrice} each in this bulk order. It would be a big help to our neighborhood, and we'd love to make this a regular monthly purchase with you if it works out!

Let me know if this works for you or what bulk price you might be able to offer.

Warmly,
${p.creatorName}
${p.location} Buying Club`;
  },

  aggressive: (p: NegotiationPromptParams) => {
    return `Bulk Purchase Proposal: ${p.totalQuantity}x ${p.productName}

To Whom It May Concern,

I have aggregated a buyer pact of ${p.actualParticipants} active customers at ${p.location} ready to order ${p.totalQuantity} units of ${p.productName} immediately.

We have established a firm target purchase price of ₹${p.targetPrice} per unit (down from the standard retail rate of ₹${p.currentPrice}). 

This is a guaranteed, high-volume order ready to be executed. We are currently offering this opportunity to a select few local vendors. The first vendor who can match our target rate of ₹${p.targetPrice}/unit or offer the closest competitive terms will secure the entire collective order.

Please confirm if you can fulfill this order at our target price. We look forward to establishing a prompt transaction.

Sincerely,
${p.creatorName}
Lead Negotiator, PricePact`;
  }
};

export async function generateNegotiationMessage(params: NegotiationPromptParams): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  if (!apiKey) {
    // Return high quality local generation if API key is not configured
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(LOCAL_TEMPLATES[params.persona](params));
      }, 500); // Small delay to simulate API response network latency
    });
  }

  // Call official Gemini API via REST fetch
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const systemInstruction = `You are a professional negotiation assistant for "PricePact", a group buying platform.
Your goal is to write a highly persuasive, concise email/WhatsApp negotiation message to a local vendor.
The community has consolidated their individual scattered demands into a single bulk order.
Do not include placeholders like [Your Name] or [Price]; use the exact values provided in the prompt.`;

  const prompt = `Write a negotiation message based on these parameters:
- Product name: "${params.productName}"
- Current standard retail price: "₹${params.currentPrice}"
- Target price requested: "₹${params.targetPrice}"
- Number of active buyers: "${params.actualParticipants}"
- Consolidated volume: "${params.totalQuantity} units"
- Group location/community: "${params.location}"
- Creator/Negotiator name: "${params.creatorName}"
- Desired Tone: "${params.persona === 'professional' ? 'Corporate, official bulk business inquiry' : params.persona === 'warm' ? 'Friendly local community buying club appeal' : 'Direct, competitive, high-volume tender bid'}"

Format it as a ready-to-send message. Do not include markdown meta-text (like "Here is your message:"). Just output the draft message itself.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      return text.trim();
    } else {
      throw new Error("No content generated");
    }
  } catch (error) {
    console.error("Gemini API call failed, using local fallback:", error);
    return LOCAL_TEMPLATES[params.persona](params);
  }
}
