// MARK: - Basic map
let baseMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 2,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

let map = L.map("map", {
    center: [0, 0],
    zoom: 2,
    layers: [
        baseMapLayer
    ],
    zoomControl: false,
});

L.control.zoom({
    position: 'topright'
}).addTo(map);

provAndcitylayers = new L.FeatureGroup();
map.addLayer(provAndcitylayers);

let popup = L.popup();

function loadBasemap(url, maxZoom, attribution) {
    baseMapLayer.remove();
    baseMapLayer = L.tileLayer(url, {
        maxZoom: maxZoom,
        attribution: attribution
    });
    map.addLayer(baseMapLayer);
}

function loadGeoJSON(geojson) {
    L.geoJSON(geojson,
        {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {
                    icon: defaultMarkerIcon,
                });
            },
            onEachFeature: function (feature, layer) {
                let descriptionHtml = feature.properties.description ? '<p class="text-muted">' + feature.properties.description + '</p>' : "";
                layer.bindPopup(`
                    <div class="marker-popup-container">
                        <input id="marker-name-input-${feature.properties.pk}" class="form-control form-control-plaintext" value="${feature.properties.name}"/>
                    </div>
                `);
                layer.on('click', function (e) {
                    this.openPopup();
                });
            }
        }
    ).addTo(map);
}

function addMarker(lat, lng, popupContent, onDragEnd) {
    let marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(popupContent);
    marker.on('mouseover', function (e) {
        this.openPopup();
    });
    marker.on('mouseout', function (e) {
        this.closePopup();
    });
    marker.on('dragend', onDragEnd);
}

function addPolyline(wkt, popupContent, onClick) {
    let polyline = L.polyline(wkt, {
        color: '#7ebbae',
        weight: 3,
        opacity: 1,
        smoothFactor: 1
    }).addTo(map);
    polyline.bindPopup(popupContent);
    polyline.on('click', onClick);
}