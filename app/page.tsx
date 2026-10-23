'use client';

import { useState, useEffect } from 'react';

interface ReceiptData {
  merchant?: string;
  date?: string;
  total?: string | number;
  tax?: string | number;
  category?: string;
  items?: Array<{ description: string; price: string | number }>;
  [key: string]: any;
}

interface SavedReceipt extends ReceiptData {
  id: string;
  timestamp: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedReceipt[]>([]);

  // Load history from browser storage on start
  useEffect(() => {
    const saved = localStorage.getItem('reconcile_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setParsedData(null);
      setError(null);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setParsedData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process receipt');
      }

      let cleanedJson = data.result.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleanedJson);
      setParsedData(parsed);

      // Save to history state & local storage
      const newEntry: SavedReceipt = {
        ...parsed,
        id: Date.now().toString(),
        timestamp: new Date().toLocaleDateString(),
      };

      const updatedHistory = [newEntry, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('reconcile_history', JSON.stringify(updatedHistory));

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred or response was not valid JSON.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!parsedData || !parsedData.items) return;
    
    let csvContent = "data:text/csv;charset=utf-8,Description,Price\n";
    parsedData.items.forEach((item: any) => {
      csvContent += `"${item.description}","${item.price}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `receipt_${parsedData.merchant || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SaaS Dashboard
          </span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '0.75rem', marginBottom: '0.5rem' }}>Reconcile AI</h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Instant receipt intelligence, auto-categorization & expense history</p>
        </header>

        {/* Upload Card */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1rem', padding: '2rem', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <form onSubmit={handleAnalyze}>
            <div style={{ border: '2px dashed #475569', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', background: '#0f172a', cursor: 'pointer', marginBottom: '1.5rem' }}>
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                onChange={handleFileChange}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.75rem' }}>Supports JPG, PNG, or PDF receipts</p>
            </div>

            {preview && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Preview:</p>
                <img src={preview} alt="Receipt preview" style={{ maxHeight: '200px', borderRadius: '0.5rem', border: '1px solid #475569' }} />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !file}
              style={{
                width: '100%',
                background: loading || !file ? '#475569' : '#3b82f6',
                color: '#fff',
                border: 'none',
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                cursor: loading || !file ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Analyzing & Categorizing...' : 'Analyze Receipt'}
            </button>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div style={{ background: '#7f1d1d', border: '1px solid #991b1b', color: '#fca5a5', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Active Result Dashboard */}
        {parsedData && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1rem', padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Current Scan Breakdown</h2>
                {parsedData.category && (
                  <span style={{ display: 'inline-block', background: '#0284c7', color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '9999px', marginTop: '0.4rem' }}>
                    {parsedData.category}
                  </span>
                )}
              </div>
              {parsedData.items && (
                <button 
                  onClick={downloadCSV}
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Download CSV
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Merchant</span>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '0.25rem' }}>{parsedData.merchant || 'N/A'}</p>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</span>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '0.25rem' }}>{parsedData.date || 'N/A'}</p>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Amount</span>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#34d399', marginTop: '0.25rem' }}>{parsedData.total ? `$${parsedData.total}` : 'N/A'}</p>
              </div>
            </div>

            {parsedData.items && parsedData.items.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Line Items</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.875rem' }}>
                        <th style={{ padding: '0.75rem' }}>Description</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '0.75rem', color: '#f8fafc' }}>{item.description}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#cbd5e1' }}>${item.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expense History Section */}
        {history.length > 0 && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1rem', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Expense History Log</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>{item.merchant || 'Unknown Merchant'}</span>
                      {item.category && (
                        <span style={{ background: '#334155', color: '#38bdf8', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Scanned on: {item.timestamp}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#34d399', fontWeight: 700, fontSize: '1.125rem' }}>${item.total || '0.00'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}