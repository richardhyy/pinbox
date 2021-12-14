const genericFeatureStyle = {
    color: '#7ebbae',
    weight: 3,
    fillColor: '#ffffff',
};

// MARK: - Basic map
let baseMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 2,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

let cursorLayer = L.featureGroup();
let editableLayer = L.featureGroup();
let userFeatureLayer = L.geoJSON(null, {
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
        layer.on('contextmenu', function (e) {
            let featureType = feature.geometry.type;
            let deleteFunctionName = featureType === "Point" ? "deletePoint" : "deletePolyline";
            deletePopup
                .setContent(`
                            <div class="marker-popup-container">
                                <h5>Delete ${feature.properties.name}?</h5>
                                <a class="btn btn-outline-secondary" id="delete-feature-${feature.properties.pk}"
                                       onclick="
                                               requireConfirm(
                                               'delete-feature-${feature.properties.pk}',
                                               () => {
                                                   ${deleteFunctionName}(${feature.properties.pk});
                                                   map.closePopup();
                                               })"
                                       data-bs-toggle="tooltip" data-bs-placement="bottom"
                                       title="Can NOT be undone">
                                        Delete</a>
                            </div>`)
                .setLatLng(e.latlng)
                .openOn(map);
        });

    },
    style: genericFeatureStyle
});

let map = L.map("map", {
    center: [0, 0],
    zoom: 2,
    layers: [
        cursorLayer,
        editableLayer,
        userFeatureLayer,
        baseMapLayer
    ],
    zoomControl: false,
});

L.control.zoom({
    position: 'topright'
}).addTo(map);

provAndcitylayers = new L.FeatureGroup();
map.addLayer(provAndcitylayers);

let deletePopup = L.popup();

function loadBasemap(url, maxZoom, attribution) {
    baseMapLayer.remove();
    baseMapLayer = L.tileLayer(url, {
        maxZoom: maxZoom,
        attribution: attribution
    });
    map.addLayer(baseMapLayer);
}

function loadGeoJSON(geojson, append = false) {
    if (!append) {
        userFeatureLayer.clearLayers();
    }
    userFeatureLayer.addData(geojson);
}

// Update data every 3 seconds
setInterval(function () {
    updateFeatureList();
}, 3000);
