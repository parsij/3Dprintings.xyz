import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const US_STATE_REGEX = /^[A-Z]{2}$/;
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;
const MAX_ADDRESS_FIELD_LENGTH = 120;

const EMPTY_ADDRESS = {
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
};

function formatAddressSummary(address) {
    const parts = [
        address.line1,
        address.line2,
        [address.city, address.state, address.zip].filter(Boolean).join(', '),
    ].filter(Boolean);

    return parts.join(' · ');
}

function normalizeAddress(address) {
    return {
        line1: String(address.line1 || '').trim().slice(0, MAX_ADDRESS_FIELD_LENGTH),
        line2: String(address.line2 || '').trim().slice(0, MAX_ADDRESS_FIELD_LENGTH),
        city: String(address.city || '').trim().slice(0, MAX_ADDRESS_FIELD_LENGTH),
        state: String(address.state || '').trim().toUpperCase().slice(0, 2),
        zip: String(address.zip || '').trim().slice(0, 10),
        country: String(address.country || 'US').trim().toUpperCase().slice(0, 2),
    };
}

function isAddressComplete(address) {
    const normalized = normalizeAddress(address);
    return Boolean(
        normalized.line1
        && normalized.city
        && US_STATE_REGEX.test(normalized.state)
        && US_ZIP_REGEX.test(normalized.zip)
        && normalized.country === 'US'
    );
}

function PriceSkeleton({ className = 'h-4 w-16' }) {
    return <div className={`animate-pulse rounded bg-gray-300 ${className}`} aria-hidden="true" />;
}

