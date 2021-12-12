class MapEditor {
    tools = [
        new CursorTool(),
        new MarkerTool(),
    ];
    #selectedTool = null;

    constructor() {
        this._setupEvents();
    }

    setSelectedTool(index) {
        if (this.#selectedTool) {
            this.#selectedTool.setDisabled();
        }
        this.#selectedTool = this.tools[index];
        this.#selectedTool.setEnabled();
    }

    _setupEvents() {
        map.on('click', this._onClick.bind(this));
        map.on('mousemove', this._onMouseMove.bind(this));
        map.on('dblclick', this._onDoubleClick.bind(this));
    }

    _onClick(e) {
        console.log(e);
        if (this.#selectedTool) {
            this.#selectedTool.onClick(e);
        }
    }

    _onMouseMove(e) {
        if (this.#selectedTool) {
            this.#selectedTool.onMouseMove(e);
        }
    }

    _onDoubleClick(e) {
        if (this.#selectedTool) {
            this.#selectedTool.onDoubleClick(e);
        }
    }
}

class MapEditorTool {
    enabled = false;

    setEnabled() {
        this.enabled = true;
    }

    setDisabled() {
        this.enabled = false;
    }

    /**
     * Only call this if the tool is enabled.
     * @param e
     */
    onClick(e) {
    }

    /**
     * Only call this if the tool is enabled.
     * @param e
     */
    onMouseMove(e) {
    }

    /**
     * Only call this if the tool is enabled.
     * @param e
     */
    onDoubleClick(e) {
    }
}

class CursorTool extends MapEditorTool {
    setEnabled() {
        super.setEnabled();

        $('.leaflet-container').css('cursor', 'grab');
    }

    setDisabled() {
        super.setDisabled();
    }
}

class MarkerTool extends MapEditorTool {
    setEnabled() {
        super.setEnabled();

        $('.leaflet-container').css('cursor', 'crosshair');
    }

    setDisabled() {
        super.setDisabled();
    }

    onClick(e) {
        console.log(e);

        let latlng = e.latlng;
        let marker = L.marker(latlng, {
            draggable: true,
            icon: smallMarkerIcon,
        });

        this._createMarkerRequest(marker);

        marker.addTo(map);
    }

    _createMarkerRequest(marker) {
        let latlng = marker.getLatLng();
        $.ajax({
            url: createPointUrl,
            type: 'POST',
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: {
                latitude: latlng.lat,
                longitude: latlng.lng
            },
            success: function (data) {
                showToast("Marker created");

                let geojson = JSON.parse(data.geom);
                marker.options.markerId = geojson.features[0].properties.pk;

                // // Bind dragend event
                // marker.on('dragend', function (e) {
                //     this._updateMarkerRequest(e.target);
                // }.bind(this));
            },
            error: function (data) {
                showErrorToastAjax(data, 'failed creating marker');
            }
        });
    }

    _updateMarkerRequest(marker) {
        let latlng = marker.getLatLng();
        let markerId = marker.options.markerId;

        $.ajax({
            url: updatePointUrl + markerId,
            type: 'POST',
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: {
                latitude: latlng.lat,
                longitude: latlng.lng
            },
            success: function (data) {
                console.log(data);
            },
            error: function (data) {
                showErrorToastAjax(data, 'failed creating marker');
            }
        });
    }
}