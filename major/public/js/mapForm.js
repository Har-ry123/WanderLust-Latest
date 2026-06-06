(function () {
    if (!window.mapFormData?.token) return;

    mapboxgl.accessToken = window.mapFormData.token;

    const lngInput = document.getElementById('lng');
    const latInput = document.getElementById('lat');
    const locationInput = document.querySelector('input[name="listing[location]"]');
    const countryInput = document.querySelector('input[name="listing[country]"]');

    const initialLng = parseFloat(window.mapFormData.lng);
    const initialLat = parseFloat(window.mapFormData.lat);
    const hasInitialCoords = !Number.isNaN(initialLng) && !Number.isNaN(initialLat);

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: hasInitialCoords ? [initialLng, initialLat] : [78.9629, 20.5937],
        zoom: hasInitialCoords ? 11 : 3,
    });

    const marker = new mapboxgl.Marker({ color: '#fe424d', draggable: true });

    function setCoordinates(lngLat) {
        const lng = lngLat.lng ?? lngLat[0];
        const lat = lngLat.lat ?? lngLat[1];
        marker.setLngLat([lng, lat]).addTo(map);
        lngInput.value = lng;
        latInput.value = lat;
    }

    if (hasInitialCoords) {
        setCoordinates([initialLng, initialLat]);
    }

    map.on('click', (event) => {
        setCoordinates(event.lngLat);
    });

    marker.on('dragend', () => {
        setCoordinates(marker.getLngLat());
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
        marker: false,
    });

    map.addControl(geocoder);

    geocoder.on('result', (event) => {
        setCoordinates(event.result.center);
        if (locationInput && !locationInput.value) {
            locationInput.value = event.result.text || '';
        }
        if (countryInput && !countryInput.value && event.result.context) {
            const country = event.result.context.find((item) => item.id.startsWith('country'));
            if (country) countryInput.value = country.text;
        }
    });

    async function geocodeFromFields() {
        const location = locationInput?.value?.trim();
        const country = countryInput?.value?.trim();
        if (!location || !country) return;

        try {
            const coordinates = await window.geocodePlace(location, country, mapboxgl.accessToken);
            if (coordinates) {
                setCoordinates(coordinates);
                map.flyTo({ center: coordinates, zoom: 11 });
            }
        } catch (err) {
            console.error('Failed to geocode location', err);
        }
    }

    locationInput?.addEventListener('change', geocodeFromFields);
    countryInput?.addEventListener('change', geocodeFromFields);

    if (!hasInitialCoords && locationInput?.value && countryInput?.value) {
        geocodeFromFields();
    }
})();
