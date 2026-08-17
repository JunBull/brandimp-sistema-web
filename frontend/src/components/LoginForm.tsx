import React, { useState, useEffect } from 'react';
import { LogIn, AlertCircle, AlertTriangle, Loader2, User, Lock, Eye, EyeOff, ShieldCheck, HelpCircle, X } from 'lucide-react';
import { apiFetch, setStoredUser } from '../utils/apiFetch';

export const LoginForm: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);

    // Cargar usuario recordado si existe
    useEffect(() => {
        const savedUsername = localStorage.getItem('brandimp_saved_username');
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }
    }, []);

    // Detectar Bloq Mayús (Caps Lock)
    const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (typeof e.getModifierState === 'function') {
            setIsCapsLockOn(e.getModifierState('CapsLock'));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const data = await apiFetch('/auth/login/', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            // Manejar persistencia de usuario recordado
            if (rememberMe) {
                localStorage.setItem('brandimp_saved_username', username);
            } else {
                localStorage.removeItem('brandimp_saved_username');
            }

            // Guardar usuario en sesión
            setStoredUser(data.user);

            // Redirección según rol
            if (data.user?.rol === 'OPERARIO') {
                window.location.href = '/pedidos';
            } else {
                window.location.href = '/';
            }
        } catch (err: any) {
            setError(err.message || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            {/* Tarjeta Principal Elevada */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl p-7 sm:p-9 shadow-xl relative transition-all duration-200">
                
                {/* Header: Isotipo de Brandimp y Título */}
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-brand-turquoise/15 via-brand-lavender/10 to-brand-peach/15 border border-[var(--border-subtle)] shadow-sm mb-3.5 transition-transform hover:scale-105 duration-200">
                        <img 
                            src="/logo.svg" 
                            alt="Logo Brandimp" 
                            className="w-12 h-12 object-contain"
                        />
                    </div>
                    <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)] tracking-tight">
                        Brandimp
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
                        Sistema de Flujo Comercial y Operaciones
                    </p>
                </div>

                {/* Banner de Error */}
                {error && (
                    <div 
                        role="alert"
                        className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs flex items-start gap-2.5 animate-fade-in"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{error}</span>
                    </div>
                )}

                {/* Formulario de Login */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Campo Usuario */}
                    <div>
                        <label 
                            htmlFor="username-input"
                            className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5"
                        >
                            Usuario o Correo
                        </label>
                        <div className="relative flex items-center">
                            <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none" />
                            <input
                                id="username-input"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ingresa tu usuario"
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-turquoise/40 focus:border-brand-turquoise transition-all"
                            />
                        </div>
                    </div>

                    {/* Campo Contraseña */}
                    <div>
                        <label 
                            htmlFor="password-input"
                            className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5"
                        >
                            Contraseña
                        </label>
                        <div className="relative flex items-center">
                            <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none" />
                            <input
                                id="password-input"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyEvent}
                                onKeyUp={handleKeyEvent}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-turquoise/40 focus:border-brand-turquoise transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
                                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {/* Indicador de Bloq Mayús (Caps Lock) */}
                        {isCapsLockOn && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-500 animate-fade-in">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Bloq Mayús activado</span>
                            </div>
                        )}
                    </div>

                    {/* Opciones Adicionales: Recordarme y Soporte */}
                    <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-default)] text-brand-turquoise accent-brand-turquoise focus:ring-brand-turquoise/40 cursor-pointer"
                            />
                            <span>Recordar usuario</span>
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowSupportModal(true)}
                            className="text-xs font-semibold text-brand-turquoise hover:text-brand-turquoise-hover transition-colors cursor-pointer"
                        >
                            ¿Ayuda para acceder?
                        </button>
                    </div>

                    {/* Botón de Envío */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-3 py-3 px-4 bg-brand-turquoise hover:bg-brand-turquoise-hover active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Iniciando sesión...</span>
                            </>
                        ) : (
                            <>
                                <LogIn className="w-4 h-4" />
                                <span>Ingresar al Sistema</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer de Seguridad y Confianza */}
                <div className="mt-7 pt-5 border-t border-[var(--border-subtle)] flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
                    <ShieldCheck className="w-4 h-4 text-brand-turquoise shrink-0" />
                    <span>Conexión cifrada TLS 256-bit • Acceso Restringido</span>
                </div>
            </div>

            {/* Modal de Soporte / Ayuda Rápida */}
            {showSupportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-fade-in-scale">
                        <button
                            onClick={() => setShowSupportModal(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
                            aria-label="Cerrar modal de ayuda"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-2xl bg-brand-turquoise/15 text-brand-turquoise">
                                <HelpCircle className="w-5 h-5" />
                            </div>
                            <h2 className="font-display font-bold text-base text-[var(--text-primary)]">
                                Soporte de Acceso
                            </h2>
                        </div>

                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                            Las credenciales de acceso al sistema son administradas por el área de **Tecnología y Operaciones de Brandimp**.
                        </p>

                        <div className="p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-secondary)] mb-5 space-y-1">
                            <p><strong className="text-[var(--text-primary)]">¿Olvidaste tu contraseña?</strong></p>
                            <p>Comunícate con el Administrador de TI para solicitar el restablecimiento de tu clave.</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowSupportModal(false)}
                            className="w-full py-2.5 px-4 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] font-semibold text-xs rounded-xl border border-[var(--border-default)] transition-colors cursor-pointer"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
