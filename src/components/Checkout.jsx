import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Checkout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const passedItems = location.state?.items;
    const cartItems = useMemo(() => (Array.isArray(passedItems) ? passedItems : []), [passedItems]);
    const passedAddress = location.state?.address || null;

    const [totals, setTotals] = useState({ subtotal: 0, tax: 0, shipping: 0, total: 0 });
    const [loading, setLoading] = useState(false);
    const [calculatingTax, setCalculatingTax] = useState(false);
    const [error, setError] = useState(null);
    const [loadingAddress, setLoadingAddress] = useState(true);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [useManualAddress, setUseManualAddress] = useState(false);
    const [saveAddressForFuture, setSaveAddressForFuture] = useState(false);
    const [addressLine, setAddressLine] = useState("");
    const [isSuggestingAddress, setIsSuggestingAddress] = useState(false);

    const [shippingAddress, setShippingAddress] = useState(passedAddress || {
        line1: '',
        line2: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
    });

    // Load user's saved address on mount
    useEffect(() => {
        const loadUserAddress = async () => {
            try {
                const response = await axios.get('https://3dprintings.xyz/api/account/address', {
                    withCredentials: true,
                });
                const addr = response.data?.address;
                if (addr?.street_address) {
                    setShippingAddress({
                        line1: addr.street_address || '',
                        line2: '',
                        city: addr.city || '',
                        state: addr.state_province || '',
                        zip: addr.postal_code || '',
                        country: addr.country_code || 'US',
                    });
                    setAddressLine([addr.street_address, addr.city, addr.state_province, addr.postal_code].filter(Boolean).join(', '));
                }
            } catch {
                console.log('No saved address found');
            } finally {
                setLoadingAddress(false);
            }
        };

        loadUserAddress();
    }, []);

    // Address autocomplete debounce
    useEffect(() => {
        if (!addressLine.trim() || addressLine.length < 3 || useManualAddress) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setIsSuggestingAddress(true);
                const response = await axios.get('https://3dprintings.xyz/api/address/autocomplete', {
                    params: { q: addressLine, limit: 6 },
                    withCredentials: true,
                });
                setAddressSuggestions(Array.isArray(response.data?.suggestions) ? response.data.suggestions : []);
                setShowSuggestions(true);
            } catch {
                setAddressSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsSuggestingAddress(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [addressLine, useManualAddress]);

    // Calculate totals with tax when items or address changes
    useEffect(() => {
        const calculateTotals = async () => {
            if (!cartItems.length) {
                setError('No items in cart');
                return;
            }

            if (!shippingAddress.zip || !shippingAddress.state || !shippingAddress.country) {
                setError('Please enter a complete shipping address');
                return;
            }

            setCalculatingTax(true);
            setError(null);
            try {
                const normalizedAddress = {
                    ...shippingAddress,
                    state: shippingAddress.state.trim().toUpperCase(),
                    zip: shippingAddress.zip.trim(),
                    country: shippingAddress.country.trim().toUpperCase(),
                };
                const res = await fetch('https://3dprintings.xyz/api/payment/calculate-totals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        items: cartItems,
                        address: normalizedAddress,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setError(data.error || 'Failed to calculate taxes');
                    return;
                }

                const data = await res.json();
                setTotals({
                    subtotal: data.subtotal,
                    tax: data.tax,
                    shipping: data.shipping,
                    total: data.total,
                });
            } catch (err) {
                console.error('Tax calculation error:', err);
                setError('Failed to calculate taxes. Please try again.');
            } finally {
                setCalculatingTax(false);
            }
        };

        if (cartItems.length > 0 && shippingAddress.zip && shippingAddress.state) {
            calculateTotals();
        }
    }, [cartItems, shippingAddress]);

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        let nextValue = value;
        if (name === 'country' || name === 'state') {
            nextValue = value.toUpperCase();
        }
        if (name === 'country' || name === 'state' || name === 'zip') {
            nextValue = nextValue.trimStart();
        }
        setShippingAddress(prev => ({
            ...prev,
            [name]: nextValue,
        }));
    };

    const selectAddressSuggestion = (suggestion) => {
        setShippingAddress({
            line1: suggestion.streetLine,
            line2: '',
            city: suggestion.city,
            state: suggestion.state,
            zip: suggestion.postcode,
            country: 'US',
        });
        setAddressLine(suggestion.displayAddress);
        setShowSuggestions(false);
    };

    const handleCheckout = async () => {
        if (!shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip || !shippingAddress.country) {
            setError('Please enter a complete shipping address');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Save address if user wants to
            if (saveAddressForFuture) {
                try {
                    await axios.put(
                        'https://3dprintings.xyz/api/account/address',
                        {
                            street_address: shippingAddress.line1,
                            city: shippingAddress.city,
                            state_province: shippingAddress.state,
                            postal_code: shippingAddress.zip,
                            country_code: 'US',
                        },
                        {
                            withCredentials: true,
                        }
                    );
                    console.log('Address saved for future purchases');
                } catch (err) {
                    console.warn('Could not save address:', err.message);
                }
            }

            const res = await fetch('https://3dprintings.xyz/api/payment/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    items: cartItems,
                    address: {
                        ...shippingAddress,
                        state: shippingAddress.state.trim().toUpperCase(),
                        zip: shippingAddress.zip.trim(),
                        country: shippingAddress.country.trim().toUpperCase(),
                    },
                }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url; // Redirect to Stripe
            } else {
                setError(data.error || 'Checkout failed!');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            setError('Something went wrong during checkout.');
        } finally {
            setLoading(false);
        }
    };

    if (!cartItems.length) {
        return (
            <div className="min-h-screen bg-orange-50 text-gray-900 px-4 py-8">
                <div className="mx-auto max-w-lg text-center">
                    <h2 className="text-2xl font-bold mb-4">Checkout</h2>
                    <p className="text-gray-600">Your cart is empty.</p>
                </div>
            </div>
        );
    }

    if (loadingAddress) {
        return (
            <div className="min-h-screen bg-orange-50 text-gray-900 px-4 py-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-gray-600">Loading checkout...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-orange-50 text-gray-900 px-4 py-8">
            <div className="mx-auto max-w-4xl">
                <h2 className="text-3xl font-bold mb-6 text-gray-800">Checkout</h2>
                
                {error && (
                    <div className="mb-4 rounded-lg bg-red-100 border border-red-400 p-4 text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Shipping Address & Items */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Shipping Address Section */}
                        <div className="bg-white p-6 rounded-xl shadow-md border border-orange-100">
                            <h3 className="font-semibold mb-4 text-lg text-gray-800">Shipping Address</h3>
                            
                            {!useManualAddress && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Search Address</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={addressLine}
                                            onChange={(e) => setAddressLine(e.target.value)}
                                            placeholder="Start typing your address..."
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                        {isSuggestingAddress && (
                                            <div className="absolute right-3 top-3">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                                            </div>
                                        )}
                                    </div>
                                    {showSuggestions && addressSuggestions.length > 0 && (
                                        <div className="mt-2 border border-gray-300 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                                            {addressSuggestions.map((suggestion, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => selectAddressSuggestion(suggestion)}
                                                    className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-100 last:border-b-0"
                                                >
                                                    <div className="text-sm font-medium text-gray-800">{suggestion.streetLine}</div>
                                                    <div className="text-xs text-gray-600">{suggestion.city}, {suggestion.state} {suggestion.postcode}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setUseManualAddress(!useManualAddress)}
                                className="mb-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
                            >
                                {useManualAddress ? 'Use address search' : 'Enter address manually'}
                            </button>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                                    <input
                                        type="text"
                                        name="line1"
                                        value={shippingAddress.line1}
                                        onChange={handleAddressChange}
                                        placeholder="123 Main St"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apt, suite, etc. (optional)</label>
                                    <input
                                        type="text"
                                        name="line2"
                                        value={shippingAddress.line2}
                                        onChange={handleAddressChange}
                                        placeholder="Apt 4B"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={shippingAddress.city}
                                            onChange={handleAddressChange}
                                            placeholder="New York"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={shippingAddress.state}
                                            onChange={handleAddressChange}
                                            placeholder="NY"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                                        <input
                                            type="text"
                                            name="zip"
                                            value={shippingAddress.zip}
                                            onChange={handleAddressChange}
                                            placeholder="10001"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                                        <input
                                            type="text"
                                            name="country"
                                            value={shippingAddress.country}
                                            onChange={handleAddressChange}
                                            placeholder="US"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 mt-4 p-3 bg-orange-50 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={saveAddressForFuture}
                                        onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-gray-700 font-medium">Save this address for future purchases</span>
                                </label>
                            </div>
                        </div>

                        {/* Order Items Section with Images */}
                        <div className="order-summary bg-white p-6 rounded-xl shadow-md border border-orange-100">
                            <h3 className="font-semibold mb-4 text-lg text-gray-800">Order Summary</h3>
                            <div className="space-y-4">
                                {cartItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                        {item.image_url && (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="w-20 h-20 object-cover rounded-lg shrink-0"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">{item.name}</p>
                                            <p className="text-sm text-gray-500 mt-1">Qty: {item.quantity}</p>
                                            <p className="text-sm font-semibold text-orange-600 mt-2">
                                                ${(Number(item.current_price) * item.quantity).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Price Breakdown */}
                    <div className="lg:col-span-1">
                        <div className="totals bg-white p-6 rounded-xl shadow-md border border-orange-100 sticky top-20">
                            <h3 className="font-semibold mb-4 text-lg text-gray-800">Price Breakdown</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-semibold text-gray-800">${totals.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Shipping and handling:</span>
                                    <span className="font-semibold text-gray-800">${totals.shipping.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Tax:</span>
                                    {calculatingTax ? (
                                        <div className="h-4 w-16 animate-pulse rounded bg-gray-300"></div>
                                    ) : (
                                        <span className="font-semibold text-gray-800">${totals.tax.toFixed(2)}</span>
                                    )}
                                </div>
                                <hr className="border-orange-100 my-3" />
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-800">Total:</span>
                                    {calculatingTax ? (
                                        <div className="h-6 w-20 animate-pulse rounded bg-orange-300"></div>
                                    ) : (
                                        <span className="font-bold text-2xl text-orange-600">${totals.total.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={handleCheckout} 
                                disabled={loading || calculatingTax || !shippingAddress.line1}
                                className="w-full mt-6 bg-orange-500 text-white py-3 rounded-xl font-bold transition-all duration-300 hover:bg-orange-600 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-t-transparent mr-2"></div>
                                        Processing...
                                    </span>
                                ) : (
                                    'Pay with Stripe'
                                )}
                            </button>

                            <button 
                                onClick={() => navigate('/cart')} 
                                disabled={loading}
                                className="w-full mt-3 border-2 border-orange-500 text-orange-500 py-3 rounded-xl font-bold transition-all duration-300 hover:bg-orange-50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Return to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Checkout;
