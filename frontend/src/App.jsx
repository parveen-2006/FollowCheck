import { useMemo, useRef, useState } from 'react'
import { Activity, ArrowDownLeft, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3, Download, FileArchive, FileJson2, Heart, LockKeyhole, Search, ShieldCheck, Sparkles, Trash2, Upload, Users, UserRoundX, UserPlus, X, Sun, Moon, FileUp } from 'lucide-react'
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination } from '@mui/material'
import { compareAccounts, compareSnapshots } from './lib/comparison.js'
import { parseInstagramFiles } from './lib/instagramParser.js'
import { exportCSV } from './lib/exportCSV.js'

const STORAGE_KEY = 'orbit.instagram.snapshot'
const tabs = [
  { id: 'notFollowingBack', label: 'They don’t follow you back', icon: UserRoundX, tint: 'rose' },
  { id: 'fans', label: 'You haven’t followed back', icon: UserPlus, tint: 'violet' },
  { id: 'mutual', label: 'Mutual followers', icon: Heart, tint: 'emerald' }
]
const readSnapshot = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null } }

function App() {
  const [snapshot, setSnapshot] = useState(readSnapshot)
  const [activeTab, setActiveTab] = useState('notFollowingBack')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [notice, setNotice] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [theme, setTheme] = useState(() => localStorage.getItem('orbit.theme') || 'light')
  const [isDragging, setIsDragging] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const inputRef = useRef(null)
  const folderInputRef = useRef(null)
  const result = snapshot?.result
  const filtered = useMemo(() => (result?.[activeTab] || []).filter(name => name.includes(query.trim().replace(/^@/, '').toLowerCase())), [result, activeTab, query])
  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const history = useMemo(() => snapshot?.previous ? compareSnapshots(snapshot.previous, result) : null, [snapshot, result])
  const tab = tabs.find(item => item.id === activeTab)

  async function upload(files) {
    if (!files?.length) return
    setBusy(true); setError(''); setNotice(''); setProgress(12)
    const timer = setInterval(() => setProgress(value => Math.min(value + 7, 86)), 150)
    try {
      const accounts = await parseInstagramFiles([...files])
      setProgress(92)
      if (!accounts.diagnostics.followerFilesDetected || !accounts.diagnostics.followingFilesDetected) {
        throw new Error([...accounts.diagnostics.parsingErrors, `Detected ${accounts.diagnostics.followerFilesDetected} follower file(s), ${accounts.followers.length} unique followers, and ${accounts.following.length} unique following.`].join(' '))
      }
      const nextResult = compareAccounts(accounts.followers, accounts.following)
      const previous = snapshot?.result ? { followers: snapshot.result.followers, following: snapshot.result.following } : null
      const next = { result: nextResult, previous, uploadedAt: new Date().toISOString(), diagnostics: accounts.diagnostics }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setSnapshot(next); setActiveTab('notFollowingBack'); setQuery(''); setPage(0)
      setProgress(100); setNotice(''); setShowUploadModal(true)
    } catch (cause) { setError(cause.message || 'We couldn’t read those files. Check the export and try again.') }
    finally { clearInterval(timer); setBusy(false); setTimeout(() => setProgress(0), 900) }
  }

  function clearData() {
    localStorage.removeItem(STORAGE_KEY); setSnapshot(null); setError(''); setNotice('Local snapshot erased.'); setShowHistory(false)
  }

  const stats = result ? [
    { label: 'Followers', value: result.followers.length, note: 'Following your account', icon: Users, tone: 'blue' },
    { label: 'Following', value: result.following.length, note: 'Accounts you follow', icon: Activity, tone: 'violet' },
    { label: 'Mutual followers', value: result.mutual.length, note: 'You follow each other', icon: Heart, tone: 'green' },
    { label: 'They don’t follow you back', value: result.notFollowingBack.length, note: 'You follow them; they don’t follow you', icon: UserRoundX, tone: 'orange' },
    { label: 'You haven’t followed back', value: result.fans.length, note: 'They follow you; you don’t follow them', icon: Sparkles, tone: 'pink' }
  ] : []
  const ratio = result?.following.length ? (result.followers.length / result.following.length).toFixed(2) : '—'
  const shownDate = snapshot?.uploadedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(snapshot.uploadedAt)) : ''

  return <div className="app-shell" data-theme={theme}>
    <main className="main-content">
      <div className="content-wrap"><section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR SOCIAL CIRCLE, IN FOCUS</div><h1>Know where you <span>stand.</span></h1><p className="subtitle">A clearer picture of your Instagram connections. Private by design.</p></div><div className="welcome-actions"><button className="button button-theme" onClick={() => setTheme(current => { const next = current === 'light' ? 'dark' : 'light'; localStorage.setItem('orbit.theme', next); return next })} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>{theme === 'light' ? <Moon size={16}/> : <Sun size={16}/>}<span>{theme === 'light' ? 'Dark' : 'Light'} mode</span></button><button className="button button-primary upload-main" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={16}/>{busy ? 'Reading export…' : 'Upload export'}</button></div></section>

      {error && <div className="alert alert-error"><X size={16}/><span>{error}</span><button onClick={() => setError('')}><X size={15}/></button></div>}
      {notice && <div className="alert alert-success"><Check size={16}/><span>{notice}</span><button onClick={() => setNotice('')}><X size={15}/></button></div>}
      {busy && <div className="progress-card"><div className="progress-heading"><span><span className="spinner"/> Reading your export locally</span><strong>{progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{width: `${progress}%`}}/></div><small>Your data never leaves this browser.</small></div>}

      {!result ? <section className={`upload-card ${isDragging ? 'drag-active' : ''}`} onDragEnter={event => {event.preventDefault(); setIsDragging(true)}} onDragOver={event => event.preventDefault()} onDragLeave={event => {if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false)}} onDrop={event => {event.preventDefault(); setIsDragging(false); upload(event.dataTransfer.files)}}><div className="upload-orbit orbit-one"/><div className="upload-orbit orbit-two"/><div className="upload-illustration"><FileArchive size={25}/><span className="file-chip"><FileJson2 size={14}/></span></div><h2>{isDragging ? 'Drop your export here' : 'Start with your Instagram export'}</h2><p>Drop your ZIP or JSON files here, or choose your original ZIP, follower and following files, or exported folder.</p><div className="upload-options"><button className="button button-primary" onClick={() => inputRef.current?.click()}><Upload size={15}/> Choose files</button><button className="button button-export" onClick={() => folderInputRef.current?.click()}><FileJson2 size={15}/> Choose folder</button></div><div className="accepted-files"><span><Check size={12}/> ZIP export</span><span><Check size={12}/> JSON files</span><span><Check size={12}/> Folder</span></div><div className="where-hint">Find your export under <b>connections/follower-and-following</b>.</div></section> : <>
        <div className="snapshot-strip"><div className="snapshot-left"><span className="snapshot-icon"><Check size={14}/></span><div><strong>Snapshot updated</strong><span>Last uploaded {shownDate} <span className="bullet">·</span> Comparison is based on this export</span></div></div><div className="snapshot-right"><span className="ratio-label">FOLLOWER / FOLLOWING RATIO <b>{ratio}</b></span><button className="text-button" onClick={() => setShowHistory(value => !value)}><Clock3 size={14}/> {showHistory ? 'Hide history' : 'View history'}</button></div></div>
        {showHistory && <section className="history-card"><div className="section-heading"><div><span className="section-kicker">SNAPSHOT COMPARISON</span><h2>What changed</h2></div><span className="history-note">Compared with your previous upload</span></div>{history ? <div className="history-grid">{[{key:'newFollowers',label:'New followers',icon:ArrowDownLeft,color:'green'},{key:'lostFollowers',label:'Lost followers',icon:ArrowUpRight,color:'rose'},{key:'newFollowing',label:'New following',icon:ArrowUpRight,color:'violet'},{key:'unfollowedAccounts',label:'Unfollowed accounts',icon:ArrowDownLeft,color:'orange'}].map(item => <div className="history-item" key={item.key}><div className={`history-icon ${item.color}`}><item.icon size={15}/></div><div><span>{item.label}</span><strong>{history[item.key].length}</strong><small>{history[item.key].length ? history[item.key].slice(0,3).map(name => `@${name}`).join(', ') : 'No changes'}</small></div></div>)}</div> : <div className="history-empty"><Clock3 size={16}/> Upload another export to compare snapshots. These changes reflect the time between exports.</div>}</section>}
        <section className="validation-strip"><div><Check size={14}/><b>Export validated</b><span>{snapshot.diagnostics?.followerFilesDetected || 0} follower file(s) detected</span></div><div><Users size={14}/><b>{result.followers.length.toLocaleString()}</b><span>unique followers</span></div><div><Activity size={14}/><b>{result.following.length.toLocaleString()}</b><span>unique following</span></div><div><FileJson2 size={14}/><b>{snapshot.diagnostics?.filesIgnored?.length || 0}</b><span>files ignored</span></div><div className={snapshot.diagnostics?.parsingErrors?.length ? 'has-errors' : ''}><CircleHelp size={14}/><b>{snapshot.diagnostics?.parsingErrors?.length || 0}</b><span>parsing errors</span></div></section>
        {!!snapshot.diagnostics?.parsingErrors?.length && <details className="diagnostic-details"><summary>Review parsing notes</summary><ul>{snapshot.diagnostics.parsingErrors.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
        <section className="stats-grid">{stats.map((stat, index) => <article className={`stat-card ${index === 2 ? 'featured' : ''}`} key={stat.label}><div className="stat-top"><span className="stat-label">{stat.label}</span><div className={`stat-icon ${stat.tone}`}><stat.icon size={17}/></div></div><strong className="stat-value">{stat.value.toLocaleString()}</strong><span className="stat-note">{stat.note}</span><span className="stat-decoration"/></article>)}</section>

        <section className="list-panel"><div className="list-header"><div><div className="section-kicker">YOUR CONNECTIONS</div><h2>Account breakdown</h2><p>Explore how your circles overlap.</p></div><div className="list-controls"><label className="search-box"><Search size={16}/><input aria-label="Search usernames" placeholder="Search usernames…" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14}/></button>}</label><button className="button button-export" onClick={() => exportCSV(activeTab, result[activeTab])}><Download size={15}/> Export CSV</button></div></div>
          <div className="tabs" role="tablist">{tabs.map(item => <button role="tab" aria-selected={activeTab === item.id} className={`tab ${activeTab === item.id ? 'is-active' : ''}`} key={item.id} onClick={() => {setActiveTab(item.id); setQuery(''); setPage(0)}}><item.icon size={15}/>{item.label}<span className="tab-count">{result[item.id].length.toLocaleString()}</span></button>)}</div>
          <div className="list-meta"><span>{tab.label} <b>{result[activeTab].length.toLocaleString()}</b></span><span>Sorted alphabetically <ChevronDown size={13}/></span></div>
          {filtered.length ? <TableContainer component={Paper} elevation={0} className="mui-table-wrap"><Table size="small" aria-label={`${tab.label} accounts`}><TableHead><TableRow><TableCell>ACCOUNT</TableCell><TableCell>USERNAME</TableCell><TableCell>RELATIONSHIP</TableCell></TableRow></TableHead><TableBody>{pageRows.map((username, index) => <TableRow key={username} hover><TableCell><span className={`avatar avatar-${(page * rowsPerPage + index) % 5}`}>{username.slice(0,1).toUpperCase()}</span></TableCell><TableCell><span className="account-handle">@{username}</span></TableCell><TableCell><span className="account-state"><span className="state-dot"/> Instagram account</span></TableCell></TableRow>)}</TableBody></Table><TablePagination component="div" count={filtered.length} page={Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1))} onPageChange={(_, nextPage) => setPage(nextPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={event => {setRowsPerPage(parseInt(event.target.value, 10)); setPage(0)}} rowsPerPageOptions={[10,20,50,100]} labelRowsPerPage="Rows:"/></TableContainer> : <div className="empty-list"><div className="empty-icon"><Search size={19}/></div><strong>{query ? 'No usernames found' : `No ${tab.label.toLowerCase()}`}</strong><span>{query ? 'Try another search term.' : 'This list is empty in your current snapshot.'}</span></div>}
          <div className="list-footer"><span>Showing <b>{filtered.length ? page * rowsPerPage + 1 : 0}–{Math.min((page + 1) * rowsPerPage, filtered.length)}</b> of <b>{filtered.length}</b> filtered accounts</span><span><ShieldCheck size={13}/> Private on this device</span></div>
        </section>
        <div className="data-actions"><span>Manage your saved snapshot</span><button onClick={clearData}><Trash2 size={14}/> Erase local data</button></div>
      </>}
      <footer className="main-footer"><span>ORBIT <span className="brand-dot">·</span> PERSONAL FOLLOWER TRACKER</span><span><LockKeyhole size={12}/> No login. No tracking. Just your data.</span></footer>
      </div>
    </main>
    <input ref={inputRef} className="hidden-input" type="file" accept=".zip,.json,application/json,application/zip" multiple onChange={event => {upload(event.target.files); event.target.value = ''}}/>
    <input ref={folderInputRef} className="hidden-input" type="file" webkitdirectory="" directory="" multiple onChange={event => {upload(event.target.files); event.target.value = ''}}/>
    {showUploadModal && <div className="modal-backdrop" role="presentation"><section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title"><div className="modal-check"><Check size={22}/></div><h2 id="upload-modal-title">Export uploaded</h2><p>Your Instagram data was processed on this device. Your lists are now up to date.</p><button className="button button-primary modal-ok" onClick={() => setShowUploadModal(false)}>OK</button></section></div>}
  </div>
}

export default App

