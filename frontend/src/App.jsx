import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ChatTab } from './components/ChatTab';
import { IngestionTab } from './components/IngestionTab';
import { TracesTab } from './components/TracesTab';
import { ABTestTab } from './components/ABTestTab';
import { api } from './api/client';

export function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState('system-design');

  const loadCollections = async () => {
    try {
      const res = await api.getCollections();
      setCollections(res.items || []);
      if (res.items && res.items.length > 0 && !res.items.find((c) => c.name === activeCollection)) {
        setActiveCollection(res.items[0].name);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col selection:bg-primary-600 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collections={collections}
        activeCollection={activeCollection}
        setActiveCollection={setActiveCollection}
      />

      <main className="flex-1">
        {activeTab === 'chat' && <ChatTab activeCollection={activeCollection} />}
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
