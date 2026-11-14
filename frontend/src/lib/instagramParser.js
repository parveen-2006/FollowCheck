import JSZip from 'jszip'
import { normalizeUsername } from './comparison.js'

function filenameRole(path) {
  const name = path.split('/').pop().toLowerCase()
  if (/^(recently_unfollowed_profiles|blocked_profiles|pending_follow_requests|follow_requests_you.ve_received|recent_follow_requests|close_friends|removed_suggestions|restricted_profiles)\.json$/.test(name)) return 'ignore'
  if (name === 'following.json') return 'following'
  if (/^followers?(?:[_-]?\d+)?\.json$/.test(name)) return 'followers'
  return null
}

function relationshipShape(data) {
  if (data && Array.isArray(data.relationships_following)) return 'following'
  if (Array.isArray(data) && data.some(row => Array.isArray(row?.string_list_data))) return 'followers'
  return null
}

function usernamesFrom(data, kind) {
  const rows = kind === 'following' ? data.relationships_following : data
  if (!Array.isArray(rows)) throw new Error(`Expected ${kind === 'following' ? 'relationships_following' : 'a follower relationship array'}.`)
  const names = []
  for (const row of rows) {
    if (!Array.isArray(row?.string_list_data)) continue
    for (const item of row.string_list_data) {
      // Instagram's following.json commonly omits `value` and stores the
      // account name in the relationship row's `title` (or only in href).
      const name = normalizeUsername(item?.value || row?.title || usernameFromHref(item?.href))
      if (name) names.push(name)
    }
  }
  return names
}

function usernameFromHref(href) {
  if (typeof href !== 'string') return ''
  try {
    const url = new URL(href)
    const parts = url.pathname.split('/').filter(Boolean)
    const marker = parts.indexOf('_u')
    return decodeURIComponent(parts[marker >= 0 ? marker + 1 : parts.length - 1] || '')
  } catch { return '' }
}

export async function parseInstagramFiles(files) {
  const candidates = []
  const diagnostics = { followerFilesDetected: 0, followingFilesDetected: 0, filesIgnored: [], parsingErrors: [] }
  for (const file of files) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      try {
        const zip = await JSZip.loadAsync(file)
        for (const [path, entry] of Object.entries(zip.files)) {
          if (!entry.dir && path.toLowerCase().endsWith('.json')) candidates.push({ path, read: () => entry.async('string') })
        }
      } catch (error) { diagnostics.parsingErrors.push(`${file.name}: ${error.message}`) }
    } else if (file.name.toLowerCase().endsWith('.json')) {
      candidates.push({ path: file.webkitRelativePath || file.name, read: () => file.text() })
    }
  }

  const followers = new Set(), following = new Set()
  let followingDetected = false
  for (const candidate of candidates) {
    const hint = filenameRole(candidate.path)
    if (hint === 'ignore') { diagnostics.filesIgnored.push(candidate.path.split('/').pop()); continue }
    let parsed
    try { parsed = JSON.parse(await candidate.read()) }
    catch (error) {
      // Parse relationship-looking files so malformed follower/following inputs are reported;
      // unrelated JSON files are ignored without noisy diagnostics.
      if (hint) diagnostics.parsingErrors.push(`${candidate.path}: invalid JSON (${error.message})`)
      else diagnostics.filesIgnored.push(candidate.path.split('/').pop())
      continue
    }
    const shape = relationshipShape(parsed)
    // A recognized Instagram filename is the strongest signal. Shape inference is
    // reserved for unfamiliar filenames and must never override following.json.
    const role = hint && hint !== 'ignore' ? hint : shape
    if (!role) {
      diagnostics.filesIgnored.push(candidate.path.split('/').pop())
      continue
    }
    try {
      const names = usernamesFrom(parsed, role)
      if (role === 'followers') {
        diagnostics.followerFilesDetected += 1
        names.forEach(name => followers.add(name))
      } else {
        diagnostics.followingFilesDetected += 1
        if (followingDetected) diagnostics.parsingErrors.push(`${candidate.path}: multiple following relationship files detected; this file was merged.`)
        followingDetected = true
        names.forEach(name => following.add(name))
      }
    } catch (error) { diagnostics.parsingErrors.push(`${candidate.path}: ${error.message}`) }
  }
  if (!diagnostics.followerFilesDetected) diagnostics.parsingErrors.push('No follower relationship files were detected. Select the Instagram connections/follower-and-following folder or ZIP.')
  if (!followingDetected) diagnostics.parsingErrors.push('No following.json relationship data was detected.')
  return { followers: [...followers], following: [...following], diagnostics }
}
