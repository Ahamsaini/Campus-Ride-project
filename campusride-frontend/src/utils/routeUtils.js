import axios from 'axios'

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving/'

/**
 * Fetches a road-following line between multiple coordinates using OSRM.
 * @param {Array<[lng, lat]>} coordinates - Array of [lng, lat] pairs.
 * @returns {Promise<{path: Array<[lat, lng]>, distance: number, geometry: Object}>}
 */
const _fetchOSRM = async (coordinates, alternatives = false) => {
    const altParam = alternatives ? 3 : 0
    const coordinateString = coordinates.map(c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join(';')
    const url = `${OSRM_URL}${coordinateString}?overview=full&geometries=geojson&steps=true&alternatives=${altParam === 0 ? 'false' : altParam}&continue_straight=true`

    try {
        const response = await axios.get(url)
        if (response.data.code !== 'Ok') return []

        return response.data.routes.map(route => {
            // Extract the top longest distinct road names from steps for a more valuable, localized summary
            const roadNames = new Map()
            route.legs.forEach(leg => {
                if (leg.steps) {
                    leg.steps.forEach(step => {
                        if (step.name && step.distance > 800) { // Only count major roads (>800m)
                            roadNames.set(step.name, (roadNames.get(step.name) || 0) + step.distance)
                        }
                    })
                }
            })

            const sortedRoads = [...roadNames.entries()]
                .sort((a, b) => b[1] - a[1]) // Sort by longest distance driven on that road
                .map(e => e[0])

            const defaultSummary = route.legs.map(l => l.summary).filter(Boolean).join(' then via ') || 'Local Roads'
            const customSummary = sortedRoads.length > 0 ? sortedRoads.slice(0, 2).join(' / ') : defaultSummary

            return {
                path: route.geometry.coordinates.map(c => [c[1], c[0]]),
                distance: route.distance,
                summary: customSummary
            }
        })
    } catch (error) {
        return []
    }
}

export const fetchRoadRoute = async (coordinates, alternatives = true) => {
    if (coordinates.length < 2) return null

    // 1. Fetch base routes
    const baseRoutes = await _fetchOSRM(coordinates, alternatives)
    let allRoutes = [...baseRoutes]

    // 2. Synthesize highly diverse regional routes if it's a simple Start-End request with alternatives
    if (coordinates.length === 2 && alternatives) {
        const [start, end] = coordinates

        // Midpoint
        const mx = (start[0] + end[0]) / 2
        const my = (start[1] + end[1]) / 2

        const dx = end[0] - start[0]
        const dy = end[1] - start[1]

        // Calculate anchors perpendicular to the direct line between start and end
        // Inner anchors for minor highway deviations
        const ratioInner = 0.12
        const viaInner1 = [mx - dy * ratioInner, my + dx * ratioInner]
        const viaInner2 = [mx + dy * ratioInner, my - dx * ratioInner]

        // Outer anchors for major highway detours
        const ratioOuter = 0.28
        const viaOuter1 = [mx - dy * ratioOuter, my + dx * ratioOuter]
        const viaOuter2 = [mx + dy * ratioOuter, my - dx * ratioOuter]

        // Fetch synthetic routes in parallel to discover completely different geographical highways
        const [i1, i2, o1, o2] = await Promise.all([
            _fetchOSRM([start, viaInner1, end], false),
            _fetchOSRM([start, viaInner2, end], false),
            _fetchOSRM([start, viaOuter1, end], false),
            _fetchOSRM([start, viaOuter2, end], false)
        ])

        allRoutes = [...allRoutes, ...i1, ...i2, ...o1, ...o2]
    }

    // 3. Deduplicate by distance & string similarity
    const uniqueRoutes = []
    for (const r of allRoutes) {
        // If routes are within 300 meters of each other length-wise, they are likely identical
        if (!uniqueRoutes.some(ur => Math.abs(ur.distance - r.distance) < 300 || ur.summary === r.summary)) {
            uniqueRoutes.push(r)
        }
    }

    // 4. Sort by shortest distance and return up to top 5 distinct paths
    uniqueRoutes.sort((a, b) => a.distance - b.distance)
    return uniqueRoutes.slice(0, 5)
}
