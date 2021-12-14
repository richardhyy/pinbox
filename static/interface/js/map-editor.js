class MapEditor {
    tools = [
        new CursorTool(),
        new MarkerTool(),
        new PolylineTool(),
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

                marker.remove();
                let geojson = JSON.parse(data.geom);
                loadGeoJSON(geojson);
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

class PolylineTool extends MapEditorTool {
    tempPolylinePoints = [];
    tempPolyline = null;
    tempJunctions = [];
    tempTrackingPolyline = null;

    setEnabled() {
        super.setEnabled();

        $('.leaflet-container').css('cursor', 'crosshair');
    }

    setDisabled() {
        super.setDisabled();
        this._cleanTemp();
    }

    /**
     * Append a point to the polyline.
     * @param e
     */
    onClick(e) {
        console.log(e);

        let latlng = e.latlng;

        if (this.tempPolylinePoints.length === 0) {
            this.tempPolylinePoints.push(latlng);
        } else {
            this.tempPolylinePoints.push(latlng);
            // Create a temp polyline connecting temp points
            if (this.tempPolyline) {
                this.tempPolyline.remove();
            }
            this.tempPolyline = L.polyline(this.tempPolylinePoints, {
                color: '#7ebbae',
                weight: 3,
                opacity: 0.8,
                smoothFactor: 1
            }).addTo(map);

            let junction = L.circle(latlng, {
                color: '#7ebbae',
                fillColor: '#ffffff',
                fillOpacity: 1,
                radius: 20,
                weight: 3,
            }).addTo(map);
            this.tempJunctions.push(junction);
        }
    }

    /**
     * Draw a line connecting previous point (if exists) and mouse position.
     * @param e
     */
    onMouseMove(e) {
        if (this.tempPolylinePoints.length > 0) {
            let latlng = e.latlng;
            let lastPoint = this.tempPolylinePoints[this.tempPolylinePoints.length - 1];

            if (this.tempTrackingPolyline) {
                this.tempTrackingPolyline.remove();
            }

            this.tempTrackingPolyline = L.polyline([lastPoint, latlng], {
                color: '#7ebbae',
                weight: 3,
                opacity: 0.8,
                smoothFactor: 1
            }).addTo(map);
        }
    }

    /**
     * Create a polyline request.
     * @param e
     */
    onDoubleClick(e) {
        console.log(e);

        if (this.tempPolylinePoints.length > 1) {
            let latlng = e.latlng;
            this.tempPolylinePoints.push(latlng);

            this._createPolylineRequest(this.tempPolylinePoints);

            this._cleanTemp();
        }

    }

    _cleanTemp() {
        if (this.tempPolyline) {
            this.tempPolyline.remove();
        }
        if (this.tempTrackingPolyline) {
            this.tempTrackingPolyline.remove();
        }
        this.tempPolylinePoints = [];
        for (let junction of this.tempJunctions) {
            junction.remove();
        }
        this.tempJunctions = [];
    }

    _polylinePointsToWKT(points) {
        let wkt = 'LINESTRING(';
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            wkt += point.lng + ' ' + point.lat + ',';
        }
        wkt = wkt.substring(0, wkt.length - 1);
        wkt += ')';
        return wkt;
    }

    _createPolylineRequest(points) {
        $.ajax({
            url: createLineUrl,
            type: 'POST',
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: {
                linestring: this._polylinePointsToWKT(points)
            },
            success: function (data) {
                showToast("Polyline created");

                let geojson = JSON.parse(data.geom);
                loadGeoJSON(geojson);
            },
            error: function (data) {
                showErrorToastAjax(data, 'failed creating polyline');
            }
        });
    }
}
