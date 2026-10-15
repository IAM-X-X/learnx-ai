import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/stripe/checkout — create a Stripe Checkout session for $5.99/month.
// Requires STRIPE_SECRET_KEY in .env and a configured price ID.
//
// To enable:
// 1. npm install stripe
// 2. Add to .env:
//    STRIPE_SECRET_KEY=sk_live_xxx
//    NEXT_PUBLIC_STRIPE_PRICE_ID=price_xxx
//    NEXT_PUBLIC_APP_URL=https://your-domain.com
// 3. Create the product + price in your Stripe Dashboard ($5.99/month recurring)
// 4. Uncomment the code below

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    // --- UNCOMMENT WHEN STRIPE IS CONFIGURED ---
    // const Stripe = (await import('stripe')).default;
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   payment_method_types: ['card'],
    //   line_items: [{ price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!, quantity: 1 }],
    //   success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?premium=success`,
    //   cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?premium=cancelled`,
    //   client_reference_id: 'learnx-user', // add a user ID when you have auth
    // });
    // return NextResponse.json({ url: session.url });

    // --- PLACEHOLDER (returns instructions) ---
    return NextResponse.json({
      error: 'Stripe not configured yet.',
      instructions: 'Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PRICE_ID to .env, then uncomment the Stripe code in this route.',
      plan: plan || 'monthly',
      price: '$5.99/month',
    }, { status: 503 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
