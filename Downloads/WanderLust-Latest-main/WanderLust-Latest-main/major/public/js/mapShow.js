(function () {
    if (!window.mapData?.token) return;

    mapboxgl.accessToken = window.mapData.token;

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [78.9629, 20.5937],
        zoom: 3,
    });

    const marker = new mapboxgl.Marker({ color: '#fe424d' });

    function showLocation(coordinates, title) {
        marker.setLngLat(coordinates).addTo(map);
        map.flyTo({ center: coordinates, zoom: 11 });
        if (title) {
            marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setText(title));
        }
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
