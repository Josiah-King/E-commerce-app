import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function POST(request) {
  try {
    const body = await request.json();

    const callback = body.Body.stkCallback;
    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    // Find the order this callback belongs to
    const order = await prisma.order.findUnique({
      where: { checkoutRequestId },
    });

    if (!order) {
      console.error('No order found for CheckoutRequestID:', checkoutRequestId);
      // Still respond 200 so Safaricom doesn't keep retrying
      return NextResponse.json({ result: 'ok' });
    }

    if (resultCode === 0) {
      // Payment succeeded — extract details from CallbackMetadata
      const metadata = callback.CallbackMetadata.Item;

      const amount = metadata.find((i) => i.Name === 'Amount')?.Value;
      const mpesaCode = metadata.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;
      const phone = metadata.find((i) => i.Name === 'PhoneNumber')?.Value;

      // Create the Payment record
      await prisma.payment.create({
        data: {
          orderId: order.id,
          mpesaCode: mpesaCode,
          amount: amount,
          phone: String(phone),
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID', // adjust to match your actual OrderStatus enum value
          mpesaRef: mpesaCode,
        },
      });
    } else {
      // Payment failed or was cancelled by the user
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' }, // adjust to match your actual OrderStatus enum value
      });
    }

    // Always respond 200 so Safaricom knows we received it
    return NextResponse.json({ result: 'ok' });
  } catch (error) {
    console.error('Callback error:', error);
    // Still return 200 — Safaricom will keep retrying otherwise
    return NextResponse.json({ result: 'ok' });
  }
}
