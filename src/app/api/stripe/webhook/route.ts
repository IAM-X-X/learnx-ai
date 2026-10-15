import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/stripe/webhook — handle Stripe subscription webhooks.
// Set the webhook endpoint URL in your Stripe Dashboard → Webhooks.
//
// Events to handle:
// - checkout.session.completed → mark user as premium
// - customer.subscription.deleted → remove premium
// - customer.subscription.updated → sync premium status
//
// --- UNCOMMENT WHEN STRIPE IS CONFIGURED ---
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    // --- UNCOMMENT WHEN STRIPE IS CONFIGURED ---
    // const event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    //
    // switch (event.type) {
    //   case 'checkout.session.completed':
    //     // Mark user as premium (store in DB when you have user accounts)
    //     console.log('[Stripe] Payment success:', event.data.object);
    //     break;
    //   case 'customer.subscription.deleted':
    //     // Remove premium
    //     console.log('[Stripe] Subscription cancelled');
    //     break;
    // }

    return NextResponse.json({ received: true, note: 'Stripe webhooks not configured yet' });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
