import React, { useState, useEffect } from 'react';
import { PillButton } from '../components/PillButton';
import { Toast, type ToastType } from '../components/Toast';
import {
  listReferences,
  addReference,
  removeReference,
  seedTrustedMerchants,
  type VerifiedReference,
} from '../storage/references';
import {
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Search,
  CheckCircle,
  Building,
  Key
} from 'lucide-react';

export const ReferencesPage: React.FC = () => {
  const [references, setReferences] = useState<VerifiedReference[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [label, setLabel] = useState('');
  const [vpa, setVpa] = useState('');
  const [payeeName, setPayeeName] = useState('');

  const [toast, setToast] = useState<{ type: ToastType; title: string; message?: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const items = await listReferences();
      setReferences(items);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vpa.trim() || !payeeName.trim()) return;

    try {
      await addReference({
        label: label.trim() || payeeName.trim(),
        vpa: vpa.trim(),
        payeeName: payeeName.trim(),
        isDemo: false,
      });
      setLabel('');
      setVpa('');
      setPayeeName('');
      setShowAddModal(false);
      await loadData();
      setToast({
        type: 'success',
        title: 'Reference Added',
        message: `Saved ${payeeName} (${vpa}) with cryptographic hash.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save reference to local database.',
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await removeReference(id);
      await loadData();
      setToast({
        type: 'info',
        title: 'Reference Removed',
        message: `Deleted reference for ${name}.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message,
      });
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset references to default trusted Indian merchants?')) {
      await seedTrustedMerchants(true);
      await loadData();
      setToast({
        type: 'success',
        title: 'Defaults Restored',
        message: 'Loaded verified seed merchants.',
      });
    }
  };

  const filtered = references.filter(
    (r) =>
      r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.vpa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.payeeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2.5">
            <span>Trusted References</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
            Verified local payee whitelist. Scanned QR codes are checked against these hashes for handle swaps and homoglyphs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="p-2.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Reset to default merchants"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <PillButton
            onClick={() => setShowAddModal(true)}
            size="sm"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
          >
            Add Reference
          </PillButton>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by merchant name, label, or VPA handle..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      {/* References Grid / List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--color-text-tertiary)]">
          Loading trusted references from IndexedDB...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
          <Building className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto" />
          <p className="text-sm text-[var(--color-text-secondary)]">No matching references found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((ref) => (
            <div
              key={ref.id}
              className={`p-5 rounded-3xl border transition-all ${
                ref.isTampered
                  ? 'border-[var(--color-danger)]/60 bg-[var(--color-danger)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-[var(--color-text-primary)]">
                      {ref.label}
                    </h3>
                    {ref.isDemo && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]">
                        Seed Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Payee: <strong className="text-[var(--color-text-primary)]">{ref.payeeName}</strong>
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(ref.id, ref.label)}
                  className="p-2 rounded-xl text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-secondary)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label={`Delete ${ref.label}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* VPA and Cryptographic Hash Check */}
              <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--color-text-tertiary)]">VPA:</span>
                  <span className="text-[var(--color-accent)] font-semibold">{ref.vpa}</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <Key className="w-3 h-3" /> SHA-256 Hash Integrity:
                  </span>
                  {ref.isTampered ? (
                    <span className="text-[var(--color-danger)] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Modified / Tampered
                    </span>
                  ) : (
                    <span className="text-[var(--color-success)] font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Cryptographically Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Reference Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Add Trusted Merchant Reference
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1">
                  Merchant / Payee Name *
                </label>
                <input
                  type="text"
                  required
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="e.g. Swiggy India, Amazon Pay, BESCOM"
                  className="w-full p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1">
                  Official UPI VPA Handle *
                </label>
                <input
                  type="text"
                  required
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                  placeholder="e.g. swiggy@hdfcbank"
                  className="w-full p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs sm:text-sm font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1">
                  Custom Label (Optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Daily Food Delivery"
                  className="w-full p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] min-h-[44px]"
                >
                  Cancel
                </button>
                <PillButton size="md" variant="primary">
                  Save Reference
                </PillButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
