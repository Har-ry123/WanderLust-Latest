(function () {
    if (!window.mapData?.token) return;

    mapboxgl.accessToken = window.mapData.token;

    // Use the listing's saved coordinates when they are valid ([0,0] means missing)
    const saved = window.mapData.coordinates;
    const hasSaved =
        Array.isArray(saved) && saved.length === 2 && !(saved[0] === 0 && saved[1] === 0);

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: hasSaved ? saved : [78.9629, 20.5937],
        zoom: hasSaved ? 11 : 3,
    });

    const marker = new mapboxgl.Marker({ color: '#fe424d' });

    function showLocation(coordinates, title, fly = true) {
        marker.setLngLat(coordinates).addTo(map);
        if (fly) map.flyTo({ center: coordinates, zoom: 11 });
        if (title) {
            marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setText(title));
        }
    }

    if (hasSaved) {
        showLocation(saved, window.mapData.title, false);
        return;
    }

    map.on('load', async () => {
        try {
            const coordinates = await window.geocodePlace(
                window.mapData.location,
                window.mapData.country,
                window.mapData.token
            );

            if (coordinates) {
                showLocation(coordinates, window.mapData.title);
            }
        } catch (err) {
            console.error('Failed to load map location', err);
        }
    });
})();
