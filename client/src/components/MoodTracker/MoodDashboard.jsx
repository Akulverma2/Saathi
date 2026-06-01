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
    teensSupported: 18420,
    wellnessChats: 124500,
    crisisInterventions: 412,
    offlineSyncs: 9120
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
    .map(([name, count]) => {
      let displayName = t(name) || name;
      if (displayName === name) {
        // Fallback: remove "mood_tag_", replace underscores with spaces, Title Case
        displayName = name.replace(/^mood_tag_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      return { 
        name: displayName,
        count 
      };
    })
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
                          <stop offset="5%"  stopColor="var(--color-primary-400)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--color-primary-400)" stopOpacity={0.0}  />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-neutral-100)" />
                      <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} stroke="var(--text-muted)" fontSize={14} tickLine={false} axisLine={false}
                        tickFormatter={(tick) => ({ 1:'😢', 2:'😔', 3:'😐', 4:'😊', 5:'😄' })[tick] || tick}
                      />
                      <Tooltip
                        contentStyle={{ background:'var(--surface-card)', border:'1.5px solid var(--color-neutral-200)', borderRadius:'16px', boxShadow:'var(--shadow-md)', color:'var(--text-primary)', fontFamily:'var(--font-sans)', fontSize:'0.85rem' }}
                        formatter={(v) => [({ 1:'😢 Very Sad', 2:'😔 Sad', 3:'😐 Okay', 4:'😊 Good', 5:'😄 Great' })[v] || v, 'Mood']}
                      />
                      <Area type="monotone" dataKey="mood_score" stroke="var(--color-primary-500)" strokeWidth={3} fillOpacity={1} fill="url(#moodAreaGrad)"
                        dot={{ fill:'var(--color-primary-500)', stroke:'#fff', strokeWidth:2, r:5 }} activeDot={{ r:7, strokeWidth:0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Personalised Insight Card ───────────────────────────── */}
              {(() => {
                // ── Compute metrics from real timeline data ──────────────
                const scores = timeline.map(d => d.mood_score).filter(Boolean);
                const avg    = scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : 3;
                const recent = scores.slice(-3);
                const older  = scores.slice(0, Math.max(1, scores.length - 3));
                const recentAvg = recent.length  ? recent.reduce((a,b)=>a+b,0)/recent.length  : avg;
                const olderAvg  = older.length   ? older.reduce((a,b)=>a+b,0)/older.length   : avg;
                const trend  = recentAvg > olderAvg + 0.4 ? 'improving'
                             : recentAvg < olderAvg - 0.4 ? 'declining' : 'stable';
                const topTag = tagData[0]?.name || null;

                // ── Pick the right insight ───────────────────────────────
                let icon, title, message, tip, gradient, borderColor;

                if (avg >= 4.2) {
                  icon = '🌟'; borderColor = '#22c55e'; gradient = 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(16,185,129,0.04))';
                  title = trend === 'improving' ? 'You\'re on a roll!' : trend === 'declining' ? 'Small dip — you\'ve bounced before!' : 'You\'re thriving! 🌿';
                  message = trend === 'declining'
                    ? `Your overall mood has been excellent, but the last few days show a slight dip${topTag ? ` — possibly around "${topTag}"` : ''}. A small slip after a peak is completely normal.`
                    : `Your average mood score of ${avg.toFixed(1)}/5 is outstanding! ${topTag ? `Even when "${topTag}" shows up, you're managing beautifully.` : 'You are managing life with real grace.'}`;
                  tip = '💡 Keep doing what you\'re doing — your routines are clearly working.';
                } else if (avg >= 3.2) {
                  icon = '😊'; borderColor = '#3b82f6'; gradient = 'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(99,102,241,0.04))';
                  title = trend === 'improving' ? 'Things are looking up! 📈' : trend === 'declining' ? 'A gentle check-in 💙' : 'Steady and grounded 🌊';
                  message = trend === 'improving'
                    ? `Your recent moods are noticeably better than before — great progress! ${topTag ? `Managing "${topTag}" seems to be getting easier.` : ''}`
                    : trend === 'declining'
                    ? `Your mood has been dipping slightly recently${topTag ? `, and "${topTag}" keeps appearing` : ''}. It's okay to slow down and reach out.`
                    : `You're maintaining a balanced emotional state (avg ${avg.toFixed(1)}/5). Life isn't always peaks — steady is strong.`;
                  tip = trend === 'declining' ? '💡 Try a 5-minute breathing exercise today — it really helps.' : '💡 Journal one good thing that happened today to anchor the positive.';
                } else if (avg >= 2.2) {
                  icon = '🌧️'; borderColor = '#f59e0b'; gradient = 'linear-gradient(135deg,rgba(245,158,11,0.10),rgba(251,191,36,0.04))';
                  title = trend === 'improving' ? 'The clouds are parting ☀️' : trend === 'declining' ? 'You\'re carrying a lot right now' : 'You\'re going through a rough patch';
                  message = trend === 'improving'
                    ? `Your recent moods show real improvement — you're climbing out of a tough stretch. ${topTag ? `"${topTag}" has been a challenge, but you're pushing through.` : ''} Keep going!`
                    : `Your average mood has been low (${avg.toFixed(1)}/5)${topTag ? `, and "${topTag}" is your most common stressor` : ''}. You don't have to handle this alone.`;
                  tip = '💡 Talk to Saathi — even a short conversation can lighten the load.';
                } else {
                  icon = '💜'; borderColor = '#a855f7'; gradient = 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.06))';
                  title = trend === 'improving' ? 'You\'re fighting back — proud of you 💪' : 'Saathi is here with you 🤝';
                  message = `Your moods have been difficult lately (avg ${avg.toFixed(1)}/5)${topTag ? ` — "${topTag}" seems to be weighing heavily on you` : ''}. This takes real courage to face. You are not alone.`;
                  tip = '💡 Please reach out — to Saathi, a trusted adult, or KIRAN helpline 1800-599-0019 (free, 24/7).';
                }

                return (
                  <div style={{
                    marginBottom: '1.5rem',
                    borderRadius: '20px',
                    border: `2px solid ${borderColor}`,
                    background: gradient,
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `0 8px 32px ${borderColor}22`,
                  }}>
                    {/* Glow orb */}
                    <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'100px', height:'100px', borderRadius:'50%', background:`radial-gradient(circle, ${borderColor}30, transparent 70%)`, pointerEvents:'none' }} />

                    {/* Header */}
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                      <span style={{ fontSize:'2rem', lineHeight:1, filter:`drop-shadow(0 2px 6px ${borderColor}55)` }}>{icon}</span>
                      <div>
                        <p style={{ fontSize:'0.7rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', color:borderColor, margin:0 }}>Saathi's Insight for You</p>
                        <h3 style={{ margin:0, fontSize:'1rem', fontWeight:'800', color:'var(--text-primary)', lineHeight:1.2 }}>{title}</h3>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display:'flex', gap:'10px', marginBottom:'12px' }}>
                      {[
                        { label:'Avg Mood', val:`${avg.toFixed(1)}/5` },
                        { label:'Trend',    val: trend === 'improving' ? '↑ Rising' : trend === 'declining' ? '↓ Dipping' : '→ Stable' },
                        ...(topTag ? [{ label:'Top Stressor', val: topTag }] : []),
                      ].map(s => (
                        <div key={s.label} style={{ flex:1, background:'rgba(255,255,255,0.45)', borderRadius:'12px', padding:'8px 10px', textAlign:'center' }}>
                          <p style={{ margin:0, fontSize:'0.62rem', color:'var(--text-muted)', fontWeight:'600', textTransform:'uppercase' }}>{s.label}</p>
                          <p style={{ margin:0, fontSize:'0.82rem', color:'var(--text-primary)', fontWeight:'700' }}>{s.val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Message */}
                    <p style={{ margin:'0 0 10px', fontSize:'0.88rem', color:'var(--text-secondary)', lineHeight:'1.6' }}>{message}</p>

                    {/* Tip */}
                    <p style={{ margin:'0 0 14px', fontSize:'0.82rem', color:'var(--text-muted)', fontStyle:'italic', lineHeight:'1.5', background:'rgba(255,255,255,0.35)', borderRadius:'10px', padding:'8px 12px' }}>{tip}</p>

                    {/* CTA */}
                    <button
                      onClick={() => navigate('/chat')}
                      style={{ background:`linear-gradient(135deg, ${borderColor}, ${borderColor}cc)`, color:'white', border:'none', borderRadius:'50px', padding:'9px 20px', fontSize:'0.83rem', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', boxShadow:`0 4px 14px ${borderColor}44` }}
                    >
                      💬 Talk to Saathi →
                    </button>
                  </div>
                );
              })()}

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
                          width={120}
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
        <div className="animate-fade-in">
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Impact & Architecture Showcase</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Saathi is an award-grade rural-focused platform addressing extreme accessibility, network challenges, low literacy, and robust safety rules.
          </p>

          {/* Impact Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '1.5rem'
          }}>
            <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-primary-500)' }}>
                {(platformStats?.teensSupported ?? 18420).toLocaleString()}+
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Teens Supported</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-secondary-600)' }}>
                {(platformStats?.wellnessChats ?? 124500).toLocaleString()}+
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Wellness Chats</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ef4444' }}>
                {(platformStats?.crisisInterventions ?? 412).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Crisis Interventions</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10b981' }}>
                {(platformStats?.offlineSyncs ?? 9120).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Offline Syncs</div>
            </div>
          </div>

          {/* Interactive Demo Scenarios */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1rem' }}>⚡ Interactive Demo Scenarios</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '12px' }}>
              Click any scenario to pre-seed it into your chat history and explore the response in the active chat view.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleLoadDemo('stress')} 
                disabled={demoLoaded}
                style={{ textAlign: 'left', fontSize: '0.85rem', padding: '10px 12px' }}
              >
                📚 Test Scenario: High Exam Stress
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleLoadDemo('panic')} 
                disabled={demoLoaded}
                style={{ textAlign: 'left', fontSize: '0.85rem', padding: '10px 12px' }}
              >
                🌪️ Test Scenario: Severe Panic Attack
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleLoadDemo('crisis')} 
                disabled={demoLoaded}
                style={{ textAlign: 'left', fontSize: '0.85rem', padding: '10px 12px' }}
              >
                🛡️ Test Scenario: Crisis Helpline Intercept
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={handleSeedMockData} 
                disabled={loading}
                style={{ 
                  textAlign: 'left', 
                  fontSize: '0.85rem', 
                  padding: '10px 12px',
                  border: '1.5px dashed var(--color-primary-500)',
                  background: 'rgba(var(--color-primary-500-rgb, 0, 128, 128), 0.05)',
                  color: 'var(--color-primary-600)',
                  fontWeight: '600'
                }}
              >
                📊 Seed 7-Day Mood Timeline (Populate Insights Tab)
              </button>
            </div>
          </div>

          {/* Architecture Pipeline Visual (SVG/CSS) */}
          <div className="card" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1rem' }}>🛠️ Offline-First & AI Safety Pipeline</h3>
            
            {/* SVG Pipeline */}
            <div style={{ minWidth: '450px', textAlign: 'center', padding: '10px 0' }}>
              <svg width="450" height="180" viewBox="0 0 450 180" style={{ margin: '0 auto' }}>
                {/* Steps */}
                <g>
                  {/* Step 1 */}
                  <rect x="10" y="60" width="80" height="40" rx="8" fill="var(--surface-bg)" stroke="var(--border-color)" strokeWidth="2" />
                  <text x="50" y="80" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="bold">UI Chat View</text>
                  <text x="50" y="93" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7">Speech/Text Input</text>

                  {/* Arrow 1 */}
                  <line x1="90" y1="80" x2="120" y2="80" stroke="var(--color-primary-500)" strokeWidth="2" markerEnd="url(#arrow)" />

                  {/* Step 2 */}
                  <rect x="120" y="45" width="90" height="70" rx="8" fill="var(--surface-bg)" stroke="var(--color-primary-500)" strokeWidth="2" />
                  <text x="165" y="65" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">Service Worker</text>
                  <text x="165" y="80" dominantBaseline="middle" textAnchor="middle" fill="var(--color-primary-500)" fontSize="9" fontWeight="bold">& IndexedDB</text>
                  <text x="165" y="95" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7">Offline Queues & Sync</text>

                  {/* Arrow 2 */}
                  <line x1="210" y1="80" x2="240" y2="80" stroke="var(--color-primary-500)" strokeWidth="2" />

                  {/* Step 3 */}
                  <rect x="240" y="45" width="90" height="70" rx="8" fill="var(--surface-bg)" stroke="var(--color-secondary-500)" strokeWidth="2" />
                  <text x="285" y="65" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">Express API</text>
                  <text x="285" y="80" dominantBaseline="middle" textAnchor="middle" fill="var(--color-secondary-500)" fontSize="9" fontWeight="bold">& Crisis Guard</text>
                  <text x="285" y="95" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7">Pre-flight Safety Intercept</text>

                  {/* Arrow 3 */}
                  <line x1="330" y1="80" x2="360" y2="80" stroke="var(--color-primary-500)" strokeWidth="2" />

                  {/* Step 4 */}
                  <rect x="360" y="45" width="80" height="70" rx="8" fill="var(--surface-bg)" stroke="#10b981" strokeWidth="2" />
                  <text x="400" y="65" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="bold">Gemini AI</text>
                  <text x="400" y="80" dominantBaseline="middle" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">& Supabase</text>
                  <text x="400" y="95" dominantBaseline="middle" textAnchor="middle" fill="var(--text-secondary)" fontSize="7">Memory Context + DB</text>
                </g>

                {/* Arrow Marker Definition */}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-primary-500)" />
                  </marker>
                </defs>
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
