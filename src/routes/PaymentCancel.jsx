import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import SmallNavBar from '../components/SmallNavBar';
import SideMenu from '../components/SideMenu';

const PaymentCancel = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');

    useEffect(() => {
        // Optionally mark order as cancelled in backend
        if (orderId) {
            const cancelOrder = async () => {
                try {
                    await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
                } catch (error) {
                    console.error('Error cancelling order:', error);
                }
            };
            cancelOrder();
        }
    }, [orderId]);

    return (
        <>
            <SmallNavBar />
            <SideMenu />
            <main className="min-h-screen bg-orange-50 text-gray-900 px-4 py-8">
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-lg text-center animate-fade-in-up">
                        {/* Cancel Icon */}
                        <div className="mb-6 flex justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                <svg className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-red-600 mb-2">Payment Cancelled</h1>
                        <p className="text-gray-600 mb-6">Your payment has been cancelled. Your order was not completed.</p>

                        {orderId && (
                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <p className="text-sm text-gray-500 mb-1">Order ID (Cancelled)</p>
                                <p className="text-lg font-mono font-semibold text-gray-800">{orderId}</p>
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-blue-800">
                                <strong>Note:</strong> Your cart items are still saved. You can complete your purchase at any time.
                            </p>
                        </div>

                        <div className="space-y-3 mt-8">
                            <Link
                                to="/cart"
                                className="inline-block w-full rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-orange-600 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                            >
                                Return to Cart
                            </Link>
                            <Link
                                to="/home"
                                className="inline-block w-full rounded-xl border-2 border-orange-500 px-6 py-3 font-semibold text-orange-500 transition-all duration-300 hover:bg-orange-50 hover:scale-105 active:scale-95"
                            >
                                Continue Shopping
                            </Link>
                        </div>

                        <p className="mt-6 text-xs text-gray-500">
                            If you have any questions, please contact our support team.
                        </p>
                    </div>
                </div>
            </main>
        </>
    );
};

export default PaymentCancel;