const Checkout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const passedItems = location.state?.items;
    const cartItems = useMemo(() => (Array.isArray(passedItems) ? passedItems : []), [passedItems]);

    const [totals, setTotals] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isCalculatingTotals, setIsCalculatingTotals] = useState(false);
    const [error, setError] = useState(null);
    const [loadingAddress, setLoadingAddress] = useState(true);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [isAddressSearchFocused, setIsAddressSearchFocused] = useState(false);
    const [showAddressDetails, setShowAddressDetails] = useState(false);
    const [saveAddressForFuture, setSaveAddressForFuture] = useState(false);
    const [addressLine, setAddressLine] = useState('');
    const [isSuggestingAddress, setIsSuggestingAddress] = useState(false);
    const [shippingAddress, setShippingAddress] = useState(EMPTY_ADDRESS);
    const totalsRequestRef = useRef(0);
    const addressSearchRef = useRef(null);
    const suppressAutocompleteRef = useRef(false);

    const clientSubtotal = useMemo(
        () => cartItems.reduce(
            (sum, item) => sum + Number(item.current_price || 0) * Number(item.quantity || 1),
            0
        ),
        [cartItems]
    );

    const normalizedShippingAddress = useMemo(
        () => normalizeAddress(shippingAddress),
        [shippingAddress]
    );

    const addressComplete = isAddressComplete(normalizedShippingAddress);

    const visibleAddressSuggestions = useMemo(() => {
        if (!isAddressSearchFocused) return [];

        const query = addressLine.trim().toLowerCase();
        if (!query) return addressSuggestions;

        return addressSuggestions.filter((suggestion) => {
            const display = String(suggestion.displayAddress || '').trim().toLowerCase();
            return display !== query;
        });
    }, [addressSuggestions, addressLine, isAddressSearchFocused]);

    const showAddressDropdown = isAddressSearchFocused
        && (isSuggestingAddress || visibleAddressSuggestions.length > 0);

    useEffect(() => {
        const loadUserAddress = async () => {
            try {
                const response = await axios.get(`${API_BASE}/api/account/address`, {
                    withCredentials: true,
                });
                const addr = response.data?.address;
                if (addr?.street_address) {
                    const loadedAddress = normalizeAddress({
                        line1: addr.street_address,
                        line2: '',
                        city: addr.city,
                        state: addr.state_province,
                        zip: addr.postal_code,
                        country: addr.country_code || 'US',
                    });
                    setShippingAddress(loadedAddress);
                    setAddressLine(formatAddressSummary(loadedAddress));
                }
            } catch {
                // No saved address is fine for checkout.
            } finally {
                setLoadingAddress(false);
            }
        };

        loadUserAddress();
    }, []);

    useEffect(() => {
        if (!isAddressSearchFocused) {
            return undefined;
        }

        if (suppressAutocompleteRef.current) {
            suppressAutocompleteRef.current = false;
            setAddressSuggestions([]);
            return undefined;
        }

        if (!addressLine.trim() || addressLine.length < 3) {
            setAddressSuggestions([]);
            return undefined;
        }

        const timer = window.setTimeout(async () => {
            try {
                setIsSuggestingAddress(true);
                const response = await axios.get(`${API_BASE}/api/address/autocomplete`, {
                    params: { q: addressLine.trim(), limit: 6 },
                    withCredentials: true,
                });
                setAddressSuggestions(Array.isArray(response.data?.suggestions) ? response.data.suggestions : []);
            } catch {
                setAddressSuggestions([]);
            } finally {
                setIsSuggestingAddress(false);
            }
        }, 300);

        return () => window.clearTimeout(timer);
    }, [addressLine, isAddressSearchFocused]);

    useEffect(() => {
        if (!cartItems.length || !addressComplete) {
            setTotals(null);
            setIsCalculatingTotals(false);
            return undefined;
        }

        const requestId = totalsRequestRef.current + 1;
        totalsRequestRef.current = requestId;

        const timer = window.setTimeout(async () => {
            setIsCalculatingTotals(true);
            setError(null);

            try {
                const res = await fetch(`${API_BASE}/api/payment/calculate-totals`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        items: cartItems.map((item) => ({
                            id: item.id,
                            productId: item.id,
                            quantity: item.quantity,
                        })),
                        address: normalizedShippingAddress,
                    }),
                });

                if (requestId !== totalsRequestRef.current) return;

                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setError(data.error || 'Failed to calculate totals');
                    setTotals(null);
                    return;
                }

                setTotals({
                    subtotal: Number(data.subtotal) || 0,
                    tax: Number(data.tax) || 0,
                    shipping: Number(data.shipping) || 0,
                    total: Number(data.total) || 0,
                });
            } catch (err) {
                if (requestId !== totalsRequestRef.current) return;
                console.error('Totals calculation error:', err);
                setError('Failed to calculate totals. Please try again.');
                setTotals(null);
            } finally {
                if (requestId === totalsRequestRef.current) {
                    setIsCalculatingTotals(false);
                }
            }
        }, 400);

        return () => window.clearTimeout(timer);
    }, [cartItems, normalizedShippingAddress, addressComplete]);

    const handleAddressChange = (event) => {
        const { name, value } = event.target;
        let nextValue = value;

        if (name === 'country' || name === 'state') {
            nextValue = value.toUpperCase();
        }
        if (name === 'country' || name === 'state' || name === 'zip') {
            nextValue = nextValue.trimStart();
        }

        setShippingAddress((prev) => ({
            ...prev,
            [name]: nextValue,
        }));
    };

    const selectAddressSuggestion = useCallback((suggestion) => {
        const nextAddress = normalizeAddress({
            line1: suggestion.streetLine,
            line2: '',
            city: suggestion.city,
            state: suggestion.state,
            zip: suggestion.postcode,
            country: 'US',
        });
        const selectedLine = suggestion.displayAddress || formatAddressSummary(nextAddress);

        suppressAutocompleteRef.current = true;
        setAddressSuggestions([]);
        setShippingAddress(nextAddress);
        setAddressLine(selectedLine);
        setIsAddressSearchFocused(false);
        setShowAddressDetails(false);
        setError(null);
        addressSearchRef.current?.blur();
    }, []);

    const handleCheckout = async () => {
        if (!addressComplete) {
            setError('Please enter a complete shipping address.');
            setShowAddressDetails(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (saveAddressForFuture) {
                try {
                    await axios.put(
                        `${API_BASE}/api/account/address`,
                        {
                            street_address: normalizedShippingAddress.line1,
                            city: normalizedShippingAddress.city,
                            state_province: normalizedShippingAddress.state,
                            postal_code: normalizedShippingAddress.zip,
                            country_code: normalizedShippingAddress.country,
                        },
                        { withCredentials: true }
                    );
                } catch (err) {
                    console.warn('Could not save address:', err.message);
                }
            }

            const res = await fetch(`${API_BASE}/api/payment/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    items: cartItems.map((item) => ({
                        id: item.id,
                        productId: item.id,
                        quantity: item.quantity,
                    })),
                    address: normalizedShippingAddress,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || 'Checkout failed.');
                return;
            }

            if (data.url) {
                window.location.assign(data.url);
                return;
            }

            setError(data.error || 'Checkout failed.');
        } catch (checkoutError) {
            console.error('Checkout error:', checkoutError);
            setError('Something went wrong during checkout.');
        } finally {
            setLoading(false);
        }
    };

    const displayedSubtotal = totals?.subtotal ?? clientSubtotal;
    const canPay = addressComplete && totals && !isCalculatingTotals && !loading;

    if (!cartItems.length) {
        return (
            <div className="min-h-screen bg-orange-50 text-gray-900 px-4 py-8">
                <div className="mx-auto max-w-lg text-center">
                    <h2 className="text-2xl font-bold mb-4">Checkout</h2>
                    <p className="text-gray-600 mb-6">Your cart is empty.</p>
                    <button
                        type="button"
                        onClick={() => navigate('/cart')}
                        className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
                    >
                        Return to Cart
                    </button>
                </div>
            </div>
        );
    }

    if (loadingAddress) {
        return (
            <div className="min-h-screen bg-orange-50 text-gray-900 px-4 py-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4" />
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
                    <div className="mb-4 rounded-lg bg-red-100 border border-red-400 p-4 text-red-700" role="alert">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-md border border-orange-100">
                            <h3 className="font-semibold mb-4 text-lg text-gray-800">Shipping Address</h3>

                            <div className="mb-4">
                                <label htmlFor="checkout-address-search" className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Address
                                </label>
                                <div className="relative">
                                    <input
                                        ref={addressSearchRef}
                                        id="checkout-address-search"
                                        type="text"
                                        value={addressLine}
                                        onChange={(event) => setAddressLine(event.target.value)}
                                        onFocus={() => setIsAddressSearchFocused(true)}
                                        onBlur={() => {
                                            window.setTimeout(() => setIsAddressSearchFocused(false), 150);
                                        }}
                                        autoComplete="off"
                                        maxLength={240}
                                        placeholder="Start typing your address..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    {isSuggestingAddress && isAddressSearchFocused && (
                                        <div className="absolute right-3 top-3">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500" />
                                        </div>
                                    )}
                                </div>

                                {showAddressDropdown && (
                                    <div className="mt-2 border border-gray-300 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto z-10 relative">
                                        {isSuggestingAddress && visibleAddressSuggestions.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-gray-500">Searching addresses...</div>
                                        ) : (
                                            visibleAddressSuggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion.displayAddress}
                                                    type="button"
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => selectAddressSuggestion(suggestion)}
                                                    className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-100 last:border-b-0"
                                                >
                                                    <div className="text-sm font-medium text-gray-800">{suggestion.streetLine}</div>
                                                    <div className="text-xs text-gray-600">
                                                        {suggestion.city}, {suggestion.state} {suggestion.postcode}
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {!showAddressDetails ? (
                                <button
                                    type="button"
                                    onClick={() => setShowAddressDetails(true)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-950 hover:text-orange-500 transition-colors shadow-none hover outline-none focus:outline-none focus:ring-0"
                                    aria-expanded="false"
                                >
                                    <ChevronDown className="h-4 w-4 transition-transform duration-350" />
                                    More Details
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddressLine(formatAddressSummary(normalizeAddress(shippingAddress)));
                                        setShowAddressDetails(false);
                                    }}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors mb-4 shadow-none hover:shadow-none focus:shadow-none active:shadow-none outline-none focus:outline-none focus:ring-0"
                                    aria-expanded="true"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </button>
                            )}

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    showAddressDetails ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <div className="space-y-4 pt-1">
                                    <div>
                                        <label htmlFor="checkout-line1" className="block text-sm font-medium text-gray-700 mb-1">
                                            Street Address *
                                        </label>
                                        <input
                                            id="checkout-line1"
                                            type="text"
                                            name="line1"
                                            value={shippingAddress.line1}
                                            onChange={handleAddressChange}
                                            maxLength={MAX_ADDRESS_FIELD_LENGTH}
                                            placeholder="123 Main St"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="checkout-line2" className="block text-sm font-medium text-gray-700 mb-1">
                                            Apt, suite, etc. (optional)
                                        </label>
                                        <input
                                            id="checkout-line2"
                                            type="text"
                                            name="line2"
                                            value={shippingAddress.line2}
                                            onChange={handleAddressChange}
                                            maxLength={MAX_ADDRESS_FIELD_LENGTH}
                                            placeholder="Apt 4B"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="checkout-city" className="block text-sm font-medium text-gray-700 mb-1">
                                                City *
                                            </label>
                                            <input
                                                id="checkout-city"
                                                type="text"
                                                name="city"
                                                value={shippingAddress.city}
                                                onChange={handleAddressChange}
                                                maxLength={MAX_ADDRESS_FIELD_LENGTH}
                                                placeholder="New York"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="checkout-state" className="block text-sm font-medium text-gray-700 mb-1">
                                                State *
                                            </label>
                                            <input
                                                id="checkout-state"
                                                type="text"
                                                name="state"
                                                value={shippingAddress.state}
                                                onChange={handleAddressChange}
                                                maxLength={2}
                                                placeholder="NY"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="checkout-zip" className="block text-sm font-medium text-gray-700 mb-1">
                                                ZIP Code *
                                            </label>
                                            <input
                                                id="checkout-zip"
                                                type="text"
                                                name="zip"
                                                value={shippingAddress.zip}
                                                onChange={handleAddressChange}
                                                maxLength={10}
                                                inputMode="numeric"
                                                placeholder="10001"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="checkout-country" className="block text-sm font-medium text-gray-700 mb-1">
                                                Country *
                                            </label>
                                            <input
                                                id="checkout-country"
                                                type="text"
                                                name="country"
                                                value={shippingAddress.country}
                                                readOnly
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 mt-6 p-3 bg-orange-50 rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={saveAddressForFuture}
                                    onChange={(event) => setSaveAddressForFuture(event.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                />
                                <span className="text-sm text-gray-700 font-medium">Save this address for future purchases</span>
                            </label>

                            {!addressComplete && (
                                <p className="mt-3 text-sm text-gray-500">
                                    Search for your address or open More Details to finish entering it.
                                </p>
                            )}
                        </div>

                        <div className="order-summary bg-white p-6 rounded-xl shadow-md border border-orange-100">
                            <h3 className="font-semibold mb-4 text-lg text-gray-800">Order Summary</h3>
                            <div className="space-y-4">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                        {item.image_url && (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-20 h-20 object-cover rounded-lg shrink-0"
                                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
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

                    <div className="lg:col-span-1">
                        <div className="totals bg-white p-6 rounded-xl shadow-md border border-orange-100 sticky top-20">
                            <h3 className="font-semibold mb-4 text-lg text-gray-800">Price Breakdown</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-semibold text-gray-800">${displayedSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-gray-600">Shipping and handling:</span>
                                    {isCalculatingTotals ? (
                                        <PriceSkeleton />
                                    ) : (
                                        <span className="font-semibold text-gray-800">
                                            {totals ? `$${totals.shipping.toFixed(2)}` : '—'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-gray-600">Tax:</span>
                                    {isCalculatingTotals ? (
                                        <PriceSkeleton />
                                    ) : (
                                        <span className="font-semibold text-gray-800">
                                            {totals ? `$${totals.tax.toFixed(2)}` : '—'}
                                        </span>
                                    )}
                                </div>
                                <hr className="border-orange-100 my-3" />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-800">Total:</span>
                                    {isCalculatingTotals ? (
                                        <PriceSkeleton className="h-6 w-20" />
                                    ) : (
                                        <span className="font-bold text-2xl text-orange-600">
                                            {totals ? `$${totals.total.toFixed(2)}` : '—'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleCheckout}
                                disabled={!canPay}
                                className="w-full mt-6 bg-orange-500 text-white py-3 rounded-xl font-bold transition-all duration-300 hover:bg-orange-600 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-t-transparent mr-2" />
                                        Processing...
                                    </span>
                                ) : (
                                    'Pay with Stripe'
                                )}
                            </button>

                            <button
                                type="button"
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
