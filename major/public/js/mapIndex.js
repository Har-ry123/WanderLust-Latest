(function () {
    if (!window.mapboxToken || !window.mapListings?.length) return;

    mapboxgl.accessToken = window.mapboxToken;

    const map = new mapboxgl.Map({
        container: 'cluster-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [78.9629, 20.5937],
        zoom: 2,
    });

    const bounds = new mapboxgl.LngLatBounds();

    map.on('load', () => {
        window.mapListings.forEach((listing) => {
            const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<a href="/listings/${listing.id}" class="text-decoration-none fw-semibold">${listing.title}</a>
                 <div class="text-muted small">${listing.location}, ${listing.country}</div>
                 <div class="mt-1">&#8377;${listing.price?.toLocaleString('en-IN') || 'N/A'} / night</div>`
            );

            new mapboxgl.Marker({ color: '#fe424d' })
                .setLngLat(listing.coordinates)
                .setPopup(popup)
                .addTo(map);

            bounds.extend(listing.coordinates);
        });

        if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 60, maxZoom: 10 });
        }
    });
})();
