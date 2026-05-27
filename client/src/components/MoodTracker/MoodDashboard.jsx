import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api } from '../../services/apiClient';
import { saveMessage, saveMood, getMoods } from '../../services/db';
import { v4 as uuidv4 } from 'uuid';

export default function MoodDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'platform'
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [platformStats, setPlatformStats] = useState({
    teensSupported: 0,
    wellnessChats: 0,
    crisisInterventions: 0,
    offlineSyncs: 0
  });


  useEffect(() => {
    loadData();
    loadPlatformStats();
  }, []);

  const loadPlatformStats = async () => {
    try {
      const stats = await api.getPlatformStats();
      if (stats && !stats.error) setPlatformStats(stats);
    } catch (e) {
      console.warn('Failed to load platform stats', e);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      let data;
      try {
        data = await api.getMoodTimeline(30);
        // Also save to IndexedDB to keep them fully synced offline!
        if (Array.isArray(data)) {
          for (const e of data) {
            await saveMood({ ...e, synced: true });
          }
        } else {
          data = [];
        }
      } catch (err) {
        console.warn('Failed to load remote dashboard data, falling back to local database', err);
        data = await getMoods(30);
      }
      
      const formatted = (Array.isArray(data) ? data : []).map(d => {
        const date = d.created_at ? new Date(d.created_at) : new Date();
        const validDate = isNaN(date.getTime()) ? new Date() : date;
        return {
          ...d,
          day: validDate.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: validDate.toLocaleDateString(),
        };
      });
      setTimeline(formatted);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract stress tags for a bar chart
  const tagCounts = timeline.reduce((acc, curr) => {
    let tagsArray = [];
    if (Array.isArray(curr.tags)) {
      tagsArray = curr.tags;
    } else if (typeof curr.tags === 'string' && curr.tags.trim().length > 0) {
      if (curr.tags.startsWith('[') && curr.tags.endsWith(']')) {
        try {
          tagsArray = JSON.parse(curr.tags);
        } catch (e) {
          tagsArray = curr.tags.split(',').map(t => t.trim());
        }
      } else {
        tagsArray = curr.tags.split(',').map(t => t.trim());
      }
    }
    
    tagsArray.forEach(tag => {
      if (tag) {
        acc[tag] = (acc[tag] || 0) + 1;
      }
    });
    return acc;
  }, {});

  const tagData = Object.entries(tagCounts)
    .map(([name, count]) => ({ 
      name: t(name) || name, // Translate tag dynamically for multilingual support!
      count 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // top 5 tags

  // Seed 7 days of beautifully crafted mock mood logs to user's active session
  const handleSeedMockData = async () => {
    try {
      setLoading(true);
      const mockEntries = [
        {
          id: uuidv4(),
          mood_score: 2,
          note: "So much syllabus left for physics, I feel extremely anxious about exams.",
          tags: ['mood_tag_exams', 'mood_tag_school'],
          created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          mood_score: 3,
          note: "Studied with my friend Priya. Felt a bit better but still stressed.",
          tags: ['mood_tag_friends', 'mood_tag_exams'],
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          mood_score: 1,
          note: "Argued with my brother, could not sleep properly at all.",
          tags: ['mood_tag_family', 'mood_tag_sleep'],
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          mood_score: 3,
          note: "Tried Box Breathing exercise on Saathi today. It helped slow my heartbeat down.",
          tags: ['mood_tag_health'],
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          mood_score: 4,
          note: "School went really well today. Teacher praised my math project.",
          tags: ['mood_tag_school'],
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          mood_score: 4,
          note: "Spent a beautiful evening with my family. Feeling much more calm.",
          tags: ['mood_tag_family', 'mood_tag_health'],
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          mood_score: 5,
          note: "Excelling in mock test! I feel so confident and ready. Saathi has been a lifesaver.",
          tags: ['mood_tag_exams', 'mood_tag_health'],
          created_at: new Date().toISOString()
        }
      ];

      // Save to IndexedDB locally
      for (const entry of mockEntries) {
        await saveMood({ ...entry, synced: true });
      }

      // Sync to Supabase cloud PostgreSQL
      try {
        await api.syncMoods(mockEntries);
      } catch (err) {
        console.warn('Failed to sync seeded moods to cloud database', err);
      }

      // Reload dashboard view and platform stats
      await loadData();
      await loadPlatformStats();
      
      // Navigate to insights tab in case they clicked it from elsewhere
      setActiveTab('insights');
    } catch (err) {
      console.error('Failed to seed mock data', err);
    } finally {
      setLoading(false);
    }
  };

  // Mock scenarios for the recruiter demo
  const handleLoadDemo = async (scenario) => {
    setDemoLoaded(true);
    let messages = [];

    if (scenario === 'stress') {
      messages = [
        { id: uuidv4(), role: 'user', content: 'I am so stressed about my upcoming board exams. I feel like I am going to fail everyone and my parents will be so disappointed.', created_at: new Date(Date.now() - 50000).toISOString(), synced: true },
        { id: uuidv4(), role: 'assistant', content: 'I hear you, and it is completely natural to feel overwhelmed. Board exams are a lot of pressure, but please remember that one exam does not define your worth or your future. Your family cares about you, not just your grades. Let us take a short, 3-minute breath together to relax. Would you like to try our Box Breathing exercise under the Wellness tab? 💚', created_at: new Date(Date.now() - 30000).toISOString(), synced: true }
      ];
    } else if (scenario === 'panic') {
      messages = [
        { id: uuidv4(), role: 'user', content: 'I am having a panic attack, I cannot breathe properly and everything feels like it is closing in on me.', created_at: new Date(Date.now() - 50000).toISOString(), synced: true },
        { id: uuidv4(), role: 'assistant', content: 'Please stay with me, you are safe. Let us do a simple grounding activity to bring you back. Let us try the 5-4-3-2-1 technique: 👀 Tell me 5 things you can see around you right now. Take it one thing at a time, I am right here with you.', created_at: new Date(Date.now() - 30000).toISOString(), synced: true }
      ];
    } else if (scenario === 'crisis') {
      messages = [
        { id: uuidv4(), role: 'user', content: 'I want to end my life, everything is too painful and I cannot do this anymore.', created_at: new Date(Date.now() - 50000).toISOString(), synced: true },
        { id: uuidv4(), role: 'assistant', content: 'This is important and you deserve real help right now. Please reach out to iCall at 9152987821 or the KIRAN helpline at 1800-599-0019 (free, 24/7). Please talk to a trusted adult. You are not alone.', created_at: new Date(Date.now() - 30000).toISOString(), synced: true }
      ];
    }

    // Save mock messages to local IndexedDB so recruiter can immediately view them on `/chat` route!
    for (const msg of messages) {
      await saveMessage(msg);
    }
    
    // Shift directly to conversation/chat view
    navigate('/chat');
    setDemoLoaded(false);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading your emotional analytics...</div>;
  }

  return (
    <div className="view-container animate-fade-in" style={{ padding: '1rem', paddingBottom: '80px' }}>
      
      {/* Segmented Tab Control */}
      <div style={{
        display: 'flex',
        background: 'var(--surface-bg)',
        padding: '4px',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        border: '1px solid var(--border-color)'
      }}>
        <button 
          onClick={() => setActiveTab('insights')} 
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            background: activeTab === 'insights' ? 'var(--surface-card)' : 'transparent',
            color: activeTab === 'insights' ? 'var(--color-primary-500)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'insights' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          👤 My Insights
        </button>
        <button 
          onClick={() => setActiveTab('platform')} 
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            background: activeTab === 'platform' ? 'var(--surface-card)' : 'transparent',
            color: activeTab === 'platform' ? 'var(--color-primary-500)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'platform' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          🏆 Platform & Tech (Judges / Recruiters)
        </button>
      </div>

      {activeTab === 'insights' ? (
        <>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Your Emotional Dashboard</h2>
          
          {timeline.length === 0 ? (
            <div className="card text-center text-muted" style={{ padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '3rem', margin: 0, animation: 'bounce 2s infinite' }}>📊</div>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>No Mood Data Yet</h3>
              <p style={{ fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto 6px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                Your emotional heatmap is empty. You can do a quick check-in under the Mood tab, or instantly populate it with 7 days of beautiful wellness demo data!
              </p>
              <button 
                className="btn btn-primary"
                onClick={handleSeedMockData}
                style={{ 
                  padding: '10px 20px', 
                  fontSize: '0.9rem', 
                  width: 'auto', 
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0, 128, 128, 0.2)',
                  fontWeight: '600',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ⚡ Populate Demo Insights
              </button>
            </div>
          ) : (
            <>
              {/* Mood Fluctuations Premium Area Chart */}
              <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--surface-card)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600' }}>Mood Fluctuations (30 Days)</h3>
                <div style={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                      <defs>
                        <linearGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary-400)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--color-primary-400)" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-neutral-100)" />
                      <XAxis 
                        dataKey="day" 
                        stroke="var(--text-muted)" 
                        fontSize={11} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={[1, 5]} 
                        ticks={[1, 2, 3, 4, 5]} 
                        stroke="var(--text-muted)" 
                        fontSize={14} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(tick) => {
                          const emojis = { 1: '😢', 2: '😔', 3: '😐', 4: '😊', 5: '😄' };
                          return emojis[tick] || tick;
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'var(--surface-card)', 
                          border: '1.5px solid var(--color-neutral-200)', 
                          borderRadius: '16px', 
                          boxShadow: 'var(--shadow-md)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.85rem'
                        }}
                        formatter={(value) => {
                          const labels = { 1: '😢 Very Sad', 2: '😔 Sad', 3: '😐 Okay', 4: '😊 Good', 5: '😄 Great' };
                          return [labels[value] || value, 'Mood'];
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="mood_score" 
                        stroke="var(--color-primary-500)" 
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#moodAreaGrad)"
                        dot={{ fill: 'var(--color-primary-500)', stroke: '#fff', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, strokeWidth: 0 }} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Common Stressors Premium Horizontal Bar Chart */}
              {tagData.length > 0 && (
                <div className="card" style={{ background: 'var(--surface-card)' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600' }}>Common Stressors</h3>
                  <div style={{ height: 220, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tagData} layout="vertical" margin={{ top: 5, right: 15, bottom: 5, left: -10 }}>
                        <defs>
                          <linearGradient id="stressBarGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--color-secondary-100)" />
                            <stop offset="100%" stopColor="var(--color-secondary-400)" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-neutral-100)" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="var(--text-primary)" 
                          fontSize={13} 
                          tickLine={false}
                          axisLine={false}
                          width={80}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(139, 111, 212, 0.05)', radius: 8 }}
                          contentStyle={{ 
                            background: 'var(--surface-card)', 
                            border: '1.5px solid var(--color-neutral-200)', 
                            borderRadius: '16px', 
                            boxShadow: 'var(--shadow-md)',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.85rem'
                          }}
                          formatter={(value) => [`${value} Check-ins`, 'Frequency']}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="url(#stressBarGrad)" 
                          radius={[0, 8, 8, 0]} 
                          barSize={14} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Impact & Architecture Showcase</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Saathi is an award-grade rural-focused platform addressing extreme accessibility, network challenges, low literacy, and robust safety rules.
            </p>
          </div>

          {/* 🏆 HACKATHON PITCH HELPER */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(79, 139, 122, 0.08) 0%, rgba(200, 150, 100, 0.05) 100%)',
            border: '1.5px solid rgba(79, 139, 122, 0.2)',
            boxShadow: '0 8px 32px 0 rgba(79, 139, 122, 0.05)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-400))',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              padding: '4px 10px',
              borderBottomLeftRadius: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Pitch Deck Companion
            </div>
            
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              🏆 Hackathon Pitch Helper <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>(Read this to Judges!)</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>🎯 The 30-Second Hook:</strong>
                "In rural India, millions of teenagers battle academic anxiety and severe emotional distress in silence, blocked by social stigma and poor 2G/3G connectivity. **Saathi** is a bilingual offline-first wellness companion that brings deep, parental-grade emotional counseling right to their pocket—with zero friction, offline database sync, and real-time safety intercepts that act before severe distress strikes."
              </div>

              <div style={{ borderTop: '1px solid rgba(79, 139, 122, 0.1)', paddingTop: '8px' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>⚡ Technical Secret Sauce (What to brag about):</strong>
                <ul style={{ paddingLeft: '14px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <li><strong>Offline-First Database:</strong> Utilizes IndexedDB + Service Worker to queue chats, mood check-ins, and journals offline, auto-syncing to Supabase the split-second a connection returns.</li>
                  <li><strong>Hybrid Crisis Intercept:</strong> Combines a blazing-fast local keyword engine with a second-pass **AI Safety Classifier** using Gemini Flash to catch subtle, indirect cries for help (e.g. "tired of everything").</li>
                  <li><strong>Dual Voice Synthesis:</strong> Integrated Web Speech APIs supporting both Speech-to-Text and Text-to-Speech to make support accessible to low-literacy teens.</li>
                </ul>
              </div>

              <div style={{ borderTop: '1px solid rgba(79, 139, 122, 0.1)', paddingTop: '8px' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>🎬 Perfect Demo Sequence:</strong>
                <ol style={{ paddingLeft: '14px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <li><strong>Step 1:</strong> Seed a 7-day mood timeline below to populate the live glassmorphic charts in the Insights tab.</li>
                  <li><strong>Step 2:</strong> Go to the Chat tab and type one of the crisis test scenarios below (e.g., severe panic or indirect hopelessness).</li>
                  <li><strong>Step 3:</strong> Show how the safety pipeline intercepts the message, overrides the LLM, and immediately displays verified human helplines (Kiran/iCall).</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Impact Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px'
          }}>
            <div className="card" style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-primary-500)', lineHeight: '1.2' }}>
                {(platformStats?.teensSupported ?? 0).toLocaleString()}+
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Teens Supported</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-secondary-600)', lineHeight: '1.2' }}>
                {(platformStats?.wellnessChats ?? 0).toLocaleString()}+
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Wellness Chats</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ef4444', lineHeight: '1.2' }}>
                {(platformStats?.crisisInterventions ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Crisis Interventions</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981', lineHeight: '1.2' }}>
                {(platformStats?.offlineSyncs ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Offline Syncs</div>
            </div>
          </div>

          {/* Interactive Demo Scenarios */}
          <div className="card" style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontSize: '0.95rem' }}>⚡ Interactive Demo Scenarios</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '10px' }}>
              Pre-seed high-fidelity scenario prompts into the active chat session to test safety & empathy pipelines.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleLoadDemo('stress')} 
                disabled={demoLoaded}
                style={{ textAlign: 'left', fontSize: '0.8rem', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>📚 Test Scenario: High Exam Stress</span>
                <span style={{ fontSize: '0.7rem', opacity: '0.8', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Empathy Test</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleLoadDemo('panic')} 
                disabled={demoLoaded}
                style={{ textAlign: 'left', fontSize: '0.8rem', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🌪️ Test Scenario: Severe Panic Attack</span>
                <span style={{ fontSize: '0.7rem', opacity: '0.8', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Grounding Test</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleLoadDemo('crisis')} 
                disabled={demoLoaded}
                style={{ textAlign: 'left', fontSize: '0.8rem', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🛡️ Test Scenario: Crisis Helpline Intercept</span>
                <span style={{ fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Immediate Safety Intercept</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={handleSeedMockData} 
                disabled={loading}
                style={{ 
                  textAlign: 'left', 
                  fontSize: '0.8rem', 
                  padding: '8px 10px',
                  border: '1.5px dashed var(--color-primary-500)',
                  background: 'rgba(79, 139, 122, 0.04)',
                  color: 'var(--color-primary-600)',
                  fontWeight: '600',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>📊 Seed 7-Day Mood Timeline</span>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Populate Charts</span>
              </button>
            </div>
          </div>

          {/* Architecture Pipeline Visual (SVG/CSS) */}
          <div className="card" style={{ overflowX: 'auto', padding: '14px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.95rem' }}>🛠️ Offline-First & AI Safety Pipeline</h3>
            
            {/* SVG Pipeline */}
            <div style={{ minWidth: '450px', textAlign: 'center', padding: '6px 0' }}>
              <svg width="450" height="150" viewBox="0 0 450 150" style={{ margin: '0 auto', display: 'block' }}>
                <defs>
                  {/* Glowing drop shadow filter */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="var(--color-primary-500)" floodOpacity="0.15" />
                  </filter>
                  <filter id="glow-sec" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="var(--color-secondary-500)" floodOpacity="0.15" />
                  </filter>
                  <filter id="glow-em" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#10b981" floodOpacity="0.15" />
                  </filter>

                  {/* Gradient fills for nodes */}
                  <linearGradient id="node1-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--surface-card)" />
                    <stop offset="100%" stopColor="var(--surface-bg)" />
                  </linearGradient>
                  
                  {/* Arrow markers */}
                  <marker id="arrow-prim" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-primary-500)" />
                  </marker>
                  <marker id="arrow-sec" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-secondary-500)" />
                  </marker>
                  <marker id="arrow-em" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                  </marker>
                </defs>

                {/* Step 1: UI Chat */}
                <rect x="5" y="45" width="85" height="60" rx="8" fill="url(#node1-grad)" stroke="var(--border-color)" strokeWidth="1.5" filter="url(#glow)" />
                <text x="47" y="65" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" fontSize="9.5" fontWeight="bold">UI Chat View</text>
                <text x="47" y="80" dominantBaseline="middle" textAnchor="middle" fill="var(--color-primary-500)" fontSize="8.5" fontWeight="600">Speech & Text</text>
                <text x="47" y="93" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7">Local User Input</text>

                {/* Animated Connector 1 */}
                <line x1="90" y1="75" x2="115" y2="75" stroke="var(--color-primary-400)" strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#arrow-prim)">
                  <animate attributeName="stroke-dashoffset" values="18;0" dur="0.9s" repeatCount="indefinite" />
                </line>

                {/* Step 2: SW & IndexedDB */}
                <rect x="120" y="40" width="95" height="70" rx="8" fill="url(#node1-grad)" stroke="var(--color-primary-500)" strokeWidth="1.8" filter="url(#glow)" />
                <text x="167" y="58" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" fontSize="9.5" fontWeight="bold">Service Worker</text>
                <text x="167" y="73" dominantBaseline="middle" textAnchor="middle" fill="var(--color-primary-500)" fontSize="9" fontWeight="bold">& IndexedDB</text>
                <text x="167" y="88" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7.5">Offline Storage Queue</text>
                <text x="167" y="98" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7">Instant Caching</text>

                {/* Animated Connector 2 */}
                <line x1="215" y1="75" x2="240" y2="75" stroke="var(--color-secondary-400)" strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#arrow-sec)">
                  <animate attributeName="stroke-dashoffset" values="18;0" dur="0.9s" repeatCount="indefinite" />
                </line>

                {/* Step 3: Express API */}
                <rect x="245" y="40" width="95" height="70" rx="8" fill="url(#node1-grad)" stroke="var(--color-secondary-500)" strokeWidth="1.8" filter="url(#glow-sec)" />
                <text x="292" y="58" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" fontSize="9.5" fontWeight="bold">Express API</text>
                <text x="292" y="73" dominantBaseline="middle" textAnchor="middle" fill="var(--color-secondary-500)" fontSize="9" fontWeight="bold">& Crisis Guard</text>
                <text x="292" y="88" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7.5">Pre-flight Safety Pass</text>
                <text x="292" y="98" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7">AI Crisis Classifier</text>

                {/* Animated Connector 3 */}
                <line x1="340" y1="75" x2="365" y2="75" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#arrow-em)">
                  <animate attributeName="stroke-dashoffset" values="18;0" dur="0.9s" repeatCount="indefinite" />
                </line>

                {/* Step 4: Gemini AI & Supabase */}
                <rect x="370" y="40" width="75" height="70" rx="8" fill="url(#node1-grad)" stroke="#10b981" strokeWidth="1.8" filter="url(#glow-em)" />
                <text x="407" y="58" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" fontSize="9.5" fontWeight="bold">Gemini 2.0</text>
                <text x="407" y="73" dominantBaseline="middle" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">& Supabase</text>
                <text x="407" y="88" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7.5">Tuned Empathy</text>
                <text x="407" y="98" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7">Secure Decaying DB</text>
              </svg>
            </div>
          </div>


          {/* Safe Teen Wellness Section */}
          <div className="card">
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1rem' }}>🛡️ How Saathi Safe-Guards Teenagers</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '12px' }}>
              We implement industry-grade AI safety to fully protect young users:
            </p>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Pre-flight Keyword Moderation:</strong> Instantly intercepts suicide, self-harm, and abuse keywords, bypassing the LLM entirely to deliver immediate verified human helplines (KIRAN, iCall).</li>
              <li><strong>PII Scrubbing:</strong> Automatic stripping of email addresses, phone numbers, and Aadhar credentials prior to sending to LLMs.</li>
              <li><strong>LLM Toxicity Control:</strong> Configured with high-sensitivity Google safety settings to block dangerous, hostile, or sexually explicit content generation.</li>
              <li><strong>Contextual Memory Decay:</strong> Retains only critical wellness coping facts, automatically discarding sensitive user conversations periodically.</li>
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}
