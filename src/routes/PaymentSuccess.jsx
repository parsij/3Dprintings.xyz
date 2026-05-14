import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import SmallNavBar from '../components/SmallNavBar';
import SideMenu from '../components/SideMenu';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [orderData, setOrderData] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentVerified, setPaymentVerified] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const orderId = searchParams.get('order_id');

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                if (!orderId) {
                    setError('Missing order id.');
                    setLoading(false);
                    return;
                }

                const response = await fetch(`/api/payment/order-status/${encodeURIComponent(orderId)}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                });

                if (response.status === 401) {
                    navigate('/signin', { replace: true });
                    return;
                }

                let payload = null;
                try {
                    payload = await response.json();
                } catch {
                    payload = null;
                }

                if (!response.ok) {
                    throw new Error(payload?.error || payload?.message || 'Could not load order status.');
                }

                setOrderData(payload?.order || null);
                setPaymentStatus(payload?.paymentStatus || '');
                setPaymentVerified(Boolean(payload?.paymentVerified));

                const shouldClearCart =
                    Boolean(payload?.paymentVerified) || payload?.order?.status === 'completed';
                if (shouldClearCart) {
                    const clearCartResponse = await fetch('/api/cart/clear', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                    });

                    if (clearCartResponse.status === 401) {
                        navigate('/signin', { replace: true });
                        return;
                    }

                    if (!clearCartResponse.ok) {
                        console.warn('Could not clear cart after successful payment.');
                    }
                }
            } catch (error) {
                console.error('Error fetching order details:', error);
                setError(error.message || 'Could not load order status.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [navigate, orderId]);

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

                        <h1 className={`text-3xl font-bold mb-2 ${paymentVerified ? 'text-green-600' : 'text-orange-600'}`}>
                            {paymentVerified ? 'Payment Successful!' : 'Payment Processing'}
                        </h1>
                        <p className="text-gray-600 mb-6">
                            {paymentVerified
                                ? 'Thank you for your order. Your payment has been Received with Stripe.'
                                : 'We are still confirming your payment with Stripe.'}
                        </p>
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
                                        <span className="font-semibold text-gray-800 capitalize">{orderData.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Amount:</span>
                                        <span className="font-semibold text-gray-800">${Number(orderData.total_amount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Order Date:</span>
                                        <span className="font-semibold text-gray-800">
                                            {new Date(orderData.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Stripe Payment:</span>
                                        <span className="font-semibold text-gray-800 capitalize">{paymentStatus || 'unknown'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : !loading && error ? (
                            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
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
