function loadPublicMapList(url, map_base_url) {
    clearInnerAndShowSpinner('map-list');

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            let mapList = document.getElementById('map-list');
            mapList.innerHTML = '';
            if (data.maps.length === 0) {
                mapList.innerHTML = '<span>No maps found.</span>';
            } else {
                for (let map of data.maps) {
                    let _id = map.id;
                    let _url = map_base_url + _id;
                    let _name = map.name;
                    let _description = map.description;
                    let _stars = map.stars;

                    mapList.innerHTML += `
                    <div class="col">
                        <div class="card shadow-sm">
                            <div class="geo-pattern" id="pattern-${_id}">${_name}</div>
    
                            <div class="card-body">
                                <p class="fs-4 pb-0">${_name}</p>
                                <p class="text-muted mb-1">${_description}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="btn-group">
                                        <a href="${_url}">
                                            <button type="button" class="btn btn-sm btn-outline-secondary">View</button>
                                        </a>
                                    </div>
<!--                                    <small class="text-muted" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Last viewed">${_lastView}</small>-->
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                }

                paintGeoPattern();
                enableTooltip();
            }
        },
        error: function (data) {
            console.log(data);
        }
    });
}
