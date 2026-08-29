import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { ChatLayout } from './components/ChatLayout';
import { IngestionTab } from './components/IngestionTab';
import { TracesTab } from './components/TracesTab';
import { ABTestTab } from './components/ABTestTab';
import { api } from './api/client';

export function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState('system-design');

  const loadCollections = async () => {
    try {
      const res = await api.getCollections();
      setCollections(res.items || []);
      if (res.items && res.items.length > 0 && !res.items.find(c => c.name === activeCollection)) {
        setActiveCollection(res.items[0].name);
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  };

  useEffect(() => { loadCollections(); }, []);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collections={collections}
        activeCollection={activeCollection}
        setActiveCollection={setActiveCollection}
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: activeTab === 'chat' ? 'hidden' : 'auto' }}>
        {activeTab === 'home' && (
          <LandingPage
            collections={collections}
            activeCollection={activeCollection}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'chat' && <ChatLayout activeCollection={activeCollection} />}
        {activeTab === 'ingestion' && (
          <IngestionTab
            collections={collections}
            activeCollection={activeCollection}
            onRefreshCollections={loadCollections}
          />
        )}
        {activeTab === 'ab_test' && <ABTestTab activeCollection={activeCollection} />}
        {activeTab === 'traces' && <TracesTab />}
      </main>
    </div>
  );
}

export default App;
