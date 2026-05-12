import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import SmallNavBar from '../components/SmallNavBar';
import SideMenu from '../components/SideMenu';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const orderId = searchParams.get('order_id');
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                if (!orderId) {
                    setLoading(false);
                    return;
                }

                if (sessionId) {
                    await fetch('/api/payment/confirm-success', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ sessionId, orderId }),
                    });
                }

                // Fetch order details from backend
                const response = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    setOrderData(data);
                }
            } catch (error) {
                console.error('Error fetching order details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId, sessionId]);

    return (
        <>
            <SmallNavBar />
            <SideMenu />
            <main className="min-h-screen bg-orange-50 text-gray-900 px-4 py-8">
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-2xl border border-green-200 bg-white p-8 shadow-lg text-center animate-fade-in-up">
                        {/* Success Icon */}
                        <div className="mb-6 flex justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-green-600 mb-2">Payment Successful!</h1>
                        <p className="text-gray-600 mb-6">Thank you for your order. Your payment has been processed successfully.</p>

                        {orderId && (
                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                                <p className="text-lg font-mono font-semibold text-gray-800">{orderId}</p>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-4">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent"></div>
                            </div>
                        ) : orderData ? (
                            <div className="mb-6 text-left">
                                <h2 className="font-semibold text-gray-800 mb-3">Order Details</h2>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <span className="font-semibold text-green-600 capitalize">{orderData.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Amount:</span>
                                        <span className="font-semibold text-gray-800">${(orderData.total_amount / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Order Date:</span>
                                        <span className="font-semibold text-gray-800">
                                            {new Date(orderData.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-3 mt-8">
                            <Link
                                to="/home"
                                className="inline-block w-full rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-orange-600 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                            >
                                Continue Shopping
                            </Link>
                            <Link
                                to="/account"
                                className="inline-block w-full rounded-xl border-2 border-orange-500 px-6 py-3 font-semibold text-orange-500 transition-all duration-300 hover:bg-orange-50 hover:scale-105 active:scale-95"
                            >
                                View Account & Orders
                            </Link>
                        </div>

                        <p className="mt-6 text-xs text-gray-500">
                            A confirmation email has been sent to your registered email address.
                        </p>
                    </div>
                </div>
            </main>
        </>
    );
};

export default PaymentSuccess;
