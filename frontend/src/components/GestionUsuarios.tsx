import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { Users, UserPlus, Loader2, Edit, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';

interface Usuario {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    perfil: {
        id: string;
        rol: 'ADMIN' | 'VENDEDOR' | 'OPERARIO';
        rol_display: string;
        nombre_completo: string;
        activo: boolean;
    };
}

export const GestionUsuarios: React.FC = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        nombre_completo: '',
        rol: 'VENDEDOR' as 'ADMIN' | 'VENDEDOR' | 'OPERARIO',
        is_active: true
    });

    const fetchUsuarios = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<Usuario[]>('/usuarios/');
            setUsuarios(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            password: '',
            email: '',
            nombre_completo: '',
            rol: 'VENDEDOR',
            is_active: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (u: Usuario) => {
        setEditingUser(u);
        setFormData({
            username: u.username,
            password: '',
            email: u.email || '',
            nombre_completo: u.perfil?.nombre_completo || u.username,
            rol: u.perfil?.rol || 'VENDEDOR',
            is_active: u.is_active
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingUser) {
                const payload: any = {
                    email: formData.email,
                    nombre_completo: formData.nombre_completo,
                    rol: formData.rol,
                    is_active: formData.is_active
                };
                if (formData.password) payload.password = formData.password;

                await apiFetch(`/usuarios/${editingUser.id}/`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                });
            } else {
                await apiFetch('/usuarios/', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }
            setIsModalOpen(false);
            fetchUsuarios();
        } catch (err: any) {
            alert(err.message || 'Error al guardar el usuario');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (u: Usuario) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${u.username}"?`)) return;
        setIsDeletingId(u.id);
        try {
            await apiFetch(`/usuarios/${u.id}/`, { method: 'DELETE' });
            fetchUsuarios();
        } catch (err: any) {
            alert(err.message || 'Error al eliminar usuario');
        } finally {
            setIsDeletingId(null);
        }
    };

    const getRoleBadge = (rol: string) => {
        switch (rol) {
            case 'ADMIN':
                return <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">👑 Administrador</span>;
            case 'VENDEDOR':
                return <span className="px-3 py-1 rounded-full bg-[#59BFCB]/10 border border-[#59BFCB]/30 text-[#59BFCB] text-xs font-bold">🛍️ Vendedor (Tienda)</span>;
            case 'OPERARIO':
                return <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">🏭 Operario (Taller)</span>;
            default:
                return <span className="px-3 py-1 rounded-full bg-gray-500/10 border border-gray-500/30 text-gray-400 text-xs font-bold">{rol}</span>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-default)] shadow-xs">
                <div>
                    <h1 className="text-2xl font-extrabold font-display tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                        <Users className="w-7 h-7 text-[#59BFCB]" />
                        Gestión de Usuarios y Roles
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] font-medium mt-1">
                        Crea cuentas de acceso, asigna roles de tienda/taller y administra permisos del sistema.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="py-3 px-5 rounded-2xl bg-gradient-to-r from-[#59BFCB] to-[#9478B3] text-white font-bold shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center gap-2 text-sm shrink-0"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Nuevo Usuario</span>
                </button>
            </div>

            {/* Content Table / Loading Skeleton / Empty State */}
            {loading ? (
              <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-default)] p-6 space-y-4 animate-pulse">
                <div className="h-10 bg-[var(--bg-surface-raised)] rounded-xl w-full"></div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-[var(--bg-surface-raised)] rounded-xl w-full"></div>
                ))}
              </div>
            ) : error ? (
                <div className="p-6 bg-red-500/10 border border-red-500/30 text-red-500 rounded-3xl font-medium text-center flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <p>{error}</p>
                    <button
                      onClick={fetchUsuarios}
                      className="mt-2 px-4 py-2 bg-[var(--bg-surface)] border border-red-500/30 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      Reintentar
                    </button>
                </div>
            ) : usuarios.length === 0 ? (
                /* Empty State */
                <div className="bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-default)] p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#59BFCB]/10 flex items-center justify-center text-[#59BFCB] border border-[#59BFCB]/20">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">No hay usuarios registrados</h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                    Comienza creando las cuentas para el personal de ventas, administradores o taller.
                  </p>
                  <button
                    onClick={openCreateModal}
                    className="mt-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#59BFCB] to-[#9478B3] text-white font-bold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" /> Crear Primer Usuario
                  </button>
                </div>
            ) : (
                <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-default)] shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    <th className="py-4 px-6">Usuario / Nombre</th>
                                    <th className="py-4 px-6">Correo</th>
                                    <th className="py-4 px-6">Rol Asignado</th>
                                    <th className="py-4 px-6">Estado</th>
                                    <th className="py-4 px-6 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)] text-sm font-medium">
                                {usuarios.map((u) => (
                                    <tr key={u.id} className="hover:bg-[var(--bg-muted)] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-[var(--text-primary)]">
                                                {u.perfil?.nombre_completo || u.username}
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)] font-mono">
                                                @{u.username}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-[var(--text-secondary)]">
                                            {u.email || <span className="italic text-[var(--text-muted)]">Sin correo</span>}
                                        </td>
                                        <td className="py-4 px-6">
                                            {getRoleBadge(u.perfil?.rol || 'VENDEDOR')}
                                        </td>
                                        <td className="py-4 px-6">
                                            {u.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                                                    <span className="w-2 h-2 rounded-full bg-rose-400"></span> Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="py-1.5 px-3 rounded-xl bg-[var(--bg-muted)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer inline-flex items-center gap-1"
                                                title="Editar usuario"
                                            >
                                                <Edit className="w-3.5 h-3.5" /> Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u)}
                                                disabled={isDeletingId === u.id}
                                                className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-400 transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                                                title="Eliminar usuario"
                                            >
                                                {isDeletingId === u.id ? (
                                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                                                ) : (
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar Responsivo */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                            <h2 className="text-xl font-bold font-display text-[var(--text-primary)]">
                                {editingUser ? `Editar Usuario @${editingUser.username}` : 'Nuevo Usuario'}
                            </h2>
                            <button
                                onClick={() => !isSubmitting && setIsModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] cursor-pointer"
                                aria-label="Cerrar modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!editingUser && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                                        Nombre de Usuario (Login) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        disabled={isSubmitting}
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="ej. juan_tienda"
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] text-sm font-medium focus:ring-2 focus:ring-[#59BFCB]/30 focus:border-[#59BFCB] outline-none disabled:opacity-50"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                                    Nombre Completo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    disabled={isSubmitting}
                                    value={formData.nombre_completo}
                                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                                    placeholder="ej. Juan Pérez"
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] text-sm font-medium focus:ring-2 focus:ring-[#59BFCB]/30 focus:border-[#59BFCB] outline-none disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                                    Correo Electrónico (Opcional)
                                </label>
                                <input
                                    type="email"
                                    disabled={isSubmitting}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="juan@brandimp.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] text-sm font-medium focus:ring-2 focus:ring-[#59BFCB]/30 focus:border-[#59BFCB] outline-none disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                                    {editingUser ? 'Nueva Contraseña (Dejar en blanco para mantener actual)' : 'Contraseña *'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    disabled={isSubmitting}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] text-sm font-medium focus:ring-2 focus:ring-[#59BFCB]/30 focus:border-[#59BFCB] outline-none disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                                    Rol en el Sistema
                                </label>
                                <select
                                    disabled={isSubmitting}
                                    value={formData.rol}
                                    onChange={(e) => setFormData({ ...formData, rol: e.target.value as any })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] text-sm font-bold focus:ring-2 focus:ring-[#59BFCB]/30 focus:border-[#59BFCB] outline-none disabled:opacity-50 cursor-pointer"
                                >
                                    <option value="ADMIN">👑 Administrador (Acceso Total)</option>
                                    <option value="VENDEDOR">🛍️ Vendedor (Tienda - Sin Catálogo)</option>
                                    <option value="OPERARIO">🏭 Operario (Taller - Solo Kanban sin precios)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    disabled={isSubmitting}
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded border-[var(--border-default)] accent-[#59BFCB] cursor-pointer"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-[var(--text-primary)] cursor-pointer select-none">
                                    Cuenta Activa
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="py-2.5 px-4 rounded-xl border border-[var(--border-default)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] cursor-pointer disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#59BFCB] to-[#9478B3] text-white font-bold shadow-md hover:opacity-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                        <span>Guardando...</span>
                                      </>
                                    ) : (
                                      <span>{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
