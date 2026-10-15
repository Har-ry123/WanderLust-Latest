// Free map (Leaflet + OpenStreetMap), used when no Mapbox token is configured.
// window.leafletData = { mode: 'show' | 'form', lng, lat, location, country, title }
(function () {
    const data = window.leafletData;
    const container = document.getElementById('map');
    if (!data || !container || typeof L === 'undefined') return;

    const DEFAULT_CENTER = [20.5937, 78.9629]; // India, [lat, lng]
    const isForm = data.mode === 'form';
    const lng = parseFloat(data.lng);
    const lat = parseFloat(data.lat);
    const hasCoords = !Number.isNaN(lng) && !Number.isNaN(lat) && !(lng === 0 && lat === 0);

    const map = L.map(container).setView(hasCoords ? [lat, lng] : DEFAULT_CENTER, hasCoords ? 11 : 3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const pinIcon = L.divIcon({
        className: 'map-pin',
        html: '<i class="fa-solid fa-location-dot"></i>',
        iconSize: [30, 40],
        iconAnchor: [15, 38],
    });
    let marker = null;

    function placeMarker(latLng, zoom) {
        if (!marker) {
            marker = L.marker(latLng, { icon: pinIcon, draggable: isForm }).addTo(map);
            if (isForm) marker.on('dragend', () => updateInputs(marker.getLatLng()));
            if (!isForm && data.title) {
                const label = document.createElement('strong');
                label.textContent = data.title;
                marker.bindPopup(label);
            }
        } else {
            marker.setLatLng(latLng);
        }
        if (zoom) map.setView(latLng, zoom);
        if (isForm) updateInputs(marker.getLatLng());
    }

    function updateInputs(latLng) {
        const lngInput = document.getElementById('lng');
        const latInput = document.getElementById('lat');
        if (lngInput) lngInput.value = latLng.lng;
        if (latInput) latInput.value = latLng.lat;
    }

    async function lookup(location, country) {
        const query = [location, country].filter(Boolean).join(', ');
        if (!query) return null;
        const params = new URLSearchParams({ q: query, format: 'json', limit: '1' });
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
            if (!response.ok) return null;
            const [place] = await response.json();
            return place ? [Number(place.lat), Number(place.lon)] : null;
        } catch (err) {
            console.error('Map lookup failed', err);
            return null;
        }
    }

    if (hasCoords) {
        placeMarker([lat, lng]);
    } else if (!isForm) {
        lookup(data.location, data.country).then((latLng) => latLng && placeMarker(latLng, 11));
    }

    if (isForm) {
        map.on('click', (event) => placeMarker(event.latlng));

        const locationInput = document.querySelector('input[name="listing[location]"]');
        const countryInput = document.querySelector('input[name="listing[country]"]');
        const fromFields = async () => {
            const latLng = await lookup(locationInput?.value.trim(), countryInput?.value.trim());
            if (latLng) placeMarker(latLng, 11);
        };
        locationInput?.addEventListener('change', fromFields);
        countryInput?.addEventListener('change', fromFields);
    }
})();
