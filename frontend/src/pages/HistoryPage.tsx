import React, { useState, useEffect } from 'react';
import { PillButton } from '../components/PillButton';
import { StatusPill } from '../components/StatusPill';
import { Toast, type ToastType } from '../components/Toast';
import {
  listHistory,
  clearAllHistory,
  removeHistoryItem,
  getDoNotKeepHistorySetting,
  setDoNotKeepHistorySetting,
  type HistoryItem,
} from '../storage/history';
import {
  Clock,
  Trash2,
  Lock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dontKeepHistory, setDontKeepHistory] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: ToastType; title: string; message?: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const items = await listHistory();
      setHistory(items);
      setDontKeepHistory(getDoNotKeepHistorySetting());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleOptOut = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked;
    setDontKeepHistory(newVal);
    setDoNotKeepHistorySetting(newVal);
    setToast({
      type: 'info',
      title: newVal ? 'History Disabled' : 'History Enabled',
      message: newVal
        ? 'Future scans will not be recorded on this device.'
        : 'Scans will be saved locally on this device.',
    });
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all local analysis history?')) {
      await clearAllHistory();
      await loadData();
      setToast({
        type: 'success',
        title: 'History Cleared',
        message: 'All local scan records have been deleted.',
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    await removeHistoryItem(id);
    await loadData();
    setToast({
      type: 'info',
      title: 'Item Deleted',
      message: 'Record removed from local history.',
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-2.5">
            <span>Local Scan History</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
            Stored 100% on your device in IndexedDB. Screenshots are never saved.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-danger)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All History</span>
          </button>
        )}
      </div>

      {/* Privacy Opt-Out Toggle Card */}
      <div className="mb-8 p-5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-accent)]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Don't Keep History (Opt-Out)
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              When enabled, FraPI Sentinel will not save any scan summaries or timestamps.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={dontKeepHistory}
            onChange={handleToggleOptOut}
            className="sr-only peer"
            aria-label="Toggle history opt out"
          />
          <div className="w-11 h-6 bg-[var(--color-bg-secondary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)] border border-[var(--color-border)]"></div>
        </label>
      </div>

      {/* History Items List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--color-text-tertiary)]">
          Loading scan records from IndexedDB...
        </div>
      ) : history.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4">
          <Clock className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto" />
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">No scans recorded yet</h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
            When you run payment evaluations, privacy-redacted summaries will appear here for your reference.
          </p>
          <div className="pt-2">
            <Link to="/check">
              <PillButton variant="primary" size="sm">
                Analyze a Payment
              </PillButton>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-subtle)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <StatusPill riskLevel={item.riskLevel} size="sm" />
                  <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                    Score: {item.scorePercentage}%
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
                  {item.label}
                </p>

                <p className="text-xs font-mono text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] p-2.5 rounded-xl border border-[var(--color-border-subtle)] break-all">
                  Snippet: {item.redactedSnippet}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 rounded-xl text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-secondary)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="Delete history item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
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
