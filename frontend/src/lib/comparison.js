export function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().replace(/^@+/, '').toLowerCase() : ''
}

export function compareAccounts(followers, following) {
  const followerSet = new Set(followers.map(normalizeUsername).filter(Boolean))
  const followingSet = new Set(following.map(normalizeUsername).filter(Boolean))
  const sorted = values => [...values].sort((a, b) => a.localeCompare(b))
  return {
    followers: sorted(followerSet), following: sorted(followingSet),
    notFollowingBack: sorted([...followingSet].filter(name => !followerSet.has(name))),
    fans: sorted([...followerSet].filter(name => !followingSet.has(name))),
    mutual: sorted([...followerSet].filter(name => followingSet.has(name)))
  }
}

export function compareSnapshots(previous, current) {
  const diff = (before, after) => [...new Set(after)].filter(name => !new Set(before).has(name)).sort()
  return {
    newFollowers: diff(previous.followers, current.followers),
    lostFollowers: diff(current.followers, previous.followers),
    newFollowing: diff(previous.following, current.following),
    unfollowedAccounts: diff(current.following, previous.following)
  }
}
