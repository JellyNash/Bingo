# Player PWA Runbook

## Overview
The Bingo Player PWA is a fully offline-capable Progressive Web App that allows players to join games, mark numbers, and claim wins through a mobile-optimized interface.

## Key Features
- **Installable PWA**: Add to home screen on mobile devices
- **Offline Support**: Cached game state with 24h expiry
- **Real-time Updates**: WebSocket connection for live game events
- **Security**: Ephemeral session tokens, persistent resume tokens
- **Accessibility**: ARIA-compliant with haptic feedback

## Installation & Updates

### Installing the PWA
1. Navigate to the Player app URL in mobile browser
2. Chrome/Edge: Tap "Add to Home Screen" prompt or menu option
3. Safari iOS: Share → Add to Home Screen
4. The app icon will appear on device home screen

### Update Flow
- Service worker auto-updates on deployment
- Users see "New version available" notification
- Clicking "Reload" installs the update immediately
- `skipWaiting` ensures instant activation

## Offline Behavior

### What Works Offline
- **View current card**: Cached grid and marks display
- **Mark numbers locally**: Optimistic updates (syncs when online)
- **View drawn numbers**: Last known state from cache
- **See winners**: Cached winner list

### What Requires Connection
- **Join new game**: Needs server validation
- **Submit claims**: Server verification required
- **Resume session**: Token validation needed
- **Real-time draws**: Live WebSocket events

### Cache Management
- Snapshots expire after 24 hours
- Expired caches pruned on app boot
- Storage key format: `player:snap:{gameId}:{cardId}`
- Typical cache size: ~2-5KB per game

## Security Model

### Token Storage
```javascript
sessionToken → sessionStorage  // Ephemeral, cleared on tab close
resumeToken → localStorage     // Persistent across sessions
gameSnapshot → localStorage    // No sensitive data
```

### Session Lifecycle
1. **Join**: Creates both session and resume tokens
2. **Active Play**: Uses session token for API calls
3. **Tab Close**: Session token cleared, resume token persists
4. **Return**: Resume token exchanges for new session token
5. **Logout**: All tokens and caches cleared

## Navigation & Routes

### Route Structure
- `/` - Join page (PIN entry)
- `/card` - Game card view (requires session)

### Route Guards
- Card route redirects to `/` if no session
- Join success auto-navigates to `/card`
- Failed resume redirects to `/`

## Performance Optimization

### Service Worker Caching
```javascript
/games/{id}/snapshot → NetworkFirst (3s timeout)
/join, /resume → NetworkOnly (never cached)
/cards/{id}/mark → NetworkOnly (mutations)
Static assets → CacheFirst
```

### Build Optimization
- Code splitting via React.lazy (if needed)
- Tree-shaking unused code
- Minified production build (~290KB total)

## Troubleshooting

### PWA Not Installing
- Check HTTPS (required for PWA)
- Verify manifest.json is served
- Icons must be accessible (192/512px PNGs)
- Clear browser cache and retry

### Offline Not Working
- Check DevTools → Application → Service Worker active
- Verify cache storage has entries
- Test with DevTools → Network → Offline checkbox

### Resume Failed
- Token expired (redirect to join)
- Game ended (need new game)
- Server restart (tokens invalidated)

### Build Issues
```bash
# Clean build
rm -rf dist node_modules/.vite
pnpm install
pnpm build

# Verify PWA assets
ls -la dist/*.js dist/icon*.png
```

## Monitoring & Logs

### Client-Side Debugging
```javascript
// Check cached data
localStorage.getItem('player:snap:*')

// View tokens (dev only)
sessionStorage.getItem('sessionToken')
localStorage.getItem('resumeToken')

// Service worker status
navigator.serviceWorker.ready
```

### Key Metrics to Track
- Install conversion rate
- Offline session percentage
- Cache hit ratio
- Resume success rate
- Socket reconnection frequency

## Deployment Checklist

### Pre-Deploy
- [ ] Run tests: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] Lighthouse PWA audit ≥95
- [ ] Test offline mode manually
- [ ] Verify icons generated

### Deploy Steps
1. Build production bundle
2. Upload to CDN/hosting
3. Verify manifest.json accessible
4. Test install on real device
5. Monitor for SW update issues

### Post-Deploy
- [ ] Verify SW updates propagate
- [ ] Check offline functionality
- [ ] Monitor error logs
- [ ] Test resume flow
- [ ] Verify real-time events

## Version History
- v1.0.0: Initial PWA implementation
- v1.0.1: Added cache expiry (24h)
- v1.0.2: Improved offline hydration

---
Last Updated: 2025-09-20