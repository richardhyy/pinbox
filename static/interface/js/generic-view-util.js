function paintGeoPattern(class_name = 'geo-pattern') {
    let pattern_divs = document.getElementsByClassName(class_name);
    for (let i = 0; i < pattern_divs.length; i++) {
        let pattern_div = pattern_divs[i];
        let pattern_id = pattern_div.id;
        let pattern_name = pattern_div.innerText;
        let pattern = GeoPattern.generate(`${pattern_name}#${pattern_id}`);
        pattern_div.style.backgroundImage = pattern.toDataUrl();
        pattern_div.innerText = '';
    }
}

function enableTooltip() {
    let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
}

function enableDrag(selector) {
    $(selector).draggable({
        handle: ".draggable"
    });
}

function enableDismissablePopover(sanitize = true) {
    let popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl, {
            trigger: 'focus',
            html: true,
            sanitize: sanitize,
        })
    });
}

function registerDropdownToggle(selector) {
    let dropdownElementList = [].slice.call(document.querySelectorAll(selector))
    dropdownElementList.map(function (dropdownToggleEl) {
        return new bootstrap.Dropdown(dropdownToggleEl)
    })
}

function clearInnerAndShowSpinner(id, showToast = true) {
    if (showToast) {
        showProcessingToast();
    }
    let el = document.getElementById(id)
    el.innerHTML = `
    <div class="d-flex justify-content-center m-3">
        <div class="spinner-border text-secondary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>`
}

function showToast(message, additionalClass = ["text-white", "bg-primary"], timeout = 5000) {
    let toast = document.getElementById("generic-toast");
    toast.classList.add(...additionalClass);
    document.getElementById("toast-message").innerHTML = message;
    let bsToast = new bootstrap.Toast(toast)
    bsToast.show()
    setTimeout(function () {
        bsToast.hide();
        toast.classList.remove(...additionalClass);
    }, timeout);
}

function showErrorToast(message) {
    showToast('Error: ' + message, ['text-white', 'bg-danger']);
}

function showErrorToastAjax(error, defaultMessage) {
    let message = '';
    console.log(error.responseText);
    try {
        let error = JSON.parse(data.responseText);
        message = error.error;
    } catch (e) {
        message = defaultMessage;
    }
    showErrorToast(message);
}

function showProcessingToast(timeout = 500) {
    showToast('<div class="spinner-border spinner-border-sm" role="status"></div> ' + " Please wait...", ['text-white', 'bg-info'], timeout);
}

function toggleButtonStatus(btnId, processing) {
    let btn = document.getElementById(btnId);
    if (processing) {
        btn.disabled = true;
        btn.querySelector('.processing-btn-content').classList.remove('d-none');
        btn.querySelector('.normal-btn-content').classList.add('d-none');
    } else {
        btn.disabled = false;
        btn.querySelector('.processing-btn-content').classList.add('d-none');
        btn.querySelector('.normal-btn-content').classList.remove('d-none');
    }
}

function registerEnterKeyEvent(selector, listener) {
    $(selector).keypress(function (e) {
        const key = e.which;
        if (key === 13) {
            listener();
            return false;
        }
    });
}

let _confirmableDefaultText = {}

function requireConfirm(elementId, onConfirm, defaultText, confirmText = "Confirm?", timeout = 2000) {
    let element = $("#" + elementId);
    let restoreText = function () {
        element.text(_confirmableDefaultText[elementId]);
        element.removeClass("text-white");
        element.removeClass("bg-danger");
    }
    if (element.text() === confirmText) {
        onConfirm();
        restoreText();
    } else {
        _confirmableDefaultText[elementId] = element.text();
        element.text(confirmText);
        element.addClass("bg-danger");
        element.addClass("text-white");

        setTimeout(function () {
            restoreText();
        }, timeout);
    }
}