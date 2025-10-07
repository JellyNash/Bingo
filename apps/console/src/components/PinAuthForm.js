import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { authenticateWithPin } from '../lib.api';
export function PinAuthForm({ onSuccess, onError }) {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(event) {
        event.preventDefault();
        if (!pin.trim())
            return;
        setLoading(true);
        try {
            await authenticateWithPin(pin.trim());
            onSuccess();
        }
        catch (error) {
            onError(error?.message ?? 'Authentication failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6", children: _jsxs("div", { className: "bg-white/10 p-8 rounded-2xl border border-white/20 max-w-md w-full shadow-xl", children: [_jsx("h1", { className: "text-2xl font-bold text-white text-center mb-6", children: "GameMaster Console" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "pin", className: "block text-sm font-medium text-white/80 mb-2", children: "Enter GameMaster PIN" }), _jsx("input", { id: "pin", type: "password", value: pin, onChange: (event) => setPin(event.target.value), disabled: loading, className: "w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-primary", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022" })] }), _jsx("button", { type: "submit", disabled: loading || !pin.trim(), className: "w-full px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-accent disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition", children: loading ? 'Authenticating…' : 'Access Console' })] })] }) }));
}
